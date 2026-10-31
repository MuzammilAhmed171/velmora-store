export function pkr(n: number): string {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
