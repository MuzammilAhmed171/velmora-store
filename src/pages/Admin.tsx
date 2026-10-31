import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, API_BASE } from "../lib/api";
import { useStore } from "../context/Store";
import { money, timeAgo } from "../lib/format";
import { Field, EmptyState, Price, Modal, DashboardSkeleton, TableSkeleton, EASE } from "../components/ui";
import { Invoice } from "./TrackOrder";

const TABS = [
  ["dashboard", "Dashboard"], ["settings", "Store Control"], ["products", "Products"], ["orders", "Orders"],
  ["returns", "Returns"], ["customers", "Customers"], ["campaigns", "Marketing"], ["content", "Content"],
  ["tickets", "Support"], ["chat", "Live Chat"], ["integrations", "Platform"], ["analytics", "Analytics"],
  ["fraud", "Fraud Queue"], ["coupons", "Coupons"], ["flashdeals", "Flash Deals"], ["banners", "Banners"],
  ["giftcards", "Gift Cards"], ["brands", "Brands"], ["blog", "Blog"], ["faqs", "FAQs"],
  ["reviews", "Reviews"], ["questions", "Q&A"], ["sellers", "Sellers"], ["warehouses", "Warehouses"],
  ["subscribers", "Newsletter"], ["seo", "SEO"], ["tax", "GST / Tax"],
];

