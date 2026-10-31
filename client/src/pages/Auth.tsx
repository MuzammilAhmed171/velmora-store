import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { Field, Spinner, EASE } from "../components/ui";

function AuthShell({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-4xl grid md:grid-cols-2 card !rounded-[2rem] overflow-hidden shadow-lift">
        {/* brand panel */}
        <div className="hidden md:flex flex-col justify-between hero-gradient text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-30" />
          <motion.div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"
            animate={{ y: [0, -18, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-extrabold text-xl">V</span>
              <span className="text-2xl font-extrabold tracking-tight">Velmora<span className="opacity-70">.</span></span>
            </div>
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">Shop smarter,<br />live better.</h2>
            <p className="text-white/75 mt-3 text-[15px] leading-relaxed">Join thousands of happy shoppers. Track orders, earn loyalty points, unlock member-only deals.</p>
            <div className="flex gap-6 mt-8">
              {[["50K+", "Happy customers"], ["4.8", "Average rating"], ["157+", "Products"]].map(([v, l]) => (
                <div key={l}><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-white/70">{l}</p></div>
              ))}
            </div>
          </div>
          <p className="relative text-xs text-white/60">Secure · Encrypted · No spam, ever</p>
        </div>
        {/* form panel */}
        <div className="p-8 md:p-10">
          <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{sub}</p>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export function Login() {
  const { login, toast, tr } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ token: string }>("/auth/login", { method: "POST", body: { email, password, remember } });
      await login(d.token);
      toast("Welcome back!", "success");
      nav("/");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  const social = async (provider: "google" | "facebook") => {
    try {
      const d = await api<{ token: string }>("/auth/social", {
        method: "POST",
        body: { provider, name: `${provider} user`, email: `${provider}.user.${Date.now()}@example.com` },
      });
      await login(d.token);
      toast("Signed in with " + provider + " (demo)", "success");
      nav("/");
    } catch (err: any) { toast(err.message, "error"); }
  };

  return (
    <AuthShell title={tr("login")} sub="Welcome back — let's get you shopping.">
      <p className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-white/[0.05] rounded-xl px-3.5 py-2.5 mb-5">
        Demo account: <span className="font-mono font-bold">customer@velmora.pk</span> / <span className="font-mono font-bold">Customer123!</span>
      </p>
      <form onSubmit={submit}>
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" type="email" required placeholder="you@example.com" /></Field>
        <Field label="Password"><input value={password} onChange={(e) => setPassword(e.target.value)} className="input" type="password" required placeholder="••••••••" /></Field>
        <div className="flex items-center justify-between mb-5 text-sm">
          <label className="flex items-center gap-2 font-medium cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#1f4fd8]" /> Remember me</label>
          <Link to="/forgot" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">Forgot password?</Link>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5 !text-[15px]" type="submit" disabled={busy}>
          {busy ? <Spinner light size={20} /> : tr("login")}
        </motion.button>
      </form>
      <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-slate-200 dark:bg-white/10" /><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">OR</span><div className="flex-1 h-px bg-slate-200 dark:bg-white/10" /></div>
      <div className="grid grid-cols-2 gap-2.5">
        <button className="btn-ghost" onClick={() => social("google")}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h6c-.3 1.4-1.2 2.5-2.4 3.3v2.8h3.9c2.3-2.1 3.1-5 3.1-8.3z" /><path fill="#34A853" d="M12 23c3.2 0 5.9-1.1 7.9-2.9l-3.9-2.8c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v2.9C3.3 20.5 7.4 23 12 23z" /><path fill="#FBBC05" d="M5.4 13.6c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.1H1.4A11 11 0 001 11.3c0 1.8.4 3.4 1.2 5l4.2-2.7z" /><path fill="#EA4335" d="M12 4.7c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.3 2.5 1.4 6.1l4 2.9c.9-2.8 3.5-4.3 6.6-4.3z" /></svg>
          Google <span className="text-[10px] text-slate-400 font-semibold">demo</span>
        </button>
        <button className="btn-ghost" onClick={() => social("facebook")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12a12 12 0 10-13.9 11.9v-8.4h-3v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0024 12z" /></svg>
          Facebook <span className="text-[10px] text-slate-400 font-semibold">demo</span>
        </button>
      </div>
      <p className="text-sm text-center mt-6 text-slate-500">No account? <Link to="/signup" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">{tr("signup")}</Link></p>
    </AuthShell>
  );
}

export function Signup() {
  const { login, toast, tr } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength(form.password) < 2) return toast("Password is too weak", "error");
    setBusy(true);
    try {
      const d = await api<{ demoCode: string }>("/auth/otp", { method: "POST", body: { target: form.email, purpose: "signup" } });
      setDemoCode(d.demoCode);
      setOtpSent(true);
      toast("Demo code shown below — enter it to verify", "success");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/otp", { method: "PUT", body: { target: form.email, code, purpose: "signup" } });
      const d = await api<{ token: string }>("/auth/signup", { method: "POST", body: form });
      await login(d.token);
      toast("Account created — welcome!", "success");
      nav("/");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  return (
    <AuthShell title={tr("signup")} sub="Create your free account in under a minute.">
      <AnimatePresence mode="wait" initial={false}>
        {!otpSent ? (
          <motion.form key="form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE }} onSubmit={sendOtp}>
            <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required placeholder="Ali Raza" /></Field>
            <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" type="email" required placeholder="you@example.com" /></Field>
            <Field label="Phone (optional)"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="03XX-XXXXXXX" /></Field>
            <Field label="Password">
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" type="password" required placeholder="Min. 8 characters" />
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <motion.div className={`h-full rounded-full ${colors[strength(form.password) - 1] || "bg-red-500"}`}
                      animate={{ width: `${(strength(form.password) / 4) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{labels[strength(form.password) - 1] || labels[0]} — use 8+ chars with mixed case, numbers, symbols</p>
                </div>
              )}
            </Field>
            <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5 !text-[15px]" type="submit" disabled={busy}>
              {busy ? <Spinner light size={20} /> : "Send verification code"}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form key="otp" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE }} onSubmit={verify}>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 text-sm">
              <p className="text-amber-800 dark:text-amber-200 font-medium">Demo mode — your code is</p>
              <p className="text-3xl font-extrabold tracking-[0.3em] text-amber-900 dark:text-amber-100 mt-1">{demoCode}</p>
            </div>
            <Field label="Enter code"><input value={code} onChange={(e) => setCode(e.target.value)} className="input tracking-[0.3em] text-xl font-extrabold text-center !py-3.5" maxLength={6} required placeholder="••••••" /></Field>
            <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5 !text-[15px]" type="submit" disabled={busy}>
              {busy ? <Spinner light size={20} /> : "Verify & create account"}
            </motion.button>
            <button type="button" className="text-sm text-slate-500 hover:text-brand-600 mt-3 font-medium" onClick={() => setOtpSent(false)}>← Back to details</button>
          </motion.form>
        )}
      </AnimatePresence>
      <p className="text-sm text-center mt-6 text-slate-500">Have an account? <Link to="/login" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">{tr("login")}</Link></p>
    </AuthShell>
  );
}

export function Forgot() {
  const { toast } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ demoCode: string | null }>("/auth/forgot", { method: "POST", body: { email } });
      if (d.demoCode) { setDemoCode(d.demoCode); setStep(2); }
      else toast("If an account exists, a code was sent", "success");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };
  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/reset", { method: "POST", body: { email, code, password } });
      toast("Password reset — please login", "success");
      nav("/login");
    } catch (err: any) { toast(err.message, "error"); }
    setBusy(false);
  };

  return (
    <AuthShell title="Reset password" sub="We'll send a verification code to your email.">
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.form key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE }} onSubmit={send}>
            <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" type="email" required placeholder="you@example.com" /></Field>
            <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5" type="submit" disabled={busy}>
              {busy ? <Spinner light size={20} /> : "Send reset code"}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE }} onSubmit={reset}>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 text-sm">
              <p className="text-amber-800 dark:text-amber-200 font-medium">Demo mode — your code is</p>
              <p className="text-3xl font-extrabold tracking-[0.3em] text-amber-900 dark:text-amber-100 mt-1">{demoCode}</p>
            </div>
            <Field label="Code"><input value={code} onChange={(e) => setCode(e.target.value)} className="input tracking-[0.3em] text-xl font-extrabold text-center" required placeholder="••••••" /></Field>
            <Field label="New password"><input value={password} onChange={(e) => setPassword(e.target.value)} className="input" type="password" required placeholder="Min. 8 characters" /></Field>
            <motion.button whileTap={{ scale: 0.98 }} className="btn-primary w-full !py-3.5" type="submit" disabled={busy}>
              {busy ? <Spinner light size={20} /> : "Reset password"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
      <p className="text-sm text-center mt-6 text-slate-500"><Link to="/login" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">← Back to login</Link></p>
    </AuthShell>
  );
}
