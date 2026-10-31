import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/user";
import { hashPassword, verifyPassword, passwordStrength } from "../lib/password";
import { createToken, getUserFromRequest } from "../lib/auth";
import { createOtp, verifyOtp } from "../lib/otp";
import { ah, ok, fail, ser } from "../lib/util";
import { requireUser, AuthedRequest } from "../middleware/auth";

const r = Router();

r.post("/signup", ah(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return fail(res, "Name, email and password are required");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, "Invalid email address");
  if (passwordStrength(password).score < 2) return fail(res, "Password is too weak (min 8 chars, mix of cases/numbers)");
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) return fail(res, "An account with this email already exists", 409);
  const user = await User.create({
    name: name.trim(),
    email: String(email).toLowerCase(),
    phone: phone?.trim() || null,
    passwordHash: hashPassword(password),
    role: "CUSTOMER",
    referralCode: "REF-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
  });
  const token = createToken(String(user._id), false);
  return ok(res, { token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
}));

r.post("/login", ah(async (req, res) => {
  const { email, password, remember } = req.body;
  if (!email || !password) return fail(res, "Email and password are required");
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (user && user.lockUntil && user.lockUntil > new Date()) {
    return fail(res, "Account temporarily locked after too many failed attempts. Try again later.", 423);
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
    }
    return fail(res, "Invalid email or password", 401);
  }
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  const token = createToken(String(user._id), !!remember);
  return ok(res, { token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
}));

// Demo social login: creates/links an account without real OAuth (paste keys in Admin > Integrations for production)
r.post("/social", ah(async (req, res) => {
  const { provider, name, email } = req.body;
  if (!["google", "facebook"].includes(provider) || !email) return fail(res, "Invalid request");
  let user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    user = await User.create({
      name: name || `${provider} user`,
      email: String(email).toLowerCase(),
      passwordHash: hashPassword(crypto.randomBytes(16).toString("hex")),
      role: "CUSTOMER",
      referralCode: "REF-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
    });
  }
  const token = createToken(String(user._id), true);
  return ok(res, { token, user: { id: String(user._id), name: user.name, email: user.email, role: user.role }, demo: true });
}));

r.post("/logout", ah(async (_req, res) => ok(res, {})));

r.get("/me", ah(async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) return ok(res, { user: null });
  return ok(res, {
    user: {
      id: String(user._id), name: user.name, email: user.email, phone: user.phone,
      role: user.role, loyaltyPoints: user.loyaltyPoints, walletBalance: user.walletBalance,
      tier: user.tier, referralCode: user.referralCode,
    },
  });
}));

r.post("/otp", ah(async (req, res) => {
  const { target, purpose } = req.body;
  if (!target || !["signup", "reset"].includes(purpose)) return fail(res, "Invalid request");
  const code = await createOtp(String(target), purpose);
  return ok(res, { demoCode: code, message: "Demo mode: use the code shown on screen." });
}));

r.put("/otp", ah(async (req, res) => {
  const { target, code, purpose } = req.body;
  if (!target || !code || !purpose) return fail(res, "Invalid request");
  const valid = await verifyOtp(String(target), String(code), purpose);
  if (!valid) return fail(res, "Invalid or expired code", 401);
  return ok(res, { verified: true });
}));

r.post("/forgot", ah(async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, "Email is required");
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (user) {
    const code = await createOtp(user.email, "reset");
    return ok(res, { demoCode: code });
  }
  return ok(res, { demoCode: null });
}));

r.post("/reset", ah(async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) return fail(res, "All fields are required");
  if (passwordStrength(password).score < 2) return fail(res, "Password is too weak");
  const valid = await verifyOtp(String(email), String(code), "reset");
  if (!valid) return fail(res, "Invalid or expired code", 401);
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return fail(res, "Account not found", 404);
  user.passwordHash = hashPassword(password);
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  return ok(res, { reset: true });
}));

r.get("/profile", requireUser, ah(async (req: AuthedRequest, res) => {
  const u = req.user!;
  const { LoyaltyTxn, WalletTxn } = await import("../models/commerce");
  const { tierFor } = await import("../lib/constants");
  const [loyalty, wallet] = await Promise.all([
    LoyaltyTxn.find({ userId: u._id }).sort({ createdAt: -1 }).limit(30),
    WalletTxn.find({ userId: u._id }).sort({ createdAt: -1 }).limit(30),
  ]);
  return ok(res, {
    user: { ...ser(u), tier: tierFor(u.loyaltyPoints || 0) },
    loyalty: ser(loyalty),
    wallet: ser(wallet),
  });
}));

r.put("/profile", requireUser, ah(async (req: AuthedRequest, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user!._id,
    { name: name?.trim() || undefined, phone: phone?.trim() || null },
    { new: true }
  );
  return ok(res, { user: ser(user) });
}));

export default r;
