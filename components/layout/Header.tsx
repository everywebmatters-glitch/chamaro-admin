"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { pageTitles } from "@/lib/nav";
import { cn, routePath } from "@/lib/utils";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAdminB2BEnquiries, type ApiB2BEnquiry } from "@/lib/api/b2b-enquiries";
import { listAdminOrders, type ApiOrder } from "@/lib/api/orders";
import { listAllAdminProducts, type ApiProduct } from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";
import { availableUnits, summarizeCatalog } from "@/lib/inventory";
import { shortOrderId } from "@/lib/orders";

function initials(name: string): string {
  const letters = name.trim().split(/\s+/).map((part) => part[0]).join("");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return "Dashboard";
  if (last === "edit") return "Edit";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const NOTIFICATION_REFRESH_MS = 60_000;

interface AdminNotification {
  id: string;
  text: string;
  href: string;
  createdAt: string;
}

function buildNotifications(orders: ApiOrder[], enquiries: ApiB2BEnquiry[], products: ApiProduct[]): AdminNotification[] {
  const notifications: AdminNotification[] = [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      text: `Order #${shortOrderId(order.id)} placed`,
      href: "/orders",
      createdAt: order.createdAt,
    })),
    ...enquiries.map((enquiry) => ({
      id: `enquiry-${enquiry.id}`,
      text: `B2B enquiry from ${enquiry.companyName}`,
      href: "/b2b-enquiries",
      createdAt: enquiry.createdAt,
    })),
    ...summarizeCatalog(products).needsRestock.slice(0, 5).map((product) => {
      const units = availableUnits(product) ?? 0;
      return {
        id: `stock-${product.id}`,
        text: units <= 0 ? `Out of stock: ${product.name}` : `Low stock: ${product.name} (${units} left)`,
        href: "/inventory",
        createdAt: product.updatedAt,
      };
    }),
  ];

  return notifications
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 10);
}

function relativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Time unavailable";

  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(timestamp);
}

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const pathname = routePath(usePathname());
  const title = resolveTitle(pathname);
  const { admin, logout } = useAdminSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[] | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;

    const controller = new AbortController();
    let refreshTimeout: number | undefined;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const token = getSessionToken() ?? "";
        const [ordersResult, enquiriesResult, products] = await Promise.all([
          listAdminOrders(token, { page: 1, limit: 5 }, controller.signal),
          listAdminB2BEnquiries(token, 1, 5, controller.signal),
          listAllAdminProducts(token, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setNotifications(buildNotifications(ordersResult.orders, enquiriesResult.enquiries, products));
        setNotificationError(null);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError
          ? error
          : new ApiError(0, "UNKNOWN", "Couldn't load notifications.");
        if (apiError.status === 401) {
          controller.abort();
          return logout();
        }
        setNotificationError(apiError.message);
      } finally {
        if (!controller.signal.aborted) {
          setNotificationsLoading(false);
          refreshTimeout = window.setTimeout(() => void loadNotifications(), NOTIFICATION_REFRESH_MS);
        }
      }
    };

    void loadNotifications();
    return () => {
      controller.abort();
      if (refreshTimeout !== undefined) window.clearTimeout(refreshTimeout);
    };
  }, [notifOpen, notificationRefresh, logout]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-sm font-semibold text-zinc-900">{title}</h1>

      <div className="ml-auto flex items-center gap-2" ref={containerRef}>
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            className="h-9 w-56 rounded-md border border-zinc-300 bg-zinc-50 pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:bg-white focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notifications && notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium leading-none text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 max-h-[min(28rem,calc(100vh-5rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-2 shadow-lg">
              <div className="flex items-center justify-between px-3 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Notifications</p>
                {notificationsLoading && <span className="text-xs text-zinc-400">Updating...</span>}
              </div>
              {notificationError && (
                <div role="alert" className="mx-3 mb-2 flex items-start gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p>Could not refresh notifications: {notificationError}</p>
                    <button
                      type="button"
                      onClick={() => setNotificationRefresh((count) => count + 1)}
                      className="mt-1 font-medium underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}
              {notifications === null && notificationsLoading ? (
                <p role="status" className="px-3 py-4 text-sm text-zinc-500">Loading live notifications...</p>
              ) : notifications && notifications.length > 0 ? (
                <ul className="flex flex-col">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <a
                        href={notification.href}
                        onClick={() => setNotifOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-zinc-50"
                      >
                        <p className="text-zinc-700">{notification.text}</p>
                        <p className="text-xs text-zinc-400">{relativeTime(notification.createdAt)}</p>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : notifications && notifications.length === 0 && !notificationError ? (
                <p className="px-3 py-4 text-sm text-zinc-500">No current notifications.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            aria-label="Admin menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 hover:bg-zinc-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
              {initials(admin.name)}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", profileOpen && "rotate-180")} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <div className="border-b border-zinc-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-zinc-900">{admin.name}</p>
                <p className="truncate text-xs text-zinc-400">{admin.email}</p>
              </div>
              <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                <User className="h-4 w-4" /> Profile
              </a>
              <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                <Settings className="h-4 w-4" /> Settings
              </a>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
