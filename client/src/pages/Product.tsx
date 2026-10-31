import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { money, emiOptions } from "../lib/format";
import { RatingStars, Price, QtyInput, Field, EmptyState, AnimatedTabs, DetailSkeleton, Spinner, EASE } from "../components/ui";
import { ProductCard, Product } from "../components/ProductCard";

export default function ProductPage() {
  const { slug } = useParams();
  const { toast, refreshCounts, currency, tr, user } = useStore();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string>("");
  const [tab, setTab] = useState("desc");
  const [revForm, setRevForm] = useState({ rating: 5, title: "", body: "" });
  const [qForm, setQForm] = useState("");
  const [alertType, setAlertType] = useState<"PRICE" | "STOCK" | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    api(`/products/${slug}`).then((d: any) => {
      setData(d); setImg(0);
      try {
        const key = "velmora_recent";
        const list = JSON.parse(localStorage.getItem(key) || "[]");
        const next = [{ id: d.product.id, slug: d.product.slug, name: d.product.name, price: d.product.price, compareAt: d.product.compareAt, images: d.product.images, rating: d.product.rating, reviewCount: d.product.reviewCount, stock: d.product.stock, sold: d.product.sold }, ...list.filter((x: any) => x.id !== d.product.id)].slice(0, 8);
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* ignore */ }
    }).catch(() => {});
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!data) return <DetailSkeleton />;
  const p: Product & any = data.product;
  const images: string[] = p.images?.length ? p.images : ["/images/products/cat-electronics.jpg"];
  const discount = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  const addToCart = async (goCheckout = false) => {
    setBusy(true);
    try {
      await api("/cart", { method: "POST", body: { productId: p.id, variant: variant || undefined, qty } });
      toast("Added to cart", "success");
      await refreshCounts();
      if (goCheckout) nav("/checkout");
    } catch (e: any) { toast(e.message, "error"); }
    setBusy(false);
  };

  const wishlist = async () => {
    try { await api("/wishlist", { method: "POST", body: { productId: p.id } }); toast("Saved to wishlist", "success"); refreshCounts(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const submitReview = async () => {
    if (!revForm.body.trim()) return toast("Please write your review", "error");
    try {
      await api("/reviews", { method: "POST", body: { productId: p.id, ...revForm } });
      toast("Review submitted", "success");
      setRevForm({ rating: 5, title: "", body: "" });
      api(`/products/${slug}`).then(setData).catch(() => {});
    } catch (e: any) { toast(e.message, "error"); }
  };

  const submitQuestion = async () => {
    if (!qForm.trim()) return;
    try {
      await api("/questions", { method: "POST", body: { productId: p.id, question: qForm } });
      toast("Question posted", "success");
      setQForm("");
      api(`/products/${slug}`).then(setData).catch(() => {});
    } catch (e: any) { toast(e.message, "error"); }
  };

  const setAlert = async () => {
    try {
      await api("/alerts", { method: "POST", body: { productId: p.id, type: alertType, targetPrice: Number(targetPrice) || undefined } });
      toast("Alert set — we'll notify you", "success");
      setAlertType(null);
    } catch (e: any) { toast(e.message, "error"); }
  };

  const createPreorder = async () => {
    if (!user) { nav("/login"); return; }
    try {
      await api("/orders/preorders", { method: "POST", body: { productId: p.id, qty } });
      toast("Pre-order placed", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const subscribe = async () => {
    if (!user) { nav("/login"); return; }
    try {
      await api("/subscriptions", { method: "POST", body: { productId: p.id, qty, intervalDays: 30 } });
      toast("Subscribed — monthly delivery", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const soldOut = p.stock <= 0 && !p.allowPreorder && !p.isDigital;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="max-w-7xl mx-auto px-4 mt-6">
      <nav className="text-[13px] text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-brand-600 font-medium">Home</Link>
        <span className="opacity-40">/</span>
        <Link to="/shop" className="hover:text-brand-600 font-medium">Shop</Link>
        <span className="opacity-40">/</span>
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[40vw]">{p.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <motion.div layout ref={zoomRef} className="relative card !rounded-3xl overflow-hidden aspect-square cursor-zoom-in bg-slate-100 dark:bg-white/[0.03]"
            onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
            onMouseMove={(e) => {
              const r = zoomRef.current!.getBoundingClientRect();
              setZoomPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.img key={img} src={images[img]} alt={p.name}
                initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }} className="w-full h-full object-cover" />
            </AnimatePresence>
            {zoom && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
                <img src={images[img]} alt="" className="absolute w-[200%] h-[200%] max-w-none object-cover"
                  style={{ left: `${-zoomPos.x}%`, top: `${-zoomPos.y}%` }} />
              </div>
            )}
            {discount > 0 && <span className="badge bg-gradient-to-r from-red-600 to-red-500 text-white absolute top-4 left-4 shadow-pop">-{discount}%</span>}
          </motion.div>
          <div className="flex gap-2.5 mt-3">
            {images.map((src, i) => (
              <motion.button key={i} whileTap={{ scale: 0.92 }} onClick={() => setImg(i)}
                className={`w-[72px] h-[72px] rounded-2xl overflow-hidden border-[3px] transition-all ${i === img ? "border-brand-600 shadow-glow" : "border-transparent opacity-70 hover:opacity-100"}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {p.videoUrl && <a href={p.videoUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">Watch video</a>}
            {p.spinImages?.length > 0 && <span className="btn-ghost btn-sm cursor-default">360° view available</span>}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{p.brand?.name} · SKU {p.sku}</p>
          <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight mt-1.5 leading-tight">{p.name}</h1>
          <div className="flex items-center gap-2.5 mt-2.5">
            <RatingStars value={p.rating} size={16} />
            <span className="text-sm text-slate-500 font-medium">{p.rating} · {p.reviewCount} reviews · {p.sold} sold</span>
          </div>
          <div className="mt-3.5"><Price pkr={p.price} compareAt={p.compareAt} big /></div>
          <motion.p key={p.stock} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`text-sm mt-2.5 font-bold inline-flex items-center gap-1.5 ${p.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>
            <span className={`w-2 h-2 rounded-full ${p.stock > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            {p.stock > 0 ? `${tr("inStock")} (${p.stock} available)` : p.allowPreorder ? "Available for pre-order" : tr("outOfStock")}
          </motion.p>

          {data.variants?.map((v: any) => (
            <div key={v.id} className="mt-5">
              <p className="label">{v.name}</p>
              <div className="flex gap-2 flex-wrap">
                {v.options.map((o: string) => (
                  <motion.button key={o} whileTap={{ scale: 0.94 }} onClick={() => setVariant(o)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${variant === o ? "border-brand-600 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-200 shadow-glow" : "border-slate-300/80 dark:border-white/10 hover:border-brand-400"}`}>
                    {o}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 mt-7 flex-wrap">
            <QtyInput value={qty} onChange={setQty} />
            <motion.button whileTap={{ scale: 0.97 }} className="btn-primary flex-1 min-w-[140px] !py-3" onClick={() => addToCart(false)} disabled={soldOut || busy}>
              {busy ? <Spinner light size={18} /> : tr("addToCart")}
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} className="btn-accent flex-1 min-w-[140px] !py-3" onClick={() => addToCart(true)} disabled={soldOut || busy}>
              {tr("buyNow")}
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} className="btn-ghost !p-3 !rounded-xl" onClick={wishlist} title="Add to wishlist" aria-label="Add to wishlist">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>
            </motion.button>
          </div>

          {p.allowPreorder && p.stock <= 0 && (
            <button className="btn-ghost w-full mt-3" onClick={createPreorder}>Pre-order now (ships in ~3 weeks)</button>
          )}
          {!p.isDigital && (
            <button className="btn-ghost w-full mt-3" onClick={subscribe}>Subscribe & Save — monthly delivery</button>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <div className="card p-4">
              <p className="font-bold text-sm mb-1.5 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600"><path d="M1 8h14v9H1zM15 11h4l4 4v2h-8z" /></svg>
                Delivery estimate
              </p>
              <p className="text-[13px] text-slate-500 leading-relaxed">Standard: 3–5 working days · Express: 1–2 days<br />Free delivery over Rs 5,000</p>
            </div>
            <div className="card p-4">
              <p className="font-bold text-sm mb-2">EMI calculator <span className="badge bg-slate-100 dark:bg-white/10 text-slate-500 ml-1">demo</span></p>
              <div className="grid grid-cols-3 gap-2">
                {emiOptions(p.price).map((e) => (
                  <div key={e.months} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-2 text-center">
                    <p className="font-extrabold text-[13px]">{money(e.perMonth, currency)}</p>
                    <p className="text-[10px] text-slate-500">× {e.months} mo</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn-ghost btn-sm flex-1" onClick={() => setAlertType(alertType === "PRICE" ? null : "PRICE")}>Price alert</button>
            <button className="btn-ghost btn-sm flex-1" onClick={() => setAlertType(alertType === "STOCK" ? null : "STOCK")}>Stock alert</button>
          </div>
          <AnimatePresence>
            {alertType && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE }} className="overflow-hidden">
                <div className="card p-3.5 mt-2.5 flex gap-2 items-center">
                  {alertType === "PRICE" && (
                    <input type="number" placeholder="Target price" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="input" />
                  )}
                  <button className="btn-primary btn-sm" onClick={setAlert}>Set alert</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <AnimatedTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "desc", label: tr("description") },
            { key: "reviews", label: `${tr("reviews")} (${data.reviews.length})` },
            { key: "qa", label: `${tr("questions")} (${data.questions.length})` },
          ]}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            {tab === "desc" && <div className="py-7 text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-w-3xl">{p.description}</div>}

            {tab === "reviews" && (
              <div className="py-7 grid md:grid-cols-2 gap-8">
                <div className="space-y-3.5">
                  {data.reviews.length === 0 && <EmptyState title="No reviews yet" hint="Be the first to review this product." />}
                  {data.reviews.map((r: any) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <RatingStars value={r.rating} />
                          <span className="font-bold text-sm">{r.authorName}</span>
                          {r.verified && <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Verified</span>}
                        </div>
                        <button className="text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors" onClick={() => api(`/reviews/${r.id}/helpful`, { method: "POST" }).then(() => toast("Thanks for your feedback", "success")).catch(() => {})}>
                          Helpful ({r.helpful})
                        </button>
                      </div>
                      {r.title && <p className="font-bold text-sm mt-2">{r.title}</p>}
                      <p className="text-sm mt-1 text-slate-600 dark:text-slate-300">{r.body}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="card p-5 h-fit">
                  <h3 className="font-extrabold mb-4">{tr("writeReview")}</h3>
                  <Field label="Rating">
                    <select value={revForm.rating} onChange={(e) => setRevForm({ ...revForm, rating: Number(e.target.value) })} className="input">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
                    </select>
                  </Field>
                  <Field label="Title"><input value={revForm.title} onChange={(e) => setRevForm({ ...revForm, title: e.target.value })} className="input" /></Field>
                  <Field label="Review"><textarea value={revForm.body} onChange={(e) => setRevForm({ ...revForm, body: e.target.value })} className="input" rows={4} /></Field>
                  <button className="btn-primary w-full" onClick={submitReview}>{tr("submit")}</button>
                </div>
              </div>
            )}

            {tab === "qa" && (
              <div className="py-7 grid md:grid-cols-2 gap-8">
                <div className="space-y-3.5">
                  {data.questions.length === 0 && <EmptyState title="No questions yet" hint="Ask anything about this product." />}
                  {data.questions.map((q: any) => (
                    <div key={q.id} className="card p-5">
                      <p className="font-bold text-sm">Q: {q.question} <span className="text-slate-400 font-normal">— {q.authorName}</span></p>
                      {q.answer ? <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">A: {q.answer}</p> : <p className="text-sm mt-2 text-slate-400 italic">Awaiting answer from our team.</p>}
                    </div>
                  ))}
                </div>
                <div className="card p-5 h-fit">
                  <h3 className="font-extrabold mb-4">{tr("askQuestion")}</h3>
                  <textarea value={qForm} onChange={(e) => setQForm(e.target.value)} className="input" rows={4} placeholder="Type your question..." />
                  <button className="btn-primary w-full mt-3" onClick={submitQuestion}>{tr("submit")}</button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {data.frequentlyBought?.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight mb-5">Frequently bought together</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.frequentlyBought.map((x: Product) => <ProductCard key={x.id} p={x} />)}
          </div>
        </div>
      )}

      {data.related?.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight mb-5">{tr("related")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.related.map((x: Product) => <ProductCard key={x.id} p={x} />)}
          </div>
        </div>
      )}
    </motion.div>
  );
}
