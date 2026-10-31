import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { SPRING } from "./ui";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const body = input;
    setInput("");
    setMessages((m) => [...m, { id: "tmp-" + Date.now(), sender: "CUSTOMER", body }]);
    setTyping(true);
    try {
      const d = await api<{ threadId: string; messages: any[] }>("/chat", { method: "POST", body: { threadId, body } });
      setThreadId(d.threadId);
      setMessages(d.messages);
    } catch { /* offline */ }
    setTyping(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)} aria-label="Live chat"
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
        className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full text-white shadow-lift flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#3b6df6,#7c3aed)" }}
      >
        <span className="absolute inset-0 rounded-full bg-brand-500 animate-pulse-ring" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? "x" : "chat"} initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 40, opacity: 0 }} transition={{ duration: 0.18 }} className="relative">
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={SPRING}
            className="fixed bottom-24 left-5 z-40 w-[21rem] max-w-[calc(100vw-2.5rem)] card !rounded-3xl shadow-lift overflow-hidden"
          >
            <div className="p-4 flex items-center gap-3 text-white" style={{ background: "linear-gradient(135deg,#1f4fd8,#7c3aed)" }}>
              <div className="relative">
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-extrabold">V</span>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Velmora Support</p>
                <p className="text-[11px] opacity-80">Online — replies instantly</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="h-72 overflow-y-auto p-4 space-y-2.5 bg-slate-50/60 dark:bg-ink-950/40">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-ink-900 rounded-2xl rounded-tl-md p-3.5 text-sm shadow-card max-w-[85%]">
                  <p className="font-semibold mb-1">Hi there!</p>
                  <p className="text-slate-500 dark:text-slate-400">How can we help you today? Ask about orders, products or returns.</p>
                </motion.div>
              )}
              {messages.map((m: any) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-2xl text-sm max-w-[85%] shadow-card ${m.sender === "CUSTOMER" ? "ml-auto text-white rounded-br-md" : "bg-white dark:bg-ink-900 rounded-bl-md"}`}
                  style={m.sender === "CUSTOMER" ? { background: "linear-gradient(135deg,#3b6df6,#1f4fd8)" } : undefined}>
                  {m.body}
                </motion.div>
              ))}
              {typing && (
                <div className="bg-white dark:bg-ink-900 rounded-2xl rounded-bl-md p-3.5 shadow-card w-fit flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-slate-200/70 dark:border-white/[0.07] flex gap-2 bg-white dark:bg-ink-900">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." className="input !py-2.5 text-sm" />
              <motion.button whileTap={{ scale: 0.9 }} className="btn-primary !px-4 !rounded-xl" onClick={send} aria-label="Send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
