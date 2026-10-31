// Tiny typed API client. Base URL comes from VITE_API_URL (written by `npm run setup`).
// Dev fallback: local API. Production build without VITE_API_URL: same-origin
// (used on Vercel, where the API runs as a serverless function on the same domain).
const BASE =
  (import.meta.env.VITE_API_URL as string) || (import.meta.env.DEV ? "http://localhost:4000" : "");

export function getToken(): string | null {
  return localStorage.getItem("velmora_token");
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem("velmora_token", t);
  else localStorage.removeItem("velmora_token");
}
export function getGuestKey(): string {
  let k = localStorage.getItem("velmora_guest");
  if (!k) {
    k = "g-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("velmora_guest", k);
  }
  return k;
}

type Opts = { method?: string; body?: any; auth?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  headers["X-Guest-Key"] = getGuestKey();
  const res = await fetch(BASE + "/api" + path, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server did not respond. Is the API running?");
  }
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const API_BASE = BASE;
