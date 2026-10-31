import crypto from "crypto";
import { Request } from "express";
import { User } from "../models/user";

function getSecret(): string {
  return process.env.TOKEN_SECRET || process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createToken(userId: string, remember: boolean): string {
  const exp = Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): { uid: number; exp: number } | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = sign(payload);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: number; exp: number };
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: Request) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  const data = verifyToken(h.slice(7).trim());
  if (!data) return null;
  return User.findById(data.uid);
}

// Guest identity comes from the X-Guest-Key header (client generates + stores a UUID).
export function getGuestKey(req: Request): string {
  const g = req.headers["x-guest-key"];
  const key = typeof g === "string" && g.length >= 8 ? g.slice(0, 64) : crypto.randomBytes(16).toString("hex");
  return `g:${key}`;
}

export function cartKeyFor(userId: number | null | undefined, guestKey: string): string {
  return userId ? `u:${userId}` : guestKey;
}
