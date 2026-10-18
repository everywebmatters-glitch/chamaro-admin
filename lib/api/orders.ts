import { apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

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
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
  customer: { id: string; customerType: "RETAIL" | "B2B"; user: { id: string; name: string; email: string } };
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
