import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, getGuestKey } from "../lib/api";
import { t, Lang } from "../lib/i18n";

export interface User {
  id: string; name: string; email: string; phone?: string; role: string;
  loyaltyPoints: number; walletBalance: number; tier: string; referralCode?: string;
}

interface Store {
  user: User | null;
  theme: "light" | "dark";
  lang: Lang;
  currency: string;
  cartCount: number;
  wishCount: number;
  notifCount: number;
  toasts: { id: number; msg: string; kind: string }[];
  tr: (key: string) => string;
  setTheme: (t: "light" | "dark") => void;
  setLang: (l: Lang) => void;
  setCurrency: (c: string) => void;
  refreshUser: () => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshCounts: () => Promise<void>;
  toast: (msg: string, kind?: string) => void;
}

const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

let toastId = 1;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">(
    (localStorage.getItem("velmora_theme") as any) || "light"
  );
  const [lang, setLangState] = useState<Lang>((localStorage.getItem("velmora_lang") as Lang) || "en");
  const [currency, setCurrencyState] = useState(localStorage.getItem("velmora_currency") || "PKR");
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [toasts, setToasts] = useState<Store["toasts"]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    localStorage.setItem("velmora_theme", theme);
  }, [theme, lang]);

  const toast = (msg: string, kind = "info") => {
    const id = toastId++;
    setToasts((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  };

  const refreshUser = async () => {
    if (!getToken()) { setUser(null); return; }
    try {
      const d = await api<{ user: User | null }>("/auth/me");
      setUser(d.user);
    } catch { setUser(null); }
  };

  const refreshCounts = async () => {
    try {
      const c = await api<{ items: any[] }>("/cart");
      setCartCount(c.items.reduce((s, i) => s + (i.qty || 1), 0));
    } catch { /* offline */ }
    try {
      const w = await api<{ items: any[] }>("/wishlist");
      setWishCount(w.items.length);
    } catch { /* offline */ }
    if (getToken()) {
      try {
        const n = await api<{ notifications: any[] }>("/notifications");
        setNotifCount(n.notifications.filter((x) => !x.isRead).length);
      } catch { /* offline */ }
    }
  };

  const login = async (token: string) => {
    setToken(token);
    const gk = getGuestKey();
    try { await api("/cart/merge", { method: "POST", body: { guestKey: gk } }); } catch { /* ignore */ }
    try { await api("/orders/claim", { method: "POST", body: { guestKey: gk } }); } catch { /* ignore */ }
    await refreshUser();
    await refreshCounts();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    refreshCounts();
  };

  useEffect(() => { refreshUser(); refreshCounts(); }, []);

  const value: Store = {
    user, theme, lang, currency, cartCount, wishCount, notifCount, toasts,
    tr: (k) => t(k, lang),
    setTheme: setThemeState,
    setLang: (l) => { setLangState(l); localStorage.setItem("velmora_lang", l); },
    setCurrency: (c) => { setCurrencyState(c); localStorage.setItem("velmora_currency", c); },
    refreshUser, login, logout, refreshCounts, toast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
