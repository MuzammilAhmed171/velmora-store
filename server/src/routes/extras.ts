import { Router } from "express";
import crypto from "crypto";
import { Product } from "../models/catalog";
import { User, Referral } from "../models/user";
import {
  Auction, Bid, DigitalFile, Download, Subscription, GiftCard, Order, LoyaltyTxn,
} from "../models/commerce";
import { Notification, Setting } from "../models/content";
import { ah, ok, fail, ser } from "../lib/util";
import { optionalUser, requireUser, AuthedRequest } from "../middleware/auth";

const r = Router();

// --- Auctions ---
r.get("/auctions", ah(async (_req, res) => {
  const list = await Auction.find({ status: "LIVE", endsAt: { $gt: new Date() } })
    .populate({ path: "productId", populate: { path: "brandId" } })
    .sort({ endsAt: 1 });
  return ok(res, { auctions: ser(list).map((a: any) => ({ ...a, product: a.product || null })) });
}));

r.get("/auctions/:id", ah(async (req, res) => {
  const auction = await Auction.findById(req.params.id).populate({ path: "productId", populate: { path: "brandId" } });
  if (!auction) return fail(res, "Not found", 404);
  const bids = await Bid.find({ auctionId: auction._id }).sort({ createdAt: -1 }).limit(20).populate("userId");
  return ok(res, { auction: ser(auction), bids: ser(bids) });
}));

r.post("/auctions/:id/bid", requireUser, ah(async (req: AuthedRequest, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction || auction.status !== "LIVE" || auction.endsAt < new Date()) return fail(res, "Auction is not live", 400);
  const amount = Math.round(Number(req.body.amount) || 0);
  if (amount <= auction.currentBid) return fail(res, `Bid must be higher than Rs ${auction.currentBid.toLocaleString()}`);
  auction.currentBid = amount;
  auction.currentBidderId = req.user!._id;
  await auction.save();
  await Bid.create({ auctionId: auction._id, userId: req.user!._id, amount });
  return ok(res, { auction: ser(auction) });
}));

// --- Digital products / secure downloads ---
r.get("/digital/files", requireUser, ah(async (req: AuthedRequest, res) => {
  const downloads = await Download.find({ userId: req.user!._id }).populate("digitalFileId");
  return ok(res, { downloads: ser(downloads) });
}));

r.get("/digital/download/:token", optionalUser, ah(async (req, res) => {
  const dl = await Download.findOne({ token: req.params.token }).populate("digitalFileId");
  if (!dl) return fail(res, "Invalid download link", 404);
  if (dl.remaining <= 0) return fail(res, "Download limit reached", 403);
  dl.remaining -= 1;
  await dl.save();
  const file: any = dl.digitalFileId;
  return ok(res, { fileUrl: file.fileUrl, fileName: file.fileName, remaining: dl.remaining });
}));

// Grant digital downloads after a digital order is paid/delivered (helper used by admin)
export async function grantDigitalDownloads(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) return;
  for (const it of order.items as any[]) {
    const files = await DigitalFile.find({ productId: it.productId });
    for (const f of files) {
      await Download.create({
        digitalFileId: f._id,
        userId: order.userId,
        orderId: order._id,
        token: crypto.randomBytes(16).toString("hex"),
        remaining: f.downloadLimit,
      });
    }
  }
}

// --- Subscriptions ---
r.get("/subscriptions", requireUser, ah(async (req: AuthedRequest, res) => {
  const list = await Subscription.find({ userId: req.user!._id }).sort({ createdAt: -1 }).populate("productId");
  return ok(res, { subscriptions: ser(list) });
}));

r.post("/subscriptions", requireUser, ah(async (req: AuthedRequest, res) => {
  const { productId, qty, intervalDays } = req.body;
  const p = await Product.findById(productId);
  if (!p || !p.isActive) return fail(res, "Product not found", 404);
  const sub = await Subscription.create({
    userId: req.user!._id,
    productId: p._id,
    qty: qty || 1,
    intervalDays: intervalDays || 30,
    status: "ACTIVE",
    nextRunAt: new Date(Date.now() + (intervalDays || 30) * 86400000),
  });
  return ok(res, { subscription: ser(sub) });
}));

r.put("/subscriptions/:id", requireUser, ah(async (req: AuthedRequest, res) => {
  const { status } = req.body;
  if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(status)) return fail(res, "Invalid status");
  const sub = await Subscription.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { status },
    { new: true }
  );
  if (!sub) return fail(res, "Not found", 404);
  return ok(res, { subscription: ser(sub) });
}));

// --- Referrals ---
r.get("/referrals", requireUser, ah(async (req: AuthedRequest, res) => {
  const list = await Referral.find({ referrerId: req.user!._id }).sort({ createdAt: -1 });
  const points = Number((await Setting.findOne({ key: "referralPoints" }))?.value || "200");
  return ok(res, { referrals: ser(list), rewardPoints: points, myCode: req.user!.referralCode });
}));

r.post("/referrals/apply", requireUser, ah(async (req: AuthedRequest, res) => {
  const { code } = req.body;
  if (!code) return fail(res, "Referral code required");
  const referrer = await User.findOne({ referralCode: String(code).toUpperCase().trim() });
  if (!referrer) return fail(res, "Invalid referral code", 404);
  if (String(referrer._id) === String(req.user!._id)) return fail(res, "You cannot use your own code", 400);
  const already = await Referral.findOne({ referrerId: referrer._id, referredUserId: req.user!._id });
  if (already) return fail(res, "Code already used", 400);
  const points = Number((await Setting.findOne({ key: "referralPoints" }))?.value || "200");
  referrer.loyaltyPoints += points;
  await referrer.save();
  await LoyaltyTxn.create({ userId: referrer._id, points, kind: "REFERRAL", note: `Referral: ${req.user!.email}` });
  await Notification.create({ userId: referrer._id, title: "Referral reward", body: `You earned ${points} points — ${req.user!.name} joined with your code.` });
  await Referral.create({ referrerId: referrer._id, referredUserId: req.user!._id, referredEmail: req.user!.email, code: referrer.referralCode!, pointsAwarded: points, status: "COMPLETED" });
  return ok(res, { applied: true, pointsAwardedToReferrer: points });
}));

// --- Gift cards: buy ---
r.post("/gift-cards/buy", requireUser, ah(async (req: AuthedRequest, res) => {
  const amount = Math.round(Number(req.body.amount) || 0);
  if (![500, 1000, 2000, 5000].includes(amount)) return fail(res, "Choose Rs 500, 1000, 2000 or 5000");
  const code = "GIFT-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const gc = await GiftCard.create({ code, balance: amount, initialBalance: amount, isActive: true });
  return ok(res, { giftCard: { code: gc.code, balance: gc.balance } });
}));

export default r;
