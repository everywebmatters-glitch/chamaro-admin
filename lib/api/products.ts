import { apiRequest } from "@/lib/api/client";

// Shapes mirror the admin product routes in backend/src/routes/product.routes.ts
// (Prisma Product + include { category, images, variants, inventory }).
export type ProductStatusCode = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ApiProductImage {
  id: string;
  // Uploaded image; null for legacy externally hosted images.
  mediaId: string | null;
  // Uploaded images: root-relative API path (/api/v1/media/:id), resolve with resolveApiUrl.
  // Legacy images: the stored external URL.
  url: string | null;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

export interface ApiProductVariant {
  id: string;
  name: string;
  sku: string;
  price: string | null; // Prisma Decimal as string; null = uses the product price
  options: Record<string, unknown>;
  status: ProductStatusCode;
}

export interface ProductSpecification {
  label: string; // 1..100
  value: string; // 1..500
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  // Storefront product-page tabs (null until set)
  features: string[] | null;
  materials: string[] | null;
  specifications: ProductSpecification[] | null;
  returnPolicy: string | null; // null = storefront shows the store-wide policy
  warranty: string | null; // null = storefront shows the store-wide warranty
  price: string; // Prisma Decimal, serialized as a string, e.g. "249.99"
  compareAtPrice: string | null;
  sku: string | null;
  status: ProductStatusCode;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
  images: ApiProductImage[];
  variants: ApiProductVariant[];
  inventory: { id: string; quantity: number; reservedQuantity: number } | null;
}

export interface AdminProductQuery {
  page: number; // >= 1
  limit: number; // 1..100
  search?: string; // matches name or SKU (contains), max 100 chars
  categoryId?: string;
  status?: ProductStatusCode;
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

// Body of POST/PUT /api/v1/admin/products (additionalProperties: false — only these keys are accepted).
export interface ProductImageInput {
  mediaId: string; // from POST /admin/media/upload; external URLs are not accepted
  altText?: string; // <= 500
  position?: number; // integer >= 0
  isPrimary?: boolean;
}

export interface ProductVariantInput {
  name: string;
  sku: string; // unique across all variants
  options: Record<string, string>;
  price?: number; // >= 0
  status?: ProductStatusCode; // API default: ACTIVE
}

export interface CreateProductInput {
  name: string; // 1..191
  slug: string; // 1..191, the API normalizes it (lowercase, non-alphanumerics -> "-")
  price: number; // >= 0, stored as DECIMAL(12,2)
  categoryId: string; // must reference an existing category, else 404 "Category not found"
  description?: string; // <= 50000
  features?: string[]; // <= 30 items, each 1..300
  materials?: string[]; // <= 30 items, each 1..300
  specifications?: ProductSpecification[]; // <= 50 rows
  returnPolicy?: string; // <= 5000; "" = use the store-wide policy
  warranty?: string; // <= 5000; "" = use the store-wide warranty
  compareAtPrice?: number; // >= 0 and >= price
  sku?: string; // <= 191, unique
  status?: ProductStatusCode; // API default: DRAFT
  quantity?: number; // integer >= 0, creates/updates the inventory record
  images?: ProductImageInput[]; // on update, replaces all images
  variants?: ProductVariantInput[]; // on update, replaces all variants
}

// PUT accepts any non-empty subset. Fields can't be cleared: the schema has no nulls.
export type UpdateProductInput = Partial<CreateProductInput>;

export function createAdminProduct(token: string, input: CreateProductInput) {
  return apiRequest<ApiProduct>("/admin/products", { method: "POST", token, body: input });
}

export function getAdminProduct(token: string, id: string, signal?: AbortSignal) {
  return apiRequest<ApiProduct>(`/admin/products/${encodeURIComponent(id)}`, { token, signal });
}

// Id of the one exported /products/[id]/edit page; the real id is then taken from the URL.
export const SHELL_PRODUCT_ID = "_";

export function updateAdminProduct(token: string, id: string, input: UpdateProductInput) {
  return apiRequest<ApiProduct>(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", token, body: input });
}

// 204 on success; 409 RECORD_IN_USE when the product is on an order or quotation.
export function deleteAdminProduct(token: string, id: string) {
  return apiRequest<void>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export function listAdminProducts(token: string, query: AdminProductQuery, signal?: AbortSignal) {
  return apiRequest<ApiProduct[]>(`/admin/products?${toQueryString(query)}`, { token, signal });
}

// Every product, 100 per request (the API maximum).
export async function listAllAdminProducts(token: string, signal?: AbortSignal) {
  const all: ApiProduct[] = [];
  for (let page = 1; ; page++) {
    const rows = await listAdminProducts(token, { page, limit: 100 }, signal);
    all.push(...rows);
    if (rows.length < 100) return all;
  }
}
