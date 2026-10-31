import { Router } from "express";
import { Product } from "../models/catalog";
import { User } from "../models/user";
import {
  CartItem, Coupon, GiftCard, Order, OrderTimeline, LoyaltyTxn, WalletTxn,
  Return, PreOrder,
} from "../models/commerce";
import { Address } from "../models/user";
import { Setting } from "../models/content";
import { ah, ok, fail, calcCoupon, orderNumber, ser } from "../lib/util";
import { optionalUser, requireUser, AuthedRequest } from "../middleware/auth";

const r = Router();

const getSetting = async (key: string, fallback: string) => {
  const s = await Setting.findOne({ key });
  return s ? s.value : fallback;
};

// ---- Addresses ----
r.get("/addresses", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where = req.user ? { userId: req.user._id } : { guestKey: String(req.guestKey) };
  const list = await Address.find(where).sort({ isDefault: -1 });
  return ok(res, { addresses: ser(list) });
}));

r.post("/addresses", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { label, name, phone, line1, line2, city, postal, isDefault } = req.body;
  if (!name || !phone || !line1 || !city) return fail(res, "Name, phone, address and city are required");
  const base = req.user ? { userId: req.user._id } : { guestKey: String(req.guestKey) };
  if (isDefault) await Address.updateMany(base, { isDefault: false });
  const addr = await Address.create({ ...base, label: label || "Home", name, phone, line1, line2: line2 || null, city, postal: postal || null, isDefault: !!isDefault });
  return ok(res, { address: ser(addr) });
}));

r.put("/addresses/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  const addr = await Address.findOne(where);
  if (!addr) return fail(res, "Not found", 404);
  const { label, name, phone, line1, line2, city, postal, isDefault } = req.body;
  Object.assign(addr, { label, name, phone, line1, line2, city, postal });
  if (isDefault) {
    await Address.updateMany(req.user ? { userId: req.user._id } : { guestKey: String(req.guestKey) }, { isDefault: false });
    addr.isDefault = true;
  }
  await addr.save();
  return ok(res, { address: ser(addr) });
}));

r.delete("/addresses/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  await Address.deleteOne(where);
  return ok(res, { removed: true });
}));

// ---- Coupons ----
r.post("/coupons/validate", optionalUser, ah(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return fail(res, "Code required");
  const c = await calcCoupon(String(code), Number(subtotal) || 0);
  if (!c) return fail(res, "Invalid or expired coupon");
  return ok(res, { coupon: c });
}));

// ---- Gift cards ----
r.get("/gift-cards/:code", ah(async (req, res) => {
  const gc = await GiftCard.findOne({ code: req.params.code.toUpperCase().trim() });
  if (!gc || !gc.isActive) return fail(res, "Invalid gift card", 404);
  return ok(res, { giftCard: { code: gc.code, balance: gc.balance } });
}));

// ---- Quote (recalc totals before placing order) ----
r.post("/quote", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { couponCode, loyaltyPoints, walletUse, giftCardCode } = req.body;
  const key = req.user ? "user:" + String(req.user._id) : "guest:" + String(req.guestKey);
  const items = await CartItem.find({ key }).populate("productId");
  if (!items.length) return fail(res, "Cart is empty");

  let subtotal = 0;
  for (const it of items) {
    const p: any = it.productId;
    if (!p || !p.isActive) return fail(res, "A product in your cart is unavailable");
    if (p.stock <= 0 && !p.allowPreorder && !p.isDigital) return fail(res, `${p.name} is out of stock`);
    subtotal += p.price * it.qty;
  }

  let discount = 0;
  let freeShip = false;
  if (couponCode) {
    const c = await calcCoupon(couponCode, subtotal);
    if (!c) return fail(res, "Invalid or expired coupon");
    discount = c.discount;
    freeShip = c.freeShip;
  }

  let loyaltyUsed = 0;
  if (req.user && loyaltyPoints) {
    const pts = Math.min(Number(loyaltyPoints) || 0, req.user.loyaltyPoints, subtotal - discount);
    loyaltyUsed = Math.max(0, pts);
  }
  let walletUsed = 0;
  if (req.user && walletUse) {
    walletUsed = Math.min(Number(walletUse) || 0, req.user.walletBalance, subtotal - discount - loyaltyUsed);
    walletUsed = Math.max(0, walletUsed);
  }
  let giftCardUsed = 0;
  if (giftCardCode) {
    const gc = await GiftCard.findOne({ code: String(giftCardCode).toUpperCase().trim() });
    if (!gc || !gc.isActive) return fail(res, "Invalid gift card");
    giftCardUsed = Math.min(gc.balance, subtotal - discount - loyaltyUsed - walletUsed);
  }

  const shippingFee = Number(await getSetting("shippingFee", "299"));
  const freeShipThreshold = Number(await getSetting("freeShipThreshold", "5000"));
  const expressFee = Number(await getSetting("expressFee", "250"));
  const method = req.body.shippingMethod || "Standard";
  let ship = method === "Express" ? expressFee : shippingFee;
  if (freeShip || subtotal - discount >= freeShipThreshold) ship = 0;
  const taxRate = Number(await getSetting("taxRate", "0"));
  const tax = Math.round((subtotal - discount) * taxRate);
  const giftWrap = req.body.giftWrap ? Number(await getSetting("giftWrapFee", "150")) : 0;
  const total = subtotal - discount - loyaltyUsed - walletUsed - giftCardUsed + ship + tax + giftWrap;

  return ok(res, {
    quote: { subtotal, discount, loyaltyUsed, walletUsed, giftCardUsed, shippingFee: ship, tax, giftWrap, total: Math.max(0, total) },
  });
}));

