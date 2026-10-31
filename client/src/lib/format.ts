// Currency: prices are stored in PKR; the switcher converts for display.
export const CURRENCIES: Record<string, { symbol: string; rate: number; label: string }> = {
  PKR: { symbol: "Rs", rate: 1, label: "PKR — Pakistani Rupee" },
  USD: { symbol: "$", rate: 278, label: "USD — US Dollar" },
  EUR: { symbol: "€", rate: 300, label: "EUR — Euro" },
  AED: { symbol: "د.إ", rate: 75.7, label: "AED — UAE Dirham" },
};

export function money(pkr: number, currency = "PKR"): string {
  const c = CURRENCIES[currency] || CURRENCIES.PKR;
  const v = pkr / c.rate;
  const rounded = currency === "PKR" ? Math.round(v).toLocaleString("en-PK") : v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${c.symbol} ${rounded}`;
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function countdown(target: string): { d: number; h: number; m: number; s: number; done: boolean } {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  };
}

export function emiOptions(total: number): { months: number; perMonth: number }[] {
  return [3, 6, 12].map((months) => ({ months, perMonth: Math.round(total / months) }));
}
