import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { money } from "../lib/format";
import { Field, Price, EmptyState, Steps, PageHeader, Spinner, DetailSkeleton, EASE } from "../components/ui";

const PAYMENTS = ["COD", "Card", "JazzCash", "EasyPaisa", "Bank Transfer"];
const STEPS = ["Address", "Shipping", "Payment", "Review"];

export default function Checkout() {
  const { user, toast, refreshCounts, currency, tr } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<any[] | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState("");
  const [newAddr, setNewAddr] = useState({ name: "", phone: "", line1: "", line2: "", city: "", postal: "" });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("Standard");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [coupon, setCoupon] = useState("");
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [giftCard, setGiftCard] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [notes, setNotes] = useState("");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [quote, setQuote] = useState<any>(null);
  const [placing, setPlacing] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });

  useEffect(() => {
    api<{ items: any[] }>("/cart").then((d) => setItems(d.items)).catch(() => setItems([]));
    api<{ addresses: any[] }>("/addresses").then((d) => {
      setAddresses(d.addresses);
      const def = d.addresses.find((a: any) => a.isDefault);
      if (def) setAddressId(def.id);
      else setShowAddrForm(d.addresses.length === 0);
    }).catch(() => {});
    api<{ settings: Record<string, string> }>("/admin/settings").then((d) => {
      try { setSlots(JSON.parse(d.settings.deliverySlots || "[]")); } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

  const getQuote = async () => {
    try {
      const d = await api<{ quote: any }>("/quote", {
        method: "POST",
        body: {
          couponCode: coupon || undefined,
          loyaltyPoints: useLoyalty ? user?.loyaltyPoints : 0,
          walletUse: useWallet ? user?.walletBalance : 0,
          giftCardCode: giftCard || undefined,
          shippingMethod, giftWrap,
        },
      });
      setQuote(d.quote);
    } catch (e: any) { toast(e.message, "error"); }
  };

  useEffect(() => { if (items && items.length) getQuote(); }, [items, coupon, useLoyalty, useWallet, giftCard, shippingMethod, giftWrap]);

  const saveAddress = async () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.line1 || !newAddr.city) return toast("Fill all address fields", "error");
    try {
      const d = await api<{ address: any }>("/addresses", { method: "POST", body: { ...newAddr, isDefault: addresses.length === 0 } });
      setAddresses([...addresses, d.address]);
      setAddressId(d.address.id);
      setShowAddrForm(false);
      setNewAddr({ name: "", phone: "", line1: "", line2: "", city: "", postal: "" });
      toast("Address saved", "success");
    } catch (e: any) { toast(e.message, "error"); }
  };

  const canNext = () => {
    if (step === 0) {
      if (!user && (!guest.name || !guest.phone)) { toast("Enter your name and phone", "error"); return false; }
      if (!addressId && !showAddrForm) { toast("Select or add a delivery address", "error"); return false; }
      return true;
    }
    if (step === 2 && paymentMethod === "Card" && (!card.number || !card.name || !card.expiry || !card.cvc)) {
      toast("Fill card details (demo)", "error"); return false;
    }
    return true;
  };

  const next = () => { if (canNext()) { setStep((s) => Math.min(3, s + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const back = () => { setStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const placeOrder = async () => {
    if (showAddrForm) { await saveAddress(); }
    if (!addressId) return toast("Select a delivery address", "error");
    setPlacing(true);
    try {
      const d = await api<{ order: any }>("/orders", {
        method: "POST",
        body: {
          addressId: addressId || undefined,
          shippingMethod, paymentMethod,
          couponCode: coupon || undefined,
          loyaltyPoints: useLoyalty ? user?.loyaltyPoints : 0,
          walletUse: useWallet ? user?.walletBalance : 0,
          giftCardCode: giftCard || undefined,
          giftWrap, deliverySlot: deliverySlot || undefined, notes: notes || undefined,
          guestName: guest.name || undefined, guestEmail: guest.email || undefined, guestPhone: guest.phone || undefined,
        },
      });
      refreshCounts();
      nav(`/order/${d.order.id}?new=1`);
    } catch (e: any) { toast(e.message, "error"); setPlacing(false); }
  };

  if (items === null) return <DetailSkeleton />;
  if (items.length === 0) {
    return <div className="max-w-4xl mx-auto px-4 mt-10">
      <EmptyState kind="cart" title="Your cart is empty" action={<Link to="/shop" className="btn-primary">Shop now</Link>} />
    </div>;
  }

  const stepCard = "card !rounded-3xl p-6";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title={tr("checkout")} />
      <div className="max-w-3xl mx-auto mb-8"><Steps steps={STEPS} current={step} /></div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.3, ease: EASE }}>

              {/* STEP 0 — ADDRESS */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className={stepCard}>
                    <h3 className="font-extrabold text-lg mb-4">{tr("address")}</h3>
                    {addresses.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {addresses.map((a) => (
                          <motion.button key={a.id} whileTap={{ scale: 0.98 }} onClick={() => { setAddressId(a.id); setShowAddrForm(false); }}
                            className={`text-left p-4 rounded-2xl border-2 text-sm transition-all ${addressId === a.id ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-glow" : "border-slate-200 dark:border-white/10 hover:border-brand-300"}`}>
                            <p className="font-bold">{a.label} — {a.name}</p>
                            <p className="text-slate-500 mt-1">{a.line1}, {a.city}</p>
                            <p className="text-slate-500">{a.phone}</p>
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <button className="text-sm font-bold text-brand-600 dark:text-brand-300" onClick={() => setShowAddrForm(!showAddrForm)}>
                      {showAddrForm ? "− Hide form" : "+ Add new address"}
                    </button>
                    <AnimatePresence>
                      {showAddrForm && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                          <div className="grid sm:grid-cols-2 gap-3 mt-4">
                            <Field label="Full name"><input value={newAddr.name} onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })} className="input" /></Field>
                            <Field label="Phone"><input value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} className="input" placeholder="03XX-XXXXXXX" /></Field>
                            <Field label="Address"><input value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} className="input" /></Field>
                            <Field label="City"><input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="input" /></Field>
                            <Field label="Postal code"><input value={newAddr.postal} onChange={(e) => setNewAddr({ ...newAddr, postal: e.target.value })} className="input" /></Field>
                            <div><span className="label">&nbsp;</span><button className="btn-ghost" onClick={saveAddress}>Save address</button></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {!user && (
                    <div className={stepCard}>
                      <h3 className="font-extrabold text-lg mb-1">Guest checkout</h3>
                      <p className="text-sm text-slate-500 mb-4">No account needed — <Link to="/signup" className="text-brand-600 font-bold">create one</Link> to earn loyalty points.</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <Field label="Name"><input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className="input" /></Field>
                        <Field label="Phone"><input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} className="input" /></Field>
                        <Field label="Email (optional)"><input value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} className="input" /></Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1 — SHIPPING */}
              {step === 1 && (
                <div className={stepCard}>
                  <h3 className="font-extrabold text-lg mb-4">Shipping</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[{ m: "Standard", d: "3–5 working days", fee: "Rs 299" }, { m: "Express", d: "1–2 working days", fee: "Rs 599" }].map(({ m, d, fee }) => (
                      <motion.button key={m} whileTap={{ scale: 0.98 }} onClick={() => setShippingMethod(m)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${shippingMethod === m ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-glow" : "border-slate-200 dark:border-white/10 hover:border-brand-300"}`}>
                        <p className="font-bold">{m} <span className="text-sm font-semibold text-slate-500">· {fee}</span></p>
                        <p className="text-[13px] text-slate-500 mt-1">{d}</p>
                      </motion.button>
                    ))}
                  </div>
                  {slots.length > 0 && (
                    <Field label="Delivery slot"><select value={deliverySlot} onChange={(e) => setDeliverySlot(e.target.value)} className="input"><option value="">Any time</option>{slots.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
                  )}
                  <label className="flex items-center gap-3 text-sm font-medium mt-4 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer hover:border-brand-300 transition-colors">
                    <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="w-4 h-4 accent-[#1f4fd8]" />
                    Gift wrap <span className="text-slate-400">(+Rs 150)</span>
                  </label>
                  <Field label="Order notes (optional)"><input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
                </div>
              )}

              {/* STEP 2 — PAYMENT */}
              {step === 2 && (
                <div className={stepCard}>
                  <h3 className="font-extrabold text-lg mb-4">{tr("payment")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PAYMENTS.map((m) => (
                      <motion.button key={m} whileTap={{ scale: 0.97 }} onClick={() => setPaymentMethod(m)}
                        className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${paymentMethod === m ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-glow text-brand-700 dark:text-brand-200" : "border-slate-200 dark:border-white/10 hover:border-brand-300"}`}>
                        {m === "COD" ? "Cash on Delivery" : m}
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {paymentMethod === "Card" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                        <div className="grid sm:grid-cols-2 gap-3 mt-5">
                          <div className="sm:col-span-2 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            Demo mode — no real charge. Paste a Stripe test key in Admin → Integrations to accept real cards.
                          </div>
                          <Field label="Card number"><input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} className="input" placeholder="4242 4242 4242 4242" /></Field>
                          <Field label="Name on card"><input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="input" /></Field>
                          <Field label="Expiry"><input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} className="input" placeholder="MM/YY" /></Field>
                          <Field label="CVC"><input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} className="input" placeholder="123" /></Field>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {paymentMethod === "JazzCash" && <p className="text-sm text-slate-500 mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">Send payment to <b>0300-1234567</b> (JazzCash) and our team will confirm your order by SMS.</p>}
                  {paymentMethod === "EasyPaisa" && <p className="text-sm text-slate-500 mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">Send payment to <b>0300-1234567</b> (EasyPaisa) and our team will confirm your order by SMS.</p>}
                  {paymentMethod === "Bank Transfer" && <p className="text-sm text-slate-500 mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03]">Bank: Meezan Bank · IBAN: PK00MEZN0000000000000000 · Send receipt on WhatsApp 0300-1234567.</p>}
                </div>
              )}

              {/* STEP 3 — REVIEW */}
              {step === 3 && (
                <div className={stepCard}>
                  <h3 className="font-extrabold text-lg mb-4">Review your order</h3>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto mb-5">
                    {items.map((i) => (
                      <div key={i.id} className="flex items-center gap-3 text-sm">
                        <img src={i.product?.images?.[0]} alt="" className="w-12 h-12 object-cover rounded-xl" />
                        <span className="flex-1 truncate font-medium">{i.product?.name} <span className="text-slate-400">× {i.qty}</span></span>
                        <Price pkr={i.line} />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm space-y-1.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-4">
                    <div className="flex justify-between"><span className="text-slate-500">Deliver to</span><span className="font-semibold text-right">{addresses.find((a) => a.id === addressId)?.line1}, {addresses.find((a) => a.id === addressId)?.city}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-semibold">{shippingMethod}{deliverySlot ? ` · ${deliverySlot}` : ""}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="font-semibold">{paymentMethod === "COD" ? "Cash on Delivery" : paymentMethod}</span></div>
                  </div>
                  <button className="btn-primary w-full mt-6 !py-4 !text-base" onClick={placeOrder} disabled={placing}>
                    {placing ? <Spinner light size={20} /> : <>{tr("placeOrder")} · {quote && <Price pkr={quote.total} />}</>}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">By placing this order you agree to our terms & 7-day return policy.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-6">
            <button className="btn-ghost" onClick={back} disabled={step === 0}>← Back</button>
            {step < 3 ? (
              <button className="btn-primary !px-8" onClick={next}>Continue →</button>
            ) : (
              <span className="text-sm text-slate-400 self-center font-medium">Almost done — review and place your order</span>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="card !rounded-3xl p-6 sticky top-32">
          <h3 className="font-extrabold text-lg mb-4">Summary ({items.length} items)</h3>
          <div className="flex gap-2 mb-4">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={tr("coupon")} className="input uppercase text-sm font-mono" />
            <button className="btn-ghost text-sm shrink-0" onClick={getQuote}>{tr("apply")}</button>
          </div>
          {user && (
            <div className="space-y-2.5 text-sm mb-4">
              <label className="flex items-center gap-2.5 font-medium cursor-pointer"><input type="checkbox" checked={useLoyalty} onChange={(e) => setUseLoyalty(e.target.checked)} className="w-4 h-4 accent-[#1f4fd8]" /> Use loyalty points ({user.loyaltyPoints})</label>
              <label className="flex items-center gap-2.5 font-medium cursor-pointer"><input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="w-4 h-4 accent-[#1f4fd8]" /> Use wallet ({money(user.walletBalance, currency)})</label>
              <input value={giftCard} onChange={(e) => setGiftCard(e.target.value.toUpperCase())} placeholder="Gift card code" className="input uppercase text-sm font-mono" />
            </div>
          )}
          {quote ? (
            <div className="space-y-2 text-sm border-t border-slate-200 dark:border-white/[0.07] pt-4">
              <div className="flex justify-between"><span className="text-slate-500">{tr("subtotal")}</span><Price pkr={quote.subtotal} /></div>
              {quote.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>{tr("discount")}</span><span>− {money(quote.discount, currency)}</span></div>}
              {quote.loyaltyUsed > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>Loyalty</span><span>− {money(quote.loyaltyUsed, currency)}</span></div>}
              {quote.walletUsed > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>Wallet</span><span>− {money(quote.walletUsed, currency)}</span></div>}
              {quote.giftCardUsed > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>Gift card</span><span>− {money(quote.giftCardUsed, currency)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">{tr("shipping")}</span><span className="font-semibold">{quote.shippingFee === 0 ? <span className="text-emerald-600">{tr("free")}</span> : money(quote.shippingFee, currency)}</span></div>
              {quote.tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax</span><Price pkr={quote.tax} /></div>}
              <div className="flex justify-between font-extrabold text-xl pt-3 border-t border-slate-200 dark:border-white/[0.07]"><span>{tr("total")}</span><Price pkr={quote.total} /></div>
            </div>
          ) : (
            <div className="flex justify-center py-4"><Spinner size={22} /></div>
          )}
        </div>
      </div>
    </div>
  );
}
