import { apiRequest } from "@/lib/api/client";
import type { ProductStatusCode } from "@/lib/api/products";

// Shape of GET /api/v1/admin/categories in backend/src/routes/category.routes.ts.
export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatusCode;
  createdAt: string;
  updatedAt: string;
}

// The API caps limit at 100. `search` matches the category name (contains).
export function listAdminCategories(token: string, signal?: AbortSignal, search?: string) {
  const query = new URLSearchParams({ limit: "100", ...(search ? { search } : {}) });
  return apiRequest<ApiCategory[]>(`/admin/categories?${query}`, { token, signal });
}

// Body of POST/PUT /api/v1/admin/categories (additionalProperties: false).
export interface CategoryInput {
  name: string; // 1..191
  slug: string; // 1..191, normalized by the API; unique (409 DUPLICATE_RECORD)
  description?: string; // <= 10000
  status?: ProductStatusCode; // API default: DRAFT. Only ACTIVE categories are public.
}

export function createAdminCategory(token: string, input: CategoryInput) {
  return apiRequest<ApiCategory>("/admin/categories", { method: "POST", token, body: input });
}

export function updateAdminCategory(token: string, id: string, input: Partial<CategoryInput>) {
  return apiRequest<ApiCategory>(`/admin/categories/${encodeURIComponent(id)}`, { method: "PUT", token, body: input });
}

// 204 on success; 409 CATEGORY_IN_USE while any product belongs to it.
export function deleteAdminCategory(token: string, id: string) {
  return apiRequest<void>(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE", token });
}
