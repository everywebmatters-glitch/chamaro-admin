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

export function fetchCurrentAdmin(token: string, signal?: AbortSignal) {
  return apiRequest<CurrentAdmin>("/admin/me", { token, signal });
}
