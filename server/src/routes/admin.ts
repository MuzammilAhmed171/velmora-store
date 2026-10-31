import { Router } from "express";
import { User } from "../models/user";
import { Category, Brand, Product, Review, Question } from "../models/catalog";
import {
  Order, OrderTimeline, Coupon, GiftCard, LoyaltyTxn, WalletTxn,
  Return, CartItem, Auction, DigitalFile,
} from "../models/commerce";
import {
  Banner, Faq, BlogPost, Ticket, TicketMessage, Notification, Setting,
  Campaign, SearchLog, NewsletterSubscriber, SeoMeta, Integration, FlashDeal,
} from "../models/content";
import { Seller, InventoryLog, ChatThread, ChatMessage } from "../models/ops";
import { ah, ok, fail, slugify, ser } from "../lib/util";
import { requireAdmin, AuthedRequest } from "../middleware/auth";

const r = Router();
r.use(requireAdmin);

// ---------- Dashboard ----------
r.get("/dashboard", ah(async (_req, res) => {
  const [
    revenueAgg, ordersCount, customersCount, productsCount,
    lowStock, recentOrders, riskyCount,
  ] = await Promise.all([
    Order.aggregate([{ $match: { status: { $nin: ["CANCELLED"] } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Order.countDocuments(),
    User.countDocuments({ role: "CUSTOMER" }),
    Product.countDocuments({ isActive: true }),
    Product.find({ isActive: true, stock: { $lt: 10 } }).sort({ stock: 1 }).limit(10),
    Order.find().sort({ createdAt: -1 }).limit(8),
    Order.countDocuments({ riskScore: { $gte: 50 }, status: { $nin: ["CANCELLED", "DELIVERED"] } }),
  ]);

  // Revenue per day (last 14 days)
  const since = new Date(Date.now() - 14 * 86400000);
  const daily = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$total" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return ok(res, {
    kpis: {
      revenue: revenueAgg[0]?.total || 0,
      orders: ordersCount,
      customers: customersCount,
      products: productsCount,
      fraudQueue: riskyCount,
    },
    revenueChart: daily,
    lowStock: ser(lowStock),
    recentOrders: ser(recentOrders),
  });
}));

// ---------- Live chat inbox ----------
r.get("/chat-threads", ah(async (_req, res) => {
  const threads = await ChatThread.find().populate("userId", "name email").sort({ createdAt: -1 }).limit(100);
  const out = await Promise.all(threads.map(async (t: any) => {
    const last = await ChatMessage.findOne({ threadId: t._id }).sort({ createdAt: -1 });
    const count = await ChatMessage.countDocuments({ threadId: t._id });
    return { ...ser(t), lastMessage: last ? ser(last) : null, messageCount: count };
  }));
  return ok(res, { threads: out });
}));

r.post("/chat-threads/:id/reply", ah(async (req, res) => {
  const { body } = req.body;
  if (!body) return fail(res, "Message required");
  const thread = await ChatThread.findById(req.params.id);
  if (!thread) return fail(res, "Thread not found", 404);
  const msg = await ChatMessage.create({ threadId: thread._id, sender: "ADMIN", body });
  return ok(res, { message: ser(msg) });
}));

r.get("/chat-threads/:id/messages", ah(async (req, res) => {
  const messages = await ChatMessage.find({ threadId: req.params.id }).sort({ createdAt: 1 });
  return ok(res, { messages: ser(messages) });
}));

// ---------- Products ----------
r.get("/products", ah(async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const list = await Product.find().populate("brandId categoryId").sort({ createdAt: -1 }).limit(200);
  const filtered = q
    ? list.filter((p: any) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    : list;
  return ok(res, { products: ser(filtered) });
}));

r.post("/products", ah(async (req, res) => {
  const { name, description, price, compareAt, cost, sku, stock, categoryId, brandId, images, tags, featured, isActive, isDigital, allowPreorder, weight } = req.body;
  if (!name || price == null) return fail(res, "Name and price are required");
  try {
    const p = await Product.create({
      name, slug: slugify(name) + "-" + Date.now().toString(36),
      description: description || "", price: Number(price), compareAt: compareAt ? Number(compareAt) : null,
      cost: cost ? Number(cost) : null, sku: sku || ("VLM-" + Date.now().toString(36).toUpperCase()),
      stock: Number(stock) || 0, categoryId: categoryId || null, brandId: brandId || null,
      images: images || [], tags: tags || [], featured: !!featured, isActive: isActive !== false,
      isDigital: !!isDigital, allowPreorder: !!allowPreorder, weight: weight ? Number(weight) : null,
    });
    return ok(res, { product: ser(p) });
  } catch (e: any) {
    return fail(res, e.code === 11000 ? "SKU or slug already exists" : "Could not create product");
  }
}));

r.put("/products/:id", ah(async (req, res) => {
  const before = await Product.findById(req.params.id);
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!p) return fail(res, "Not found", 404);
  if (before && req.body.stock != null && Number(req.body.stock) !== before.stock) {
    await InventoryLog.create({ productId: p._id, change: Number(req.body.stock) - before.stock, reason: "MANUAL", note: "Admin stock update" });
  }
  return ok(res, { product: ser(p) });
}));

r.delete("/products/:id", ah(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

r.post("/products/bulk-restock", ah(async (req, res) => {
  const { ids, qty } = req.body;
  if (!Array.isArray(ids) || !ids.length) return fail(res, "No products selected");
  await Product.updateMany({ _id: { $in: ids } }, { $inc: { stock: Number(qty) || 0 } });
  for (const id of ids) {
    await InventoryLog.create({ productId: id, change: Number(qty) || 0, reason: "RESTOCK", note: "Bulk restock" });
  }
  return ok(res, { updated: ids.length });
}));

r.post("/products/bulk-delete", ah(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return fail(res, "No products selected");
  await Product.deleteMany({ _id: { $in: ids } });
  return ok(res, { deleted: ids.length });
}));

r.post("/products/:id/duplicate", ah(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return fail(res, "Not found", 404);
  const o: any = p.toObject();
  delete o._id;
  const copy = await Product.create({ ...o, name: o.name + " (Copy)", slug: o.slug + "-copy-" + Date.now().toString(36), sku: o.sku + "-C" });
  return ok(res, { product: ser(copy) });
}));

r.get("/products/export", ah(async (_req, res) => {
  const list = await Product.find().populate("categoryId brandId");
  const rows = [["sku", "name", "price", "compareAt", "cost", "stock", "category", "brand", "rating", "sold", "active"]];
  for (const p of list) {
    const o: any = p;
    rows.push([o.sku, `"${o.name.replace(/"/g, '""')}"`, o.price, o.compareAt || "", o.cost || "", o.stock, o.categoryId?.name || "", o.brandId?.name || "", o.rating, o.sold, o.isActive]);
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=products.csv");
  res.send(rows.map((x) => x.join(",")).join("\n"));
}));

// Printable barcode/QR label (demo SVG)
r.get("/products/:id/label", ah(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return fail(res, "Not found", 404);
  let bars = "";
  const seed = [...p.sku].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 40; i++) {
    const w = 1 + ((seed * (i + 3)) % 4);
    bars += `<rect x="${10 + i * 7}" y="30" width="${w}" height="60" fill="black"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="white"/>${bars}<text x="10" y="115" font-family="monospace" font-size="14">${p.sku}</text><text x="10" y="135" font-family="sans-serif" font-size="12">${String(p.name).slice(0, 40)}</text></svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
}));

// ---------- Orders ----------
r.get("/orders", ah(async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const status = req.query.status ? String(req.query.status) : null;
  const where: any = {};
  if (status) where.status = status;
  const list = await Order.find(where).sort({ createdAt: -1 }).limit(200);
  const filtered = q
    ? list.filter((o: any) => o.orderNumber.toLowerCase().includes(q) || (o.guestPhone || "").includes(q) || (o.guestEmail || "").toLowerCase().includes(q))
    : list;
  return ok(res, { orders: ser(filtered) });
}));

r.put("/orders/:id", ah(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return fail(res, "Not found", 404);
  const { status, note, courier, trackingNo, notify } = req.body;
  if (status) {
    if (!["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) return fail(res, "Invalid status");
    order.status = status;
    if (status === "DELIVERED") order.paymentStatus = "PAID";
    await OrderTimeline.create({ orderId: order._id, status, note: note || null });
    if (notify && order.userId) {
      await Notification.create({ userId: order.userId, title: `Order ${order.orderNumber}`, body: `Your order status is now: ${status}. ${trackingNo ? "Tracking: " + trackingNo : ""}` });
    }
  }
  if (courier !== undefined) order.courier = courier;
  if (trackingNo !== undefined) order.trackingNo = trackingNo;
  await order.save();
  return ok(res, { order: ser(order) });
}));

// Fraud review queue
r.get("/fraud", ah(async (_req, res) => {
  const list = await Order.find({ riskScore: { $gte: 50 } }).sort({ riskScore: -1 }).limit(50);
  return ok(res, { orders: ser(list) });
}));

// ---------- Returns ----------
r.get("/returns", ah(async (_req, res) => {
  const list = await Return.find().sort({ createdAt: -1 }).populate("orderId").limit(100);
  return ok(res, { returns: ser(list) });
}));

r.put("/returns/:id", ah(async (req, res) => {
  const ret = await Return.findById(req.params.id).populate("orderId");
  if (!ret) return fail(res, "Not found", 404);
  const { status } = req.body;
  if (!["APPROVED", "REJECTED", "REFUNDED"].includes(status)) return fail(res, "Invalid status");
  ret.status = status;
  await ret.save();
  // Wallet refund on REFUNDED
  if (status === "REFUNDED" && ret.userId) {
    const order: any = ret.orderId;
    const refund = (ret.items as any[]).reduce((sum: number, it: any) => {
      const oi = (order.items as any[]).find((x: any) => String(x.productId) === String(it.productId));
      return sum + (oi ? oi.price * it.qty : 0);
    }, 0);
    if (refund > 0) {
      await User.findByIdAndUpdate(ret.userId, { $inc: { walletBalance: refund } });
      await WalletTxn.create({ userId: ret.userId, amount: refund, kind: "REFUND", note: `Return refund for ${order.orderNumber}` });
    }
  }
  return ok(res, { return: ser(ret) });
}));

// ---------- Coupons ----------
r.get("/coupons", ah(async (_req, res) => {
  const list = await Coupon.find().sort({ createdAt: -1 });
  return ok(res, { coupons: ser(list) });
}));

r.post("/coupons", ah(async (req, res) => {
  const { code, kind, value, minSubtotal, maxUses, startsAt, endsAt, isActive } = req.body;
  if (!code || !kind) return fail(res, "Code and type required");
  try {
    const c = await Coupon.create({
      code: String(code).toUpperCase(), kind, value: Number(value) || 0,
      minSubtotal: Number(minSubtotal) || 0, maxUses: maxUses ? Number(maxUses) : null,
      startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null,
      isActive: isActive !== false,
    });
    return ok(res, { coupon: ser(c) });
  } catch {
    return fail(res, "Coupon code already exists");
  }
}));

r.put("/coupons/:id", ah(async (req, res) => {
  const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!c) return fail(res, "Not found", 404);
  return ok(res, { coupon: ser(c) });
}));

r.delete("/coupons/:id", ah(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

// ---------- Categories / Brands ----------
const crudFor = (Model: any, name: string) => {
  const sub = Router();
  sub.get("/", ah(async (_req, res) => ok(res, { [name]: ser(await Model.find().sort({ name: 1 })) })));
  sub.post("/", ah(async (req, res) => {
    const { name: n, description, image } = req.body;
    if (!n) return fail(res, "Name required");
    try {
      const item = await Model.create({ name: n, slug: slugify(n), description: description || null, image: image || null });
      return ok(res, { [name.slice(0, -1)]: ser(item) });
    } catch {
      return fail(res, "Already exists");
    }
  }));
  sub.put("/:id", ah(async (req, res) => ok(res, { [name.slice(0, -1)]: ser(await Model.findByIdAndUpdate(req.params.id, req.body, { new: true })) })));
  sub.delete("/:id", ah(async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    return ok(res, { removed: true });
  }));
  return sub;
};
r.use("/categories", crudFor(Category, "categories"));
r.use("/brands", crudFor(Brand, "brands"));

// ---------- Customers ----------
r.get("/customers", ah(async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const segment = req.query.segment ? String(req.query.segment) : null;
  const list = await User.find({ role: { $in: ["CUSTOMER", "SELLER"] } }).sort({ createdAt: -1 }).limit(200);
  // Lifetime value per customer
  const ltvAgg = await Order.aggregate([
    { $match: { userId: { $ne: null }, status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$userId", ltv: { $sum: "$total" }, orders: { $sum: 1 } } },
  ]);
  const ltvMap = new Map(ltvAgg.map((a: any) => [String(a._id), a]));
  const out = ser(list).map((u: any) => {
    const l = ltvMap.get(u.id) || { ltv: 0, orders: 0 };
    let seg = "NEW";
    if (l.ltv >= 100000) seg = "HIGH_VALUE";
    else if (l.orders >= 5) seg = "LOYAL";
    else if (l.orders === 0) seg = "INACTIVE";
    return { ...u, lifetimeValue: l.ltv, orderCount: l.orders, segment: seg };
  });
  const filtered = out.filter((u: any) =>
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!segment || u.segment === segment)
  );
  return ok(res, { customers: filtered });
}));

r.put("/customers/:id/adjust", ah(async (req: AuthedRequest, res) => {
  const { loyaltyPoints, walletBalance, note } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, "Not found", 404);
  if (loyaltyPoints != null && Number(loyaltyPoints) !== 0) {
    user.loyaltyPoints += Number(loyaltyPoints);
    await LoyaltyTxn.create({ userId: user._id, points: Number(loyaltyPoints), kind: "ADJUST", note: note || "Admin adjustment" });
  }
  if (walletBalance != null && Number(walletBalance) !== 0) {
    user.walletBalance += Number(walletBalance);
    await WalletTxn.create({ userId: user._id, amount: Number(walletBalance), kind: "ADJUST", note: note || "Admin adjustment" });
  }
  await user.save();
  return ok(res, { user: ser(user) });
}));

// ---------- Marketing ----------
r.get("/flash-deals", ah(async (_req, res) => {
  const list = await FlashDeal.find().sort({ createdAt: -1 }).populate("productId");
  return ok(res, { deals: ser(list) });
}));

r.post("/flash-deals", ah(async (req, res) => {
  const { productId, dealPrice, endsAt } = req.body;
  const deal = await FlashDeal.create({ productId, dealPrice: Number(dealPrice), endsAt: new Date(endsAt), isActive: true });
  return ok(res, { deal: ser(deal) });
}));

r.delete("/flash-deals/:id", ah(async (req, res) => {
  await FlashDeal.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

r.get("/banners", ah(async (_req, res) => {
  const list = await Banner.find().sort({ sortOrder: 1 });
  return ok(res, { banners: ser(list) });
}));

r.post("/banners", ah(async (req, res) => {
  const b = await Banner.create(req.body);
  return ok(res, { banner: ser(b) });
}));

r.put("/banners/:id", ah(async (req, res) => {
  const b = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return ok(res, { banner: ser(b) });
}));

// ---------- Digital files ----------
r.get("/digital-files", ah(async (_req, res) => {
  const list = await DigitalFile.find().populate("productId", "name").sort({ _id: -1 });
  return ok(res, { files: ser(list) });
}));

r.post("/digital-files", ah(async (req, res) => {
  const { productId, fileName, fileUrl, downloadLimit } = req.body;
  if (!productId || !fileName || !fileUrl) return fail(res, "productId, fileName and fileUrl are required");
  const f = await DigitalFile.create({ productId, fileName, fileUrl, downloadLimit: Number(downloadLimit) || 5 });
  return ok(res, { file: ser(f) });
}));

r.delete("/digital-files/:id", ah(async (req, res) => {
  await DigitalFile.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

r.delete("/banners/:id", ah(async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

r.get("/gift-cards", ah(async (_req, res) => {
  const list = await GiftCard.find().sort({ createdAt: -1 }).limit(100);
  return ok(res, { giftCards: ser(list) });
}));

r.post("/gift-cards", ah(async (req, res) => {
  const { code, balance } = req.body;
  const gc = await GiftCard.create({ code: String(code).toUpperCase(), balance: Number(balance), initialBalance: Number(balance), isActive: true });
  return ok(res, { giftCard: ser(gc) });
}));

r.put("/gift-cards/:id", ah(async (req, res) => {
  const gc = await GiftCard.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return ok(res, { giftCard: ser(gc) });
}));

// Broadcast notifications + targeted campaigns
r.get("/campaigns", ah(async (_req, res) => {
  const list = await Campaign.find().sort({ createdAt: -1 });
  return ok(res, { campaigns: ser(list) });
}));

r.post("/campaigns", ah(async (req, res) => {
  const { name, segment, couponCode, message } = req.body;
  if (!name || !message) return fail(res, "Name and message required");
  const where: any = { role: "CUSTOMER" };
  const users = await User.find(where).select("_id");
  const ltvAgg = await Order.aggregate([
    { $match: { status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$userId", ltv: { $sum: "$total" }, orders: { $sum: 1 } } },
  ]);
  const ltvMap = new Map(ltvAgg.map((a: any) => [String(a._id), a]));
  let targets = users;
  if (segment && segment !== "ALL") {
    targets = users.filter((u: any) => {
      const l = ltvMap.get(String(u._id));
      if (segment === "HIGH_VALUE") return l && l.ltv >= 100000;
      if (segment === "INACTIVE") return !l;
      if (segment === "NEW") return !l || l.orders <= 1;
      return true;
    });
  }
  const docs = targets.map((u: any) => ({ userId: u._id, title: name, body: message }));
  if (docs.length) await Notification.insertMany(docs);
  const campaign = await Campaign.create({ name, segment: segment || "ALL", couponCode: couponCode || null, message, sentCount: docs.length });
  return ok(res, { campaign: ser(campaign) });
}));

r.delete("/campaigns/:id", ah(async (req, res) => {
  await Campaign.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

// ---------- Content ----------
r.get("/faqs", ah(async (_req, res) => ok(res, { faqs: ser(await Faq.find().sort({ sortOrder: 1 })) })));
r.post("/faqs", ah(async (req, res) => ok(res, { faq: ser(await Faq.create(req.body)) })));
r.put("/faqs/:id", ah(async (req, res) => ok(res, { faq: ser(await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true })) })));
r.delete("/faqs/:id", ah(async (req, res) => { await Faq.findByIdAndDelete(req.params.id); return ok(res, { removed: true }); }));

r.get("/blog", ah(async (_req, res) => ok(res, { posts: ser(await BlogPost.find().sort({ createdAt: -1 })) })));
r.post("/blog", ah(async (req, res) => {
  const { title, excerpt, body, image, isPublished } = req.body;
  if (!title || !body) return fail(res, "Title and body required");
  const post = await BlogPost.create({ title, slug: slugify(title) + "-" + Date.now().toString(36), excerpt: excerpt || null, body, image: image || null, isPublished: !!isPublished });
  return ok(res, { post: ser(post) });
}));
r.put("/blog/:id", ah(async (req, res) => ok(res, { post: ser(await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true })) })));
r.delete("/blog/:id", ah(async (req, res) => { await BlogPost.findByIdAndDelete(req.params.id); return ok(res, { removed: true }); }));

// ---------- Support ----------
r.get("/tickets", ah(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const list = await Ticket.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100);
  return ok(res, { tickets: ser(list) });
}));

r.get("/tickets/:id", ah(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return fail(res, "Not found", 404);
  const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 });
  return ok(res, { ticket: ser(ticket), messages: ser(messages) });
}));

r.put("/tickets/:id", ah(async (req, res) => {
  const t = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return ok(res, { ticket: ser(t) });
}));

r.post("/tickets/:id/reply", ah(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return fail(res, "Not found", 404);
  const { body } = req.body;
  const msg = await TicketMessage.create({ ticketId: ticket._id, sender: "ADMIN", body });
  if (ticket.userId) await Notification.create({ userId: ticket.userId, title: "Support reply", body: `Support replied to "${ticket.subject}".` });
  return ok(res, { message: ser(msg) });
}));

r.get("/reviews", ah(async (req, res) => {
  const list = await Review.find().sort({ createdAt: -1 }).limit(100).populate("productId");
  return ok(res, { reviews: ser(list) });
}));

r.put("/reviews/:id", ah(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return ok(res, { review: ser(review) });
}));

r.delete("/reviews/:id", ah(async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

r.get("/questions", ah(async (_req, res) => {
  const list = await Question.find().sort({ createdAt: -1 }).limit(100).populate("productId");
  return ok(res, { questions: ser(list) });
}));

r.put("/questions/:id", ah(async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { answer: req.body.answer }, { new: true });
  return ok(res, { question: ser(q) });
}));

r.get("/subscribers", ah(async (_req, res) => {
  const list = await NewsletterSubscriber.find().sort({ createdAt: -1 }).limit(500);
  return ok(res, { subscribers: ser(list) });
}));

r.delete("/subscribers/:id", ah(async (req, res) => {
  await NewsletterSubscriber.findByIdAndDelete(req.params.id);
  return ok(res, { removed: true });
}));

// ---------- SEO ----------
r.get("/seo", ah(async (_req, res) => ok(res, { pages: ser(await SeoMeta.find()) })));
r.put("/seo", ah(async (req, res) => {
  const { path, title, description } = req.body;
  if (!path || !title) return fail(res, "Path and title required");
  const page = await SeoMeta.findOneAndUpdate({ path }, { title, description: description || null }, { new: true, upsert: true });
  return ok(res, { page: ser(page) });
}));

// ---------- Settings & integrations ----------
r.get("/settings", ah(async (_req, res) => {
  const list = await Setting.find();
  const out: Record<string, string> = {};
  for (const s of list) out[s.key] = s.value;
  return ok(res, { settings: out });
}));

r.put("/settings", ah(async (req, res) => {
  const settings = req.body.settings || {};
  for (const [key, value] of Object.entries(settings)) {
    await Setting.findOneAndUpdate({ key }, { value: String(value) }, { upsert: true });
  }
  return ok(res, { saved: true });
}));

r.get("/integrations", ah(async (_req, res) => ok(res, { integrations: ser(await Integration.find()) })));

r.put("/integrations/:provider", ah(async (req, res) => {
  const { apiKey, apiSecret, isActive } = req.body;
  const integ = await Integration.findOneAndUpdate(
    { provider: req.params.provider },
    { apiKey: apiKey || "", apiSecret: apiSecret || "", isActive: !!isActive, updatedAt: new Date() },
    { new: true, upsert: true }
  );
  return ok(res, { integration: ser(integ) });
}));

// ---------- Analytics ----------
r.get("/analytics/overview", ah(async (_req, res) => {
  const byCategory = await Order.aggregate([
    { $match: { status: { $nin: ["CANCELLED"] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } } } },
    { $sort: { revenue: -1 } },
    { $limit: 20 },
  ]);
  // Enrich with product + category names
  const prodIds = byCategory.map((a: any) => a._id).filter(Boolean);
  const prods = await Product.find({ _id: { $in: prodIds } }).populate("categoryId");
  const prodMap = new Map(prods.map((p: any) => [String(p._id), p]));
  const catRevenue: Record<string, number> = {};
  for (const a of byCategory) {
    const p: any = prodMap.get(String(a._id));
    const cat = p?.categoryId?.name || "Unknown";
    catRevenue[cat] = (catRevenue[cat] || 0) + a.revenue;
  }
  const byPayment = await Order.aggregate([
    { $match: { status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$paymentMethod", count: { $sum: 1 }, revenue: { $sum: "$total" } } },
  ]);
  const byCity = await Order.aggregate([
    { $match: { status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$address.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  const topCustomers = await Order.aggregate([
    { $match: { userId: { $ne: null }, status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$userId", spent: { $sum: "$total" }, orders: { $sum: 1 } } },
    { $sort: { spent: -1 } },
    { $limit: 10 },
  ]);
  const topUsers = await User.find({ _id: { $in: topCustomers.map((a: any) => a._id) } });
  const userMap = new Map(topUsers.map((u: any) => [String(u._id), u]));
  const searches = await SearchLog.aggregate([
    { $group: { _id: "$term", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  // Abandoned carts: guest/user keys with items but no order in last 7 days
  const cartKeys = await CartItem.distinct("key", { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } });
  const abandoned = await CartItem.aggregate([
    { $match: { key: { $in: cartKeys } } },
    { $group: { _id: "$key", items: { $sum: 1 } } },
  ]);
  return ok(res, {
    categoryRevenue: Object.entries(catRevenue).map(([name, revenue]) => ({ name, revenue })),
    paymentMix: byPayment,
    cityMix: byCity,
    topCustomers: topCustomers.map((a: any) => {
      const u: any = userMap.get(String(a._id));
      return { name: u?.name || "Guest", email: u?.email || "", spent: a.spent, orders: a.orders };
    }),
    searchInsights: searches,
    abandonedCarts: abandoned.length,
    abandonedItems: abandoned.reduce((s: number, a: any) => s + a.items, 0),
  });
}));

r.get("/analytics/sales", ah(async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const orders = await Order.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 });
  const rows = [["orderNumber", "date", "status", "payment", "items", "subtotal", "discount", "shipping", "tax", "total", "city"]];
  for (const o of orders) {
    rows.push([
      o.orderNumber, o.createdAt.toISOString(), o.status, o.paymentMethod,
      (o.items as any[]).reduce((s: number, i: any) => s + i.qty, 0),
      o.subtotal, o.discount, o.shippingFee, o.tax, o.total, (o.address as any)?.city || "",
    ]);
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=sales-report.csv");
  res.send(rows.map((x) => x.join(",")).join("\n"));
}));

// ---------- Inventory logs ----------
r.get("/inventory-logs", ah(async (req, res) => {
  const productId = req.query.productId ? String(req.query.productId) : null;
  const list = await InventoryLog.find(productId ? { productId } : {}).sort({ createdAt: -1 }).limit(200).populate("productId");
  return ok(res, { logs: ser(list) });
}));

// ---------- GST / tax report ----------
r.get("/tax-report", ah(async (req, res) => {
  const taxRate = Number((await Setting.findOne({ key: "taxRate" }))?.value || "0");
  const orders = await Order.find({ status: { $nin: ["CANCELLED"] } }).sort({ createdAt: -1 }).limit(500);
  const invoices = orders.map((o) => ({
    orderNumber: o.orderNumber, date: o.createdAt, subtotal: o.subtotal,
    tax: o.tax, total: o.total, gst: Math.round(o.total * taxRate),
  }));
  const totalGst = invoices.reduce((s, i) => s + i.gst, 0);
  return ok(res, { taxRate, totalGst, invoices });
}));

export default r;
