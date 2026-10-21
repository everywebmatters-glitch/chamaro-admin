import { apiRequest, apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

// Shape of /api/v1/admin/payments (backend/src/routes/payment.routes.ts, Prisma Payment). Amounts are in paise.
export type PaymentStatusCode = "CREATED" | "FAILED" | "AUTHORIZED" | "CAPTURED" | "PARTIALLY_REFUNDED" | "REFUNDED";

export interface ApiPayment {
  id: string;
  orderId: string;
  provider: string;
  // The Razorpay key mode the payment was made with; test-mode payments move no real money.
  mode: "test" | "live";
  providerOrderId: string;
  providerPaymentId: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatusCode;
  amountRefundedMinor: number;
  method: string | null;
  lastErrorCode: string | null;
  lastErrorReason: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  capturedAt: string | null;
  refundedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

// attention = money flagged for review, or a refund Razorpay reported as failed.
export async function listAdminPayments(token: string, query: { page: number; attention?: boolean; status?: PaymentStatusCode }, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), limit: "20" });
  if (query.attention) params.set("attention", "true");
  if (query.status) params.set("status", query.status);
  const { data, meta } = await apiRequestWithMeta<ApiPayment[]>(`/admin/payments?${params}`, { token, signal });
  return { payments: data, meta: meta as PageMeta | undefined };
}

// Reads the payment back from Razorpay now and applies what it says (e.g. after a refund made in the Razorpay dashboard).
export function syncAdminPayment(token: string, id: string) {
  return apiRequest<ApiPayment>(`/admin/payments/${encodeURIComponent(id)}/sync`, { method: "POST", token });
}
