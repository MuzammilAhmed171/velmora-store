import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { money, countdown } from "../lib/format";
import { useStore } from "../context/Store";

/* ================= motion presets ================= */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

export function Reveal({ children, delay = 0, y = 22, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, gap = 0.06 }: { children: React.ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
    >
      {children}
    </motion.div>
  );
}

/* ================= rating / price ================= */
export function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth="1.5" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function Price({ pkr, compareAt, big }: { pkr: number; compareAt?: number | null; big?: boolean }) {
  const { currency } = useStore();
  return (
    <span className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${big ? "text-3xl" : "text-[17px]"}`}>
        {money(pkr, currency)}
      </span>
      {compareAt && compareAt > pkr && (
        <>
          <span className="text-sm text-slate-400 line-through">{money(compareAt, currency)}</span>
          <span className="badge bg-red-600 text-white shadow-sm">
            {Math.round((1 - pkr / compareAt) * 100)}% off
          </span>
        </>
      )}
    </span>
  );
}

export function QtyInput({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const btn = "w-9 h-9 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-white/5 transition-colors active:scale-90";
  return (
    <div className="inline-flex items-center border border-slate-300/80 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-ink-900 shadow-card">
      <button className={btn} onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease">−</button>
      <span className="px-2 text-sm font-bold min-w-[2.25rem] text-center tabular-nums">{value}</span>
      <button className={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase">+</button>
    </div>
  );
}

/* ================= loading ================= */
export function Spinner({ size = 18, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none">
      <circle cx="12" cy="12" r="10" stroke={light ? "rgba(255,255,255,0.35)" : "currentColor"} strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 00-10-10" stroke={light ? "#fff" : "currentColor"} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingButton({ loading, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button className={className} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner light size={18} /> : children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ""}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-square !rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ShopSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6 grid md:grid-cols-2 gap-8">
      <div>
        <Skeleton className="aspect-square !rounded-2xl" />
        <div className="flex gap-2 mt-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="w-16 h-16 !rounded-xl" />)}</div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12 w-full !rounded-xl" />
        <Skeleton className="h-24 w-full !rounded-xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-8 flex-1" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 !rounded-2xl" />)}
      </div>
      <Skeleton className="h-56 !rounded-2xl mb-6" />
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-44 !rounded-2xl" />
        <Skeleton className="h-44 !rounded-2xl" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <Skeleton className="w-12 h-12 !rounded-xl shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="h-8 w-20 !rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/* ================= modal / drawer ================= */
export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            initial={{ scale: 0.92, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={SPRING}
            className={`relative card !rounded-3xl p-6 w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[90vh] overflow-y-auto shadow-lift`}
          >
            <button onClick={onClose} aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-ink-900 shadow-lift flex flex-col"
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/[0.07]">
                <h3 className="font-bold text-lg">{title}</h3>
                <button onClick={onClose} aria-label="Close"
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ================= accordion / tabs ================= */
export function Accordion({ title, children, defaultOpen }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="font-semibold">{title}</span>
        <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AnimatedTabs({ tabs, active, onChange }: { tabs: { key: string; label: React.ReactNode }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-white/[0.07] overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${active === t.key ? "text-brand-600 dark:text-brand-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
          {t.label}
          {active === t.key && (
            <motion.span layoutId="tab-underline" className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-brand-600"
              transition={{ type: "spring", stiffness: 500, damping: 40 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ================= stat card with sparkline ================= */
export function Sparkline({ values, width = 96, height = 30, stroke = "#3b6df6" }: { values: number[]; width?: number; height?: number; stroke?: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / Math.max(1, max - min)) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline points={pts} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE }} />
    </svg>
  );
}

export function StatCard({ label, value, sub, spark, icon, tone = "brand" }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; spark?: number[];
  icon?: React.ReactNode; tone?: "brand" | "green" | "amber" | "red" | "violet";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-600/10 text-brand-600 dark:text-brand-300",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
      className="card card-hover p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-[26px] font-extrabold tracking-tight mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1 opacity-90"><Sparkline values={spark} width={140} height={32} /></div>
      )}
    </motion.div>
  );
}

/* ================= checkout steps ================= */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center shrink-0">
            <motion.div
              animate={i < current ? { scale: [1, 1.25, 1] } : {}}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i < current ? "bg-green-500 text-white shadow-pop" :
                i === current ? "bg-brand-600 text-white shadow-glow" :
                "bg-slate-200 dark:bg-white/10 text-slate-500"}`}
            >
              {i < current ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              ) : i + 1}
            </motion.div>
            <span className={`text-[11px] mt-1.5 font-semibold whitespace-nowrap ${i === current ? "text-brand-700 dark:text-brand-300" : "text-slate-400"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-[3px] mx-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden -mt-5 min-w-[12px]">
              <motion.div className={`h-full rounded-full ${i < current ? "bg-green-500" : "bg-brand-600"}`}
                initial={{ width: "0%" }} animate={{ width: i < current ? "100%" : "0%" }} transition={{ duration: 0.5, ease: EASE }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ================= empty states (CSS-illustrated, no emoji) ================= */
function EmptyArt({ kind }: { kind: "cart" | "wishlist" | "orders" | "search" | "box" }) {
  const stroke = "stroke-slate-300 dark:stroke-white/15";
  const fill = "fill-slate-100 dark:fill-white/[0.04]";
  return (
    <motion.svg width="120" height="120" viewBox="0 0 120 120" fill="none"
      animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="60" cy="60" r="52" className={fill} />
      <circle cx="60" cy="60" r="52" className={stroke} strokeWidth="2" strokeDasharray="6 6" />
      {kind === "cart" && (
        <g className="stroke-brand-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="48" cy="82" r="4" /><circle cx="76" cy="82" r="4" />
          <path d="M36 44h8l6 30h26l8-22H44" />
        </g>
      )}
      {kind === "wishlist" && (
        <path d="M60 84S38 68 38 54a11 11 0 0120-6.5A11 11 0 0182 54c0 14-22 30-22 30z"
          className="stroke-red-400" strokeWidth="3" strokeLinejoin="round" />
      )}
      {kind === "orders" && (
        <g className="stroke-brand-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="36" y="42" width="48" height="36" rx="4" />
          <path d="M36 58h48M48 42v-6a4 4 0 014-4h16a4 4 0 014 4v6" />
          <path d="M52 68l6 6 12-12" />
        </g>
      )}
      {kind === "search" && (
        <g className="stroke-brand-500" strokeWidth="3" strokeLinecap="round">
          <circle cx="54" cy="54" r="18" />
          <path d="M68 68l14 14" />
          <path d="M48 54h12" />
        </g>
      )}
      {kind === "box" && (
        <g className="stroke-brand-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M36 48l24-12 24 12v24l-24 12-24-12z" />
          <path d="M36 48l24 12 24-12M60 60v24" />
        </g>
      )}
    </motion.svg>
  );
}

export function EmptyState({ title, hint, kind = "box", action }: {
  title: string; hint?: string; kind?: "cart" | "wishlist" | "orders" | "search" | "box"; action?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="text-center py-14 px-6">
      <div className="flex justify-center mb-5"><EmptyArt kind={kind} /></div>
      <p className="font-bold text-lg">{title}</p>
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/* ================= pagination / misc ================= */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter((p, i, a) => a.indexOf(p) === i && p <= totalPages);
  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${p === page ? "bg-brand-600 text-white shadow-pop" : "hover:bg-slate-100 dark:hover:bg-white/5"}`}>
          {p}
        </button>
      ))}
      <button className="btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

