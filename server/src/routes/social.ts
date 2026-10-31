import { Router } from "express";
import { Product, Review, Question, Alert } from "../models/catalog";
import { Ticket, TicketMessage, Notification, SearchLog, SavedSearch, NewsletterSubscriber, Faq, BlogPost } from "../models/content";
import { ChatThread, ChatMessage } from "../models/ops";
import { ah, ok, fail, ser } from "../lib/util";
import { optionalUser, AuthedRequest } from "../middleware/auth";

const r = Router();

// --- Reviews ---
r.post("/reviews", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { productId, rating, title, body, images } = req.body;
  if (!productId || !rating || !body) return fail(res, "Rating and review are required");
  const p = await Product.findById(productId);
  if (!p) return fail(res, "Product not found", 404);
  const review = await Review.create({
    productId: p._id,
    userId: req.user?._id || null,
    authorName: req.user ? req.user.name : "Guest",
    rating: Math.min(5, Math.max(1, Number(rating))),
    title: title || null,
    body,
    images: images || [],
    verified: !!req.user,
    isApproved: true,
  });
  // Recalc product rating
  const agg = await Review.aggregate([
    { $match: { productId: p._id, isApproved: true } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (agg[0]) {
    p.rating = Math.round(agg[0].avg * 10) / 10;
    p.reviewCount = agg[0].count;
    await p.save();
  }
  return ok(res, { review: ser(review) });
}));

r.post("/reviews/:id/helpful", ah(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return fail(res, "Not found", 404);
  review.helpful = (review.helpful || 0) + 1;
  await review.save();
  return ok(res, { helpful: review.helpful });
}));

// --- Q&A ---
r.post("/questions", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { productId, question } = req.body;
  if (!productId || !question) return fail(res, "Question is required");
  const p = await Product.findById(productId);
  if (!p) return fail(res, "Product not found", 404);
  const q = await Question.create({
    productId: p._id,
    userId: req.user?._id || null,
    authorName: req.user ? req.user.name : "Guest",
    question,
  });
  return ok(res, { question: ser(q) });
}));

// --- Support tickets ---
r.get("/tickets", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return ok(res, { tickets: [] });
  const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return ok(res, { tickets: ser(tickets) });
}));

r.post("/tickets", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { name, email, subject, message, priority } = req.body;
  if (!subject || !message) return fail(res, "Subject and message are required");
  const ticket = await Ticket.create({
    userId: req.user?._id || null,
    name: name || req.user?.name || "Guest",
    email: email || req.user?.email || "",
    subject,
    priority: priority || "NORMAL",
    status: "OPEN",
  });
  await TicketMessage.create({ ticketId: ticket._id, sender: req.user ? req.user.name : name || "Guest", body: message });
  return ok(res, { ticket: ser(ticket) });
}));

r.get("/tickets/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return fail(res, "Not found", 404);
  if (req.user && ticket.userId && String(ticket.userId) !== String(req.user._id)) return fail(res, "Not found", 404);
  const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 });
  return ok(res, { ticket: ser(ticket), messages: ser(messages) });
}));

r.post("/tickets/:id/reply", optionalUser, ah(async (req: AuthedRequest, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return fail(res, "Not found", 404);
  const { body } = req.body;
  if (!body) return fail(res, "Message required");
  const msg = await TicketMessage.create({ ticketId: ticket._id, sender: req.user ? req.user.name : ticket.name, body });
  return ok(res, { message: ser(msg) });
}));

// --- Notifications ---
r.get("/notifications", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return ok(res, { notifications: [] });
  const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  return ok(res, { notifications: ser(list) });
}));

r.post("/notifications/read", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return ok(res, {});
  const { id } = req.body;
  if (id) await Notification.updateOne({ _id: id, userId: req.user._id }, { isRead: true });
  else await Notification.updateMany({ userId: req.user._id }, { isRead: true });
  return ok(res, {});
}));

