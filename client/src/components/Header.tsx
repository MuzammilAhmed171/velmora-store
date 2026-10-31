import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { Drawer, Spinner } from "./ui";
import { money } from "../lib/format";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.3 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-ember-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow"
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

function NavIcon({ to, label, badge, title, children, onClick }: {
  to?: string; label: string; badge?: number; title?: string;
  children: React.ReactNode; onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="relative">
        {children}
        <CountBadge count={badge || 0} />
      </span>
      <span className="text-[11px] font-bold leading-none mt-1.5">{label}</span>
    </>
  );
  const cls = "flex flex-col items-center justify-center px-2 sm:px-2.5 py-1 text-char-soft dark:text-slate-200 hover:text-ember-600 dark:hover:text-ember-400 transition-colors min-w-[54px]";
  return to
    ? <Link to={to} title={title || label} className={cls} onClick={onClick}>{inner}</Link>
    : <button onClick={onClick} title={title || label} className={cls}>{inner}</button>;
}

const I = {
  bolt: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" /></svg>,
  heart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>,
  bell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>,
  cube: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.3 7l8.7 5 8.7-5M12 22V12" /></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>,
  help: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.2" /><path d="M9.2 9a2.9 2.9 0 015.6 1c0 1.9-2.8 2.6-2.8 3.9" /><path d="M12 17.5h.01" /></svg>,
  chart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M8 17v-6M13 17V7M18 17v-3" /></svg>,
  cart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.4" /><circle cx="19" cy="21" r="1.4" /><path d="M1.5 2h3l2.6 12.4a2 2 0 002 1.6h8.7a2 2 0 002-1.6L21.5 6H6" /></svg>,
  moon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>,
  sun: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2 12h2.5M19.5 12H22M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></svg>,
  chev: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  search: <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a938a]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
};

