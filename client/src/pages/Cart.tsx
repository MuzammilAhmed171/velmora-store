import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { Price, QtyInput, EmptyState, ListSkeleton, PageHeader, Spinner, EASE } from "../components/ui";

export default function Cart() {
  const { toast, refreshCounts, tr } = useStore();
  const [items, setItems] = useState<any[] | null>(null);
  const [saved, setSaved] = useState<any[]>([]);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  const load = async () => {
    const [c, s] = await Promise.all([api<{ items: any[] }>("/cart"), api<{ items: any[] }>("/saved")]);
    setItems(c.items); setSaved(s.items);
  };
  useEffect(() => { load(); }, []);

  const setQty = async (id: string, qty: number) => {
    await api(`/cart/${id}`, { method: "PUT", body: { qty } });
    load(); refreshCounts();
  };
  const remove = async (id: string) => {
    await api(`/cart/${id}`, { method: "DELETE" });
    load(); refreshCounts(); setQuote(null);
  };
  const saveLater = async (productId: string) => {
    await api("/saved", { method: "POST", body: { productId } });
    toast("Saved for later", "success");
    load(); refreshCounts();
  };
  const moveToCart = async (id: string) => {
    await api(`/saved/${id}/move`, { method: "POST" });
    load(); refreshCounts();
  };
  const applyCoupon = async () => {
    if (!coupon.trim() || !items) return;
    setApplying(true);
    const subtotal = items.reduce((s, i) => s + i.line, 0);
    try {
      const d = await api<{ quote: any }>("/quote", { method: "POST", body: { couponCode: coupon, subtotal } });
      setQuote(d.quote);
      toast("Coupon applied", "success");
    } catch (e: any) { toast(e.message, "error"); }
    setApplying(false);
  };

  if (items === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <PageHeader title={tr("cart")} />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ListSkeleton rows={3} /></div>
          <div className="skeleton h-72 !rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 mt-10">
        <EmptyState kind="cart" title="Your cart is empty"
          hint="Looks like you haven't added anything yet. Explore our collection and find something you love."
          action={<Link to="/shop" className="btn-primary !px-8 !py-3">Start shopping</Link>} />
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.line, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title={`${tr("cart")}`} sub={`${items.length} item${items.length > 1 ? "s" : ""} in your bag`} />
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-3.5">
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.div key={i.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0, overflow: "hidden" }}
                transition={{ duration: 0.3, ease: EASE }}
                className="card card-hover p-3.5 flex gap-4">
                <Link to={`/product/${i.product?.slug}`} className="shrink-0">
                  <img src={i.product?.images?.[0]} alt={i.product?.name} loading="lazy"
                    className="w-24 h-24 object-cover rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:scale-105 transition-transform" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${i.product?.slug}`} className="font-bold leading-snug hover:text-brand-600 transition-colors line-clamp-2">{i.product?.name}</Link>
                  {i.variant && <p className="text-xs text-slate-500 mt-1">Option: {i.variant}</p>}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <QtyInput value={i.qty} onChange={(q) => setQty(i.id, q)} />
                    <Price pkr={i.line} />
                  </div>
                  <div className="flex gap-4 mt-2.5 text-xs font-semibold">
                    <button className="text-slate-500 hover:text-brand-600 transition-colors" onClick={() => saveLater(i.product.id)}>Save for later</button>
                    <button className="text-slate-500 hover:text-red-600 transition-colors" onClick={() => remove(i.id)}>{tr("remove")}</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {saved.length > 0 && (
            <div className="mt-8">
              <h3 className="font-extrabold mb-3.5">Saved for later</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {saved.map((s) => (
                  <motion.div key={s.id} layout className="card card-hover p-2.5">
                    <img src={s.product?.images?.[0]} alt={s.product?.name} loading="lazy" className="w-full aspect-square object-cover rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                    <p className="text-xs font-bold truncate mt-2 px-1">{s.product?.name}</p>
                    <button className="text-xs font-bold text-brand-600 dark:text-brand-300 mt-1.5 px-1 hover:underline" onClick={() => moveToCart(s.id)}>Move to cart</button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card !rounded-3xl p-6 sticky top-32">
          <h3 className="font-extrabold text-lg mb-4">Order summary</h3>
          <div className="flex gap-2 mb-4">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={tr("coupon")} className="input uppercase font-mono" />
            <button className="btn-ghost shrink-0 min-w-[76px]" onClick={applyCoupon} disabled={applying}>
              {applying ? <Spinner size={16} /> : tr("apply")}
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{tr("subtotal")}</span><Price pkr={subtotal} /></div>
            <AnimatePresence>
              {quote && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>{tr("discount")}</span><span>− <Price pkr={quote.discount} /></span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{tr("shipping")}</span><span className="font-semibold">{quote.shippingFee === 0 ? <span className="text-emerald-600">{tr("free")}</span> : <Price pkr={quote.shippingFee} />}</span></div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between font-extrabold text-lg pt-3 border-t border-slate-200 dark:border-white/[0.07]">
              <span>{tr("total")}</span><Price pkr={quote ? quote.total : subtotal} />
            </div>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-5 !py-3.5 !text-[15px]">
            {tr("checkout")}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-6-6l6 6-6 6" /></svg>
          </Link>
          <Link to="/shop" className="btn-ghost w-full mt-2.5">{tr("continue")} shopping</Link>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-slate-400 font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
            Secure checkout · 7-day returns
          </div>
        </motion.div>
      </div>
    </div>
  );
}
