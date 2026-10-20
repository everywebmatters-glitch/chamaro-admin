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

// Password reset by emailed 6-digit code. The send answers the same whether or not the email has an account.
export function sendPasswordResetCode(email: string) {
  return apiRequest<{ message: string }>("/auth/forgot-password/send-otp", { method: "POST", body: { email } });
}

// Checks the code without using it up, so the new-password step can follow; reset below checks it again.
export function verifyPasswordResetCode(email: string, otp: string) {
  return apiRequest<{ verified: true }>("/auth/forgot-password/verify-otp", { method: "POST", body: { email, otp } });
}

export function resetPasswordWithCode(email: string, otp: string, newPassword: string) {
  return apiRequest<{ message: string }>("/auth/forgot-password/reset", { method: "POST", body: { email, otp, newPassword } });
}

export function fetchCurrentAdmin(token: string, signal?: AbortSignal) {
  return apiRequest<CurrentAdmin>("/admin/me", { token, signal });
}