export function Countdown({ target, compact }: { target: string; compact?: boolean }) {
  const [c, setC] = useState(countdown(target));
  useEffect(() => {
    const id = setInterval(() => setC(countdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (c.done) return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Deal ended</span>;
  const cell = (v: number, l: string) => (
    <div className={`relative overflow-hidden rounded-xl text-center ${compact ? "min-w-[2.6rem] px-1.5 py-1" : "min-w-[3.4rem] px-2 py-1.5"} bg-ink-950 dark:bg-white text-white dark:text-ink-950 shadow-pop`}>
      <div className={`font-extrabold tabular-nums ${compact ? "text-base" : "text-xl"}`}>{String(v).padStart(2, "0")}</div>
      <div className="text-[9px] uppercase tracking-widest opacity-70">{l}</div>
    </div>
  );
  return (
    <div className="flex gap-1.5 items-center">
      {cell(c.d, "days")}<span className="font-bold opacity-40">:</span>
      {cell(c.h, "hrs")}<span className="font-bold opacity-40">:</span>
      {cell(c.m, "min")}<span className="font-bold opacity-40">:</span>
      {cell(c.s, "sec")}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3.5">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const TOAST_ICONS: Record<string, React.ReactNode> = {
  success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>,
  error: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" /></svg>,
};

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-5 right-5 z-[70] space-y-2.5 max-w-sm w-[calc(100%-2.5rem)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            layout initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={SPRING}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lift text-sm font-medium text-white ${
              t.kind === "error" ? "bg-red-600" : t.kind === "success" ? "bg-emerald-600" : "bg-ink-900 dark:bg-white dark:text-ink-950"}`}>
            <span className="shrink-0">{TOAST_ICONS[t.kind] || TOAST_ICONS.info}</span>
            <span className="flex-1">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function SectionTitle({ title, link, linkText, sub }: { title: string; link?: string; linkText?: string; sub?: string }) {
  return (
    <Reveal className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-xl md:text-[26px] font-extrabold tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
      </div>
      {link && (
        <a href={link} className="group text-sm font-bold text-brand-600 dark:text-brand-300 flex items-center gap-1 hover:gap-2 transition-all">
          {linkText || "View all"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-6-6l6 6-6 6" /></svg>
        </a>
      )}
    </Reveal>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </motion.div>
  );
}
