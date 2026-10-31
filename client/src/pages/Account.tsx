import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { money, timeAgo } from "../lib/format";
import { Field, EmptyState, Price, StatCard, ListSkeleton, Skeleton, PageHeader, Spinner, EASE } from "../components/ui";

const TABS: [string, string][] = [
  ["overview", "Overview"], ["orders", "Orders"], ["returns", "Returns"], ["addresses", "Addresses"],
  ["wallet", "Wallet & Loyalty"], ["alerts", "Price Alerts"], ["tickets", "Support Tickets"],
  ["notifications", "Notifications"], ["referrals", "Referrals"], ["subscriptions", "Subscriptions"],
  ["preorders", "Pre-orders"], ["downloads", "Downloads"], ["profile", "Profile"],
];

const TIER_TONE: Record<string, string> = {
  BRONZE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SILVER: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  GOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  PLATINUM: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};

export default function Account() {
  const { user, tr } = useStore();
  const { tab } = useParams();
  const nav = useNavigate();
  const active = tab || "overview";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    setData(null);
    load();
  }, [user, active]);

  const load = async () => {
    try {
      switch (active) {
        case "overview": setData(await api("/auth/profile")); break;
        case "orders": setData(await api("/orders")); break;
        case "returns": setData(await api("/orders/returns/list")); break;
        case "addresses": setData(await api("/addresses")); break;
        case "wallet": setData(await api("/auth/profile")); break;
        case "alerts": setData(await api("/alerts")); break;
        case "tickets": setData(await api("/tickets")); break;
        case "notifications": setData(await api("/notifications")); break;
        case "referrals": setData(await api("/referrals")); break;
        case "subscriptions": setData(await api("/subscriptions")); break;
        case "preorders": setData(await api("/orders/preorders/list")); break;
        case "downloads": setData(await api("/digital/files")); break;
        case "profile": setData(await api("/auth/profile")); break;
      }
    } catch { /* ignore */ }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title="My Account" sub={`Welcome back, ${user.name.split(" ")[0]}`} />
      <div className="flex gap-6 flex-col md:flex-row items-start">
        <aside className="md:w-60 shrink-0 w-full">
          <div className="card !rounded-3xl p-4 md:sticky md:top-32">
            <div className="flex items-center gap-3 p-2 mb-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg text-white shadow-pop shrink-0"
                style={{ background: "linear-gradient(135deg,#3b6df6,#7c3aed)" }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-extrabold truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                <span className={`badge mt-1.5 ${TIER_TONE[user.tier] || TIER_TONE.BRONZE}`}>{user.tier} tier</span>
              </div>
            </div>
            <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              {TABS.map(([k, l]) => (
                <Link key={k} to={`/account/${k === "overview" ? "" : k}`} className={`tab ${active === k ? "tab-active" : "tab-idle"}`}>{l}</Link>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}>
              {!data ? <ListSkeleton rows={4} /> : <TabBody tab={active} data={data} reload={load} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TabBody({ tab, data, reload }: { tab: string; data: any; reload: () => void }) {
  const { user, toast, currency, refreshUser, tr } = useStore();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [addrForm, setAddrForm] = useState({ label: "Home", name: "", phone: "", line1: "", line2: "", city: "", postal: "" });
  const [showAddr, setShowAddr] = useState(false);
  const [topup, setTopup] = useState("");
  const [refCode, setRefCode] = useState("");
  const [busy, setBusy] = useState(false);

  const dl = async (token: string) => {
    try {
      const d = await api<{ fileUrl: string; remaining: number }>(`/digital/download/${token}`);
      toast(`Download started — ${d.remaining} left`, "success");
      window.open(d.fileUrl, "_blank");
      reload();
    } catch (e: any) { toast(e.message, "error"); }
  };

  switch (tab) {
    case "overview": {
      const spark = (data.loyalty || []).slice(0, 12).reverse().map((t: any) => Math.max(0, t.points));
      return (
        <div>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <StatCard label="Loyalty points" value={data.user.loyaltyPoints} tone="brand" spark={spark}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" /></svg>} />
            <StatCard label="Wallet balance" value={money(data.user.walletBalance, currency)} tone="green"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M2 10h20" /></svg>} />
            <StatCard label="Tier" value={data.user.tier} tone="amber" sub="Earn more to level up"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h10l4 6-9 12L3 9z" /><path d="M3 9h18M12 21L8 9l4-6 4 6z" /></svg>} />
          </div>
          <div className="card !rounded-3xl p-6">
            <h3 className="font-extrabold mb-4">Recent loyalty activity</h3>
            {data.loyalty.length === 0 ? <p className="text-sm text-slate-400">No activity yet — shop to earn points.</p> :
              <div className="space-y-2 text-sm">{data.loyalty.slice(0, 6).map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                  <span className="text-slate-600 dark:text-slate-300">{t.note || t.kind} <span className="text-slate-400">· {timeAgo(t.createdAt)}</span></span>
                  <span className={`font-extrabold tabular-nums ${t.points >= 0 ? "text-emerald-600" : "text-red-600"}`}>{t.points >= 0 ? "+" : ""}{t.points}</span>
                </div>
              ))}</div>}
          </div>
        </div>
      );
    }
    case "orders":
      return data.orders.length === 0 ? <EmptyState kind="orders" title="No orders yet" hint="Your orders will appear here once you shop." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} /> : (
        <div className="space-y-2.5">
          {data.orders.map((o: any, i: number) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}>
              <Link to={`/order/${o.id}`} className="card card-hover p-5 flex items-center justify-between">
                <div><p className="font-extrabold font-mono">{o.orderNumber}</p><p className="text-xs text-slate-500 mt-0.5">{new Date(o.createdAt).toLocaleString()} · {o.items.length} items</p></div>
                <div className="text-right"><Price pkr={o.total} /><p className="mt-1"><span className="badge bg-slate-100 dark:bg-white/10">{o.status}</span></p></div>
              </Link>
            </motion.div>
          ))}
        </div>
      );
    case "returns":
      return data.returns.length === 0 ? <EmptyState title="No returns" hint="Return requests you make will show up here." /> : (
        <div className="space-y-2.5">{data.returns.map((r: any) => (
          <div key={r.id} className="card p-5"><p className="font-bold">Return for <span className="font-mono">{r.orderId?.orderNumber}</span></p><p className="text-sm text-slate-500 mt-1">{r.reason}</p><span className="badge bg-slate-100 dark:bg-white/10 mt-2">{r.status}</span></div>
        ))}</div>
      );
    case "addresses":
      return (
        <div>
          <button className="btn-ghost btn-sm mb-4" onClick={() => setShowAddr(!showAddr)}>+ Add address</button>
          <AnimatePresence>
            {showAddr && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="card !rounded-3xl p-5 grid sm:grid-cols-2 gap-3 mb-4">
                  {Object.keys(addrForm).map((k) => (
                    <Field key={k} label={k}><input value={(addrForm as any)[k]} onChange={(e) => setAddrForm({ ...addrForm, [k]: e.target.value })} className="input" /></Field>
                  ))}
                  <div className="sm:col-span-2"><button className="btn-primary btn-sm" onClick={async () => {
                    try { await api("/addresses", { method: "POST", body: addrForm }); toast("Address saved", "success"); setShowAddr(false); reload(); }
                    catch (e: any) { toast(e.message, "error"); }
                  }}>Save address</button></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid sm:grid-cols-2 gap-3.5">
            {data.addresses.map((a: any) => (
              <div key={a.id} className="card card-hover p-5">
                <p className="font-bold">{a.label} {a.isDefault && <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ml-1">Default</span>}</p>
                <p className="text-sm text-slate-500 mt-1">{a.name} · {a.phone}</p>
                <p className="text-sm text-slate-500">{a.line1}, {a.city}</p>
                <button className="text-xs font-bold text-red-600 mt-2.5 hover:underline" onClick={async () => { await api(`/addresses/${a.id}`, { method: "DELETE" }); reload(); }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      );
    case "wallet":
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card !rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Wallet balance</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{money(data.user.walletBalance, currency)}</p>
              <div className="flex gap-2 mt-4"><input value={topup} onChange={(e) => setTopup(e.target.value)} placeholder="Amount (min Rs 100)" type="number" className="input" />
                <motion.button whileTap={{ scale: 0.97 }} className="btn-primary btn-sm shrink-0" disabled={busy} onClick={async () => { setBusy(true); try { await api("/orders/wallet/topup", { method: "POST", body: { amount: Number(topup) } }); toast("Wallet topped up", "success"); setTopup(""); reload(); refreshUser(); } catch (e: any) { toast(e.message, "error"); } setBusy(false); }}>
                  {busy ? <Spinner light size={14} /> : "Top up"}</motion.button></div>
            </div>
            <div className="card !rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-brand-500/10 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loyalty points</p>
              <p className="text-3xl font-extrabold text-brand-600 mt-1">{data.user.loyaltyPoints}</p>
              <p className="text-xs text-slate-400 mt-2">Tier: <b>{data.user.tier}</b> · Earn 1 pt per Rs 100 spent</p>
            </div>
          </div>
          <div className="card !rounded-3xl p-6">
            <h3 className="font-extrabold mb-4">Transaction history</h3>
            <div className="space-y-1.5 text-sm max-h-72 overflow-y-auto pr-1">
              {[...data.wallet.map((t: any) => ({ ...t, label: `${t.kind}: ${t.note || ""}` })), ...data.loyalty.map((t: any) => ({ ...t, label: `Loyalty ${t.kind}: ${t.note || ""}` }))].map((t: any) => (
                <div key={t.id} className="flex justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03]"><span className="text-slate-600 dark:text-slate-300">{t.label} <span className="text-slate-400">· {timeAgo(t.createdAt)}</span></span><span className={`font-bold tabular-nums ${(t.amount ?? t.points) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{(t.amount ?? t.points) >= 0 ? "+" : ""}{t.amount ?? t.points}</span></div>
              ))}
            </div>
          </div>
        </div>
      );
    case "alerts":
      return data.alerts.length === 0 ? <EmptyState title="No alerts set" hint="Set price or stock alerts from any product page." /> : (
        <div className="space-y-2.5">{data.alerts.map((a: any) => (
          <div key={a.id} className="card p-5 flex items-center justify-between">
            <div><p className="font-bold">{a.product?.name}</p><p className="text-sm text-slate-500 mt-0.5">{a.type} alert{a.targetPrice ? ` — target ${money(a.targetPrice, currency)}` : ""}</p></div>
            <button className="text-xs font-bold text-red-600 hover:underline" onClick={async () => { await api(`/alerts/${a.id}`, { method: "DELETE" }); reload(); }}>Remove</button>
          </div>
        ))}</div>
      );
    case "tickets":
      return data.tickets.length === 0 ? <EmptyState title="No tickets" hint="Need help? Open a support ticket from the Help Centre." /> : (
        <div className="space-y-2.5">{data.tickets.map((t: any) => (
          <Link key={t.id} to={`/account/tickets/${t.id}`} className="card card-hover p-5 flex items-center justify-between">
            <div><p className="font-bold">{t.subject}</p><p className="text-xs text-slate-500 mt-0.5">{timeAgo(t.createdAt)}</p></div>
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{t.status}</span>
          </Link>
        ))}</div>
      );
    case "notifications":
      return data.notifications.length === 0 ? <EmptyState title="No notifications" hint="Order updates and offers will appear here." /> : (
        <div className="space-y-2.5">
          <button className="btn-ghost btn-sm" onClick={async () => { await api("/notifications/read", { method: "POST", body: {} }); reload(); }}>Mark all read</button>
          {data.notifications.map((n: any) => (
            <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`card p-5 ${n.isRead ? "opacity-60" : "border-l-4 !border-l-brand-600"}`}>
              <p className="font-bold text-sm">{n.title}</p><p className="text-sm text-slate-500 mt-0.5">{n.body}</p><p className="text-xs text-slate-400 mt-1.5">{timeAgo(n.createdAt)}</p>
            </motion.div>
          ))}
        </div>
      );
    case "referrals":
      return (
        <div className="card !rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <h3 className="font-extrabold text-lg">Invite friends, earn {data.rewardPoints} points each</h3>
          </div>
          <div className="flex gap-2 my-5"><input value={data.myCode || ""} readOnly className="input font-mono font-bold text-center tracking-[0.2em]" /><button className="btn-ghost btn-sm shrink-0" onClick={() => { navigator.clipboard.writeText(data.myCode || ""); toast("Code copied", "success"); }}>Copy</button></div>
          <div className="flex gap-2 mb-6"><input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="Have a friend's code? Enter it" className="input font-mono" />
            <button className="btn-primary btn-sm shrink-0" onClick={async () => { try { await api("/referrals/apply", { method: "POST", body: { code: refCode } }); toast("Referral applied", "success"); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Apply</button></div>
          <h4 className="font-extrabold mb-3">My referrals ({data.referrals.length})</h4>
          {data.referrals.length === 0 ? <p className="text-sm text-slate-400">No referrals yet — share your code to start earning.</p> :
            <div className="space-y-2 text-sm">{data.referrals.map((r: any) => <div key={r.id} className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><span>{r.referredEmail} · {r.status}</span><span className="text-emerald-600 font-extrabold">+{r.pointsAwarded} pts</span></div>)}</div>}
        </div>
      );
    case "subscriptions":
      return data.subscriptions.length === 0 ? <EmptyState title="No subscriptions" hint="Subscribe to a product from its page for recurring delivery." /> : (
        <div className="space-y-2.5">{data.subscriptions.map((s: any) => (
          <div key={s.id} className="card p-5 flex items-center justify-between flex-wrap gap-3">
            <div><p className="font-bold">{s.productId?.name} × {s.qty}</p><p className="text-sm text-slate-500 mt-0.5">Every {s.intervalDays} days · Next: {s.nextRunAt ? new Date(s.nextRunAt).toLocaleDateString() : "-"}</p></div>
            <div className="flex gap-2 items-center">
              <span className="badge bg-slate-100 dark:bg-white/10">{s.status}</span>
              {s.status === "ACTIVE" && <button className="btn-ghost btn-sm" onClick={async () => { await api(`/subscriptions/${s.id}`, { method: "PUT", body: { status: "PAUSED" } }); reload(); }}>Pause</button>}
              {s.status === "PAUSED" && <button className="btn-ghost btn-sm" onClick={async () => { await api(`/subscriptions/${s.id}`, { method: "PUT", body: { status: "ACTIVE" } }); reload(); }}>Resume</button>}
              <button className="text-xs font-bold text-red-600 hover:underline" onClick={async () => { await api(`/subscriptions/${s.id}`, { method: "PUT", body: { status: "CANCELLED" } }); reload(); }}>Cancel</button>
            </div>
          </div>
        ))}</div>
      );
    case "preorders":
      return data.preorders.length === 0 ? <EmptyState title="No pre-orders" hint="Pre-order out-of-stock products from their pages." /> : (
        <div className="space-y-2.5">{data.preorders.map((p: any) => (
          <div key={p.id} className="card p-5 flex items-center justify-between">
            <div><p className="font-bold">{p.productId?.name} × {p.qty}</p><p className="text-sm text-slate-500 mt-0.5">Expected: {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "-"}</p></div>
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{p.status}</span>
          </div>
        ))}</div>
      );
    case "downloads":
      return data.downloads.length === 0 ? <EmptyState title="No downloads" hint="Digital products you buy appear here." /> : (
        <div className="space-y-2.5">{data.downloads.map((d: any) => (
          <div key={d.id} className="card p-5 flex items-center justify-between">
            <div><p className="font-bold">{d.digitalFileId?.fileName}</p><p className="text-sm text-slate-500 mt-0.5">{d.remaining} downloads left</p></div>
            <button className="btn-primary btn-sm" onClick={() => dl(d.token)} disabled={d.remaining <= 0}>Download</button>
          </div>
        ))}</div>
      );
    case "profile":
      return (
        <div className="card !rounded-3xl p-6 max-w-md">
          <h3 className="font-extrabold text-lg mb-4">Profile settings</h3>
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
          <button className="btn-primary" onClick={async () => { try { await api("/auth/profile", { method: "PUT", body: form }); toast("Profile updated", "success"); refreshUser(); } catch (e: any) { toast(e.message, "error"); } }}>Save changes</button>
        </div>
      );
    default:
      return null;
  }
}

export function TicketThread() {
  const { id } = useParams();
  const { toast } = useStore();
  const [data, setData] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api(`/tickets/${id}`).then(setData).catch(() => {});
  useEffect(() => { load(); }, [id]);
  const send = async () => {
    if (!reply.trim() || busy) return;
    setBusy(true);
    try { await api(`/tickets/${id}/reply`, { method: "POST", body: { body: reply } }); setReply(""); load(); }
    catch (e: any) { toast(e.message, "error"); }
    setBusy(false);
  };
  if (!data) return <div className="max-w-3xl mx-auto px-4 mt-6 space-y-3"><Skeleton className="h-8 w-2/3 !rounded-xl" /><Skeleton className="h-24 !rounded-2xl" /><Skeleton className="h-24 !rounded-2xl" /></div>;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-4 mt-6">
      <h1 className="text-xl font-extrabold tracking-tight">{data.ticket.subject} <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ml-2">{data.ticket.status}</span></h1>
      <div className="space-y-3 mt-5">
        {data.messages.map((m: any, i: number) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.5) }}
            className={`p-4 rounded-2xl max-w-[82%] text-sm shadow-card ${m.sender === "ADMIN" ? "ml-auto text-white rounded-br-md" : "card rounded-bl-md"}`}
            style={m.sender === "ADMIN" ? { background: "linear-gradient(135deg,#3b6df6,#1f4fd8)" } : undefined}>
            <p className={`text-[11px] font-bold mb-1 ${m.sender === "ADMIN" ? "text-white/70" : "text-slate-400"}`}>{m.sender} · {timeAgo(m.createdAt)}</p>
            <p className="leading-relaxed">{m.body}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2 mt-5">
        <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply..." className="input" onKeyDown={(e) => e.key === "Enter" && send()} />
        <motion.button whileTap={{ scale: 0.95 }} className="btn-primary shrink-0 min-w-[90px]" onClick={send} disabled={busy}>
          {busy ? <Spinner light size={16} /> : "Send"}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function NotificationsPage() {
  const { user } = useStore();
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { if (user) api("/notifications").then((d: any) => setList(d.notifications)).catch(() => setList([])); }, [user]);
  return (
    <div className="max-w-3xl mx-auto px-4 mt-6">
      <PageHeader title="Notifications" />
      {!user ? <EmptyState title="Login to see notifications" /> : list === null ? <ListSkeleton rows={4} /> : list.length === 0 ? <EmptyState title="No notifications" /> : (
        <div className="space-y-2.5">{list.map((n: any, i: number) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className="card p-5"><p className="font-bold text-sm">{n.title}</p><p className="text-sm text-slate-500 mt-0.5">{n.body}</p><p className="text-xs text-slate-400 mt-1.5">{timeAgo(n.createdAt)}</p></motion.div>
        ))}</div>
      )}
    </div>
  );
}
