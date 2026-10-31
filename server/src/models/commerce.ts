import mongoose, { Schema } from "mongoose";

const cartItemSchema = new Schema({
  key: { type: String, required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variant: String,
  qty: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

const wishlistItemSchema = new Schema({
  key: { type: String, required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
});

const savedItemSchema = new Schema({
  key: { type: String, required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
});

const wishlistShareSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  kind: { type: String, required: true }, // PERCENT | FLAT | FREESHIP
  value: { type: Number, default: 0 },
  minSubtotal: { type: Number, default: 0 },
  maxUses: Number,
  usedCount: { type: Number, default: 0 },
  startsAt: Date,
  endsAt: Date,
  isActive: { type: Boolean, default: true },
});

const giftCardSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  balance: { type: Number, required: true },
  initialBalance: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    guestKey: String,
    guestName: String,
    guestEmail: String,
    guestPhone: String,
    status: { type: String, default: "PENDING", index: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: { type: String, default: "PENDING" },
    address: { type: Schema.Types.Mixed, required: true },
    items: { type: [Schema.Types.Mixed], required: true },
    couponCode: String,
    loyaltyUsed: { type: Number, default: 0 },
    walletUsed: { type: Number, default: 0 },
    giftCardUsed: { type: Number, default: 0 },
    giftCardCode: String,
    shippingMethod: { type: String, default: "Standard" },
    deliverySlot: String,
    giftWrap: { type: Boolean, default: false },
    notes: String,
    courier: String,
    trackingNo: String,
    riskScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const orderTimelineSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  status: { type: String, required: true },
  note: String,
  createdAt: { type: Date, default: Date.now },
});

const loyaltyTxnSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  points: { type: Number, required: true },
  kind: { type: String, required: true },
  note: String,
  createdAt: { type: Date, default: Date.now },
});

const walletTxnSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true },
  kind: { type: String, required: true },
  note: String,
  createdAt: { type: Date, default: Date.now },
});

const returnSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  items: { type: [Schema.Types.Mixed], default: [] },
  reason: { type: String, required: true },
  status: { type: String, default: "REQUESTED", index: true }, // REQUESTED | APPROVED | REJECTED | REFUNDED
  createdAt: { type: Date, default: Date.now },
});

const preOrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, default: 1 },
  status: { type: String, default: "PENDING" }, // PENDING | FULFILLED | CANCELLED
  expectedDate: Date,
  createdAt: { type: Date, default: Date.now },
});

const subscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, default: 1 },
  intervalDays: { type: Number, default: 30 },
  status: { type: String, default: "ACTIVE", index: true }, // ACTIVE | PAUSED | CANCELLED
  nextRunAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const digitalFileSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // path under /downloads or external URL
  downloadLimit: { type: Number, default: 5 },
});

const downloadSchema = new Schema({
  digitalFileId: { type: Schema.Types.ObjectId, ref: "DigitalFile", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  token: { type: String, required: true, unique: true, index: true },
  remaining: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const auctionSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  startPrice: { type: Number, required: true },
  currentBid: { type: Number, required: true },
  currentBidderId: { type: Schema.Types.ObjectId, ref: "User" },
  startsAt: { type: Date, default: Date.now },
  endsAt: { type: Date, required: true, index: true },
  status: { type: String, default: "LIVE", index: true }, // LIVE | ENDED
  createdAt: { type: Date, default: Date.now },
});

const bidSchema = new Schema({
  auctionId: { type: Schema.Types.ObjectId, ref: "Auction", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const CartItem = mongoose.model("CartItem", cartItemSchema);
export const WishlistItem = mongoose.model("WishlistItem", wishlistItemSchema);
export const SavedItem = mongoose.model("SavedItem", savedItemSchema);
export const WishlistShare = mongoose.model("WishlistShare", wishlistShareSchema);
export const Coupon = mongoose.model("Coupon", couponSchema);
export const GiftCard = mongoose.model("GiftCard", giftCardSchema);
export const Order = mongoose.model("Order", orderSchema);
export const OrderTimeline = mongoose.model("OrderTimeline", orderTimelineSchema);
export const LoyaltyTxn = mongoose.model("LoyaltyTxn", loyaltyTxnSchema);
export const WalletTxn = mongoose.model("WalletTxn", walletTxnSchema);
export const Return = mongoose.model("Return", returnSchema);
export const PreOrder = mongoose.model("PreOrder", preOrderSchema);
export const Subscription = mongoose.model("Subscription", subscriptionSchema);
export const DigitalFile = mongoose.model("DigitalFile", digitalFileSchema);
export const Download = mongoose.model("Download", downloadSchema);
export const Auction = mongoose.model("Auction", auctionSchema);
export const Bid = mongoose.model("Bid", bidSchema);
