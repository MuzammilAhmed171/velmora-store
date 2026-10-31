import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  image: String,
  description: String,
});

const brandSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    compareAt: Number,
    cost: Number,
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, default: 0 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller" },
    images: { type: [String], default: [] },
    videoUrl: String, // product video (URL or uploaded path)
    spinImages: { type: [String], default: [] }, // 360-degree image set
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDigital: { type: Boolean, default: false },
    allowPreorder: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    weight: Number,
  },
  { timestamps: true }
);
productSchema.index({ name: "text", description: "text" });

const variantSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  name: { type: String, required: true },
  options: { type: [String], default: [] },
  priceDelta: { type: Number, default: 0 },
});

const reviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, required: true },
  rating: { type: Number, required: true },
  title: String,
  body: { type: String, required: true },
  images: { type: [String], default: [] }, // photo/video review uploads (URLs)
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const questionSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, required: true },
  question: { type: String, required: true },
  answer: String,
  createdAt: { type: Date, default: Date.now },
});

const alertSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  guestKey: { type: String, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  type: { type: String, required: true }, // PRICE | STOCK
  targetPrice: Number,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const Category = mongoose.model("Category", categorySchema);
export const Brand = mongoose.model("Brand", brandSchema);
export const Product = mongoose.model("Product", productSchema);
export const ProductVariant = mongoose.model("ProductVariant", variantSchema);
export const Review = mongoose.model("Review", reviewSchema);
export const Question = mongoose.model("Question", questionSchema);
export const Alert = mongoose.model("Alert", alertSchema);
