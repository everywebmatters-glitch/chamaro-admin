import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  CreditCard,
  Handshake,
  Users,
  Image as ImageIcon,
  Images,
  FileText,
  MessageSquare,
  LayoutTemplate,
  Settings,
  ShieldCheck,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  items?: NavLeaf[];
}

export const navSections: NavSection[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Catalog",
    icon: Package,
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: FolderTree },
      { label: "Inventory", href: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { label: "Retail Orders", href: "/orders", icon: ShoppingCart },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "B2B Enquiries", href: "/b2b-enquiries", icon: Handshake },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Reviews", href: "/reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Content",
    icon: Images,
    items: [
      { label: "Banners", href: "/banners", icon: ImageIcon },
      { label: "Collection Section", href: "/collection-section", icon: LayoutTemplate },
      { label: "Best Sellers", href: "/best-sellers", icon: LayoutTemplate },
      { label: "Pages", href: "/cms-pages", icon: FileText },
      { label: "Media", href: "/media", icon: Images },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Store Settings", href: "/settings", icon: Settings },
      { label: "Admin Users", href: "/settings/admin-users", icon: ShieldCheck },
    ],
  },
];

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/new": "Add Product",
  "/categories": "Categories",
  "/inventory": "Inventory",
  "/orders": "Retail Orders",
  "/payments": "Payments",
  "/b2b-enquiries": "B2B Enquiries",
  "/customers": "Customers",
  "/reviews": "Reviews",
  "/banners": "Banners",
  "/banners/new": "Add Banner",
  "/collection-section": "Collection Section",
  "/best-sellers": "Best Sellers",
  "/cms-pages": "Pages",
  "/cms-pages/new": "Add Page",
  "/media": "Media Library",
  "/settings": "Store Settings",
  "/settings/admin-users": "Admin Users",
};
