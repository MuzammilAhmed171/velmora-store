import { Router } from "express";
import { User } from "../models/user";
import { Seller, Payout } from "../models/ops";
import { Product } from "../models/catalog";
import { Order } from "../models/commerce";
import { Notification } from "../models/content";
import { ah, ok, fail, ser } from "../lib/util";
import { requireUser, requireAdmin, AuthedRequest } from "../middleware/auth";

const r = Router();

// Register as seller (customer-facing)
r.post("/register", requireUser, ah(async (req: AuthedRequest, res) => {
  const { storeName, phone, address } = req.body;
  if (!storeName) return fail(res, "Store name is required");
  const existing = await Seller.findOne({ userId: req.user!._id });
  if (existing) return fail(res, "You already applied as a seller", 400);
  const seller = await Seller.create({
    userId: req.user!._id,
    storeName, phone: phone || null, address: address || null,
    status: "PENDING", commission: 10,
  });
  return ok(res, { seller: ser(seller) });
}));

r.get("/me", requireUser, ah(async (req: AuthedRequest, res) => {
  const seller = await Seller.findOne({ userId: req.user!._id });
  if (!seller) return ok(res, { seller: null });
  return ok(res, { seller: ser(seller) });
}));

// Seller dashboard (approved sellers)
const requireSeller = async (req: AuthedRequest, res: any, next: any) => {
  const seller = await Seller.findOne({ userId: req.user!._id, status: "APPROVED" });
  if (!seller) return fail(res, "Seller access required", 403);
  (req as any).seller = seller;
  next();
};

r.get("/dashboard", requireUser, requireSeller, ah(async (req: AuthedRequest, res) => {
  const seller: any = (req as any).seller;
  const products = await Product.find({ sellerId: seller._id });
  const productIds = products.map((p) => String(p._id));
  const orders = await Order.find({ "items.sellerId": String(seller._id) }).limit(20);
  let revenue = 0;
  for (const o of orders) {
    for (const it of o.items as any[]) {
      if (productIds.includes(String(it.productId))) revenue += it.price * it.qty;
    }
  }
  const commissionOwed = Math.round(revenue * (seller.commission / 100));
  const payouts = await Payout.find({ sellerId: seller._id }).sort({ createdAt: -1 });
  return ok(res, {
    stats: { products: products.length, orders: orders.length, revenue, commissionOwed },
    products: ser(products),
    payouts: ser(payouts),
  });
}));

r.post("/payouts", requireUser, requireSeller, ah(async (req: AuthedRequest, res) => {
  const seller: any = (req as any).seller;
  const amount = Math.round(Number(req.body.amount) || 0);
  if (amount < 1000) return fail(res, "Minimum payout is Rs 1,000");
  const payout = await Payout.create({ sellerId: seller._id, amount, status: "PENDING" });
  return ok(res, { payout: ser(payout) });
}));

// Admin: sellers management
r.get("/admin/list", requireAdmin, ah(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const list = await Seller.find(status ? { status } : {}).sort({ createdAt: -1 }).populate("userId");
  return ok(res, { sellers: ser(list) });
}));

r.put("/admin/:id", requireAdmin, ah(async (req, res) => {
  const { status, commission } = req.body;
  const seller = await Seller.findById(req.params.id).populate("userId");
  if (!seller) return fail(res, "Not found", 404);
  if (status) {
    if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) return fail(res, "Invalid status");
    seller.status = status;
    if (status === "APPROVED") {
      const u: any = seller.userId;
      await User.findByIdAndUpdate(u._id, { role: "SELLER" });
      await Notification.create({ userId: u._id, title: "Seller approved", body: `Your store "${seller.storeName}" is now live.` });
    }
  }
  if (commission != null) seller.commission = Number(commission);
  await seller.save();
  return ok(res, { seller: ser(seller) });
}));

r.get("/admin/payouts", requireAdmin, ah(async (req, res) => {
  const list = await Payout.find().sort({ createdAt: -1 }).populate("sellerId");
  return ok(res, { payouts: ser(list) });
}));

r.put("/admin/payouts/:id", requireAdmin, ah(async (req, res) => {
  const { status, note } = req.body;
  const payout = await Payout.findByIdAndUpdate(req.params.id, { status, note }, { new: true });
  if (!payout) return fail(res, "Not found", 404);
  return ok(res, { payout: ser(payout) });
}));

export default r;
