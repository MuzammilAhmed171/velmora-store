import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import authRoutes from "./routes/auth";
import catalogRoutes, { sitemapRouter } from "./routes/catalog";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import socialRoutes from "./routes/social";
import extrasRoutes from "./routes/extras";
import sellerRoutes from "./routes/sellers";
import opsRoutes from "./routes/ops";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/velmora";

// ---- Serverless-safe MongoDB connection (cached across warm invocations) ----
let connectPromise: Promise<typeof mongoose> | null = null;
export function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!connectPromise) {
    connectPromise = mongoose
      .connect(MONGODB_URI)
      .then((m) => {
        console.log("MongoDB connected");
        return m;
      })
      .catch((e) => {
        connectPromise = null;
        throw e;
      });
  }
  return connectPromise;
}

// Ensure a live DB connection on every request (no-op when already connected).
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e: any) {
    next(e);
  }
});

app.use(cors({ origin: (process.env.FRONTEND_URL || "http://localhost:5173").split(","), credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "velmora-api" }));

app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes); // products, meta, home
app.use("/api", sitemapRouter); // sitemap.xml
app.use("/api", cartRoutes); // cart, wishlist, saved
app.use("/api/orders", orderRoutes);
app.use("/api", socialRoutes); // reviews, tickets, alerts, chat, search, newsletter
app.use("/api", extrasRoutes); // auctions, digital, subscriptions, referrals, gift cards
app.use("/api/sellers", sellerRoutes);
app.use("/api/warehouses", opsRoutes);
app.use("/api/admin", adminRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Server error" });
});

export default app;

// Long-running server mode (local dev / Render / VPS). On Vercel the
// serverless function in /api imports `app` directly and never calls listen().
if (!process.env.VERCEL) {
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Velmora API on http://localhost:${PORT}`)))
    .catch((e) => {
      console.error("MongoDB connection failed:", e.message);
      process.exit(1);
    });
}
