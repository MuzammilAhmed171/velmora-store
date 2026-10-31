import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { ProductCard, QuickView, Product } from "../components/ProductCard";
import { SectionTitle, Reveal, Stagger, StaggerItem, ProductCardSkeleton, RatingStars, EASE } from "../components/ui";
import { money } from "../lib/format";

const TRUST = [
  { t: "Cash on Delivery", d: "Pay when your order arrives", icon: <path d="M2 7h20v10H2zM2 10h20M6 15h4" /> },
  { t: "7-Day Returns", d: "Easy returns on unused items", icon: <path d="M3 12a9 9 0 109-9M3 12V5m0 7h7" /> },
  { t: "Secure Shopping", d: "Your data stays protected", icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /> },
  { t: "Nationwide Delivery", d: "Shipping across Pakistan", icon: <path d="M1 8h14v9H1zM15 11h4l4 4v2h-8z" /> },
];

function useCountdown(target?: string) {
  const [left, setLeft] = useState("--:--:--");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) { setLeft("00:00:00"); return; }
      const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export default function Home() {
  const { tr, user, toast, refreshCounts, currency } = useStore();
  const [data, setData] = useState<any>(null);
  const [quick, setQuick] = useState<Product | null>(null);
  const [slide, setSlide] = useState(0);
  const [recent, setRecent] = useState<Product[]>([]);
  const [recs, setRecs] = useState<Product[] | null>(null);

  useEffect(() => {
    api("/home").then(setData).catch(() => setData({ banners: [], deals: [], featured: [], categories: [] }));
    try { setRecent(JSON.parse(localStorage.getItem("velmora_recent") || "[]")); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const viewed = JSON.parse(localStorage.getItem("velmora_recent") || "[]").map((p: any) => p.id).join(",");
      api<{ products: Product[] }>(`/recommendations${viewed ? `?viewed=${encodeURIComponent(viewed)}` : ""}`)
        .then((d) => setRecs(d.products)).catch(() => setRecs([]));
    } catch { setRecs([]); }
  }, []);

  useEffect(() => {
    if (!data?.banners?.length) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % data.banners.length), 6000);
    return () => clearInterval(id);
  }, [data]);

  const banners = data?.banners || [];
  const deals = data?.deals || [];
  const deal = deals[0];
  const dealProduct: Product | null = deal?.product || null;
  const dealPrice = deal?.dealPrice ?? dealProduct?.price;
  const discount = dealProduct && dealProduct.compareAt && dealProduct.compareAt > (dealPrice || 0)
    ? Math.round((1 - dealPrice / dealProduct.compareAt) * 100) : 0;
  const liveProducts = (data?.categories || []).reduce((s: number, c: any) => s + (c.productCount || 0), 0);
  const countdown = useCountdown(deal?.endsAt);

  const addDealToCart = async () => {
    if (!dealProduct) return;
    try {
      await api("/cart", { method: "POST", body: { productId: dealProduct.id, qty: 1 } });
      toast("Added to cart", "success");
      refreshCounts();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const hero = banners[slide] || null;

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* ---------- MAROON PROMO HERO ---------- */}
      <div className="relative overflow-hidden mt-6 rounded-[1.75rem] shadow-lift"
        style={{ background: "linear-gradient(105deg, #8f1d16 0%, #7a1712 55%, #5e100c 100%)" }}>
        <motion.div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-white/[0.07] blur-3xl"
          animate={{ y: [0, 22, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative px-8 md:px-12 py-10 md:py-14 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={slide}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: EASE }}>
                <p className="text-[12px] font-bold tracking-[0.22em] text-white/60">FEATURED PROMOTION</p>
                <h1 className="text-white font-extrabold tracking-tight leading-[1.05] text-4xl md:text-[44px] mt-3">
                  {hero?.title || "Home Essentials Under Rs 5,000"}
                </h1>
                <p className="text-white/70 text-base md:text-[17px] mt-3 max-w-xl">
                  {hero?.subtitle || "Cookware, air fryers and smart lighting for every home"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="shrink-0">
            <Link to={hero?.link || "/shop"}>
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="inline-block bg-white text-[#1c1c1c] font-bold px-8 py-3.5 rounded-full shadow-lift cursor-pointer">
                Shop Home
              </motion.span>
            </Link>
          </div>
        </div>
        {banners.length > 1 && (
          <div className="absolute bottom-5 right-8 flex gap-2 z-10">
            {banners.map((_: any, i: number) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: i === slide ? 28 : 8, background: i === slide ? "#fff" : "rgba(255,255,255,0.4)" }} />
            ))}
          </div>
        )}
      </div>

      {/* ---------- DEAL OF THE DAY ---------- */}
      <div className="mt-6 rounded-[1.75rem] overflow-hidden bg-[#151515] dark:bg-[#151515] shadow-lift">
        <div className="grid md:grid-cols-2">
          {/* left */}
          <div className="p-8 md:p-12">
            {!dealProduct ? (
              <div>
                <div className="skeleton h-7 w-44 !rounded-full !bg-white/10" />
                <div className="skeleton h-12 w-4/5 !bg-white/10 mt-5" />
                <div className="skeleton h-5 w-3/5 !bg-white/10 mt-3" />
                <div className="skeleton h-10 w-48 !bg-white/10 mt-5" />
              </div>
            ) : (
              <>
                <span className="inline-block px-4 py-1.5 rounded-full bg-ember-600 text-white text-[12px] font-extrabold tracking-[0.14em]">DEAL OF THE DAY</span>
                <h2 className="text-white font-extrabold tracking-tight leading-[1.08] text-4xl md:text-[44px] mt-5">{dealProduct.name}</h2>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <RatingStars value={dealProduct.rating} size={17} />
                  <span className="text-white font-extrabold">{dealProduct.rating?.toFixed(1)}</span>
                  <span className="text-[#a3a3a3] text-sm">{dealProduct.reviewCount} reviews · {(dealProduct.sold || 0).toLocaleString()} sold</span>
                </div>
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <span className="text-white font-extrabold text-4xl tracking-tight">{money(dealPrice, currency)}</span>
                  {dealProduct.compareAt && dealProduct.compareAt > dealPrice && (
                    <span className="text-[#8a8a8a] text-xl line-through">{money(dealProduct.compareAt, currency)}</span>
                  )}
                  {discount > 0 && (
                    <span className="px-3.5 py-1.5 rounded-full bg-white text-[#1c1c1c] text-[13px] font-extrabold">Save {discount}%</span>
                  )}
                </div>
                <div className="flex gap-3 mt-6 flex-wrap">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={addDealToCart}
                    className="px-8 py-3.5 rounded-full bg-ember-600 hover:bg-ember-700 text-white font-bold transition-colors shadow">
                    Add to Cart
                  </motion.button>
                  <Link to={`/product/${dealProduct.slug}`}>
                    <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="inline-block px-8 py-3.5 rounded-full border border-white/25 text-white font-bold hover:bg-white/10 transition-colors cursor-pointer">
                      View Details
                    </motion.span>
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-8">
                  {[
                    [liveProducts || "—", "Live Products"],
                    [user?.loyaltyPoints ?? 0, "Your Loyalty Points"],
                    [money(user?.walletBalance ?? 0, currency), "Wallet Balance"],
                  ].map(([v, l]) => (
                    <div key={l as string} className="bg-[#262626] rounded-2xl p-4 text-center">
                      <p className="text-white font-extrabold text-xl">{v}</p>
                      <p className="text-[#8a8a8a] text-[11px] font-semibold mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* right : image full-bleed */}
          <div className="relative min-h-[320px] md:min-h-[480px] bg-[#0d0d0d]">
            {dealProduct ? (
              <>
                <img src={dealProduct.images?.[0]} alt={dealProduct.name} className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-white text-[#1c1c1c] text-[12px] font-bold shadow">Trending</span>
                {discount > 0 && (
                  <span className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-ember-600 text-white text-[12px] font-extrabold shadow">-{discount}%</span>
                )}
                <span className="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-[12px] font-semibold">
                  {dealProduct.brand?.name || ""}{dealProduct.brand?.name && dealProduct.category?.name ? " · " : ""}{dealProduct.category?.name || ""}
                </span>
              </>
            ) : (
              <div className="absolute inset-0 skeleton !rounded-none !bg-white/[0.06]" />
            )}
          </div>
        </div>
      </div>

      {/* ---------- FLASH DEALS HEADER ---------- */}
      {deals.length > 0 && (
        <div className="mt-6">
          <Reveal className="rounded-3xl bg-[#151515] p-5 flex items-center gap-4 flex-wrap shadow-lift">
            <span className="w-12 h-12 rounded-2xl bg-ember-600 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" /></svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-white font-extrabold text-[22px] tracking-tight">Flash Deals</h2>
              <p className="text-[#8a8a8a] text-sm">Limited stock at special prices — applied automatically in cart</p>
            </div>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#262626] text-white text-sm font-bold">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Ends in <span className="tabular-nums">{countdown}</span>
              </span>
              <Link to="/deals">
                <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="inline-block px-6 py-2.5 rounded-full bg-ember-600 hover:bg-ember-700 text-white text-sm font-bold transition-colors cursor-pointer">
                  All deals
                </motion.span>
              </Link>
            </div>
          </Reveal>
          <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            {deals.slice(0, 4).map((d: any) => (
              <StaggerItem key={d.id}>
                <ProductCard p={{ ...d.product, price: d.dealPrice, compareAt: d.product?.price }} onQuickView={setQuick} flashDeal />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}

      {/* ---------- CATEGORIES ---------- */}
      <div className="mt-12">
        <SectionTitle title={tr("categories")} link="/shop" linkText={tr("viewAll")} />
        {!data ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton aspect-square !rounded-2xl" />)}
          </div>
        ) : (
          <Stagger className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {(data.categories || []).map((c: any) => (
              <StaggerItem key={c.id}>
                <Link to={`/shop?category=${c.slug}`}
                  className="card card-hover p-3 text-center block group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-cream-deep dark:bg-white/[0.04] mb-2.5">
                    <img src={c.image || "/images/products/cat-electronics.jpg"} alt={c.name} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <p className="text-[13px] font-bold truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400">{c.productCount || 0} items</p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      {/* ---------- RECOMMENDED ---------- */}
      {recs !== null && recs.length > 0 && (
        <div className="mt-12">
          <SectionTitle title="Recommended for you" sub="Based on your browsing" link="/shop?sort=popular" linkText={tr("viewAll")} />
          <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.slice(0, 4).map((p: Product) => (
              <StaggerItem key={p.id}><ProductCard p={p} onQuickView={setQuick} /></StaggerItem>
            ))}
          </Stagger>
        </div>
      )}

      {/* ---------- FEATURED ---------- */}
      <div className="mt-12">
        <SectionTitle title={tr("featured")} link="/shop?sort=featured" linkText={tr("viewAll")} sub="Hand-picked best sellers and new arrivals" />
        {!data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(data.featured || []).slice(0, 8).map((p: Product) => (
              <StaggerItem key={p.id}><ProductCard p={p} onQuickView={setQuick} /></StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      {/* ---------- RECENTLY VIEWED ---------- */}
      {recent.length > 0 && (
        <div className="mt-12">
          <SectionTitle title="Recently viewed" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recent.slice(0, 4).map((p: Product) => (
              <ProductCard key={p.id} p={p} onQuickView={setQuick} />
            ))}
          </div>
        </div>
      )}

      {/* ---------- TRUST BADGES ---------- */}
      <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14" gap={0.08}>
        {TRUST.map(({ t, d, icon }) => (
          <StaggerItem key={t}>
            <div className="card card-hover p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-ember-600/10 text-ember-600 dark:text-ember-400 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </div>
              <p className="font-bold text-[15px]">{t}</p>
              <p className="text-[13px] text-slate-500 mt-1">{d}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <QuickView p={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
