import { apiRequest, apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

export interface ApiAdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  isActive: boolean;
  createdAt: string;
}

export async function listAdminUsers(token: string, query: { page: number; search?: string }, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), limit: "20" });
  if (query.search) params.set("search", query.search);
  const { data, meta } = await apiRequestWithMeta<ApiAdminUser[]>(`/admin/admins?${params}`, { token, signal });
  return { admins: data, meta: meta as PageMeta | undefined };
}

export function createAdminUser(token: string, input: { name: string; email: string; password: string }) {
  return apiRequest<ApiAdminUser>("/admin/admins", { method: "POST", token, body: input });
}

export function setAdminUserActive(token: string, id: string, isActive: boolean) {
  return apiRequest<ApiAdminUser>(`/admin/admins/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    token,
    body: { isActive },
  });
}
