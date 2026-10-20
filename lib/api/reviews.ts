import { apiRequest, apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

// Shape of /api/v1/admin/reviews (backend/src/routes/review.routes.ts, Prisma Review + its product).
export type ReviewStatusCode = "PENDING" | "APPROVED" | "HIDDEN";

export interface ApiReview {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  body: string;
  status: ReviewStatusCode;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; slug: string };
}

export async function listAdminReviews(token: string, query: { page: number; status?: ReviewStatusCode }, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), limit: "20" });
  if (query.status) params.set("status", query.status);
  const { data, meta } = await apiRequestWithMeta<ApiReview[]>(`/admin/reviews?${params}`, { token, signal });
  return { reviews: data, meta: meta as PageMeta | undefined };
}

export function setAdminReviewStatus(token: string, id: string, status: ReviewStatusCode) {
  return apiRequest<ApiReview>(`/admin/reviews/${encodeURIComponent(id)}`, { method: "PUT", token, body: { status } });
}

export function deleteAdminReview(token: string, id: string) {
  return apiRequest<void>(`/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE", token });
}
