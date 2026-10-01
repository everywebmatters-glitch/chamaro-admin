import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Handshake,
  Users,
  Image as ImageIcon,
  Images,
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
      { label: "B2B Enquiries", href: "/b2b-enquiries", icon: Handshake },
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Content",
    icon: Images,
    items: [
      { label: "Banners", href: "/banners", icon: ImageIcon },
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
  "/b2b-enquiries": "B2B Enquiries",
  "/customers": "Customers",
  "/banners": "Banners",
  "/banners/new": "Add Banner",
  "/media": "Media Library",
  "/settings": "Store Settings",
  "/settings/admin-users": "Admin Users",
};
