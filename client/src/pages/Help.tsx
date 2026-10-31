import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { Field, Accordion, PageHeader, Spinner, Skeleton } from "../components/ui";

export default function Help() {
  const { toast, tr, user } = useStore();
  const [faqs, setFaqs] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", priority: "NORMAL" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api("/faqs").then((d: any) => setFaqs(d.faqs)).catch(() => setFaqs([]));
    if (user) api("/tickets").then((d: any) => setTickets(d.tickets)).catch(() => {});
  }, [user]);

  const filtered = (faqs || []).filter((f) => !q || f.question.toLowerCase().includes(q.toLowerCase()) || f.answer.toLowerCase().includes(q.toLowerCase()));

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api("/tickets", { method: "POST", body: form });
      toast("Ticket submitted — we'll reply soon", "success");
      setForm({ name: "", email: "", subject: "", message: "", priority: "NORMAL" });
      if (user) api("/tickets").then((d: any) => setTickets(d.tickets)).catch(() => {});
    } catch (err: any) { toast(err.message, "error"); }
    setSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-6">
      <PageHeader title={`${tr("help")} Centre`} sub="Answers to common questions, or reach our support team" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FAQs..." className="input !pl-11 !py-3.5 !rounded-2xl shadow-card !text-[15px]" />
      </motion.div>

      {faqs === null ? (
        <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 !rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-2.5 mb-12">
          {filtered.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}>
              <Accordion title={f.question} defaultOpen={i === 0}>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.answer}</p>
              </Accordion>
            </motion.div>
          ))}
          {filtered.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">No matching FAQs — try different keywords.</p>}
        </div>
      )}

      <h2 className="text-xl font-extrabold tracking-tight mb-4" id="tickets">Contact support</h2>
      <motion.form initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitTicket} className="card !rounded-3xl p-6 md:p-7 grid sm:grid-cols-2 gap-3 mb-10">
        <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
        <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
        <Field label="Subject"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" required /></Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
            <option>LOW</option><option>NORMAL</option><option>HIGH</option>
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Message"><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" rows={4} required /></Field></div>
        <div className="sm:col-span-2">
          <motion.button whileTap={{ scale: 0.98 }} className="btn-primary !px-8" type="submit" disabled={sending}>
            {sending ? <Spinner light size={18} /> : "Submit ticket"}
          </motion.button>
        </div>
      </motion.form>

      {user && tickets.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-extrabold tracking-tight mb-4">My tickets</h2>
          <div className="space-y-2.5">
            {tickets.map((t) => (
              <Link key={t.id} to={`/account/tickets/${t.id}`} className="card card-hover p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold">{t.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{t.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