// ---- Place order ----
r.post("/", optionalUser, ah(async (req: AuthedRequest, res) => {
  const {
    addressId, address, shippingMethod, paymentMethod, couponCode, loyaltyPoints,
    walletUse, giftCardCode, notes, giftWrap, deliverySlot, guestName, guestEmail, guestPhone,
  } = req.body;
  const key = req.user ? "user:" + String(req.user._id) : "guest:" + String(req.guestKey);
  const items = await CartItem.find({ key }).populate("productId");
  if (!items.length) return fail(res, "Cart is empty");

  let addr: any = null;
  if (addressId) {
    const where: any = { _id: addressId };
    if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
    addr = await Address.findOne(where);
  } else if (address) {
    addr = address;
  }
  if (!addr || !addr.name || !addr.phone || !addr.line1 || !addr.city) return fail(res, "Delivery address is required");

  let subtotal = 0;
  const orderItems: any[] = [];
  for (const it of items) {
    const p: any = it.productId;
    if (!p || !p.isActive) return fail(res, "A product in your cart is unavailable");
    if (p.stock < it.qty && !p.allowPreorder && !p.isDigital) return fail(res, `${p.name} only has ${p.stock} in stock`);
    subtotal += p.price * it.qty;
    orderItems.push({ productId: String(p._id), name: p.name, price: p.price, qty: it.qty, variant: it.variant, image: p.images?.[0] || null, sku: p.sku });
  }

  // Coupon
  let discount = 0, freeShip = false, couponCodeUsed: string | null = null;
  if (couponCode) {
    const c = await calcCoupon(couponCode, subtotal);
    if (!c) return fail(res, "Invalid or expired coupon");
    discount = c.discount; freeShip = c.freeShip; couponCodeUsed = c.code;
    await Coupon.updateOne({ code: c.code }, { $inc: { usedCount: 1 } });
  }
  // Loyalty
  let loyaltyUsed = 0;
  if (req.user && loyaltyPoints) {
    const user = await User.findById(req.user._id);
    const pts = Math.min(Number(loyaltyPoints) || 0, user!.loyaltyPoints, subtotal - discount);
    loyaltyUsed = Math.max(0, Math.round(pts));
    if (loyaltyUsed > 0) {
      user!.loyaltyPoints -= loyaltyUsed;
      await user!.save();
      await LoyaltyTxn.create({ userId: user!._id, points: -loyaltyUsed, kind: "REDEEM", note: "Redeemed at checkout" });
    }
  }
  // Wallet
  let walletUsed = 0;
  if (req.user && walletUse) {
    const user = await User.findById(req.user._id);
    walletUsed = Math.min(Number(walletUse) || 0, user!.walletBalance, subtotal - discount - loyaltyUsed);
    walletUsed = Math.max(0, Math.round(walletUsed));
    if (walletUsed > 0) {
      user!.walletBalance -= walletUsed;
      await user!.save();
      await WalletTxn.create({ userId: user!._id, amount: -walletUsed, kind: "SPEND", note: "Order payment" });
    }
  }
  // Gift card
  let giftCardUsed = 0, giftCardCodeUsed: string | null = null;
  if (giftCardCode) {
    const gc = await GiftCard.findOne({ code: String(giftCardCode).toUpperCase().trim() });
    if (!gc || !gc.isActive) return fail(res, "Invalid gift card");
    giftCardUsed = Math.min(gc.balance, subtotal - discount - loyaltyUsed - walletUsed);
    gc.balance -= giftCardUsed;
    await gc.save();
    giftCardCodeUsed = gc.code;
  }

  const shippingFee = Number(await getSetting("shippingFee", "299"));
  const freeShipThreshold = Number(await getSetting("freeShipThreshold", "5000"));
  const expressFee = Number(await getSetting("expressFee", "250"));
  const method = shippingMethod || "Standard";
  let ship = method === "Express" ? expressFee : shippingFee;
  if (freeShip || subtotal - discount >= freeShipThreshold) ship = 0;
  const taxRate = Number(await getSetting("taxRate", "0"));
  const tax = Math.round((subtotal - discount) * taxRate);
  const giftWrapFee = giftWrap ? Number(await getSetting("giftWrapFee", "150")) : 0;
  const total = Math.max(0, subtotal - discount - loyaltyUsed - walletUsed - giftCardUsed + ship + tax + giftWrapFee);

  // Simple fraud risk score
  let riskScore = 0;
  if (total > 100000) riskScore += 40;
  if (paymentMethod === "COD" && total > 50000) riskScore += 30;
  if (!req.user) riskScore += 10;
  if (addr.city && !["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"].includes(addr.city)) riskScore += 5;

  const order = await Order.create({
    orderNumber: orderNumber(),
    userId: req.user?._id || null,
    guestKey: req.user ? null : String(req.guestKey),
    guestName: req.user ? null : guestName,
    guestEmail: req.user ? null : guestEmail,
    guestPhone: req.user ? null : guestPhone,
    status: "PENDING",
    subtotal, discount, shippingFee: ship, tax, total,
    paymentMethod: paymentMethod || "COD",
    paymentStatus: (paymentMethod || "COD") === "COD" ? "PENDING" : "PAID",
    address: addr,
    items: orderItems,
    couponCode: couponCodeUsed,
    loyaltyUsed, walletUsed, giftCardUsed, giftCardCode: giftCardCodeUsed,
    shippingMethod: method, deliverySlot: deliverySlot || null,
    giftWrap: !!giftWrap, notes: notes || null,
    riskScore,
  });
  await OrderTimeline.create({ orderId: order._id, status: "PENDING", note: "Order placed" });

  // Decrement stock
  const { InventoryLog } = await import("../models/ops");
  for (const it of items) {
    const p: any = it.productId;
    if (!p.isDigital) {
      p.stock = Math.max(0, p.stock - it.qty);
      p.sold = (p.sold || 0) + it.qty;
      await p.save();
      await InventoryLog.create({ productId: p._id, change: -it.qty, reason: "SALE", note: `Order placed (cart checkout)` });
    }
  }

  // Loyalty earn
  if (req.user) {
    const per100 = Number(await getSetting("loyaltyPer100", "1"));
    const earned = Math.floor(total / 100) * per100;
    if (earned > 0) {
      const user = await User.findById(req.user._id);
      user!.loyaltyPoints += earned;
      const tiers = [["Platinum", 5000], ["Gold", 2000], ["Silver", 500]];
      for (const [t, min] of tiers) {
        if (user!.loyaltyPoints >= (min as number)) { user!.tier = t as string; break; }
      }
      await user!.save();
      await LoyaltyTxn.create({ userId: user!._id, points: earned, kind: "EARN", note: `Order ${order.orderNumber}` });
    }
  }

  await CartItem.deleteMany({ key });
  return ok(res, { order: { orderNumber: order.orderNumber, total: order.total, id: String(order._id) } });
}));

