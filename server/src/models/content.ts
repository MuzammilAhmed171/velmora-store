import mongoose, { Schema } from "mongoose";

const bannerSchema = new Schema({
  title: { type: String, required: true },
  subtitle: String,
  image: String,
  link: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const faqSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const blogPostSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: String,
  body: { type: String, required: true },
  image: String,
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ticketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, default: "OPEN", index: true },
  priority: { type: String, default: "NORMAL" },
  createdAt: { type: Date, default: Date.now },
});

const ticketMessageSchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
  sender: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const flashDealSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  dealPrice: { type: Number, required: true },
  startsAt: { type: Date, default: Date.now },
  endsAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
});

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

const campaignSchema = new Schema({
  name: { type: String, required: true },
  segment: { type: String, default: "ALL" }, // ALL | HIGH_VALUE | INACTIVE | NEW
  couponCode: String,
  message: { type: String, required: true },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const searchLogSchema = new Schema({
  term: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});
searchLogSchema.index({ createdAt: -1 });

const savedSearchSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  query: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

const subscriberSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const seoMetaSchema = new Schema({
  path: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
});

const integrationSchema = new Schema({
  provider: { type: String, required: true, unique: true }, // stripe | paypal | sms | email | tcs | leopards | google | facebook
  apiKey: String,
  apiSecret: String,
  isActive: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

export const Banner = mongoose.model("Banner", bannerSchema);
export const Faq = mongoose.model("Faq", faqSchema);
export const BlogPost = mongoose.model("BlogPost", blogPostSchema);
export const Ticket = mongoose.model("Ticket", ticketSchema);
export const TicketMessage = mongoose.model("TicketMessage", ticketMessageSchema);
export const FlashDeal = mongoose.model("FlashDeal", flashDealSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const Setting = mongoose.model("Setting", settingSchema);
export const Campaign = mongoose.model("Campaign", campaignSchema);
export const SearchLog = mongoose.model("SearchLog", searchLogSchema);
export const SavedSearch = mongoose.model("SavedSearch", savedSearchSchema);
export const NewsletterSubscriber = mongoose.model("NewsletterSubscriber", subscriberSchema);
export const SeoMeta = mongoose.model("SeoMeta", seoMetaSchema);
export const Integration = mongoose.model("Integration", integrationSchema);
