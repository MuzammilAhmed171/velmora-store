import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { money, timeAgo } from "../lib/format";
import { ProductCard, QuickView, Product } from "../components/ProductCard";
import { Countdown, EmptyState, Price, Field, ProductCardSkeleton, PageHeader, Spinner, Stagger, StaggerItem, EASE } from "../components/ui";

export function Deals() {
  const { tr } = useStore();
  const [deals, setDeals] = useState<any[] | null>(null);
  const [quick, setQuick] = useState<Product | null>(null);
  useEffect(() => {
    api<{ deals: any[] }>("/home").then((d) => setDeals(d.deals)).catch(() => setDeals([]));
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      {/* deal hero banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden rounded-[2rem] hero-gradient text-white p-8 md:p-12 mb-8 shadow-lift">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <motion.div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl"
          animate={{ y: [0, 18, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div>
            <span className="badge bg-white/15 border border-white/25 text-white w-fit mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE NOW
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Flash Deals</h1>
            <p className="text-white/80 mt-2 max-w-md">Up to 70% off top products. When the timer hits zero, prices go back up — grab them while they last.</p>
          </div>
          {deals && deals[0] && (
            <div className="shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-2">Deals end in</p>
              <Countdown target={deals[0].endsAt} />
            </div>
          )}
        </div>
      </motion.div>

      {deals === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : deals.length === 0 ? (
        <EmptyState title="No flash deals right now" hint="New deals drop regularly — check back soon or browse the full shop." kind="box"
          action={<Link to="/shop" className="btn-primary">Browse shop</Link>} />
      ) : (
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {deals.map((d) => (
            <StaggerItem key={d.id}>
              <div className="relative">
                <ProductCard p={{ ...d.product, price: d.dealPrice, compareAt: d.product?.price }} onQuickView={setQuick} />
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 pointer-events-none">
                  <span className="badge bg-ink-950/80 backdrop-blur text-white !text-[10px]">Ends {timeAgo(d.endsAt)}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <QuickView p={quick} onClose={() => setQuick(null)} />

      {/* ---------- GIFT CARDS ---------- */}
      <GiftCardSection />
    </div>
  );
}

function GiftCardSection() {
  const { toast, currency } = useStore();
  const [amount, setAmount] = useState(1000);
  const [bought, setBought] = useState<any>(null);
  const [checkCode, setCheckCode] = useState("");
  const [checked, setChecked] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      const d = await api<{ giftCard: any }>("/gift-cards/buy", { method: "POST", body: { amount } });
      setBought(d.giftCard);
      toast("Gift card created", "success");
    } catch (e: any) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const check = async () => {
    if (!checkCode.trim()) return;
    try {
      const d = await api<{ giftCard: any }>(`/gift-cards/${encodeURIComponent(checkCode.trim().toUpperCase())}`);
      setChecked(d.giftCard);
    } catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="mt-10 rounded-[1.75rem] bg-[#151515] p-8 md:p-10 shadow-lift">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-ember-600 text-white text-[12px] font-extrabold tracking-[0.14em]">GIFT CARDS</span>
          <h2 className="text-white font-extrabold text-3xl tracking-tight mt-4">Give Velmora credit</h2>
          <p className="text-[#8a8a8a] mt-2">Buy a gift card and share the code — it can be redeemed at checkout like cash.</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {[500, 1000, 2000, 5000].map((a) => (
              <button key={a} onClick={() => setAmount(a)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${amount === a
                  ? "bg-ember-600 border-ember-600 text-white"
                  : "border-white/20 text-white/70 hover:border-ember-600/60"}`}>
                {money(a, currency)}
              </button>
            ))}
          </div>
          <button onClick={buy} disabled={busy}
            className="mt-5 px-8 py-3.5 rounded-full bg-ember-600 hover:bg-ember-700 text-white font-bold transition-colors disabled:opacity-50">
            {busy ? "Creating..." : "Buy gift card"}
          </button>
          {bought && (
            <div className="mt-5 p-4 rounded-2xl bg-[#262626] border border-emerald-500/30">
              <p className="text-[12px] font-bold tracking-[0.1em] text-emerald-400">YOUR GIFT CARD CODE</p>
              <p className="text-white font-mono font-extrabold text-xl mt-1">{bought.code}</p>
              <p className="text-[#8a8a8a] text-sm mt-1">Balance: {money(bought.balance, currency)}</p>
            </div>
          )}
        </div>
        <div className="md:border-l md:border-white/10 md:pl-8">
          <h3 className="text-white font-extrabold text-xl tracking-tight">Check balance</h3>
          <p className="text-[#8a8a8a] text-sm mt-1.5">Enter a gift card code to see its remaining balance.</p>
          <div className="flex gap-2 mt-4">
            <input value={checkCode} onChange={(e) => setCheckCode(e.target.value)} placeholder="GIFT-XXXXXX"
              className="flex-1 px-5 py-3 rounded-full bg-[#262626] text-white placeholder:text-[#6a6a6a] border border-white/10 focus:border-ember-600 outline-none font-mono" />
            <button onClick={check} className="px-6 py-3 rounded-full bg-white text-[#1c1c1c] font-bold hover:bg-slate-200 transition-colors">Check</button>
          </div>
          {checked && (
            <div className="mt-4 p-4 rounded-2xl bg-[#262626]">
              <p className="text-white font-mono font-bold">{checked.code}</p>
              <p className="text-[#8a8a8a] text-sm mt-1">Balance: <span className="text-white font-extrabold">{money(checked.balance, currency)}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Auctions() {
  const { tr } = useStore();
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => {
    api<{ auctions: any[] }>("/auctions").then((d) => setList(d.auctions)).catch(() => setList([]));
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title={tr("auctions")} sub="Bid live and win exclusive products at unbeatable prices" />
      {list === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title="No live auctions" hint="Auctions start regularly — check back soon." />
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {list.map((a) => (
            <StaggerItem key={a.id}>
              <Link to={`/auctions/${a.id}`} className="card card-hover overflow-hidden block group">
                <div className="relative overflow-hidden">
                  <img src={a.product?.images?.[0]} alt={a.product?.name} loading="lazy" className="w-full aspect-[16/10] object-cover bg-slate-100 dark:bg-white/[0.04] group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 badge bg-red-600 text-white shadow-pop">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold line-clamp-1 text-[15px]">{a.product?.name}</h3>
                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-sm text-slate-500">Current bid</p>
                    <p className="font-extrabold text-brand-600 dark:text-brand-300 text-lg">{money(a.currentBid)}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <Countdown target={a.endsAt} compact />
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

export function AuctionDetail() {
  const { id } = useParams();
  const { user, toast, currency } = useStore();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [bid, setBid] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api(`/auctions/${id}`).then(setData).catch(() => {});
  useEffect(() => { load(); }, [id]);
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [id]);

  const placeBid = async () => {
    if (!user) { nav("/login"); return; }
    setBusy(true);
    try {
      await api(`/auctions/${id}/bid`, { method: "POST", body: { amount: Number(bid) } });
      toast("Bid placed — you're the highest bidder!", "success");
      setBid("");
      load();
    } catch (e: any) { toast(e.message, "error"); }
    setBusy(false);
  };

  if (!data) return (
    <div className="max-w-4xl mx-auto px-4 mt-6">
      <div className="card !rounded-3xl p-6 grid md:grid-cols-2 gap-6">
        <div className="skeleton aspect-square !rounded-2xl" />
        <div className="space-y-3"><div className="skeleton h-8 w-3/4" /><div className="skeleton h-6 w-1/2" /><div className="skeleton h-12 w-full !rounded-xl" /></div>
      </div>
    </div>
  );
  const a = data.auction;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto px-4 mt-6">
      <div className="card !rounded-3xl p-6 grid md:grid-cols-2 gap-7">
        <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
          <img src={a.product?.images?.[0]} alt={a.product?.name} className="w-full aspect-square object-cover" />
        </div>
        <div>
          <span className="badge bg-red-600 text-white shadow-pop mb-2"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE AUCTION</span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">{a.product?.name}</h1>
          <p className="text-sm text-slate-500 mt-1.5">Starting price: {money(a.startPrice, currency)}</p>
          <div className="mt-4 p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current bid</p>
            <motion.p key={a.currentBid} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-3xl font-extrabold text-brand-600 dark:text-brand-300 tabular-nums">{money(a.currentBid, currency)}</motion.p>
          </div>
          <div className="mt-4"><Countdown target={a.endsAt} /></div>
          <div className="flex gap-2 mt-5">
            <input type="number" value={bid} onChange={(e) => setBid(e.target.value)} placeholder={`Min ${money(a.currentBid + 1, currency)}`} className="input font-mono" />
            <motion.button whileTap={{ scale: 0.97 }} className="btn-accent shrink-0 min-w-[110px]" onClick={placeBid} disabled={busy}>
              {busy ? <Spinner light size={18} /> : "Place bid"}
            </motion.button>
          </div>
          <h3 className="font-extrabold mt-7 mb-3">Bid history</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto text-sm pr-1">
            {data.bids.length === 0 && <p className="text-slate-400">No bids yet — be the first!</p>}
            <AnimatePresence initial={false}>
              {data.bids.map((b: any, i: number) => (
                <motion.div key={b.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  className={`flex justify-between items-center p-2.5 rounded-xl ${i === 0 ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-slate-50 dark:bg-white/[0.03]"}`}>
                  <span className="font-semibold flex items-center gap-2">
                    {i === 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500"><path d="M5 3l3.6 3.6L12 4l3.4 2.6L19 3l-1.5 9H6.5zM6 12v9h12v-9" /></svg>}
                    {b.userId?.name || "Bidder"}
                  </span>
                  <span className="font-extrabold tabular-nums">{money(b.amount, currency)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
