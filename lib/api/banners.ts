import { apiRequest } from "@/lib/api/client";
import type { ProductStatusCode } from "@/lib/api/products";

// Shape of GET /api/v1/admin/cms/banners (backend/src/routes/cms.routes.ts, Prisma Banner).
export interface ApiBanner {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  altText: string | null;
  status: ProductStatusCode;
  position: number;
  pageId: string | null;
  publishedAt: string | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Body of POST/PUT (additionalProperties: false). Image and link URLs must be absolute http(s) URLs. The API only
// accepts values for the optional fields, so an edit can change them but cannot blank one that is already set.
export interface BannerInput {
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  altText?: string;
  status?: ProductStatusCode;
  position?: number;
  startAt?: string; // ISO date-time
  endAt?: string;
}

export function listAdminBanners(token: string, signal?: AbortSignal) {
  return apiRequest<ApiBanner[]>("/admin/cms/banners", { token, signal });
}

export function getAdminBanner(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<ApiBanner>(`/admin/cms/banners/${encodeURIComponent(id)}`, { token, signal });
}

export function createAdminBanner(token: string, input: BannerInput) {
  return apiRequest<ApiBanner>("/admin/cms/banners", { method: "POST", token, body: input });
}

export function updateAdminBanner(token: string, id: string, input: Partial<BannerInput>) {
  return apiRequest<ApiBanner>(`/admin/cms/banners/${encodeURIComponent(id)}`, { method: "PUT", token, body: input });
}

export function deleteAdminBanner(token: string, id: string) {
  return apiRequest<void>(`/admin/cms/banners/${encodeURIComponent(id)}`, { method: "DELETE", token });
}