export default function Admin() {
  const { user } = useStore();
  const { tab } = useParams();
  const nav = useNavigate();
  const active = tab || "dashboard";

  useEffect(() => {
    if (user && user.role !== "ADMIN") nav("/");
    else if (!user) nav("/login");
  }, [user]);

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8">
      <h1 className="text-4xl md:text-[40px] font-extrabold tracking-tight">Admin Panel</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2 text-[15px]">Velmora store management — every part of the store, fully live</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-5">
        {TABS.map(([k, l]) => (
          <Link key={k} to={`/admin/${k === "dashboard" ? "" : k}`}
            className={`shrink-0 px-5 py-2.5 rounded-full text-[14px] font-semibold border transition-all whitespace-nowrap ${active === k
              ? "bg-[#1c1c1c] dark:bg-ember-600 text-white border-transparent shadow-pop"
              : "bg-white dark:bg-white/[0.04] border-[#e5ddcc] dark:border-white/10 text-char-soft dark:text-slate-200 hover:border-ember-600/50 hover:text-ember-700 dark:hover:text-ember-300"}`}>
            {l}
          </Link>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}>
          <AdminBody tab={active} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ChatInbox() {
  const { toast } = useStore();
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = () => api<{ threads: any[] }>("/admin/chat-threads").then((d) => setThreads(d.threads)).catch(() => {});
  useEffect(() => { loadThreads(); const id = setInterval(loadThreads, 15000); return () => clearInterval(id); }, []);

  const open = async (t: any) => {
    setActive(t);
    const d = await api<{ messages: any[] }>(`/admin/chat-threads/${t.id}/messages`).catch(() => ({ messages: [] }));
    setMessages(d.messages);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const reply = async () => {
    if (!draft.trim() || !active) return;
    try {
      const d = await api<{ message: any }>(`/admin/chat-threads/${active.id}/reply`, { method: "POST", body: { body: draft } });
      setMessages((m) => [...m, d.message]);
      setDraft("");
      loadThreads();
    } catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card !rounded-3xl p-3 max-h-[70vh] overflow-y-auto">
        <h3 className="font-extrabold text-[16px] px-3 pt-2 pb-3">Conversations</h3>
        {threads.length === 0 ? <p className="text-sm text-slate-400 px-3 pb-3">No chat threads yet.</p> :
          threads.map((t) => (
            <button key={t.id} onClick={() => open(t)}
              className={`w-full text-left p-3.5 rounded-2xl transition-colors ${active?.id === t.id ? "bg-ember-600/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"}`}>
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold text-sm truncate">{t.userId?.name || t.userId?.email || "Guest"}</span>
                <span className="badge bg-slate-100 dark:bg-white/10 shrink-0">{t.messageCount}</span>
              </div>
              <p className="text-[13px] text-slate-500 truncate mt-1">{t.lastMessage?.body || "—"}</p>
            </button>
          ))}
      </div>
      <div className="md:col-span-2 card !rounded-3xl p-5 flex flex-col min-h-[60vh] max-h-[70vh]">
        {!active ? <p className="text-slate-400 m-auto">Select a conversation to reply.</p> : (
          <>
            <h3 className="font-extrabold text-[17px] mb-4">Chat with {active.userId?.name || active.userId?.email || "Guest"}</h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "ADMIN" ? "ml-auto bg-ember-600 text-white" : "bg-slate-100 dark:bg-white/10"}`}>
                  {m.body}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reply()} placeholder="Type a reply..." className="input flex-1" />
              <button className="btn-primary" onClick={reply}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminBody({ tab }: { tab: string }) {
  const { toast, currency } = useStore();
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  if (invoiceOrder) {
    return (
      <div>
        <button className="btn-ghost mb-4" onClick={() => setInvoiceOrder(null)}>← Back to orders</button>
        <div className="card !rounded-3xl p-6 max-w-3xl">
          <Invoice order={invoiceOrder} />
        </div>
      </div>
    );
  }

  const load = async () => {
    setData(null);
    try {
      switch (tab) {
        case "dashboard": {
          const [dash, prods, pending, settings] = await Promise.all([
            api("/admin/dashboard"),
            api("/admin/products").catch(() => ({ products: [] })),
            api("/admin/orders?status=PENDING").catch(() => ({ orders: [] })),
            api("/admin/settings").catch(() => ({ settings: {} })),
          ]);
          setData({ ...dash, allProducts: prods.products || [], pendingCount: (pending.orders || []).length, settingsCount: Object.keys(settings.settings || {}).length });
          break;
        }
        case "content": setData({ hub: true }); break;
        case "chat": setData(await api("/admin/chat-threads")); break;
        case "products": setData(await api(`/admin/products${q ? `?q=${encodeURIComponent(q)}` : ""}`)); break;
        case "orders": setData(await api(`/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`)); break;
        case "fraud": setData(await api("/admin/fraud")); break;
        case "returns": setData(await api("/admin/returns")); break;
        case "customers": setData(await api(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`)); break;
        case "coupons": setData(await api("/admin/coupons")); break;
        case "flashdeals": setData(await api("/admin/flash-deals")); break;
        case "banners": setData(await api("/admin/banners")); break;
        case "giftcards": setData(await api("/admin/gift-cards")); break;
        case "categories": setData(await api("/admin/categories")); break;
        case "brands": setData(await api("/admin/brands")); break;
        case "blog": setData(await api("/admin/blog")); break;
        case "faqs": setData(await api("/admin/faqs")); break;
        case "tickets": setData(await api("/admin/tickets")); break;
        case "reviews": setData(await api("/admin/reviews")); break;
        case "questions": setData(await api("/admin/questions")); break;
        case "sellers": setData(await api("/sellers/admin/list")); break;
        case "warehouses": {
          const [wh, stock, transfers, logs] = await Promise.all([api("/warehouses"), api("/warehouses/stock"), api("/warehouses/transfers"), api("/admin/inventory-logs")]);
          setData({ ...wh, ...stock, ...transfers, ...logs });
          break;
        }
        case "campaigns": setData(await api("/admin/campaigns")); break;
        case "subscribers": setData(await api("/admin/subscribers")); break;
        case "analytics": setData(await api("/admin/analytics/overview")); break;
        case "seo": setData(await api("/admin/seo")); break;
        case "integrations": setData(await api("/admin/integrations")); break;
        case "tax": setData(await api("/admin/tax-report")); break;
        case "settings": setData(await api("/admin/settings")); break;
      }
    } catch (e: any) { toast(e.message, "error"); }
  };

  useEffect(() => { load(); setSelected([]); }, [tab]);

  const reload = load;
  if (!data) return tab === "dashboard" ? <DashboardSkeleton /> : <TableSkeleton rows={8} cols={5} />;

  const th = "text-left px-3 py-2 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap";
  const td = "px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 align-middle";

  /* ---------- DASHBOARD ---------- */
  if (tab === "dashboard") {
    const kpis = data.kpis;
    const prods: any[] = data.allProducts || [];
    const liveCount = prods.filter((p) => p.isActive !== false).length;
    const totalCount = prods.length;
    const inventoryValue = prods.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
    const grossProfit = prods.reduce((s, p) => s + ((p.price || 0) - (p.cost || 0)) * (p.sold || 0), 0);
    const unitsSold = prods.reduce((s, p) => s + (p.sold || 0), 0);
    const avgOrder = kpis.orders > 0 ? kpis.revenue / kpis.orders : 0;
    const newest = [...prods].sort((a, b) => String(b._id).localeCompare(String(a._id)))[0];
    const max = Math.max(1, ...data.revenueChart.map((d: any) => d.total));

    const syncStats: [React.ReactNode, string][] = [
      [`${liveCount}/${totalCount}`, "PRODUCTS LIVE"],
      [kpis.orders, "ORDERS"],
      [data.pendingCount ?? 0, "PENDING"],
      [money(kpis.revenue, currency), "REVENUE"],
      [data.settingsCount ?? 0, "SETTINGS KEYS"],
      [(data.lowStock || []).length, "UNREAD ALERTS"],
    ];
    const kpiCards: [string, React.ReactNode][] = [
      ["TOTAL REVENUE", money(kpis.revenue, currency)],
      ["TOTAL ORDERS", kpis.orders],
      ["PRODUCTS IN CATALOG", kpis.products],
      ["UNIQUE CUSTOMERS", kpis.customers],
      ["AVG ORDER VALUE", money(avgOrder, currency)],
      ["GROSS PROFIT (EST.)", money(grossProfit, currency)],
      ["UNITS SOLD", unitsSold.toLocaleString()],
      ["INVENTORY VALUE", money(inventoryValue, currency)],
    ];

    return (
      <div>
        {/* live sync + activity */}
        <div className="grid lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-5 rounded-3xl bg-[#151515] p-6 shadow-lift">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-extrabold text-[18px] tracking-tight">Live Sync — Admin to Storefront</h3>
              <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-emerald-400 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {syncStats.map(([v, l]) => (
                <div key={l} className="bg-[#262626] rounded-2xl p-4 text-center">
                  <p className="text-white font-extrabold text-[19px]">{v}</p>
                  <p className="text-[#8a8a8a] text-[10px] font-bold tracking-[0.08em] mt-1.5">{l}</p>
                </div>
              ))}
            </div>
            <p className="text-[#8a8a8a] text-[13px] leading-relaxed mt-5">
              {kpis.orders === 0 ? "No orders yet · " : ""}Newest product: {newest?.name || "—"}. Every change you save here reaches the public store within seconds — the storefront refetches automatically.
            </p>
          </div>
          <div className="lg:col-span-7 card !rounded-3xl p-6">
            <h3 className="font-extrabold text-[18px] tracking-tight mb-3">Live Activity Feed</h3>
            {data.recentOrders.length === 0 ? (
              <p className="text-slate-400 text-[15px]">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {data.recentOrders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-white/[0.05] last:border-0">
                    <span className="font-mono font-bold">{o.orderNumber}</span>
                    <span className="flex items-center gap-2"><Price pkr={o.total} /><span className="badge bg-slate-100 dark:bg-white/10">{o.status}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {kpiCards.map(([l, v], i) => (
            <motion.div key={l} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-2xl bg-[#151515] p-5 shadow-lift">
              <p className="text-[#8a8a8a] text-[11px] font-bold tracking-[0.08em]">{l}</p>
              <p className="text-white font-extrabold text-[26px] tracking-tight mt-2">{v}</p>
            </motion.div>
          ))}
        </div>

        {/* revenue chart + low stock */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card !rounded-3xl p-6">
            <h3 className="font-extrabold text-[18px] tracking-tight mb-4">Revenue — Last 14 Days</h3>
            <div className="flex items-end gap-1.5 h-44">
              {data.revenueChart.map((d: any, i: number) => (
                <div key={d._id} className="flex-1 flex flex-col items-center group relative" title={`${d._id}: ${money(d.total, currency)} (${d.count} orders)`}>
                  <motion.div className="w-full rounded-t-md cursor-pointer bg-ember-600"
                    initial={{ height: 4 }} animate={{ height: `${Math.max(3, (d.total / max) * 100)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.04, ease: EASE }}
                    whileHover={{ filter: "brightness(1.25)" }} />
                  <span className="text-[9px] text-slate-400 mt-1.5 font-semibold">{d._id.slice(5)}</span>
                  <span className="absolute -top-9 hidden group-hover:block bg-ink-950 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lift">
                    {money(d.total, currency)} · {d.count} orders
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card !rounded-3xl p-6">
            <h3 className="font-extrabold text-[18px] tracking-tight mb-4">Low Stock Alerts ({data.lowStock.length})</h3>
            {data.lowStock.length === 0 ? <p className="text-sm text-slate-400">All stocked up.</p> :
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {data.lowStock.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-white/[0.05] last:border-0 gap-2">
                    <span className="truncate font-medium flex-1">{p.name}</span>
                    <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0">{p.stock} left</span>
                    <button className="btn-ghost btn-sm shrink-0" onClick={async () => {
                      await api("/admin/products/bulk-restock", { method: "POST", body: { ids: [p.id], qty: 50 } });
                      toast("Restocked +50", "success"); reload();
                    }}>+50</button>
                  </div>
                ))}
              </div>}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- CONTENT HUB ---------- */
  if (tab === "content") {
    const hubs = [
      ["Categories", "Organize products into browsable categories", "/admin/categories", "M3 3h18v18H3zM3 9h18M9 21V9"],
      ["Brands", "Manage product brands", "/admin/brands", "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"],
      ["Blog", "Publish stories and guides", "/admin/blog", "M4 4h16v12H4zM4 20h16M8 8h8M8 12h5"],
      ["FAQs", "Answer common questions", "/admin/faqs", "M12 2a10 10 0 100 20 10 10 0 000-20zM9.2 9a2.9 2.9 0 015.6 1c0 1.9-2.8 2.6-2.8 3.9M12 17.5h.01"],
    ];
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hubs.map(([t, d, to, icon], i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link to={to} className="card card-hover p-6 block">
              <span className="w-12 h-12 rounded-2xl bg-ember-600/10 text-ember-600 dark:text-ember-400 flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
              </span>
              <p className="font-extrabold text-[17px]">{t}</p>
              <p className="text-sm text-slate-500 mt-1">{d}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    );
  }

  /* ---------- LIVE CHAT INBOX ---------- */
  if (tab === "chat") {
    return <ChatInbox />;
  }

  /* ---------- PRODUCTS ---------- */
  if (tab === "products") {
    const save = async (p: any) => {
      try {
        if (p.id) await api(`/admin/products/${p.id}`, { method: "PUT", body: p });
        else await api("/admin/products", { method: "POST", body: p });
        toast("Saved", "success"); setEditing(null); reload();
      } catch (e: any) { toast(e.message, "error"); }
    };
    return (
      <div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search SKU or name..." className="input !w-64" />
          <button className="btn-ghost text-sm" onClick={load}>Search</button>
          <a className="btn-ghost text-sm" href={`${API_BASE}/api/admin/products/export`} target="_blank" rel="noreferrer">Export CSV</a>
          <button className="btn-primary text-sm ml-auto" onClick={() => setEditing({})}>+ Add product</button>
        </div>
        {selected.length > 0 && (
          <div className="card p-3 mb-3 flex gap-2 items-center text-sm">
            <span>{selected.length} selected</span>
            <button className="btn-ghost text-xs" onClick={async () => { const qty = prompt("Add stock qty:", "50"); if (qty) { await api("/admin/products/bulk-restock", { method: "POST", body: { ids: selected, qty: Number(qty) } }); reload(); } }}>Bulk restock</button>
            <button className="btn-ghost text-xs" onClick={async () => { if (confirm("Delete selected?")) { await api("/admin/products/bulk-delete", { method: "POST", body: { ids: selected } }); reload(); } }}>Bulk delete</button>
          </div>
        )}
        <div className="card overflow-x-auto">
          <table className="table min-w-[800px]">
            <thead><tr><th className={th}></th><th className={th}>Product</th><th className={th}>SKU</th><th className={th}>Price</th><th className={th}>Stock</th><th className={th}>Sold</th><th className={th}>Actions</th></tr></thead>
            <tbody>
              {data.products.map((p: any) => (
                <tr key={p.id}>
                  <td className={td}><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))} /></td>
                  <td className={td}><div className="flex items-center gap-2"><img src={p.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" /><span className="max-w-[220px] truncate">{p.name}</span></div></td>
                  <td className={td + " text-xs"}>{p.sku}</td>
                  <td className={td}><Price pkr={p.price} /></td>
                  <td className={td + (p.stock < 10 ? " text-red-600 font-medium" : "")}>{p.stock}</td>
                  <td className={td}>{p.sold}</td>
                  <td className={td}>
                    <div className="flex gap-1 text-xs">
                      <button className="text-brand-600" onClick={() => setEditing(p)}>Edit</button>
                      <button className="text-slate-500" onClick={async () => { await api(`/admin/products/${p.id}/duplicate`, { method: "POST" }); toast("Duplicated", "success"); reload(); }}>Duplicate</button>
                      <a className="text-slate-500" href={`${API_BASE}/api/admin/products/${p.id}/label`} target="_blank" rel="noreferrer">Label</a>
                      <button className="text-red-600" onClick={async () => { if (confirm("Delete?")) { await api(`/admin/products/${p.id}`, { method: "DELETE" }); reload(); } }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ProductFormModal p={editing} onClose={() => setEditing(null)} onSave={save} />
      </div>
    );
  }

  /* ---------- ORDERS ---------- */
  if (tab === "orders" || tab === "fraud") {
    const list = tab === "orders" ? data.orders : data.orders;
    const update = async (id: string, body: any) => {
      try { await api(`/admin/orders/${id}`, { method: "PUT", body }); toast("Order updated", "success"); reload(); }
      catch (e: any) { toast(e.message, "error"); }
    };
    return (
      <div>
        {tab === "orders" && (
          <div className="flex gap-2 mb-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search order #, phone, email..." className="input !w-72" />
            <button className="btn-ghost text-sm" onClick={load}>Search</button>
          </div>
        )}
        <div className="space-y-2">
          {list.map((o: any) => (
            <details key={o.id} className="card p-4">
              <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-2">
                <div><span className="font-semibold">{o.orderNumber}</span> <span className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</span>
                  {o.riskScore >= 50 && <span className="badge bg-red-100 text-red-700 ml-2">Risk {o.riskScore}</span>}</div>
                <div className="flex items-center gap-2"><Price pkr={o.total} /><span className="badge bg-slate-100 dark:bg-slate-800">{o.status}</span></div>
              </summary>
              <div className="mt-3 text-sm grid md:grid-cols-2 gap-3">
                <div>
                  <p><b>Customer:</b> {o.address?.name} · {o.address?.phone}</p>
                  <p><b>Address:</b> {o.address?.line1}, {o.address?.city}</p>
                  <p><b>Payment:</b> {o.paymentMethod} ({o.paymentStatus})</p>
                  <p><b>Items:</b> {o.items.map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</p>
                  {o.couponCode && <p><b>Coupon:</b> {o.couponCode}</p>}
                  {o.notes && <p><b>Notes:</b> {o.notes}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select id={`st-${o.id}`} defaultValue={o.status} className="input text-sm">
                      {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button className="btn-primary text-sm" onClick={() => {
                      const st = (document.getElementById(`st-${o.id}`) as HTMLSelectElement).value;
                      const note = prompt("Timeline note (optional):") || undefined;
                      const courier = prompt("Courier:", o.courier || "") || undefined;
                      const trackingNo = prompt("Tracking #:", o.trackingNo || "") || undefined;
                      const notify = confirm("Notify customer?");
                      update(o.id, { status: st, note, courier, trackingNo, notify });
                    }}>Update</button>
                    <button className="btn-ghost text-sm" onClick={() => setInvoiceOrder(o)}>Invoice</button>
                  </div>
                </div>
              </div>
            </details>
          ))}
          {list.length === 0 && <EmptyState title="No orders" />}
        </div>
      </div>
    );
  }

  /* ---------- RETURNS ---------- */
  if (tab === "returns") {
    return (
      <div className="space-y-2">
        {data.returns.map((r: any) => (
          <div key={r.id} className="card p-4 flex items-center justify-between flex-wrap gap-2">
            <div><p className="font-medium">{r.orderId?.orderNumber}</p><p className="text-sm text-slate-500">{r.reason}</p><p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p></div>
            <div className="flex gap-2 items-center">
              <span className="badge bg-slate-100 dark:bg-slate-800">{r.status}</span>
              {["REQUESTED", "APPROVED"].map((s) => (
                <button key={s} className="btn-ghost text-xs" onClick={async () => { await api(`/admin/returns/${r.id}`, { method: "PUT", body: { status: s === "REQUESTED" ? "APPROVED" : "REFUNDED" } }); toast("Updated", "success"); reload(); }}>
                  {s === "REQUESTED" ? "Approve" : "Refund to wallet"}
                </button>
              ))}
              <button className="text-xs text-red-600" onClick={async () => { await api(`/admin/returns/${r.id}`, { method: "PUT", body: { status: "REJECTED" } }); reload(); }}>Reject</button>
            </div>
          </div>
        ))}
        {data.returns.length === 0 && <EmptyState title="No returns" />}
      </div>
    );
  }

  /* ---------- CUSTOMERS ---------- */
  if (tab === "customers") {
    return (
      <div>
        <div className="flex gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name/email..." className="input !w-64" />
          <button className="btn-ghost text-sm" onClick={load}>Search</button>
        </div>
        <div className="card overflow-x-auto">
          <table className="table min-w-[800px]">
            <thead><tr><th className={th}>Customer</th><th className={th}>Segment</th><th className={th}>LTV</th><th className={th}>Orders</th><th className={th}>Loyalty</th><th className={th}>Wallet</th><th className={th}>Actions</th></tr></thead>
            <tbody>
              {data.customers.map((c: any) => (
                <tr key={c.id}>
                  <td className={td}><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.email}</p></td>
                  <td className={td}><span className="badge bg-brand-100 text-brand-700">{c.segment}</span></td>
                  <td className={td}><Price pkr={c.lifetimeValue} /></td>
                  <td className={td}>{c.orderCount}</td>
                  <td className={td}>{c.loyaltyPoints}</td>
                  <td className={td}><Price pkr={c.walletBalance} /></td>
                  <td className={td}><button className="text-brand-600 text-xs" onClick={() => {
                    const lp = Number(prompt("Adjust loyalty points (+/-):", "0") || 0);
                    const w = Number(prompt("Adjust wallet Rs (+/-):", "0") || 0);
                    const note = prompt("Note:", "Admin adjustment") || "";
                    api(`/admin/customers/${c.id}/adjust`, { method: "PUT", body: { loyaltyPoints: lp, walletBalance: w, note } }).then(() => { toast("Adjusted", "success"); reload(); }).catch((e: any) => toast(e.message, "error"));
                  }}>Adjust</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------- COUPONS ---------- */
  if (tab === "coupons") {
    const save = async (c: any) => {
      try {
        if (c.id) await api(`/admin/coupons/${c.id}`, { method: "PUT", body: c });
        else await api("/admin/coupons", { method: "POST", body: c });
        toast("Saved", "success"); setEditing(null); reload();
      } catch (e: any) { toast(e.message, "error"); }
    };
    return (
      <div>
        <button className="btn-primary text-sm mb-4" onClick={() => setEditing({})}>+ New coupon</button>
        <div className="card overflow-x-auto">
          <table className="table min-w-[700px]">
            <thead><tr><th className={th}>Code</th><th className={th}>Type</th><th className={th}>Value</th><th className={th}>Min order</th><th className={th}>Used</th><th className={th}>Active</th><th className={th}>Actions</th></tr></thead>
            <tbody>
              {data.coupons.map((c: any) => (
                <tr key={c.id}>
                  <td className={td + " font-mono font-bold"}>{c.code}</td>
                  <td className={td}>{c.kind}</td><td className={td}>{c.kind === "PERCENT" ? c.value + "%" : money(c.value, currency)}</td>
                  <td className={td}><Price pkr={c.minSubtotal} /></td>
                  <td className={td}>{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                  <td className={td}>{c.isActive ? "Yes" : "No"}</td>
                  <td className={td}><div className="flex gap-2 text-xs"><button className="text-brand-600" onClick={() => setEditing(c)}>Edit</button><button className="text-red-600" onClick={async () => { if (confirm("Delete?")) { await api(`/admin/coupons/${c.id}`, { method: "DELETE" }); reload(); } }}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Modal open={!!editing} onClose={() => setEditing(null)}>
          <h3 className="font-bold mb-4">{editing?.id ? "Edit" : "New"} coupon</h3>
          <CouponForm c={editing || {}} onSave={save} />
        </Modal>
      </div>
    );
  }

  /* ---------- FLASH DEALS ---------- */
  if (tab === "flashdeals") {
    const [pid, setPid] = useState(""); const [dp, setDp] = useState(""); const [ends, setEnds] = useState("");
    return (
      <div>
        <div className="card p-4 mb-4 grid sm:grid-cols-4 gap-3">
          <Field label="Product ID"><input value={pid} onChange={(e) => setPid(e.target.value)} className="input" placeholder="Paste product ID" /></Field>
          <Field label="Deal price"><input value={dp} onChange={(e) => setDp(e.target.value)} type="number" className="input" /></Field>
          <Field label="Ends at"><input value={ends} onChange={(e) => setEnds(e.target.value)} type="datetime-local" className="input" /></Field>
          <div><span className="label">&nbsp;</span><button className="btn-primary text-sm" onClick={async () => { try { await api("/admin/flash-deals", { method: "POST", body: { productId: pid, dealPrice: Number(dp), endsAt: ends } }); toast("Deal created", "success"); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Create</button></div>
        </div>
        <div className="space-y-2">
          {data.deals.map((d: any) => (
            <div key={d.id} className="card p-4 flex items-center justify-between">
              <div><p className="font-medium">{d.product?.name}</p><p className="text-sm text-slate-500">Deal: <Price pkr={d.dealPrice} /> · ends {new Date(d.endsAt).toLocaleString()}</p></div>
              <button className="text-xs text-red-600" onClick={async () => { await api(`/admin/flash-deals/${d.id}`, { method: "DELETE" }); reload(); }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- BANNERS ---------- */
  if (tab === "banners") {
    const save = async (b: any) => {
      try {
        if (b.id) await api(`/admin/banners/${b.id}`, { method: "PUT", body: b });
        else await api("/admin/banners", { method: "POST", body: b });
        toast("Saved", "success"); setEditing(null); reload();
      } catch (e: any) { toast(e.message, "error"); }
    };
    return (
      <div>
        <button className="btn-primary text-sm mb-4" onClick={() => setEditing({})}>+ New banner</button>
        <div className="grid md:grid-cols-2 gap-3">
          {data.banners.map((b: any) => (
            <div key={b.id} className="card p-4 flex gap-3">
              {b.image && <img src={b.image} alt="" className="w-24 h-16 object-cover rounded" />}
              <div className="flex-1"><p className="font-medium">{b.title}</p><p className="text-sm text-slate-500">{b.subtitle}</p></div>
              <div className="flex flex-col gap-1 text-xs"><button className="text-brand-600" onClick={() => setEditing(b)}>Edit</button><button className="text-red-600" onClick={async () => { await api(`/admin/banners/${b.id}`, { method: "DELETE" }); reload(); }}>Delete</button></div>
            </div>
          ))}
        </div>
        <Modal open={!!editing} onClose={() => setEditing(null)}>
          <h3 className="font-bold mb-4">Banner</h3>
          <BannerForm b={editing || {}} onSave={save} />
        </Modal>
      </div>
    );
  }

  /* ---------- GIFT CARDS ---------- */
  if (tab === "giftcards") {
    const [code, setCode] = useState(""); const [bal, setBal] = useState("");
    return (
      <div>
        <div className="card p-4 mb-4 flex gap-3 items-end flex-wrap">
          <Field label="Code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input uppercase" /></Field>
          <Field label="Balance (Rs)"><input value={bal} onChange={(e) => setBal(e.target.value)} type="number" className="input" /></Field>
          <button className="btn-primary text-sm" onClick={async () => { try { await api("/admin/gift-cards", { method: "POST", body: { code, balance: Number(bal) } }); toast("Created", "success"); setCode(""); setBal(""); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Create</button>
        </div>
        <div className="card overflow-x-auto"><table className="table">
          <thead><tr><th className={th}>Code</th><th className={th}>Balance</th><th className={th}>Initial</th><th className={th}>Active</th></tr></thead>
          <tbody>{data.giftCards.map((g: any) => <tr key={g.id}><td className={td + " font-mono"}>{g.code}</td><td className={td}><Price pkr={g.balance} /></td><td className={td}><Price pkr={g.initialBalance} /></td><td className={td}>{g.isActive ? "Yes" : "No"}</td></tr>)}</tbody>
        </table></div>
      </div>
    );
  }

  /* ---------- CATEGORIES / BRANDS ---------- */
  if (tab === "categories" || tab === "brands") {
    const ep = tab === "categories" ? "categories" : "brands";
    const [name, setName] = useState(""); const [desc, setDesc] = useState("");
    return (
      <div>
        <div className="card p-4 mb-4 flex gap-3 items-end flex-wrap">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <Field label="Description / image URL"><input value={desc} onChange={(e) => setDesc(e.target.value)} className="input" /></Field>
          <button className="btn-primary text-sm" onClick={async () => { try { await api(`/admin/${ep}`, { method: "POST", body: { name, description: desc } }); toast("Created", "success"); setName(""); setDesc(""); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Add</button>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {data[ep].map((c: any) => (
            <div key={c.id} className="card p-4 flex items-center justify-between">
              <div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.slug}</p></div>
              <button className="text-xs text-red-600" onClick={async () => { if (confirm("Delete?")) { await api(`/admin/${ep}/${c.id}`, { method: "DELETE" }); reload(); } }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- BLOG ---------- */
  if (tab === "blog") {
    const save = async (p: any) => {
      try {
        if (p.id) await api(`/admin/blog/${p.id}`, { method: "PUT", body: p });
        else await api("/admin/blog", { method: "POST", body: p });
        toast("Saved", "success"); setEditing(null); reload();
      } catch (e: any) { toast(e.message, "error"); }
    };
    return (
      <div>
        <button className="btn-primary text-sm mb-4" onClick={() => setEditing({})}>+ New post</button>
        <div className="space-y-2">
          {data.posts.map((p: any) => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div><p className="font-medium">{p.title}</p><p className="text-xs text-slate-500">{p.slug} · {p.isPublished ? "Published" : "Draft"}</p></div>
              <div className="flex gap-2 text-xs"><button className="text-brand-600" onClick={() => setEditing(p)}>Edit</button><button className="text-red-600" onClick={async () => { if (confirm("Delete?")) { await api(`/admin/blog/${p.id}`, { method: "DELETE" }); reload(); } }}>Delete</button></div>
            </div>
          ))}
        </div>
        <Modal open={!!editing} onClose={() => setEditing(null)} wide>
          <h3 className="font-bold mb-4">Blog post</h3>
          <BlogForm p={editing || {}} onSave={save} />
        </Modal>
      </div>
    );
  }

  /* ---------- FAQS ---------- */
  if (tab === "faqs") {
    const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState("");
    return (
      <div>
        <div className="card p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <Field label="Question"><input value={question} onChange={(e) => setQuestion(e.target.value)} className="input" /></Field>
          <Field label="Answer"><input value={answer} onChange={(e) => setAnswer(e.target.value)} className="input" /></Field>
          <div className="sm:col-span-2"><button className="btn-primary text-sm" onClick={async () => { await api("/admin/faqs", { method: "POST", body: { question, answer } }); toast("Added", "success"); setQuestion(""); setAnswer(""); reload(); }}>Add FAQ</button></div>
        </div>
        <div className="space-y-2">
          {data.faqs.map((f: any) => (
            <div key={f.id} className="card p-4 flex items-start justify-between gap-3">
              <div><p className="font-medium">{f.question}</p><p className="text-sm text-slate-500">{f.answer}</p></div>
              <button className="text-xs text-red-600 shrink-0" onClick={async () => { await api(`/admin/faqs/${f.id}`, { method: "DELETE" }); reload(); }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- TICKETS ---------- */
  if (tab === "tickets") {
    const [tid, setTid] = useState<string | null>(null);
    const [thread, setThread] = useState<any>(null);
    const [reply, setReply] = useState("");
    const open = async (id: string) => { setTid(id); setThread(await api(`/admin/tickets/${id}`)); };
    return (
      <div>
        <div className="space-y-2">
          {data.tickets.map((t: any) => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div><p className="font-medium">{t.subject}</p><p className="text-xs text-slate-500">{t.name} · {t.email} · {timeAgo(t.createdAt)}</p></div>
              <div className="flex gap-2 items-center">
                <span className="badge bg-slate-100 dark:bg-slate-800">{t.status}</span>
                <button className="btn-ghost text-xs" onClick={() => open(t.id)}>Open</button>
              </div>
            </div>
          ))}
        </div>
        <Modal open={!!tid} onClose={() => { setTid(null); setThread(null); }} wide>
          {thread && (
            <div>
              <h3 className="font-bold">{thread.ticket.subject}</h3>
              <div className="space-y-2 my-4 max-h-64 overflow-y-auto">
                {thread.messages.map((m: any) => (
                  <div key={m.id} className={`p-2.5 rounded-lg text-sm max-w-[85%] ${m.sender === "ADMIN" ? "bg-brand-50 dark:bg-brand-900/20 ml-auto" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <p className="text-xs text-slate-500">{m.sender}</p><p>{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." className="input" />
                <button className="btn-primary text-sm" onClick={async () => { await api(`/admin/tickets/${tid}/reply`, { method: "POST", body: { body: reply } }); setReply(""); open(tid!); reload(); }}>Send</button>
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                  <button key={s} className="btn-ghost !py-1" onClick={async () => { await api(`/admin/tickets/${tid}`, { method: "PUT", body: { status: s } }); open(tid!); reload(); }}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  /* ---------- REVIEWS ---------- */
  if (tab === "reviews") {
    return (
      <div className="space-y-2">
        {data.reviews.map((r: any) => (
          <div key={r.id} className="card p-4 flex items-start justify-between gap-3">
            <div><p className="font-medium text-sm">{r.product?.name}</p><p className="text-sm">{r.rating}★ — {r.body}</p><p className="text-xs text-slate-500">{r.authorName} · {timeAgo(r.createdAt)}</p></div>
            <div className="flex gap-2 text-xs shrink-0">
              <button className="text-brand-600" onClick={async () => { await api(`/admin/reviews/${r.id}`, { method: "PUT", body: { isApproved: !r.isApproved } }); reload(); }}>{r.isApproved ? "Hide" : "Approve"}</button>
              <button className="text-red-600" onClick={async () => { if (confirm("Delete?")) { await api(`/admin/reviews/${r.id}`, { method: "DELETE" }); reload(); } }}>Delete</button>
            </div>
          </div>
        ))}
        {data.reviews.length === 0 && <EmptyState title="No reviews" />}
      </div>
    );
  }

  /* ---------- Q&A ---------- */
  if (tab === "questions") {
    const [ans, setAns] = useState<Record<string, string>>({});
    return (
      <div className="space-y-2">
        {data.questions.map((q: any) => (
          <div key={q.id} className="card p-4">
            <p className="text-sm"><b>Q:</b> {q.question} <span className="text-slate-400">({q.product?.name})</span></p>
            {q.answer ? <p className="text-sm mt-1 text-slate-600 dark:text-slate-300"><b>A:</b> {q.answer}</p> : (
              <div className="flex gap-2 mt-2">
                <input value={ans[q.id] || ""} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} placeholder="Write answer..." className="input" />
                <button className="btn-primary text-sm" onClick={async () => { await api(`/admin/questions/${q.id}`, { method: "PUT", body: { answer: ans[q.id] } }); toast("Answered", "success"); reload(); }}>Answer</button>
              </div>
            )}
          </div>
        ))}
        {data.questions.length === 0 && <EmptyState title="No questions" />}
      </div>
    );
  }

  /* ---------- SELLERS ---------- */
  if (tab === "sellers") {
    return (
      <div className="space-y-2">
        {data.sellers.map((s: any) => (
          <div key={s.id} className="card p-4 flex items-center justify-between flex-wrap gap-2">
            <div><p className="font-medium">{s.storeName}</p><p className="text-xs text-slate-500">{s.userId?.name} · {s.userId?.email} · Commission {s.commission}%</p></div>
            <div className="flex gap-2 items-center">
              <span className="badge bg-slate-100 dark:bg-slate-800">{s.status}</span>
              {s.status === "PENDING" && <>
                <button className="btn-primary text-xs" onClick={async () => { await api(`/sellers/admin/${s.id}`, { method: "PUT", body: { status: "APPROVED" } }); toast("Approved", "success"); reload(); }}>Approve</button>
                <button className="btn-ghost text-xs" onClick={async () => { await api(`/sellers/admin/${s.id}`, { method: "PUT", body: { status: "REJECTED" } }); reload(); }}>Reject</button>
              </>}
            </div>
          </div>
        ))}
        {data.sellers.length === 0 && <EmptyState title="No seller applications" />}
      </div>
    );
  }

  /* ---------- WAREHOUSES ---------- */
  if (tab === "warehouses") {
    const [whName, setWhName] = useState("");
    const [tr2, setTr2] = useState({ fromId: "", toId: "", productId: "", qty: "" });
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Warehouses</h3>
          <div className="flex gap-2 flex-wrap mb-3">
            {data.warehouses.map((w: any) => <span key={w.id} className="badge bg-slate-100 dark:bg-slate-800 !py-1.5 !px-3">{w.name} — {w.location}</span>)}
          </div>
          <div className="flex gap-2">
            <input value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="New warehouse name" className="input !w-64" />
            <button className="btn-ghost text-sm" onClick={async () => { await api("/warehouses", { method: "POST", body: { name: whName } }); toast("Added", "success"); setWhName(""); reload(); }}>Add</button>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Stock transfer</h3>
          <div className="grid sm:grid-cols-4 gap-2">
            <select value={tr2.fromId} onChange={(e) => setTr2({ ...tr2, fromId: e.target.value })} className="input"><option value="">From...</option>{data.warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <select value={tr2.toId} onChange={(e) => setTr2({ ...tr2, toId: e.target.value })} className="input"><option value="">To...</option>{data.warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <input value={tr2.productId} onChange={(e) => setTr2({ ...tr2, productId: e.target.value })} placeholder="Product ID" className="input" />
            <input value={tr2.qty} onChange={(e) => setTr2({ ...tr2, qty: e.target.value })} placeholder="Qty" type="number" className="input" />
          </div>
          <button className="btn-primary text-sm mt-3" onClick={async () => { try { await api("/warehouses/transfer", { method: "POST", body: tr2 }); toast("Transferred", "success"); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Transfer stock</button>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Recent transfers</h3>
          {data.transfers.map((t: any) => <p key={t.id} className="text-sm py-1">{t.qty} × {t.productId?.name} — {timeAgo(t.createdAt)}</p>)}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Inventory logs</h3>
          <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
            {(data.logs || []).slice(0, 50).map((l: any) => (
              <div key={l.id} className="flex justify-between">
                <span className="truncate">{l.productId?.name || "Product"} <span className="text-slate-400">({l.reason})</span></span>
                <span className={l.change >= 0 ? "text-green-600" : "text-red-600"}>{l.change >= 0 ? "+" : ""}{l.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- MARKETING ---------- */
  if (tab === "campaigns") {
    const [f, setF] = useState({ name: "", segment: "ALL", couponCode: "", message: "" });
    return (
      <div>
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">New broadcast / campaign</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Campaign name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></Field>
            <Field label="Target segment"><select value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })} className="input"><option>ALL</option><option>HIGH_VALUE</option><option>INACTIVE</option><option>NEW</option></select></Field>
            <Field label="Coupon code (optional)"><input value={f.couponCode} onChange={(e) => setF({ ...f, couponCode: e.target.value.toUpperCase() })} className="input uppercase" /></Field>
            <div />
            <div className="sm:col-span-2"><Field label="Message"><textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="input" rows={3} /></Field></div>
          </div>
          <button className="btn-primary text-sm mt-2" onClick={async () => { try { const d = await api<{ campaign: any }>("/admin/campaigns", { method: "POST", body: f }); toast(`Sent to ${d.campaign.sentCount} customers`, "success"); setF({ name: "", segment: "ALL", couponCode: "", message: "" }); reload(); } catch (e: any) { toast(e.message, "error"); } }}>Send campaign</button>
        </div>
        <div className="space-y-2">
          {data.campaigns.map((c: any) => (
            <div key={c.id} className="card p-4 flex items-center justify-between">
              <div><p className="font-medium">{c.name}</p><p className="text-sm text-slate-500">{c.segment} · sent to {c.sentCount}</p></div>
              <button className="text-xs text-red-600" onClick={async () => { await api(`/admin/campaigns/${c.id}`, { method: "DELETE" }); reload(); }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- NEWSLETTER ---------- */
  if (tab === "subscribers") {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">{data.subscribers.length} subscribers</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {data.subscribers.map((s: any) => (
            <div key={s.id} className="flex justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"><span className="truncate">{s.email}</span><button className="text-red-600 text-xs ml-2" onClick={async () => { await api(`/admin/subscribers/${s.id}`, { method: "DELETE" }); reload(); }}>✕</button></div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- ANALYTICS ---------- */
  if (tab === "analytics") {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <a className="btn-primary text-sm" href={`${API_BASE}/api/admin/analytics/sales`} target="_blank" rel="noreferrer">Download sales report (CSV)</a>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Revenue by category</h3>
            {data.categoryRevenue.map((c: any) => <div key={c.name} className="flex justify-between text-sm py-1"><span>{c.name}</span><Price pkr={c.revenue} /></div>)}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Payment mix</h3>
            {data.paymentMix.map((p: any) => <div key={p._id} className="flex justify-between text-sm py-1"><span>{p._id}</span><span>{p.count} orders · <Price pkr={p.revenue} /></span></div>)}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Top customers</h3>
            {data.topCustomers.map((c: any, i: number) => <div key={i} className="flex justify-between text-sm py-1"><span>{c.name} ({c.orders})</span><Price pkr={c.spent} /></div>)}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Search insights</h3>
            {data.searchInsights.map((s: any) => <div key={s._id} className="flex justify-between text-sm py-1"><span>{s._id}</span><span>{s.count}×</span></div>)}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-2">Abandoned carts</h3>
          <p className="text-sm text-slate-500">{data.abandonedCarts} carts with {data.abandonedItems} items in the last 7 days — send a recovery campaign from Marketing.</p>
        </div>
      </div>
    );
  }

  /* ---------- SEO ---------- */
  if (tab === "seo") {
    const [f, setF] = useState({ path: "/", title: "", description: "" });
    return (
      <div>
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">Meta editor</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Path (e.g. /shop)"><input value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} className="input" /></Field>
            <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input" /></Field>
            <Field label="Description"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input" /></Field>
          </div>
          <button className="btn-primary text-sm mt-2" onClick={async () => { await api("/admin/seo", { method: "PUT", body: f }); toast("Saved", "success"); reload(); }}>Save</button>
        </div>
        <div className="space-y-2">
          {data.pages.map((p: any) => <div key={p.id} className="card p-3 text-sm"><p className="font-mono">{p.path}</p><p className="font-medium">{p.title}</p><p className="text-slate-500">{p.description}</p></div>)}
        </div>
      </div>
    );
  }

  /* ---------- INTEGRATIONS ---------- */
  if (tab === "integrations") {
    const [vals, setVals] = useState<Record<string, any>>({});
    const save = async (provider: string) => {
      const v = vals[provider] || {};
      await api(`/admin/integrations/${provider}`, { method: "PUT", body: v });
      toast("Saved", "success"); reload();
    };
    const labels: Record<string, string> = {
      stripe: "Stripe (cards)", paypal: "PayPal", sms: "SMS provider", email: "Email provider",
      tcs: "TCS courier", leopards: "Leopards courier", google: "Google login", facebook: "Facebook login",
    };
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Paste your real API keys here to switch each service from demo to live mode.</p>
        {data.integrations.map((i: any) => (
          <div key={i.provider} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">{labels[i.provider] || i.provider}</p>
              <span className={`badge ${i.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{i.isActive ? "Active" : "Demo"}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <input placeholder="API key" defaultValue={i.apiKey} onChange={(e) => setVals({ ...vals, [i.provider]: { ...vals[i.provider], apiKey: e.target.value } })} className="input" />
              <input placeholder="API secret" defaultValue={i.apiSecret} onChange={(e) => setVals({ ...vals, [i.provider]: { ...vals[i.provider], apiSecret: e.target.value } })} className="input" type="password" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked={i.isActive} onChange={(e) => setVals({ ...vals, [i.provider]: { ...vals[i.provider], isActive: e.target.checked } })} /> Active</label>
            </div>
            <button className="btn-ghost text-sm mt-2" onClick={() => save(i.provider)}>Save keys</button>
          </div>
        ))}
      </div>
    );
  }

  /* ---------- TAX ---------- */
  if (tab === "tax") {
    return (
      <div className="card p-5">
        <h3 className="font-semibold mb-2">GST / Tax report</h3>
        <p className="text-sm text-slate-500 mb-4">Tax rate: {(data.taxRate * 100).toFixed(1)}% (change in Settings) · Total GST collected: <b><Price pkr={data.totalGst} /></b></p>
        <div className="overflow-x-auto">
          <table className="table min-w-[600px]">
            <thead><tr><th className={th}>Invoice</th><th className={th}>Date</th><th className={th}>Subtotal</th><th className={th}>GST</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {data.invoices.slice(0, 50).map((i: any) => (
                <tr key={i.orderNumber}><td className={td}>{i.orderNumber}</td><td className={td}>{new Date(i.date).toLocaleDateString()}</td><td className={td}><Price pkr={i.subtotal} /></td><td className={td}><Price pkr={i.gst} /></td><td className={td}><Price pkr={i.total} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------- SETTINGS ---------- */
  if (tab === "settings") {
    const [s, setS] = useState<Record<string, string>>(data.settings);
    const fields: [string, string][] = [
      ["storeName", "Store name"], ["currency", "Base currency"], ["currencyRates", "Currency rates (JSON, PKR base)"],
      ["shippingFee", "Standard shipping (Rs)"],
      ["freeShipThreshold", "Free shipping threshold (Rs)"], ["expressFee", "Express fee (Rs)"],
      ["taxRate", "Tax rate (0.16 = 16%)"], ["giftWrapFee", "Gift wrap fee (Rs)"],
      ["loyaltyPer100", "Loyalty points per Rs 100"], ["referralPoints", "Referral reward points"],
      ["supportEmail", "Support email"], ["supportPhone", "Support phone"], ["announcement", "Announcement bar text"],
    ];
    return (
      <div className="card p-5 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-3">
          {fields.map(([k, l]) => <Field key={k} label={l}><input value={s[k] || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="input" /></Field>)}
        </div>
        <button className="btn-primary mt-3" onClick={async () => { await api("/admin/settings", { method: "PUT", body: { settings: s } }); toast("Settings saved", "success"); }}>Save settings</button>
      </div>
    );
  }

  return <EmptyState title="Unknown tab" />;
}

/* ---------- Forms ---------- */
function ProductFormModal({ p, onClose, onSave }: { p: any; onClose: () => void; onSave: (p: any) => void }) {
  const [f, setF] = useState<any>(p || null);
  useEffect(() => setF(p ? { ...p, images: (p.images || []).join(", "), tags: (p.tags || []).join(", ") } : null), [p]);
  if (!f) return <Modal open={false} onClose={onClose}><></></Modal>;
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <Modal open={!!p} onClose={onClose} wide>
      <h3 className="font-bold mb-4">{f.id ? "Edit" : "New"} product</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label="Name"><input value={f.name || ""} onChange={(e) => set("name", e.target.value)} className="input" /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><textarea value={f.description || ""} onChange={(e) => set("description", e.target.value)} className="input" rows={3} /></Field></div>
        <Field label="Price"><input value={f.price || ""} onChange={(e) => set("price", Number(e.target.value))} type="number" className="input" /></Field>
        <Field label="Compare-at price"><input value={f.compareAt || ""} onChange={(e) => set("compareAt", Number(e.target.value) || null)} type="number" className="input" /></Field>
        <Field label="Cost"><input value={f.cost || ""} onChange={(e) => set("cost", Number(e.target.value) || null)} type="number" className="input" /></Field>
        <Field label="SKU"><input value={f.sku || ""} onChange={(e) => set("sku", e.target.value)} className="input" /></Field>
        <Field label="Stock"><input value={f.stock ?? ""} onChange={(e) => set("stock", Number(e.target.value))} type="number" className="input" /></Field>
        <Field label="Image URLs (comma separated)"><input value={f.images || ""} onChange={(e) => set("images", e.target.value)} className="input" /></Field>
        <Field label="Video URL (optional)"><input value={f.videoUrl || ""} onChange={(e) => set("videoUrl", e.target.value)} className="input" /></Field>
        <Field label="Tags (comma separated)"><input value={f.tags || ""} onChange={(e) => set("tags", e.target.value)} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive !== false} onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.isDigital} onChange={(e) => set("isDigital", e.target.checked)} /> Digital product</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.allowPreorder} onChange={(e) => set("allowPreorder", e.target.checked)} /> Allow pre-order</label>
      </div>
      <button className="btn-primary mt-4" onClick={() => onSave({ ...f, images: String(f.images || "").split(",").map((s: string) => s.trim()).filter(Boolean), tags: String(f.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean) })}>Save product</button>
    </Modal>
  );
}

function CouponForm({ c, onSave }: { c: any; onSave: (c: any) => void }) {
  const [f, setF] = useState({ code: c.code || "", kind: c.kind || "PERCENT", value: c.value || 10, minSubtotal: c.minSubtotal || 0, maxUses: c.maxUses || "", endsAt: c.endsAt ? c.endsAt.slice(0, 16) : "", isActive: c.isActive !== false });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Code"><input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="input uppercase" /></Field>
      <Field label="Type"><select value={f.kind} onChange={(e) => set("kind", e.target.value)} className="input"><option>PERCENT</option><option>FLAT</option><option>FREESHIP</option></select></Field>
      <Field label="Value"><input value={f.value} onChange={(e) => set("value", Number(e.target.value))} type="number" className="input" /></Field>
      <Field label="Min subtotal"><input value={f.minSubtotal} onChange={(e) => set("minSubtotal", Number(e.target.value))} type="number" className="input" /></Field>
      <Field label="Max uses"><input value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} type="number" className="input" /></Field>
      <Field label="Expires"><input value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} type="datetime-local" className="input" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
      <div><span className="label">&nbsp;</span><button className="btn-primary" onClick={() => onSave({ ...c, ...f, maxUses: f.maxUses ? Number(f.maxUses) : null, endsAt: f.endsAt || null })}>Save coupon</button></div>
    </div>
  );
}

function BannerForm({ b, onSave }: { b: any; onSave: (b: any) => void }) {
  const [f, setF] = useState({ title: b.title || "", subtitle: b.subtitle || "", image: b.image || "", link: b.link || "/shop", sortOrder: b.sortOrder || 0, isActive: b.isActive !== false });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Title"><input value={f.title} onChange={(e) => set("title", e.target.value)} className="input" /></Field>
      <Field label="Subtitle"><input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="input" /></Field>
      <Field label="Image URL"><input value={f.image} onChange={(e) => set("image", e.target.value)} className="input" /></Field>
      <Field label="Link"><input value={f.link} onChange={(e) => set("link", e.target.value)} className="input" /></Field>
      <button className="btn-primary" onClick={() => onSave({ ...b, ...f })}>Save banner</button>
    </div>
  );
}

function BlogForm({ p, onSave }: { p: any; onSave: (p: any) => void }) {
  const [f, setF] = useState({ title: p.title || "", excerpt: p.excerpt || "", body: p.body || "", image: p.image || "", isPublished: !!p.isPublished });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Title"><input value={f.title} onChange={(e) => set("title", e.target.value)} className="input" /></Field>
      <Field label="Excerpt"><input value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="input" /></Field>
      <Field label="Body"><textarea value={f.body} onChange={(e) => set("body", e.target.value)} className="input" rows={8} /></Field>
      <Field label="Image URL"><input value={f.image} onChange={(e) => set("image", e.target.value)} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> Published</label>
      <button className="btn-primary" onClick={() => onSave({ ...p, ...f })}>Save post</button>
    </div>
  );
}
