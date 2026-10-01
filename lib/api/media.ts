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
