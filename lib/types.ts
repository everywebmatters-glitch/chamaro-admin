export type ProductStatus = "Active" | "Draft" | "Out of stock";

export interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  status: ProductStatus;
  updatedAt: string;
  description?: string;
  // B2B UI-preparation fields — no pricing model finalized yet.
  retailAvailable: boolean;
  b2bAvailable: boolean;
  moq?: number;
  b2bPricingNote?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  status: "Active" | "Inactive";
  updatedAt: string;
}

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Shipped" | "Completed" | "Cancelled";
export type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed";

export interface Order {
  id: string;
  customer: string;
  email: string;
  date: string;
  items: number;
  total: number;
  payment: PaymentStatus;
  status: OrderStatus;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
  order: number;
  status: "Active" | "Inactive";
  updatedAt: string;
  startAt?: string;
  endAt?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export type CustomerType = "Retail" | "B2B";

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  joinedAt: string;
  // Retail-only
  ordersCount?: number;
  totalSpent?: number;
  recentOrders?: { id: string; date: string; total: number }[];
  // B2B-only
  companyName?: string;
  contactPerson?: string;
  enquiriesCount?: number;
  quotationStatus?: string;
  recentActivity?: { label: string; date: string }[];
}

export type EnquiryStatus =
  | "New"
  | "Contacted"
  | "Requirement Received"
  | "Quotation Sent"
  | "Negotiating"
  | "Converted"
  | "Closed";

export interface B2BEnquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  requirement: string;
  estimatedQuantity: number;
  productsRequested: string;
  notes?: string;
  expectedTimeline?: string;
  date: string;
  status: EnquiryStatus;
}

export type AdminRole = "ADMIN";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Inactive";
  role: AdminRole;
}
