// Display helpers for orders (type-only imports, unit-tested with `node --test`).
import type { ApiOrder, OrderStatusCode, PaymentStatusCode } from "@/lib/api/orders";

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusCode, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export const PAYMENT_TONES: Record<PaymentStatusCode, "amber" | "green" | "zinc"> = { UNPAID: "amber", PAID: "green", REFUNDED: "zinc" };

export function statusOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

// "ckx9f2a1…" is long and unreadable; the last characters are enough to tell orders apart on screen.
export function shortOrderId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

export function itemCount(order: Pick<ApiOrder, "items">): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function itemName(item: Pick<ApiOrder["items"][number], "productName" | "variantName">): string {
  const name = item.productName ?? "Product";
  return item.variantName ? `${name} (${item.variantName})` : name;
}

export function addressLines(address: ApiOrder["shippingAddress"]): string[] {
  if (!address) return [];
  return [address.name, address.addressLine1, address.addressLine2, `${address.city}, ${address.state} ${address.postalCode}`, address.country, address.phone].filter((line): line is string => Boolean(line && line.trim()));
}
