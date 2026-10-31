import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { ProductCard, QuickView, Product } from "../components/ProductCard";
import { EmptyState, Pagination, ShopSkeleton, EASE } from "../components/ui";

const SORTS = [
  ["popular", "Most Popular"], ["featured", "Featured"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"],
  ["rating", "Top Rated"], ["newest", "Newest"], ["nameAsc", "Name: A to Z"], ["nameDesc", "Name: Z to A"], ["discount", "Biggest Discount"],
];

const RATINGS = [["", "All"], ["4", "4+"], ["4.5", "4.5+"], ["4.7", "4.7+"], ["4.8", "4.8+"]];

export default function Shop() {
  const { tr } = useStore();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<{ categories: any[]; brands: any[] }>({ categories: [], brands: [] });
  const [quick, setQuick] = useState<Product | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [compare, setCompare] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [dealIds, setDealIds] = useState<Set<string>>(new Set());

  const f = {
    q: params.get("q") || "", category: params.get("category") || "", brand: params.get("brand") || "",
    minPrice: params.get("minPrice") || "", maxPrice: params.get("maxPrice") || "",
    minRating: params.get("minRating") || "", inStock: params.get("inStock") || "",
    onSale: params.get("onSale") || "", featured: params.get("featured") || "",
    sort: params.get("sort") || "popular", page: params.get("page") || "1",
  };

  useEffect(() => {
    api("/meta").then(setMeta).catch(() => {});
    api<{ deals: any[] }>("/home").then((d) => setDealIds(new Set((d.deals || []).map((x: any) => x.product?.id).filter(Boolean)))).catch(() => {});
  }, []);

  useEffect(() => {
    setProducts(null);
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
    qs.set("limit", "12");
    api<{ products: Product[]; total: number; totalPages: number }>(`/products?${qs}`)
      .then((d) => { setProducts(d.products); setTotal(d.total); setTotalPages(d.totalPages); })
      .catch(() => setProducts([]));
  }, [params]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    setParams(next);
  };

  const toggleCompare = (p: Product) => {
    setCompare((c) => c.some((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : c.length >= 3 ? c : [...c, p]);
  };

  const catName = meta.categories.find((c) => c.slug === f.category)?.name;
  const title = f.q ? `Results for "${f.q}"` : catName || "All Products";

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2.5">Sort by</h4>
        <div className="relative">
          <select value={f.sort} onChange={(e) => set("sort", e.target.value)}
            className="input !rounded-xl appearance-none !py-2.5 font-medium cursor-pointer">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2.5">Brand</h4>
        <div className="relative">
          <select value={f.brand} onChange={(e) => set("brand", e.target.value)}
            className="input !rounded-xl appearance-none !py-2.5 font-medium cursor-pointer">
            <option value="">All</option>
            {meta.brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2.5">Price range</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="0" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} className="input !rounded-xl !py-2.5 font-semibold" />
          <span className="text-slate-400 font-bold">–</span>
          <input type="number" placeholder="200000" value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value)} className="input !rounded-xl !py-2.5 font-semibold" />
        </div>
        <input type="range" min={0} max={200000} step={500} value={Number(f.maxPrice) || 200000}
          onChange={(e) => set("maxPrice", e.target.value === "200000" ? "" : e.target.value)}
          className="w-full mt-3 accent-ember-600 cursor-pointer" aria-label="Max price" />
      </div>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2.5">Minimum rating</h4>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map(([v, l]) => {
            const active = f.minRating === v;
            return (
              <button key={l} onClick={() => set("minRating", v)}
                className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-all ${active
                  ? "border-char dark:border-white text-char dark:text-white bg-transparent"
                  : "border-[#e5ddcc] dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-ember-600/50"}`}>
                {l}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-3 text-[14px]">
        <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
          <input type="checkbox" checked={f.inStock === "1"} onChange={(e) => set("inStock", e.target.checked ? "1" : "")} className="w-[18px] h-[18px] rounded accent-ember-600 cursor-pointer" /> In stock only
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
          <input type="checkbox" checked={f.onSale === "1"} onChange={(e) => set("onSale", e.target.checked ? "1" : "")} className="w-[18px] h-[18px] rounded accent-ember-600 cursor-pointer" /> On sale only
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
          <input type="checkbox" checked={f.featured === "1"} onChange={(e) => set("featured", e.target.checked ? "1" : "")} className="w-[18px] h-[18px] rounded accent-ember-600 cursor-pointer" /> Featured only
        </label>
      </div>
      <button className="btn-ghost btn-sm w-full" onClick={() => setParams({})}>Clear all filters</button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <div className="flex gap-6 items-start">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="card !rounded-3xl p-5 sticky top-36">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[19px] font-extrabold tracking-tight">Filters</h3>
              <span className="text-[13px] text-slate-400 font-medium">{total} results</span>
            </div>
            {filterPanel}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
              <p className="text-slate-400 text-[15px] mt-1.5">
                {products ? `Showing ${products.length} of ${total} products` : "Loading products..."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost btn-sm lg:hidden" onClick={() => setShowFilters(!showFilters)}>{tr("filters")}</button>
              <div className="flex items-center gap-1 p-1 rounded-full bg-white dark:bg-white/[0.05] border border-[#e5ddcc] dark:border-white/10">
                <button onClick={() => setView("grid")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${view === "grid" ? "bg-[#1c1c1c] dark:bg-white/10 text-white shadow" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                  Grid
                </button>
                <button onClick={() => setView("list")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${view === "list" ? "bg-[#1c1c1c] dark:bg-white/10 text-white shadow" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
                  List
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden lg:hidden">
                <div className="card !rounded-3xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[19px] font-extrabold">Filters</h3>
                    <span className="text-[13px] text-slate-400">{total} results</span>
                  </div>
                  {filterPanel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {products === null ? (
            <ShopSkeleton count={8} />
          ) : products.length === 0 ? (
            <EmptyState kind="search" title="No products found" hint="Try different search terms or clear your filters."
              action={<button className="btn-primary" onClick={() => setParams({})}>Clear filters</button>} />
          ) : view === "grid" ? (
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} onQuickView={setQuick}
                    onCompare={toggleCompare} compared={compare.some((x) => x.id === p.id)}
                    flashDeal={dealIds.has(p.id)} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {products.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
                  className="card card-hover p-3.5 flex gap-4">
                  <img src={p.images?.[0]} alt={p.name} loading="lazy" className="w-28 h-28 object-cover rounded-xl bg-cream-deep dark:bg-white/[0.04] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold leading-snug">{p.name}</h3>
                    <div className="text-[13px] text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                    <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                      <span className="text-[17px] font-extrabold text-ember-600 dark:text-ember-500">{p.price.toLocaleString("en-PK")}</span>
                      <div className="flex gap-2">
                        <button className="btn-ghost btn-sm" onClick={() => setQuick(p)}>Quick view</button>
                        <button className="btn-ghost btn-sm" onClick={() => toggleCompare(p)}>Compare</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <Pagination page={Number(f.page)} totalPages={totalPages} onChange={(p) => set("page", String(p))} />
        </div>
      </div>

      {/* Compare tray */}
      <AnimatePresence>
        {compare.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 card !rounded-full py-2.5 pl-5 pr-2.5 flex items-center gap-2.5 z-40 shadow-lift max-w-[calc(100vw-2rem)] overflow-x-auto">
            <span className="text-sm font-bold whitespace-nowrap">{compare.length} selected</span>
            {compare.map((p) => (
              <button key={p.id} onClick={() => toggleCompare(p)} className="text-xs font-semibold bg-cream-deep dark:bg-white/10 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-red-100 dark:hover:bg-red-900/30">{p.name.slice(0, 15)}… ✕</button>
            ))}
            <button className="btn-primary btn-sm whitespace-nowrap" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>Compare now</button>
            <button className="text-[13px] text-slate-500 hover:text-red-600 whitespace-nowrap px-1" onClick={() => setCompare([])}>Clear</button>
          </motion.div>
        )}
      </AnimatePresence>

      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowCompare(false)} />
          <motion.div initial={{ scale: 0.94, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative card !rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-lift">
            <h3 className="text-lg font-extrabold mb-4">Product comparison</h3>
            <table className="table">
              <thead><tr><th></th>{compare.map((p) => <th key={p.id}>{p.name.slice(0, 30)}</th>)}</tr></thead>
              <tbody>
                <tr><td className="font-bold">Image</td>{compare.map((p) => <td key={p.id}><img src={p.images?.[0]} alt="" className="w-20 h-20 object-cover rounded-xl" /></td>)}</tr>
                <tr><td className="font-bold">Price</td>{compare.map((p) => <td key={p.id} className="font-extrabold text-ember-600">{p.price.toLocaleString("en-PK")}</td>)}</tr>
                <tr><td className="font-bold">Rating</td>{compare.map((p) => <td key={p.id}>{p.rating} ({p.reviewCount})</td>)}</tr>
                <tr><td className="font-bold">Stock</td>{compare.map((p) => <td key={p.id}>{p.stock > 0 ? `${p.stock} available` : "Out of stock"}</td>)}</tr>
                <tr><td className="font-bold">Brand</td>{compare.map((p) => <td key={p.id}>{p.brand?.name || "-"}</td>)}</tr>
              </tbody>
            </table>
            <button className="btn-ghost mt-5" onClick={() => setShowCompare(false)}>Close</button>
          </motion.div>
        </div>
      )}

      <QuickView p={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
