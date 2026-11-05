import { apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

export type CustomerType = "RETAIL" | "B2B";

export interface ApiCustomer {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  customer: {
    customerType: CustomerType;
    phone: string | null;
    companyName: string | null;
    _count: { retailOrders: number };
  };
}

export async function listAdminCustomers(
  token: string,
  query: { page: number; search?: string; customerType?: CustomerType },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(query.page), limit: "20" });
  if (query.search) params.set("search", query.search);
  if (query.customerType) params.set("customerType", query.customerType);
  const { data, meta } = await apiRequestWithMeta<ApiCustomer[]>(`/admin/customers?${params}`, { token, signal });
  return { customers: data, meta: meta as PageMeta | undefined };
}
