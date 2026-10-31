import { Request, Response, NextFunction, RequestHandler } from "express";
import { Coupon } from "../models/commerce";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export function orderNumber(): string {
  return "ORD-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
}

// Serialize a Mongoose doc (or array) to a plain JSON-safe object with string `id`
// and populated refs aliased (brandId -> brand, categoryId -> category, productId -> product).
export function ser(doc: any): any {
  if (doc == null) return doc;
  if (doc instanceof Date) return doc;
  if (typeof doc.toObject === "function") return ser(doc.toObject());
  if (typeof doc === "object" && (doc as any)._bsontype) return String(doc);
  if (Array.isArray(doc)) return doc.map(ser);
  if (typeof doc === "object") {
    const o: any = {};
    for (const [k, v] of Object.entries(doc)) o[k] = ser(v);
    if ((doc as any)._id && !o.id) o.id = String((doc as any)._id);
    if (o.brandId && typeof o.brandId === "object") o.brand = o.brandId;
    if (o.categoryId && typeof o.categoryId === "object") o.category = o.categoryId;
    if (o.productId && typeof o.productId === "object" && o.productId.name) o.product = o.productId;
    return o;
  }
  return doc;
}

export type CouponCalc = { code: string; discount: number; freeShip: boolean };

export async function calcCoupon(code: string, subtotal: number): Promise<CouponCalc | null> {
  const c = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!c || !c.isActive) return null;
  const now = new Date();
  if (c.startsAt && c.startsAt > now) return null;
  if (c.endsAt && c.endsAt < now) return null;
  if (c.maxUses && c.usedCount >= c.maxUses) return null;
  if (subtotal < c.minSubtotal) return null;
  let discount = 0;
  let freeShip = false;
  if (c.kind === "PERCENT") discount = Math.min(subtotal, Math.round((subtotal * c.value) / 100));
  else if (c.kind === "FLAT") discount = Math.min(subtotal, c.value);
  else if (c.kind === "FREESHIP") freeShip = true;
  return { code: c.code, discount, freeShip };
}

// Wrap async route handlers so rejections reach Express error handling
export const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export const ok = (res: Response, data: Record<string, unknown> = {}) => res.json({ ok: true, ...data });
export const fail = (res: Response, message: string, status = 400) => res.status(status).json({ ok: false, error: message });
