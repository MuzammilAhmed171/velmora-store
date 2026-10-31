import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { RatingStars, Modal, Spinner, Price, EASE } from "./ui";
import { money } from "../lib/format";

export interface Product {
  id: string; name: string; slug: string; price: number; compareAt?: number | null;
  images: string[]; rating: number; reviewCount: number; stock: number; sold: number;
  brand?: { name: string }; category?: { name: string }; featured?: boolean;
  allowPreorder?: boolean; isDigital?: boolean; description?: string; createdAt?: string;
}

const boltSm = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" /></svg>
);

export function ProductCard({ p, onQuickView, onCompare, compared, flashDeal }: {
  p: Product; onQuickView?: (p: Product) => void;
  onCompare?: (p: Product) => void; compared?: boolean; flashDeal?: boolean;
}) {
  const { toast, refreshCounts, currency } = useStore();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const [wishedIds] = useState<Set<string>>(new Set());
  const img = p.images?.[0] || "/images/products/cat-electronics.jpg";
  const img2 = p.images?.[1];
  const discount = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  const inStock = p.stock > 0 || !!p.allowPreorder;

  const add = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (adding) return;
    setAdding(true);
    try {
      await api("/cart", { method: "POST", body: { productId: p.id, qty: 1 } });
      toast("Added to cart", "success");
      setAdded(true);
      setTimeout(() => setAdded(false), 1400);
      refreshCounts();
    } catch (err: any) { toast(err.message, "error"); }
    setAdding(false);
  };

  const toggleWish = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await api("/wishlist", { method: "POST", body: { productId: p.id } });
      const nowWished = !wishedIds.has(p.id);
      if (nowWished) wishedIds.add(p.id); else wishedIds.delete(p.id);
      setWished(nowWished);
      toast(nowWished ? "Saved to wishlist" : "Removed from wishlist", "success");
      refreshCounts();
    } catch (err: any) { toast(err.message, "error"); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: EASE }}
      whileHover={{ y: -5 }}
      className="card overflow-hidden group relative flex flex-col"
    >
      <Link to={`/product/${p.slug}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/[0.04] dark:to-white/[0.02] overflow-hidden">
          <img src={img} alt={p.name} loading="lazy"
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.07] ${img2 ? "group-hover:opacity-0" : ""}`} />
          {img2 && (
            <img src={img2} alt="" loading="lazy" aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-0 scale-[1.07] group-hover:opacity-100 group-hover:scale-100 transition-all duration-500" />
          )}
          {/* top-left */}
          {p.featured && (
            <span className="absolute top-2.5 left-2.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-bold">Trending</span>
          )}
          {/* top-right */}
          {discount > 0 && (
            <span className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-full bg-ember-600 text-white text-[11px] font-extrabold shadow">-{discount}%</span>
          )}
          {/* bottom-left */}
          <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 items-center">
            <span className="px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-semibold truncate max-w-[140px]">
              {p.brand?.name || ""}{p.brand?.name && p.category?.name ? " · " : ""}{p.category?.name || ""}
            </span>
            {flashDeal && (
              <span className="px-2.5 py-1.5 rounded-full bg-ember-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow">
                {boltSm} FLASH DEAL
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 truncate">{p.brand?.name || p.category?.name}</p>
          <span className={`text-[11px] font-bold shrink-0 ${inStock ? "text-green-600 dark:text-green-500" : "text-red-500"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
        <Link to={`/product/${p.slug}`}>
          <h3 className="text-[15px] font-bold line-clamp-2 min-h-[2.7rem] leading-snug mt-1 text-slate-900 dark:text-white group-hover:text-ember-600 dark:group-hover:text-ember-400 transition-colors">{p.name}</h3>
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <RatingStars value={p.rating} size={14} />
          <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">{p.rating?.toFixed(1)}</span>
          <span className="text-[12px] text-slate-400">({p.reviewCount}) · {p.sold > 0 ? `${p.sold.toLocaleString()} sold` : "sold"}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-[19px] font-extrabold tracking-tight text-ember-600 dark:text-ember-500">{money(p.price, currency)}</span>
          {p.compareAt && p.compareAt > p.price && (
            <span className="text-[13px] text-slate-400 line-through">{money(p.compareAt, currency)}</span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={add}
            disabled={adding || !inStock}
            className={`flex-1 rounded-xl py-2 px-2 text-[13px] font-bold flex items-center justify-center transition-all duration-300 overflow-hidden
              bg-[#101010] dark:bg-black/50 text-white hover:bg-ember-600 disabled:opacity-50 border border-white/[0.06]`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {adding ? (
                <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Spinner light size={16} /></motion.span>
              ) : added ? (
                <motion.span key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-emerald-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                  Added
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="leading-tight text-center">
                  Add to<br />Cart
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={toggleWish} title="Wishlist"
            className={`w-11 rounded-xl border border-[#e5ddcc] dark:border-white/10 bg-white dark:bg-white/[0.04] flex items-center justify-center transition-all ${wished ? "text-red-500" : "text-slate-500 dark:text-slate-300 hover:text-red-500 hover:border-red-400"}`}>
            <motion.svg width="17" height="17" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"
              animate={wished ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </motion.svg>
          </motion.button>
          {onCompare && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompare(p); }} title="Compare"
              className={`w-11 rounded-xl border text-[12px] font-extrabold flex items-center justify-center transition-all ${compared ? "bg-ember-600 border-ember-600 text-white" : "border-[#e5ddcc] dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-300 hover:border-ember-600/60"}`}>
              VS
            </motion.button>
          )}
          {onQuickView && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(p); }} title="Quick view"
              className="w-11 rounded-xl border border-[#e5ddcc] dark:border-white/10 bg-white dark:bg-white/[0.04] flex items-center justify-center text-slate-500 dark:text-slate-300 hover:border-ember-600/60 hover:text-ember-600 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function QuickView({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { toast, refreshCounts, tr } = useStore();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  if (!p) return null;
  const img = p.images?.[0] || "/images/products/cat-electronics.jpg";
  const add = async () => {
    setAdding(true);
    try {
      await api("/cart", { method: "POST", body: { productId: p.id, qty } });
      toast("Added to cart", "success");
      refreshCounts();
      onClose();
    } catch (err: any) { toast(err.message, "error"); }
    setAdding(false);
  };
  return (
    <Modal open={!!p} onClose={onClose} wide>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
          <img src={img} alt={p.name} className="w-full aspect-square object-cover" />
        </div>
        <div className="py-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{p.brand?.name || p.category?.name}</p>
          <h2 className="text-xl font-extrabold tracking-tight mt-1">{p.name}</h2>
          <div className="flex items-center gap-2 mt-2"><RatingStars value={p.rating} size={15} /><span className="text-sm text-slate-500">({p.reviewCount} reviews)</span></div>
          <div className="mt-3"><Price pkr={p.price} compareAt={p.compareAt} big /></div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-4 leading-relaxed">{p.description}</p>
          <div className="flex items-center gap-3 mt-6">
            <input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="input !w-20 text-center font-bold" />
            <button className="btn-primary flex-1" onClick={add} disabled={adding}>
              {adding ? <Spinner light size={18} /> : tr("addToCart")}
            </button>
          </div>
          <Link to={`/product/${p.slug}`} className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline mt-4 inline-block">View full details →</Link>
        </div>
      </div>
    </Modal>
  );
}
