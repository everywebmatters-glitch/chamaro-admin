// The admin access token (JWT from POST /auth/admin/login) is kept in a first-party cookie so that:
// - it survives reloads and is shared across tabs (the app is a static export, so there is no server session), and
// - the browser API client can send it as the Bearer token the Fastify API expects.
// The cookie is never trusted on its own: AuthProvider validates it with GET /admin/me.

export const SESSION_COOKIE = "chamaro_admin_token";

// Matches the backend's JWT lifetime (sign.expiresIn: "8h" in backend/src/plugins/auth.ts).
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join("=")) || null;
  }
  return null;
}

function writeCookie(value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${secure}`;
}

export function setSessionToken(token: string) {
  writeCookie(token, SESSION_MAX_AGE_SECONDS);
}

export function clearSessionToken() {
  writeCookie("", 0);
}

// Only allow same-app paths as a post-login destination (blocks "//evil.com" and absolute URLs).
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/dashboard";
  return value;
}
