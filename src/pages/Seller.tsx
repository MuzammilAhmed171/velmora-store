import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { money } from "../lib/format";
import { Field, Price, StatCard, PageHeader, Spinner, Skeleton } from "../components/ui";

export function SellerRegister() {
  const { user, toast } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({ storeName: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { nav("/login"); return; }
    setBusy(true);
    try {
      await api("/sellers/register", { method: "POST", body: form });
      toast("Application submitted — we'll review it soon", "success");
      nav("/seller");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 mt-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card !rounded-[2rem] p-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><path d="M9 21v-6h6v6" /></svg>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Become a seller</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">Sell on Velmora and reach thousands of customers. Our team reviews every application. Platform commission starts at 10%.</p>
        <form onSubmit={submit}>
          <Field label="Store name"><input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="input" required placeholder="e.g. Ali Fabrics" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="03XX-XXXXXXX" /></Field>
          <Field label="Business address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field>
          <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5" type="submit" disabled={busy}>
            {busy ? <Spinner light size={18} /> : "Apply as seller"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export function SellerDashboard() {
  const { user, toast } = useStore();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/sellers/me").then((d: any) => {
      if (!d.seller) nav("/sell");
      else if (d.seller.status !== "APPROVED") setData({ pending: true, seller: d.seller });
      else api("/sellers/dashboard").then(setData).catch((e: any) => toast(e.message, "error"));
    }).catch(() => nav("/login"));
  }, []);

  if (!data) return (
    <div className="max-w-6xl mx-auto px-4 mt-6">
      <Skeleton className="h-9 w-64 !rounded-xl mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 !rounded-2xl" />)}</div>
      <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-64 !rounded-2xl" /><Skeleton className="h-64 !rounded-2xl" /></div>
    </div>
  );
  if (data.pending) {
    return (
      <div className="max-w-xl mx-auto px-4 mt-10">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card !rounded-[2rem] p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          </div>
          <h1 className="text-xl font-extrabold mb-2">Application {data.seller.status.toLowerCase()}</h1>
          <p className="text-sm text-slate-500">Your store "{data.seller.storeName}" is under review. We'll notify you once it's approved.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6">
      <PageHeader title="Seller dashboard" sub={data.seller?.storeName} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Products" value={data.stats.products} tone="brand" />
        <StatCard label="Orders" value={data.stats.orders} tone="violet" />
        <StatCard label="Revenue" value={money(data.stats.revenue)} tone="green" />
        <StatCard label="Commission owed" value={money(data.stats.commissionOwed)} tone="amber" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card !rounded-3xl p-6">
          <h3 className="font-extrabold mb-4">My products ({data.products.length})</h3>
          <div className="space-y-2 text-sm max-h-72 overflow-y-auto pr-1">
            {data.products.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                <span className="truncate font-medium">{p.name}</span>
                <span className="shrink-0"><Price pkr={p.price} /> <span className="text-slate-400">· {p.stock}</span></span>
              </div>
            ))}
            {data.products.length === 0 && <p className="text-sm text-slate-400">No products yet.</p>}
          </div>
        </div>
        <div className="card !rounded-3xl p-6">
          <h3 className="font-extrabold mb-4">Payouts</h3>
          <div className="flex gap-2 mb-4">
            <input value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Amount (min Rs 1,000)" type="number" className="input" />
            <motion.button whileTap={{ scale: 0.97 }} className="btn-primary btn-sm shrink-0" disabled={busy}
              onClick={async () => { setBusy(true); try { await api("/sellers/payouts", { method: "POST", body: { amount: Number(payout) } }); toast("Payout requested", "success"); setPayout(""); } catch (e: any) { toast(e.message, "error"); } setBusy(false); }}>
              {busy ? <Spinner light size={14} /> : "Request"}
            </motion.button>
          </div>
          <div className="space-y-2">
            {data.payouts.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center text-sm p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                <Price pkr={p.amount} /><span className="badge bg-slate-200 dark:bg-white/10">{p.status}</span>
              </div>
            ))}
            {data.payouts.length === 0 && <p className="text-sm text-slate-400">No payouts yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
