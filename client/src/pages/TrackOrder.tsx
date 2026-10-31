import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, API_BASE } from "../lib/api";
import { useStore } from "../context/Store";
import { Price, Field, EmptyState, PageHeader, Spinner, Skeleton, EASE } from "../components/ui";

const STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

export function OrderTimeline({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  const cancelled = status === "CANCELLED";
  return (
    <div className="my-8">
      <div className="flex items-start">
        {STEPS.map((s, i) => {
          const done = !cancelled && i <= idx;
          const current = !cancelled && i === idx;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center shrink-0 w-16">
                <motion.div
                  initial={false}
                  animate={done ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.45, delay: i * 0.15 }}
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-500 ${
                    cancelled ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                    : done ? "text-white shadow-pop" : "bg-slate-200 dark:bg-white/10 text-slate-400"}`}
                  style={done && !cancelled ? { background: "linear-gradient(135deg,#10b981,#059669)" } : undefined}
                >
                  {current && !cancelled && <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse-ring" />}
                  {done ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (i + 1)}
                </motion.div>
                <span className={`text-[11px] mt-2 font-bold capitalize text-center ${done ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>{s.toLowerCase()}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[5px] mx-1 mt-[22px] rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden min-w-[16px]">
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#10b981,#059669)" }}
                    initial={{ width: "0%" }} animate={{ width: !cancelled && i < idx ? "100%" : "0%" }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: EASE }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {cancelled && (
        <div className="mt-4 text-center"><span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 !px-4 !py-1.5">This order was cancelled</span></div>
      )}
    </div>
  );
}

export function Invoice({ order }: { order: any }) {
  const print = () => window.print();
  return (
    <div className="card !rounded-3xl p-6 md:p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white" style={{ background: "linear-gradient(135deg,#3b6df6,#7c3aed)" }}>V</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Velmora</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">support@velmora.pk · 0300-1234567</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-extrabold">Invoice {order.orderNumber}</p>
          <p className="text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-sm mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Bill to</p>
        <p className="font-semibold">{order.address?.name} · {order.address?.phone}</p>
        <p className="text-slate-500">{order.address?.line1}, {order.address?.city}</p>
      </div>
      <table className="table">
        <thead><tr><th>Item</th><th>Qty</th><th className="!text-right">Price</th><th className="!text-right">Total</th></tr></thead>
        <tbody>
          {order.items.map((i: any, n: number) => (
            <tr key={n}><td className="font-medium">{i.name}{i.variant ? ` (${i.variant})` : ""}</td><td>{i.qty}</td><td className="text-right"><Price pkr={i.price} /></td><td className="text-right"><Price pkr={i.price * i.qty} /></td></tr>
          ))}
        </tbody>
      </table>
      <div className="text-sm space-y-1.5 mt-5 max-w-xs ml-auto">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><Price pkr={order.subtotal} /></div>
        {order.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>− <Price pkr={order.discount} /></span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Shipping</span><Price pkr={order.shippingFee} /></div>
        {order.tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax</span><Price pkr={order.tax} /></div>}
        <div className="flex justify-between font-extrabold text-base border-t border-slate-200 dark:border-white/[0.07] pt-2.5"><span>Total</span><Price pkr={order.total} /></div>
      </div>
      <button className="btn-ghost mt-6 no-print" onClick={print}>Print invoice</button>
    </div>
  );
}

export default function TrackOrder() {
  const { toast } = useStore();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api("/orders/track", { method: "POST", body: { orderNumber, phone } });
      setResult(d);
    } catch (err: any) { toast(err.message, "error"); setResult(null); }
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 mt-8">
      <PageHeader title="Track your order" sub="Enter your order number and phone to see live status" />
      <motion.form onSubmit={track} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="card !rounded-3xl p-5 md:p-6 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <Field label="Order number"><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} className="input uppercase font-mono" placeholder="ORD-XXXX" /></Field>
        <Field label="Phone number"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="03XX-XXXXXXX" /></Field>
        <button className="btn-primary !py-3 min-w-[110px]" type="submit" disabled={busy}>{busy ? <Spinner light size={18} /> : "Track"}</button>
      </motion.form>
      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={result.order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <OrderView data={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function OrderView({ data }: { data: { order: any; timeline: any[] } }) {
  const { toast, refreshCounts } = useStore();
  const [showInvoice, setShowInvoice] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const { order, timeline } = data;

  const cancel = async () => {
    if (!confirm("Cancel this order?")) return;
    try { await api(`/orders/${order.id}/cancel`, { method: "POST" }); toast("Order cancelled", "success"); window.location.reload(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const reorder = async () => {
    try { await api(`/orders/${order.id}/reorder`, { method: "POST" }); toast("Items added to cart", "success"); refreshCounts(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const requestReturn = async () => {
    if (!returnReason.trim()) return toast("Enter a reason", "error");
    try { await api(`/orders/${order.id}/returns`, { method: "POST", body: { reason: returnReason } }); toast("Return requested", "success"); setShowReturn(false); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="card !rounded-3xl p-5 md:p-7 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight font-mono">{order.orderNumber}</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleString()} · {order.paymentMethod}</p>
        </div>
        <span className={`badge !px-4 !py-1.5 ${STATUS_TONE[order.status] || "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"}`}>{order.status}</span>
      </div>

      <OrderTimeline status={order.status} />

      {order.trackingNo && (
        <div className="text-sm mb-4 p-3.5 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50">
          Courier: <b>{order.courier}</b> · Tracking: <b className="font-mono">{order.trackingNo}</b>
        </div>
      )}

      <div className="space-y-2.5 mb-5">
        {order.items.map((i: any, n: number) => (
          <div key={n} className="flex items-center gap-3 text-sm p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            {i.image && <img src={i.image} alt="" className="w-12 h-12 object-cover rounded-xl" />}
            <span className="flex-1 font-medium">{i.name} <span className="text-slate-400">× {i.qty}</span>{i.variant ? ` (${i.variant})` : ""}</span>
            <Price pkr={i.price * i.qty} />
          </div>
        ))}
      </div>

      <div className="text-sm space-y-1.5 border-t border-slate-200 dark:border-white/[0.07] pt-4">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><Price pkr={order.subtotal} /></div>
        {order.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>− <Price pkr={order.discount} /></span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Shipping</span><Price pkr={order.shippingFee} /></div>
        <div className="flex justify-between font-extrabold text-base"><span>Total</span><Price pkr={order.total} /></div>
      </div>

      <div className="flex gap-2 mt-5 flex-wrap">
        {["PENDING", "CONFIRMED"].includes(order.status) && <button className="btn-ghost btn-sm" onClick={cancel}>Cancel order</button>}
        <button className="btn-ghost btn-sm" onClick={reorder}>Reorder</button>
        <button className="btn-ghost btn-sm" onClick={() => setShowInvoice(!showInvoice)}>{showInvoice ? "Hide invoice" : "View invoice"}</button>
        {order.status === "DELIVERED" && <button className="btn-ghost btn-sm" onClick={() => setShowReturn(!showReturn)}>Request return</button>}
      </div>

      <AnimatePresence>
        {showReturn && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 flex gap-2">
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Reason for return" className="input" />
              <button className="btn-primary btn-sm shrink-0" onClick={requestReturn}>Submit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoice && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-5"><Invoice order={order} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <h4 className="font-extrabold text-sm mb-3">Order history</h4>
        <div className="space-y-0">
          {timeline.map((t: any, i: number) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="flex gap-3.5 text-sm pb-4 relative">
              {i < timeline.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-slate-200 dark:bg-white/10" />}
              <span className="w-3 h-3 rounded-full bg-brand-600 shrink-0 mt-1 z-10" />
              <div>
                <span className="font-bold">{t.status}</span>
                <span className="text-slate-400 text-xs ml-2">{new Date(t.createdAt).toLocaleString()}</span>
                {t.note && <p className="text-slate-500 mt-0.5">{t.note}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const isNew = search.get("new") === "1";
  useEffect(() => {
    api(`/orders/${id}`).then(setData).catch(() => {});
  }, [id]);
  if (!data) return (
    <div className="max-w-3xl mx-auto px-4 mt-8 space-y-4">
      <Skeleton className="h-10 w-2/3 !rounded-xl" />
      <Skeleton className="h-40 !rounded-3xl" />
      <Skeleton className="h-64 !rounded-3xl" />
    </div>
  );
  return (
    <div className="max-w-3xl mx-auto px-4 mt-8">
      <AnimatePresence>
        {isNew && (
          <motion.div initial={{ opacity: 0, y: -14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            className="rounded-3xl p-5 mb-5 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 flex items-start gap-3.5">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
              className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-pop">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
            </motion.span>
            <div>
              <p className="font-extrabold text-emerald-800 dark:text-emerald-200 text-lg">Order placed successfully!</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">Save your order number: <b className="font-mono">{data.order.orderNumber}</b></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <OrderView data={data} />
      <Link to="/shop" className="btn-ghost mt-5">Continue shopping</Link>
    </div>
  );
}
