import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { Spinner } from "./ui";

export default function Footer() {
  const { tr, toast } = useStore();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/newsletter", { method: "POST", body: { email } });
      toast("Subscribed — welcome aboard!", "success");
      setEmail("");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  const cols: [string, [string, string][]][] = [
    ["Shop", [["/shop", tr("shop")], ["/deals", tr("deals")], ["/auctions", tr("auctions")], ["/wishlist", tr("wishlist")]]],
    ["Support", [["/help", tr("help")], ["/track", tr("track")], ["/help#tickets", "Contact Support"], ["/blog", tr("blog")]]],
    ["Sell & Company", [["/sell", "Become a Seller"], ["/account", tr("account")], ["/login", tr("login")]]],
  ];

  return (
    <footer className="mt-20 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
      <div className="bg-ink-950 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 py-14 grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shadow-pop"
                style={{ background: "linear-gradient(135deg,#3b6df6,#7c3aed)" }}>V</span>
              <span className="text-2xl font-extrabold tracking-tight text-white">Velmora<span className="text-brand-400">.</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Pakistan's online shopping destination. Quality products, fair prices, delivered to your door.</p>
            <form onSubmit={subscribe} className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Get deals in your inbox</p>
              <div className="flex max-w-xs">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" required
                  className="flex-1 px-4 py-2.5 rounded-l-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all" />
                <button className="btn-primary !rounded-l-none text-sm px-5" type="submit" disabled={busy}>
                  {busy ? <Spinner light size={16} /> : "Join"}
                </button>
              </div>
            </form>
          </div>
          {cols.map(([h, links]) => (
            <div key={h}>
              <h4 className="font-bold text-white text-sm uppercase tracking-widest mb-4">{h}</h4>
              <div className="space-y-2.5 text-sm">
                {links.map(([to, label]) => (
                  <Link key={to + label} to={to} className="block text-slate-400 hover:text-white hover:translate-x-1 transition-all w-fit">{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Velmora. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Secure checkout</span>
              <span>COD available</span>
              <span>Prices in PKR unless converted</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
