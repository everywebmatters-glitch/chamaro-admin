import { apiRequest } from "@/lib/api/client";

// POST /api/v1/admin/media/upload (backend/src/routes/media.routes.ts). The bytes are stored in the
// database; `url` is the root-relative path that serves them (resolve with resolveApiUrl).
export interface UploadedMedia {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string | null;
}

// Mirrors the API's limits so most problems are caught before uploading. The API re-checks
// the actual file contents, so these are a convenience, not the security boundary.
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageFileProblem(file: File): string | null {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) return `“${file.name}” isn't a JPEG, PNG or WebP image.`;
  if (file.size > MAX_IMAGE_BYTES) return `“${file.name}” is larger than 5 MB.`;
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

export function uploadMedia(token: string, file: File, altText?: string) {
  const form = new FormData();
  // Fields must come before the file for the API to read them.
  if (altText) form.append("altText", altText);
  form.append("file", file);
  return apiRequest<UploadedMedia>("/admin/media/upload", { method: "POST", token, body: form });
}

// GET /api/v1/admin/media: metadata for the 100 most recent files, newest first (no pagination, no image bytes).
export interface ApiMedia {
  id: string;
  // Uploaded files: root-relative path that serves the bytes (resolve with resolveApiUrl). Registered external files: their own URL.
  url: string | null;
  filename: string;
  altText: string | null;
  mimeType: string;
  size: number | null;
  createdAt: string;
  updatedAt: string;
}

export const MEDIA_LIST_LIMIT = 100;

export function listAdminMedia(token: string, signal?: AbortSignal) {
  return apiRequest<ApiMedia[]>("/admin/media", { token, signal });
}

// 409 RECORD_IN_USE when a product still shows the image.
export function deleteAdminMedia(token: string, id: string) {
  return apiRequest<void>(`/admin/media/${encodeURIComponent(id)}`, { method: "DELETE", token });
}
