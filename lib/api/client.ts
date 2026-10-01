// Single entry point for every call from the Admin app to the Fastify API.
// The backend always answers with { success: true, data } or { success: false, error: { code, message } }.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

export class ApiError extends Error {
  // status 0 means the request never got an HTTP response (backend down, CORS, DNS, offline).
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  0: "Can't reach the Chamaro API. Check that the backend is running and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "The requested resource was not found.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "The server ran into a problem. Please try again shortly.",
};

function fallbackMessage(status: number): string {
  return FALLBACK_MESSAGES[status] ?? (status >= 500 ? FALLBACK_MESSAGES[500] : "Something went wrong. Please try again.");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, { method = "GET", body, token, signal }: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "API_NOT_CONFIGURED", "NEXT_PUBLIC_API_URL is not set for the Admin app.");
  }

  // FormData (file uploads) is sent as multipart; the browser sets its Content-Type and boundary.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", fallbackMessage(0));
  }

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: T; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok || payload?.success === false) {
    const status = response.ok ? 500 : response.status;
    // 5xx bodies are generic on purpose; show our own wording instead.
    const message = status < 500 && payload?.error?.message ? payload.error.message : fallbackMessage(status);
    throw new ApiError(status, payload?.error?.code ?? `HTTP_${status}`, message);
  }

  return payload?.data as T;
}

// The API returns its own files (e.g. uploaded images) as root-relative paths like /api/v1/media/:id;
// resolve them against the API's origin. Absolute URLs (and blob: previews) are returned unchanged.
export function resolveApiUrl(url: string): string {
  if (!url.startsWith("/") || !API_BASE_URL) return url;
  return new URL(url, API_BASE_URL).toString();
}
