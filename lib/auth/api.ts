import { apiRequest } from "@/lib/api/client";

// Shapes mirror backend/src/types/auth.types.ts (AuthenticatedUser / SafeUser).
export interface AdminLoginResult {
  token: string;
  user: { id: string; name: string; email: string; role: "ADMIN" | "CUSTOMER" };
}

export interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  isActive: boolean;
  createdAt: string;
}

export function loginAdmin(email: string, password: string) {
  return apiRequest<AdminLoginResult>("/auth/admin/login", { method: "POST", body: { email, password } });
}

// The API answers the same whether or not the email has an account, so this never says which.
export function requestPasswordResetLink(email: string) {
  return apiRequest<{ message: string }>("/auth/forgot-password/request-link", { method: "POST", body: { email } });
}

export function resetPasswordWithToken(token: string, newPassword: string) {
  return apiRequest<{ message: string }>("/auth/reset-password", { method: "POST", body: { token, newPassword } });
}

export function fetchCurrentAdmin(token: string, signal?: AbortSignal) {
  return apiRequest<CurrentAdmin>("/admin/me", { token, signal });
}
