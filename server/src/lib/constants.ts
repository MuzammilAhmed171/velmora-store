export const ORDER_STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const PAYMENT_METHODS = [
  { id: "COD", label: "Cash on Delivery" },
  { id: "CARD", label: "Debit / Credit Card (demo)" },
  { id: "JAZZCASH", label: "JazzCash" },
  { id: "EASYPASA", label: "EasyPaisa" },
  { id: "BANK", label: "Bank Transfer" },
] as const;

export const LOYALTY_TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;

export function tierFor(points: number): string {
  if (points >= 5000) return "Platinum";
  if (points >= 2000) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}