// ---- List own orders ----
r.get("/", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = req.user ? { userId: req.user._id } : { guestKey: String(req.guestKey) };
  const orders = await Order.find(where).sort({ createdAt: -1 }).limit(50);
  return ok(res, { orders: ser(orders) });
}));

r.get("/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  const order = await Order.findOne(where);
  if (!order) return fail(res, "Not found", 404);
  const timeline = await OrderTimeline.find({ orderId: order._id }).sort({ createdAt: 1 });
  return ok(res, { order: ser(order), timeline: ser(timeline) });
}));

// Guest lookup by order number + phone
r.post("/track", ah(async (req, res) => {
  const { orderNumber, phone } = req.body;
  if (!orderNumber || !phone) return fail(res, "Order number and phone are required");
  const order = await Order.findOne({ orderNumber: String(orderNumber).trim().toUpperCase() });
  if (!order) return fail(res, "Order not found", 404);
  const phoneOk = (order.guestPhone || order.address?.phone || "").replace(/\D/g, "").endsWith(String(phone).replace(/\D/g, "").slice(-7));
  if (!phoneOk) return fail(res, "Order not found", 404);
  const timeline = await OrderTimeline.find({ orderId: order._id }).sort({ createdAt: 1 });
  return ok(res, { order: ser(order), timeline: ser(timeline) });
}));

