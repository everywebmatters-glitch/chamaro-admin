import { apiRequest, apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

// Shape of /api/v1/admin/cms/pages (backend/src/routes/cms.routes.ts, Prisma CmsPage + CmsSection).
export type PageStatusCode = "DRAFT" | "PUBLISHED";

export interface ApiCmsSection {
  id: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
}

export interface ApiCmsPage {
  id: string;
  title: string;
  slug: string;
  status: PageStatusCode;
  seoTitle: string | null;
  seoDescription: string | null;
  sections?: ApiCmsSection[];
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Body of POST/PUT (additionalProperties: false). `sections`, when sent, replaces all of the page's sections.
export interface CmsPageInput {
  title: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  sections?: { type: string; content: Record<string, unknown>; position: number }[];
}

const PAGE_LIMIT = 100;

export async function listAdminCmsPages(token: string, signal?: AbortSignal) {
  const { data, meta } = await apiRequestWithMeta<ApiCmsPage[]>(`/admin/cms/pages?limit=${PAGE_LIMIT}`, { token, signal });
  return { pages: data, meta: meta as PageMeta | undefined };
}

export function getAdminCmsPage(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<ApiCmsPage>(`/admin/cms/pages/${encodeURIComponent(id)}`, { token, signal });
}

export function createAdminCmsPage(token: string, input: CmsPageInput) {
  return apiRequest<ApiCmsPage>("/admin/cms/pages", { method: "POST", token, body: input });
}

export function updateAdminCmsPage(token: string, id: string, input: Partial<CmsPageInput>) {
  return apiRequest<ApiCmsPage>(`/admin/cms/pages/${encodeURIComponent(id)}`, { method: "PUT", token, body: input });
}

export function deleteAdminCmsPage(token: string, id: string) {
  return apiRequest<void>(`/admin/cms/pages/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export function setAdminCmsPagePublished(token: string, id: string, published: boolean) {
  return apiRequest<ApiCmsPage>(`/admin/cms/pages/${encodeURIComponent(id)}/${published ? "publish" : "unpublish"}`, { method: "POST", token });
}
