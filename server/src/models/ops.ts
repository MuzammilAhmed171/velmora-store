import mongoose, { Schema } from "mongoose";

const sellerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  storeName: { type: String, required: true },
  phone: String,
  address: String,
  status: { type: String, default: "PENDING", index: true }, // PENDING | APPROVED | REJECTED | SUSPENDED
  commission: { type: Number, default: 10 }, // platform commission %
  createdAt: { type: Date, default: Date.now },
});

const payoutSchema = new Schema({
  sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, default: "PENDING", index: true }, // PENDING | PAID | REJECTED
  note: String,
  createdAt: { type: Date, default: Date.now },
});

const warehouseSchema = new Schema({
  name: { type: String, required: true },
  location: String,
  isActive: { type: Boolean, default: true },
});

const stockItemSchema = new Schema({
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  qty: { type: Number, default: 0 },
});
stockItemSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

const stockTransferSchema = new Schema({  fromId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  toId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true },
  status: { type: String, default: "COMPLETED" },
  createdAt: { type: Date, default: Date.now },
});

const chatThreadSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  guestKey: { type: String, index: true },
  subject: { type: String, default: "Live chat" },
  status: { type: String, default: "OPEN", index: true },
  createdAt: { type: Date, default: Date.now },
});

const chatMessageSchema = new Schema({
  threadId: { type: Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
  sender: { type: String, required: true }, // CUSTOMER | ADMIN
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Seller = mongoose.model("Seller", sellerSchema);
export const Payout = mongoose.model("Payout", payoutSchema);
export const Warehouse = mongoose.model("Warehouse", warehouseSchema);
export const StockItem = mongoose.model("StockItem", stockItemSchema);
export const StockTransfer = mongoose.model("StockTransfer", stockTransferSchema);
export const ChatThread = mongoose.model("ChatThread", chatThreadSchema);
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

const inventoryLogSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  change: { type: Number, required: true }, // +restock / -sale / adjustment
  reason: { type: String, default: "MANUAL" }, // MANUAL | SALE | RESTOCK | TRANSFER | RETURN
  note: String,
  createdAt: { type: Date, default: Date.now },
});
export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);