export default function Header() {
  const { user, tr, lang, setLang, theme, setTheme, currency, setCurrency, cartCount, wishCount, notifCount, logout } = useStore();
  const [q, setQ] = useState("");
  const [trending, setTrending] = useState<{ term: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cats, setCats] = useState<any[]>([]);
  const [dealsCount, setDealsCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ trending: { term: string }[] }>("/search/trending").then((d) => setTrending(d.trending)).catch(() => {});
    api<{ categories: any[] }>("/meta").then((d) => setCats(d.categories || [])).catch(() => {});
    api<{ deals: any[] }>("/home").then((d) => setDealsCount((d.deals || []).length)).catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  const openCart = async () => {
    setCartOpen(true);
    setCartLoading(true);
    try {
      const d = await api<{ items: any[] }>("/cart");
      setCartItems(d.items);
    } catch { /* offline */ }
    setCartLoading(false);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowSearch(false);
    nav("/shop" + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""));
  };

  const lp = user?.loyaltyPoints ?? 0;
  const wb = user?.walletBalance ?? 0;
  const cartSubtotal = cartItems.reduce((s, i) => s + (i.line || 0), 0);

  // category pills
  const searchParams = new URLSearchParams(loc.search);
  const activeCat = searchParams.get("category");
  const pills: { key: string; label: string; to: string }[] = [
    { key: "all", label: "All", to: "/shop" },
    ...cats.map((c: any) => ({ key: `cat-${c.slug}`, label: c.name, to: `/shop?category=${c.slug}` })),
    { key: "deals", label: "Flash Deals", to: "/deals" },
    { key: "auctions", label: "Auctions", to: "/auctions" },
    { key: "giftcards", label: "Gift Cards", to: "/deals" },
    { key: "blog", label: "Blog", to: "/blog" },
  ];
  const isActivePill = (p: { key: string }) => {
    if (loc.pathname === "/") return p.key === "deals";
    if (loc.pathname === "/shop") {
      if (activeCat) return p.key === `cat-${activeCat}`;
      return p.key === "all";
    }
    if (loc.pathname === "/deals") return p.key === "deals";
    if (loc.pathname.startsWith("/auctions")) return p.key === "auctions";
    if (loc.pathname.startsWith("/blog")) return p.key === "blog";
    return false;
  };

  const iconItems = (
    <>
      <NavIcon to="/deals" label="Deals" badge={dealsCount}>{I.bolt}</NavIcon>
      <NavIcon to="/wishlist" label="Wishlist" badge={wishCount}>{I.heart}</NavIcon>
      <NavIcon to="/notifications" label="Alerts" badge={notifCount}>{I.bell}</NavIcon>
      <NavIcon to={user ? "/account/orders" : "/login"} label="Orders">{I.cube}</NavIcon>
      <NavIcon to={user ? "/account" : "/login"} label="Account">{I.user}</NavIcon>
      <NavIcon to="/help" label="Help">{I.help}</NavIcon>
      <NavIcon to="/admin" label="Admin">{I.chart}</NavIcon>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40">
        {/* announcement bar */}
        <div className="bg-[#111111] text-white text-center text-[11px] sm:text-xs font-medium py-2 px-3 tracking-wide">
          Free delivery on orders over Rs 5,000 <span className="opacity-40 mx-1">·</span> Use code WELCOME10 for 10% off <span className="opacity-40 mx-1">·</span> {lp} loyalty points <span className="opacity-40 mx-1">·</span> Wallet Rs {wb}
        </div>

        <div className="bg-cream/95 dark:bg-ink-950/95 backdrop-blur-xl border-b border-[#e9e2d4] dark:border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 sm:gap-3 h-[76px]">
              <button className="lg:hidden p-2 -ml-2 text-char-soft dark:text-slate-200" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>

              {/* logo */}
              <Link to="/" className="shrink-0 leading-none select-none">
                <span className="text-[30px] font-extrabold tracking-tight text-char dark:text-white">
                  velmora<span className="text-[#d9480f]">.</span>
                </span>
                <span className="block text-[9px] font-bold tracking-[0.26em] text-[#8a8474] dark:text-slate-400 mt-1">PREMIUM ONLINE STORE</span>
              </Link>

              {/* search pill */}
              <div className="hidden md:block flex-1 max-w-md mx-2 relative" ref={searchRef}>
                <form onSubmit={submit} className="relative">
                  {I.search}
                  <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setShowSearch(true)}
                    placeholder="Search products, brands, categories..."
                    className="w-full h-11 rounded-full bg-white dark:bg-ink-900 border border-[#e5ddcc] dark:border-white/10 pl-11 pr-4 text-sm placeholder:text-[#a09a8c] dark:placeholder:text-slate-500 focus:outline-none focus:border-ember-600/60 focus:ring-4 focus:ring-ember-600/10 transition-all shadow-sm" />
                </form>
                <AnimatePresence>
                  {showSearch && trending.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full mt-2 w-full bg-white dark:bg-ink-900 border border-[#e9e2d4] dark:border-white/10 rounded-2xl p-2 z-50 shadow-lift">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1.5">Trending searches</p>
                      {trending.map((t) => (
                        <button key={t.term} className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-cream dark:hover:bg-white/5 transition-colors"
                          onClick={() => { setQ(t.term); setShowSearch(false); nav(`/shop?q=${encodeURIComponent(t.term)}`); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>
                          {t.term}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* icon nav */}
              <nav className="hidden lg:flex items-center ml-auto">{iconItems}</nav>

              {/* controls */}
              <div className="hidden lg:flex items-center gap-2 ml-1">
                <button onClick={() => setLang(lang === "en" ? "ur" : "en")} title="Language"
                  className="h-10 px-4 rounded-full bg-white dark:bg-ink-900 border border-[#e5ddcc] dark:border-white/10 text-[13px] font-bold text-char dark:text-slate-100 flex items-center gap-1.5 hover:border-ember-600/50 transition-colors">
                  {lang === "en" ? "EN" : "UR"} {I.chev}
                </button>
                <div className="relative">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} title="Currency"
                    className="h-10 pl-4 pr-8 rounded-full bg-white dark:bg-ink-900 border border-[#e5ddcc] dark:border-white/10 text-[13px] font-bold text-char dark:text-slate-100 appearance-none cursor-pointer hover:border-ember-600/50 transition-colors">
                    {["PKR", "USD", "EUR", "AED", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-char dark:text-slate-300">{I.chev}</span>
                </div>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Theme"
                  className="w-10 h-10 rounded-full bg-white dark:bg-ink-900 border border-[#e5ddcc] dark:border-white/10 flex items-center justify-center text-char dark:text-slate-100 hover:border-ember-600/50 transition-colors">
                  {theme === "light" ? I.moon : I.sun}
                </motion.button>
                <motion.button whileTap={{ scale: 0.94 }} onClick={openCart}
                  className="h-11 pl-4 pr-2 rounded-full bg-[#1c1c1c] dark:bg-white text-white dark:text-ink-950 flex items-center gap-2 font-bold text-[14px] hover:bg-[#2b2b2b] dark:hover:bg-slate-200 transition-colors shadow-pop">
                  {I.cart} Cart
                  <span className="w-7 h-7 rounded-full bg-ember-600 text-white text-[12px] font-extrabold flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                </motion.button>
              </div>

              {/* mobile cart */}
              <button onClick={openCart} className="lg:hidden ml-auto relative p-2 text-char dark:text-slate-100" aria-label="Cart">
                {I.cart}
                {cartCount > 0 && <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-ember-600 text-white text-[10px] font-extrabold flex items-center justify-center">{cartCount}</span>}
              </button>
            </div>

            {/* mobile search */}
            <div className="md:hidden pb-3">
              <form onSubmit={submit} className="relative">
                {I.search}
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("search")}
                  className="w-full h-11 rounded-full bg-white dark:bg-ink-900 border border-[#e5ddcc] dark:border-white/10 pl-11 pr-4 text-sm placeholder:text-[#a09a8c] focus:outline-none focus:border-ember-600/60" />
              </form>
            </div>

            {/* category pills */}
            <div className="border-t border-[#e9e2d4]/70 dark:border-white/[0.06]">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
                {pills.map((p) => {
                  const active = isActivePill(p);
                  return (
                    <Link key={p.key} to={p.to}
                      className={`shrink-0 px-5 py-2.5 rounded-full text-[14px] font-semibold border transition-all whitespace-nowrap ${active
                        ? "bg-[#1c1c1c] dark:bg-ember-600 text-white border-transparent shadow-pop"
                        : "bg-white dark:bg-white/[0.04] border-[#e5ddcc] dark:border-white/10 text-char-soft dark:text-slate-200 hover:border-ember-600/50 hover:text-ember-700 dark:hover:text-ember-300"}`}>
                      {p.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden bg-cream dark:bg-ink-950 border-b border-[#e9e2d4] dark:border-white/10">
              <div className="px-4 py-3 grid grid-cols-2 gap-1">
                {[
                  ["/deals", "Deals"], ["/wishlist", "Wishlist"], ["/notifications", "Alerts"],
                  [user ? "/account/orders" : "/login", "Orders"], [user ? "/account" : "/login", "Account"],
                  ["/help", "Help"], ["/admin", "Admin"],
                ].map(([to, label]) => (
                  <Link key={label as string} to={to as string} onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-[#e9e2d4] dark:border-white/10 text-sm font-bold">
                    {label}
                  </Link>
                ))}
                <div className="flex gap-2 col-span-2 mt-1">
                  <button onClick={() => setLang(lang === "en" ? "ur" : "en")} className="flex-1 h-11 rounded-full bg-white dark:bg-white/[0.04] border border-[#e5ddcc] dark:border-white/10 text-sm font-bold">
                    {lang === "en" ? "EN / اردو" : "UR / EN"}
                  </button>
                  <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="flex-1 h-11 rounded-full bg-white dark:bg-white/[0.04] border border-[#e5ddcc] dark:border-white/10 text-sm font-bold">
                    {theme === "light" ? "Dark mode" : "Light mode"}
                  </button>
                </div>
                {user ? (
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="col-span-2 h-11 rounded-full bg-red-600 text-white text-sm font-bold mt-1">Logout</button>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="col-span-2 h-11 rounded-full bg-ember-600 text-white text-sm font-bold mt-1 flex items-center justify-center">Login / Signup</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mini cart drawer */}
      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title={`${tr("cart")} (${cartCount})`}>
        <div className="p-5">
          {cartLoading ? (
            <div className="flex justify-center py-16"><Spinner size={28} /></div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-14">
              <p className="font-bold text-lg">Your cart is empty</p>
              <p className="text-sm text-slate-500 mt-1 mb-5">Add some products to get started.</p>
              <button className="btn-primary" onClick={() => { setCartOpen(false); nav("/shop"); }}>Browse shop</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {cartItems.map((i: any) => (
                    <motion.div key={i.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                      className="flex gap-3 p-2.5 rounded-2xl border border-[#e9e2d4] dark:border-white/[0.07] bg-white dark:bg-ink-900">
                      <img src={i.product?.images?.[0]} alt="" className="w-16 h-16 object-cover rounded-xl bg-cream dark:bg-white/5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{i.product?.name}</p>
                        <p className="text-xs text-slate-500">Qty {i.qty}</p>
                        <p className="text-sm font-extrabold mt-0.5">{money(i.line, currency)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-5 pt-4 border-t border-[#e9e2d4] dark:border-white/[0.07]">
                <div className="flex justify-between font-extrabold text-lg mb-4">
                  <span>Subtotal</span><span>{money(cartSubtotal, currency)}</span>
                </div>
                <button className="btn-primary w-full" onClick={() => { setCartOpen(false); nav("/checkout"); }}>{tr("checkout")}</button>
                <button className="btn-ghost w-full mt-2" onClick={() => { setCartOpen(false); nav("/cart"); }}>View full cart</button>
              </div>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}
