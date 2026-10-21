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

// ---- shipping by hand ----------------------------------------------------------------------------------------------

const SHIPPABLE: OrderStatusCode[] = ["PENDING", "CONFIRMED", "PROCESSING"];

// Why an order can't be marked shipped here (null = it can). The server makes the final decision, including that the
// payment is a verified live Razorpay payment; this only decides whether to offer the form.
export function shipBlockReason(order: Pick<ApiOrder, "status" | "paymentStatus" | "trackingNumber" | "shipment">): string | null {
  if (order.shipment) return "This order has a Delhivery shipment; its status comes from Delhivery.";
  if (order.trackingNumber || order.status === "SHIPPED" || order.status === "COMPLETED") return "This order has already been shipped.";
  if (order.status === "CANCELLED") return "Cancelled orders can't be shipped.";
  if (order.paymentStatus !== "PAID") return "Only paid orders can be shipped.";
  if (!SHIPPABLE.includes(order.status)) return "This order can't be shipped.";
  return null;
}

// The same limits the API enforces (shipOrderBody in backend order.routes.ts), checked before sending.
export function validateShipment(input: { carrier: string; trackingNumber: string }): { carrier?: string; trackingNumber?: string } {
  const errors: { carrier?: string; trackingNumber?: string } = {};
  const carrier = input.carrier.trim();
  const tracking = input.trackingNumber.trim();
  if (!carrier) errors.carrier = "Enter the courier's name.";
  else if (carrier.length > 64) errors.carrier = "Keep the courier's name under 64 characters.";
  if (!tracking) errors.trackingNumber = "Enter the tracking number.";
  else if (tracking.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9 _./-]*$/.test(tracking)) errors.trackingNumber = "Use letters, numbers, spaces and . _ / - only.";
  return errors;
}