r.post("/:id/cancel", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  const order = await Order.findOne(where);
  if (!order) return fail(res, "Not found", 404);
  if (!["PENDING", "CONFIRMED"].includes(order.status)) return fail(res, "Order can no longer be cancelled");
  order.status = "CANCELLED";
  await order.save();
  await OrderTimeline.create({ orderId: order._id, status: "CANCELLED", note: "Cancelled by customer" });
  return ok(res, { order: ser(order) });
}));

r.post("/:id/reorder", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  const order = await Order.findOne(where);
  if (!order) return fail(res, "Not found", 404);
  const key = req.user ? "user:" + String(req.user._id) : "guest:" + String(req.guestKey);
  for (const it of order.items) {
    const p = await Product.findById(it.productId);
    if (p && p.isActive) {
      const existing = await CartItem.findOne({ key, productId: p._id });
      if (existing) existing.qty = Math.min(10, existing.qty + it.qty), await existing.save();
      else await CartItem.create({ key, productId: p._id, qty: it.qty });
    }
  }
  return ok(res, { added: true });
}));

// Returns
r.post("/:id/returns", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = { _id: req.params.id };
  if (req.user) where.userId = req.user._id; else where.guestKey = String(req.guestKey);
  const order = await Order.findOne(where);
  if (!order) return fail(res, "Not found", 404);
  if (!["DELIVERED"].includes(order.status)) return fail(res, "Returns can only be requested for delivered orders");
  const { items, reason } = req.body;
  if (!reason) return fail(res, "Reason is required");
  const ret = await Return.create({
    orderId: order._id,
    userId: req.user?._id || null,
    items: items || order.items.map((i: any) => ({ productId: i.productId, qty: i.qty })),
    reason,
    status: "REQUESTED",
  });
  return ok(res, { return: ser(ret) });
}));

r.get("/returns/list", optionalUser, ah(async (req: AuthedRequest, res) => {
  const where: any = req.user ? { userId: req.user._id } : {};
  const list = await Return.find(where).sort({ createdAt: -1 }).populate("orderId");
  return ok(res, { returns: ser(list) });
}));

// Pre-orders
r.post("/preorders", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  const { productId, qty } = req.body;
  const p = await Product.findById(productId);
  if (!p || !p.allowPreorder) return fail(res, "Product not available for pre-order", 400);
  const pre = await PreOrder.create({ userId: req.user._id, productId: p._id, qty: qty || 1, status: "PENDING", expectedDate: new Date(Date.now() + 21 * 86400000) });
  return ok(res, { preorder: ser(pre) });
}));

r.get("/preorders/list", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  const list = await PreOrder.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate("productId");
  return ok(res, { preorders: ser(list) });
}));

// Wallet top-up (demo)
r.post("/wallet/topup", requireUser, ah(async (req: AuthedRequest, res) => {
  const amount = Math.round(Number(req.body.amount) || 0);
  if (amount < 100) return fail(res, "Minimum top-up is Rs 100");
  const user = await User.findByIdAndUpdate(req.user!._id, { $inc: { walletBalance: amount } }, { new: true });
  await WalletTxn.create({ userId: req.user!._id, amount, kind: "TOPUP", note: "Demo top-up" });
  return ok(res, { walletBalance: user!.walletBalance });
}));

// Convert guest orders to account after signup
r.post("/claim", requireUser, ah(async (req: AuthedRequest, res) => {
  const guestKey = String(req.body.guestKey || "");
  if (!guestKey) return fail(res, "guestKey required");
  const result = await Order.updateMany({ guestKey, userId: null }, { userId: req.user!._id, guestKey: null });
  return ok(res, { claimed: result.modifiedCount });
}));

export default r;
