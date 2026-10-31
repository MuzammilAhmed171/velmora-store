import { Router } from "express";
import { Category, Brand, Product } from "../models/catalog";
import { Banner, FlashDeal, SearchLog } from "../models/content";
import { SeoMeta } from "../models/content";
import { ah, ok, fail, ser } from "../lib/util";
import { optionalUser, AuthedRequest } from "../middleware/auth";

const r = Router();
r.use(optionalUser);

const prodOut = (p: any) => {
  const o = ser(p);
  return o;
};

// Public product listing with filters/sort/search
r.get("/products", ah(async (req: AuthedRequest, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const category = req.query.category ? String(req.query.category) : null;
  const brand = req.query.brand ? String(req.query.brand) : null;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : Infinity;
  const minRating = req.query.minRating ? Number(req.query.minRating) : 0;
  const inStock = req.query.inStock === "1";
  const onSale = req.query.onSale === "1";
  const allowPreorder = req.query.preorder === "1";
  const isDigital = req.query.digital === "1";
  const sort = String(req.query.sort || "featured");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Number(req.query.limit) || 24);

  const all = await Product.find({ isActive: true }).populate("brandId categoryId");
  let list = all.filter((p: any) => {
    if (q && !(p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
    if (category && p.categoryId?.slug !== category) return false;
    if (brand && p.brandId?.slug !== brand) return false;
    if (p.price < minPrice || p.price > maxPrice) return false;
    if (p.rating < minRating) return false;
    if (inStock && p.stock <= 0 && !p.allowPreorder) return false;
    if (onSale && !(p.compareAt && p.compareAt > p.price)) return false;
    if (allowPreorder && !p.allowPreorder) return false;
    if (isDigital && !p.isDigital) return false;
    if (String(req.query.featured || "") === "1" && !p.featured) return false;
    return true;
  });

  const by: Record<string, (a: any, b: any) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold,
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    newest: (a, b) => String(b._id).localeCompare(String(a._id)),
    popular: (a, b) => b.sold - a.sold,
    nameAsc: (a, b) => a.name.localeCompare(b.name),
    nameDesc: (a, b) => b.name.localeCompare(a.name),
    discount: (a, b) =>
      (b.compareAt && b.compareAt > b.price ? 1 - b.price / b.compareAt : 0) -
      (a.compareAt && a.compareAt > a.price ? 1 - a.price / a.compareAt : 0),
  };
  list = [...list].sort(by[sort] ?? by.featured);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Log search term for trending analytics (fire and forget)
  if (q) {
    SearchLog.create({ term: q, userId: req.user?._id }).catch(() => {});
  }

  return ok(res, { products: ser(list.slice((page - 1) * limit, page * limit)).map(prodOut), total, page, totalPages });
}));

r.get("/products/:slug", ah(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug }).populate("brandId categoryId");
  if (!p || !p.isActive) return fail(res, "Not found", 404);
  const { Review, Question, ProductVariant } = await import("../models/catalog");
  const [reviews, questions, variants, related] = await Promise.all([
    Review.find({ productId: p._id, isApproved: true }).sort({ createdAt: -1 }).limit(20),
    Question.find({ productId: p._id }).sort({ createdAt: -1 }).limit(20),
    ProductVariant.find({ productId: p._id }),
    Product.find({ isActive: true, categoryId: p.categoryId, _id: { $ne: p._id } }).populate("brandId").limit(4),
  ]);
  // Frequently bought together: products co-purchased in orders with this one
  const { Order } = await import("../models/commerce");
  const coOrders = await Order.find({ "items.productId": String(p._id), status: { $nin: ["CANCELLED"] } })
    .select("items").limit(40).lean();
  const freq: Record<string, number> = {};
  for (const o of coOrders as any[]) {
    for (const it of o.items || []) {
      const pid = String(it.productId);
      if (pid !== String(p._id)) freq[pid] = (freq[pid] || 0) + 1;
    }
  }
  const fbtIds = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  const fbt = fbtIds.length ? await Product.find({ _id: { $in: fbtIds }, isActive: true }).populate("brandId").limit(4) : [];
  return ok(res, { product: prodOut(ser(p)), reviews: ser(reviews), questions: ser(questions), variants: ser(variants), related: ser(related).map(prodOut), frequentlyBought: ser(fbt).map(prodOut) });
}));

r.get("/meta", ah(async (_req, res) => {
  const [categories, brands] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Brand.find().sort({ name: 1 }),
  ]);
  const counts = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$categoryId", count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c: any) => [String(c._id), c.count]));
  return ok(res, {
    categories: ser(categories).map((c: any) => ({ ...c, productCount: countMap.get(c.id) || 0 })),
    brands: ser(brands),
  });
}));

r.get("/home", ah(async (_req, res) => {
  const [banners, categories, deals, featured] = await Promise.all([
    Banner.find({ isActive: true }).sort({ sortOrder: 1 }).limit(5),
    Category.find(),
    FlashDeal.find({ isActive: true, endsAt: { $gt: new Date() } }).populate({ path: "productId", populate: { path: "brandId" } }).limit(8),
    Product.find({ isActive: true, featured: true }).populate("brandId").sort({ sold: -1 }).limit(8),
  ]);
  const counts = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$categoryId", count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c: any) => [String(c._id), c.count]));
  return ok(res, {
    banners: ser(banners),
    categories: ser(categories).map((c: any) => ({ ...c, productCount: countMap.get(c.id) || 0 })),
    deals: ser(deals).map((d: any) => ({ ...d, product: d.product || null })),
    featured: ser(featured).map(prodOut),
  });
}));

// ---------- Personalized recommendations ----------
// Query: ?viewed=<id1,id2> (recently viewed product ids). Returns products from the
// same categories as viewed items (excluding viewed), ranked by units sold.
// Falls back to global top sellers when no viewed ids are given.
r.get("/recommendations", ah(async (req, res) => {
  const viewedIds = String(req.query.viewed || "").split(",").filter(Boolean);
  let list: any[] = [];
  if (viewedIds.length) {
    const viewed = await Product.find({ _id: { $in: viewedIds }, isActive: true }).select("categoryId");
    const catIds = [...new Set(viewed.map((v: any) => String(v.categoryId)).filter(Boolean))];
    if (catIds.length) {
      list = await Product.find({ isActive: true, categoryId: { $in: catIds }, _id: { $nin: viewedIds } })
        .populate("brandId").sort({ sold: -1 }).limit(8);
    }
  }
  if (!list.length) {
    list = await Product.find({ isActive: true }).populate("brandId").sort({ sold: -1 }).limit(8);
  }
  return ok(res, { products: ser(list).map(prodOut) });
}));

export default r;

// Sitemap (mounted at /api/sitemap.xml)
export const sitemapRouter = (() => {
  const s = Router();
  s.get("/sitemap.xml", ah(async (req, res) => {
    const base = String(req.query.base || process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0];
    const [products, categories] = await Promise.all([
      Product.find({ isActive: true }).select("slug"),
      Category.find().select("slug"),
    ]);
    const urls = [
      `${base}/`, `${base}/shop`, `${base}/deals`, `${base}/auctions`, `${base}/blog`,
      ...categories.map((c: any) => `${base}/shop?category=${c.slug}`),
      ...products.map((p: any) => `${base}/product/${p.slug}`),
    ];
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      urls.map((u) => `<url><loc>${u}</loc></url>`).join("") +
      `</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  }));
  return s;
})();
