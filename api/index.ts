// Vercel serverless entry: runs the Express app for all /api/* requests.
// The DB-connect middleware in server/src/index.ts keeps MongoDB alive
// across warm invocations.
import app, { connectDB } from "../server/src/index";

export default async function handler(req: any, res: any) {
  try {
    await connectDB();
  } catch (e: any) {
    res.status(500).json({ ok: false, error: "Database unavailable" });
    return;
  }
  return (app as any)(req, res);
}