// --- Price/stock alerts ---
r.post("/alerts", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { productId, type, targetPrice } = req.body;
  if (!productId || !["PRICE", "STOCK"].includes(type)) return fail(res, "Invalid alert");
  const p = await Product.findById(productId);
  if (!p) return fail(res, "Product not found", 404);
  const existing = await Alert.findOne(req.user
    ? { userId: req.user._id, productId: p._id, type, isActive: true }
    : { guestKey: String(req.guestKey), productId: p._id, type, isActive: true });
  if (existing) return ok(res, { alert: ser(existing) });
  const alert = await Alert.create({
    userId: req.user?._id || null,
    guestKey: req.user ? null : String(req.guestKey),
    productId: p._id,
    type,
    targetPrice: type === "PRICE" ? Number(targetPrice) || p.price : null,
    isActive: true,
  });
  return ok(res, { alert: ser(alert) });
}));

r.get("/alerts", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return ok(res, { alerts: [] });
  const list = await Alert.find({ userId: req.user._id, isActive: true }).populate("productId");
  return ok(res, { alerts: ser(list) });
}));

r.delete("/alerts/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  await Alert.deleteOne({ _id: req.params.id, userId: req.user._id });
  return ok(res, { removed: true });
}));

// --- Live chat (demo) ---
r.post("/chat", optionalUser, ah(async (req: AuthedRequest, res) => {
  const { threadId, body } = req.body;
  if (!body) return fail(res, "Message required");
  let thread = threadId ? await ChatThread.findById(threadId) : null;
  if (!thread) {
    thread = await ChatThread.create({
      userId: req.user?._id || null,
      guestKey: req.user ? null : String(req.guestKey),
      subject: "Live chat",
      status: "OPEN",
    });
  }
  await ChatMessage.create({ threadId: thread._id, sender: "CUSTOMER", body });
  // Demo auto-reply
  const autoReply = "Thanks for reaching out! A support agent will reply shortly. For urgent help call 0300-1234567.";
  await ChatMessage.create({ threadId: thread._id, sender: "ADMIN", body: autoReply });
  const messages = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 });
  return ok(res, { threadId: String(thread._id), messages: ser(messages) });
}));

r.get("/chat/:threadId", optionalUser, ah(async (req, res) => {
  const messages = await ChatMessage.find({ threadId: req.params.threadId }).sort({ createdAt: 1 });
  return ok(res, { messages: ser(messages) });
}));

// --- Search insights + saved searches ---
r.get("/search/trending", ah(async (_req, res) => {
  const agg = await SearchLog.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
    { $group: { _id: "$term", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return ok(res, { trending: agg.map((a: any) => ({ term: a._id, count: a.count })) });
}));

r.get("/search/saved", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return ok(res, { saved: [] });
  const list = await SavedSearch.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return ok(res, { saved: ser(list) });
}));

r.post("/search/saved", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  const { name, query } = req.body;
  if (!name || !query) return fail(res, "Name and query required");
  const saved = await SavedSearch.create({ userId: req.user._id, name, query });
  return ok(res, { saved: ser(saved) });
}));

r.delete("/search/saved/:id", optionalUser, ah(async (req: AuthedRequest, res) => {
  if (!req.user) return fail(res, "Login required", 401);
  await SavedSearch.deleteOne({ _id: req.params.id, userId: req.user._id });
  return ok(res, { removed: true });
}));

// --- Public FAQs & blog ---
r.get("/faqs", ah(async (_req, res) => {
  const list = await Faq.find({ isActive: true }).sort({ sortOrder: 1 });
  return ok(res, { faqs: ser(list) });
}));

r.get("/blog", ah(async (_req, res) => {
  const list = await BlogPost.find({ isPublished: true }).sort({ createdAt: -1 });
  return ok(res, { posts: ser(list) });
}));

r.get("/blog/:slug", ah(async (req, res) => {
  const post = await BlogPost.findOne({ slug: req.params.slug, isPublished: true });
  if (!post) return fail(res, "Not found", 404);
  return ok(res, { post: ser(post) });
}));

// --- Newsletter ---
r.post("/newsletter", ah(async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, "Invalid email");
  try {
    await NewsletterSubscriber.create({ email: String(email).toLowerCase() });
  } catch {
    // already subscribed
  }
  return ok(res, { subscribed: true });
}));

export default r;
