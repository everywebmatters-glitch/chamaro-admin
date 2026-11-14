import { apiRequest } from "@/lib/api/client";
import type { OrphanReleaseView, StockFigures } from "@/lib/orphan-release";

// Admin inventory corrections (backend/src/routes/inventory.routes.ts).
// Paths are relative to NEXT_PUBLIC_API_URL, which already ends in /api/v1.

export function getOrphanReleaseView(token: string, productId: string, signal?: AbortSignal): Promise<OrphanReleaseView> {
  return apiRequest<OrphanReleaseView>(`/admin/inventory/products/${encodeURIComponent(productId)}/orphan-release`, { token, signal });
}

export interface OrphanReleaseRequest {
  quantity: number;
  expectedOnHand: number;
  expectedReserved: number;
  reason: string;
  reference: string;
}

export interface OrphanReleaseResponse {
  movement: { id: string; quantity: number; reservedBefore: number; reservedAfter: number; reason: string; reference: string; createdAt: string };
  stock: StockFigures;
}

export function releaseOrphanedReservation(token: string, productId: string, body: OrphanReleaseRequest): Promise<OrphanReleaseResponse> {
  return apiRequest<OrphanReleaseResponse>(`/admin/inventory/products/${encodeURIComponent(productId)}/orphan-releases`, { method: "POST", token, body });
}
