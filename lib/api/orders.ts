import { apiRequest, apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

// Shapes of GET /api/v1/admin/orders (backend/src/services/order.service.ts). Money amounts are decimal strings in rupees.
export type OrderStatusCode = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
export type PaymentStatusCode = "UNPAID" | "PAID" | "REFUNDED";

export interface ApiOrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  productName: string | null;
  variantName: string | null;
  sku: string | null;
}

export interface ApiOrderAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ApiOrder {
  id: string;
  status: OrderStatusCode;
  paymentStatus: PaymentStatusCode;
  subtotal: string;
  shippingTotal: string;
  total: string;
  shippingMethod: string | null;
  // The address as it was when the order was placed.
  shippingAddress: ApiOrderAddress | null;
  note: string | null;
  // Set together when the order is marked shipped (by hand here, or by Delhivery's tracking).
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  // The Delhivery booking, when there is one (admins see the full record).
  shipment?: ApiShipment | null;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
  customer: { id: string; customerType: "RETAIL" | "B2B"; user: { id: string; name: string; email: string } };
}

export type ShipmentStatusCode = "QUEUED" | "CREATING" | "CREATE_FAILED" | "MANIFESTED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURN_IN_TRANSIT" | "RETURNED" | "CANCELLED";

// Shape of RetailOrder.shipment for admins (backend Prisma Shipment).
export interface ApiShipment {
  id: string;
  status: ShipmentStatusCode;
  waybill: string | null; // the AWB, once Delhivery has created the shipment
  uploadWbn: string | null; // Delhivery's reference for the booking (manifest upload)
  providerStatus: string | null;
  providerStatusLocation: string | null;
  providerStatusAt: string | null;
  trackingUrl: string | null; // only when Delhivery's API returns one
  attempts: number;
  autoBooked: boolean;
  needsReconcile: boolean; // Delhivery may already have it: the next attempt looks it up first
  nextAttemptAt: string | null;
  lockedUntil: string | null;
  lastErrorCode: string | null;
  lastErrorRemark: string | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  manifestedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface AdminOrderQuery {
  page: number;
  limit: number;
  status?: OrderStatusCode;
  paymentStatus?: PaymentStatusCode;
  search?: string; // an order id, or part of the customer's name or email
}

export async function listAdminOrders(token: string, query: AdminOrderQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.status) params.set("status", query.status);
  if (query.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query.search) params.set("search", query.search);
  const { data, meta } = await apiRequestWithMeta<ApiOrder[]>(`/admin/orders?${params}`, { token, signal });
  return { orders: data, meta: meta as PageMeta | undefined };
}

// POST /api/v1/admin/orders/:id/ship: marks a paid order shipped with the courier's name and tracking number and emails
// the customer once. The server re-checks everything (a verified live payment, a shippable status); repeating the same
// carrier and tracking number returns the order unchanged.
export function shipAdminOrder(token: string, id: string, input: { carrier: string; trackingNumber: string }) {
  return apiRequest<ApiOrder>(`/admin/orders/${encodeURIComponent(id)}/ship`, { method: "POST", token, body: input });
}

// POST /api/v1/admin/orders/:id/shipment: books (or retries booking) the order with Delhivery. The parcel entered here
// replaces the recorded one; without it the recorded parcel is used. The server re-checks the verified live payment,
// and a repeat never creates a second shipment (a booking whose outcome was unknown is looked up at Delhivery first).
export function bookCourier(token: string, id: string, parcel: { weightGrams?: number; lengthCm?: number; widthCm?: number; heightCm?: number }) {
  return apiRequest<ApiOrder>(`/admin/orders/${encodeURIComponent(id)}/shipment`, { method: "POST", token, body: parcel });
}

// POST /api/v1/admin/orders/:id/shipment/sync: reads the shipment's status from Delhivery now.
export function refreshCourierTracking(token: string, id: string) {
  return apiRequest<ApiOrder>(`/admin/orders/${encodeURIComponent(id)}/shipment/sync`, { method: "POST", token });
}
