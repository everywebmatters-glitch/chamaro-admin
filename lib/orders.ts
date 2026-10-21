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
  if (order.shipment && !courierBookingUnsent(order.shipment)) return "This order has a Delhivery shipment; its status comes from Delhivery.";
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

// ---- Delhivery booking ---------------------------------------------------------------------------------------------

type ShipmentLike = { status: string; waybill: string | null; needsReconcile: boolean; lockedUntil?: string | null };

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Booking queued",
  CREATING: "Booking with Delhivery",
  CREATE_FAILED: "Booking needs attention",
  MANIFESTED: "Booked, awaiting pickup",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURN_IN_TRANSIT: "Returning",
  RETURNED: "Returned",
  CANCELLED: "Booking cancelled",
};

// What each recorded booking problem means for the admin.
export const BOOKING_PROBLEMS: Record<string, string> = {
  PARCEL_DETAILS_MISSING: "The product has no packed weight and size. Enter the parcel below and book.",
  MULTI_PARCEL_ORDER: "More than one unit: pack the order, then enter the parcel below and book.",
  PINCODE_NOT_SERVICEABLE: "Delhivery does not deliver prepaid orders to this PIN code. Ship by hand with another courier.",
  ADDRESS_INCOMPLETE: "The delivery address is incomplete. Contact the customer.",
  EWAYBILL_REQUIRED: "Orders of Rs. 50,000 or more need an e-waybill number.",
  DELHIVERY_REJECTED: "Delhivery rejected the booking (see its remark). Fix the problem and retry, or ship by hand.",
  DELHIVERY_AUTH_FAILED: "Delhivery refused the API credentials. Check the Delhivery setup.",
  DELHIVERY_UNAVAILABLE: "Delhivery did not answer. The retry first checks whether it created the shipment anyway.",
  DELHIVERY_BAD_RESPONSE: "Delhivery's answer could not be read. The retry first checks whether it created the shipment anyway.",
  SHIPPING_DISABLED: "Delhivery shipping is not switched on yet. Ship by hand.",
  DELHIVERY_NOT_CONFIGURED: "Delhivery is not configured yet. Ship by hand.",
};

// A booking that never reached Delhivery (queued, or refused with nothing created): shipping by hand withdraws it.
export function courierBookingUnsent(shipment: ShipmentLike): boolean {
  return !shipment.waybill && (shipment.status === "QUEUED" || (shipment.status === "CREATE_FAILED" && !shipment.needsReconcile));
}

// Whether "Book with Delhivery" / "Retry booking" is offered: a paid, unshipped order whose booking is not done or
// running. The server decides finally (verified live payment, Delhivery configured).
export function canBookCourier(order: Pick<ApiOrder, "status" | "paymentStatus" | "trackingNumber" | "shipment">, now = Date.now()): boolean {
  if (order.paymentStatus !== "PAID" || !SHIPPABLE.includes(order.status)) return false;
  const shipment = order.shipment;
  if (!shipment) return !order.trackingNumber;
  if (shipment.waybill) return false;
  if (shipment.status === "CREATING") return Boolean(shipment.lockedUntil && Date.parse(shipment.lockedUntil) < now);
  return shipment.status === "QUEUED" || shipment.status === "CREATE_FAILED";
}
