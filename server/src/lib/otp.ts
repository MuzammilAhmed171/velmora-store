import { OtpCode } from "../models/user";

// Demo OTP service. In production, wire this to your SMS/email provider
// (see .env.example: SMS_API_KEY / EMAIL_API_KEY) and stop returning the code.
export async function createOtp(target: string, purpose: "signup" | "reset"): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await OtpCode.create({
    target: target.toLowerCase(),
    code,
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return code;
}

export async function verifyOtp(target: string, code: string, purpose: string): Promise<boolean> {
  const rec = await OtpCode.findOne({
    target: target.toLowerCase(),
    code,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!rec) return false;
  rec.used = true;
  await rec.save();
  return true;
}
