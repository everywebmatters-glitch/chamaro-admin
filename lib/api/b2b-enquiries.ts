import { apiRequestWithMeta, type PageMeta } from "@/lib/api/client";

export type B2BEnquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "REQUIREMENT_RECEIVED"
  | "QUOTATION_SENT"
  | "NEGOTIATING"
  | "CONVERTED"
  | "CLOSED";

export interface ApiB2BEnquiry {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: B2BEnquiryStatus;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    quantity: number;
    requirements: string | null;
  }>;
}

export async function listAdminB2BEnquiries(token: string, page: number, limit: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const { data, meta } = await apiRequestWithMeta<ApiB2BEnquiry[]>(`/admin/b2b-enquiries?${params}`, {
    token,
    signal,
  });
  return { enquiries: data, meta: meta as PageMeta | undefined };
}
