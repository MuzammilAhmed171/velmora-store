import { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "../lib/auth";
import { fail } from "../lib/util";

export interface AuthedRequest extends Request {
  user?: NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>;
  guestKey?: string;
}

// Attaches req.user when a valid token is present; never rejects.
export async function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.user = (await getUserFromRequest(req)) ?? undefined;
  next();
}

export async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user) return fail(res, "Login required", 401);
  req.user = user;
  next();
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return fail(res, "Forbidden", 403);
  req.user = user;
  next();
}
