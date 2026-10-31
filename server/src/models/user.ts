import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: String,
    passwordHash: { type: String, required: true },
    role: { type: String, default: "CUSTOMER" }, // CUSTOMER | ADMIN | SELLER
    loyaltyPoints: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    tier: { type: String, default: "Bronze" },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    referralCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

const otpSchema = new Schema({
  target: { type: String, required: true, lowercase: true, index: true },
  code: { type: String, required: true },
  purpose: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const addressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  guestKey: { type: String, index: true },
  label: { type: String, default: "Home" },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  postal: String,
  isDefault: { type: Boolean, default: false },
});

const referralSchema = new Schema({
  referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  referredUserId: { type: Schema.Types.ObjectId, ref: "User" },
  referredEmail: String,
  code: { type: String, required: true },
  pointsAwarded: { type: Number, default: 0 },
  status: { type: String, default: "PENDING" }, // PENDING | COMPLETED
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", userSchema);
export const OtpCode = mongoose.model("OtpCode", otpSchema);
export const Address = mongoose.model("Address", addressSchema);
export const Referral = mongoose.model("Referral", referralSchema);
