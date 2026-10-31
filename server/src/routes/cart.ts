import { Router } from "express";
import crypto from "crypto";
import { Product } from "../models/catalog";
import { CartItem, WishlistItem, SavedItem, WishlistShare } from "../models/commerce";
import { ah, ok, fail, ser } from "../lib/util";
import { optionalUser, AuthedRequest } from "../middleware/auth";

const r = Router();
r.use(optionalUser);

function keyFor(req: AuthedRequest): string {
  return req.user ? "user:" + String(req.user._id) : "guest:" + String(req.guestKey);
}

const hydrate = (items: any[]) => items.map((it: any) => {
  const p = it.productId && typeof it.productId === "object" ? it.productId : null;
  const line = it.qty && p ? p.price * it.qty : p ? p.price : 0;
  return { ...ser(it), product: p ? ser(p) : null, line };
});

// --- Cart ---
r.get("/cart", ah(async (req: AuthedRequest, res) => {
  const items = await CartItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.post("/cart", ah(async (req: AuthedRequest, res) => {
  const { productId, variant, qty } = req.body;
  const p = await Product.findById(productId);
  if (!p || !p.isActive) return fail(res, "Product not found", 404);
  if (p.stock <= 0 && !p.allowPreorder && !p.isDigital) return fail(res, "Out of stock", 400);
  const key = keyFor(req);
  const existing = await CartItem.findOne({ key, productId: p._id, variant: variant || null });
  if (existing) {
    existing.qty = Math.min(10, existing.qty + (qty || 1));
    await existing.save();
  } else {
    await CartItem.create({ key, productId: p._id, variant: variant || null, qty: Math.min(10, qty || 1) });
  }
  const items = await CartItem.find({ key }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.put("/cart/:id", ah(async (req: AuthedRequest, res) => {
  const item = await CartItem.findOne({ _id: req.params.id, key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  if (!item) return fail(res, "Not found", 404);
  const qty = Number(req.body.qty);
  if (!qty || qty < 1) return fail(res, "Invalid quantity");
  item.qty = Math.min(10, qty);
  await item.save();
  const items = await CartItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.delete("/cart/:id", ah(async (req: AuthedRequest, res) => {
  await CartItem.deleteOne({ _id: req.params.id, key: keyFor(req) });
  const items = await CartItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.delete("/cart", ah(async (req: AuthedRequest, res) => {
  await CartItem.deleteMany({ key: keyFor(req) });
  return ok(res, { items: [] });
}));

// Merge guest cart into user cart after login
r.post("/cart/merge", ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  const guestKey = "guest:" + String(req.guestKey);
  const guestItems = await CartItem.find({ key: guestKey });
  const userKey = "user:" + String(req.user._id);
  for (const gi of guestItems) {
    const existing = await CartItem.findOne({ key: userKey, productId: gi.productId, variant: gi.variant });
    if (existing) {
      existing.qty = Math.min(10, existing.qty + gi.qty);
      await existing.save();
    } else {
      await CartItem.create({ key: userKey, productId: gi.productId, variant: gi.variant, qty: gi.qty });
    }
    await gi.deleteOne();
  }
  return ok(res, { merged: guestItems.length });
}));

// --- Wishlist ---
r.get("/wishlist", ah(async (req: AuthedRequest, res) => {
  const items = await WishlistItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.post("/wishlist", ah(async (req: AuthedRequest, res) => {
  const { productId } = req.body;
  const key = keyFor(req);
  if (!(await WishlistItem.findOne({ key, productId }))) {
    await WishlistItem.create({ key, productId });
  }
  return ok(res, { added: true });
}));

r.delete("/wishlist/:id", ah(async (req: AuthedRequest, res) => {
  await WishlistItem.deleteOne({ _id: req.params.id, key: keyFor(req) });
  const items = await WishlistItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

// Wishlist sharing link
r.post("/wishlist/share", ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  let share = await WishlistShare.findOne({ userId: req.user._id });
  if (!share) {
    share = await WishlistShare.create({ userId: req.user._id, token: crypto.randomBytes(8).toString("hex") });
  }
  return ok(res, { token: share.token, url: "/wishlist/shared/" + share.token });
}));

r.get("/wishlist/shared/:token", ah(async (req, res) => {
  const share = await WishlistShare.findOne({ token: req.params.token });
  if (!share) return fail(res, "Invalid share link", 404);
  const items = await WishlistItem.find({ key: "user:" + String(share.userId) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

// --- Save for later ---
r.get("/saved", ah(async (req: AuthedRequest, res) => {
  const items = await SavedItem.find({ key: keyFor(req) }).populate({ path: "productId", populate: { path: "brandId" } });
  return ok(res, { items: hydrate(items) });
}));

r.post("/saved", ah(async (req: AuthedRequest, res) => {
  const { productId } = req.body;
  const key = keyFor(req);
  const cartItem = await CartItem.findOne({ key, productId });
  if (cartItem) await cartItem.deleteOne();
  if (!(await SavedItem.findOne({ key, productId }))) {
    await SavedItem.create({ key, productId });
  }
  return ok(res, { saved: true });
}));

r.delete("/saved/:id", ah(async (req: AuthedRequest, res) => {
  await SavedItem.deleteOne({ _id: req.params.id, key: keyFor(req) });
  return ok(res, { removed: true });
}));

r.post("/saved/:id/move", ah(async (req: AuthedRequest, res) => {
  const saved = await SavedItem.findOne({ _id: req.params.id, key: keyFor(req) });
  if (!saved) return fail(res, "Not found", 404);
  const key = keyFor(req);
  if (!(await CartItem.findOne({ key, productId: saved.productId }))) {
    await CartItem.create({ key, productId: saved.productId, qty: 1 });
  }
  await saved.deleteOne();
  return ok(res, { moved: true });
}));

export default r;
