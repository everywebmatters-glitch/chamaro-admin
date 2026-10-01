"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { pageTitles } from "@/lib/nav";
import { cn, routePath } from "@/lib/utils";
import { useAdminSession } from "@/components/auth/AuthProvider";

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

const notifications = [
  { id: 1, text: "Wireless Earbuds Pro is out of stock", time: "10m ago" },
  { id: 2, text: "New order #10234 received", time: "1h ago" },
  { id: 3, text: "3 products are running low on stock", time: "3h ago" },
];

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const pathname = routePath(usePathname());
  const title = resolveTitle(pathname);
  const { admin, logout } = useAdminSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-72 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Notifications
              </p>
              <ul className="flex flex-col">
                {notifications.map((n) => (
                  <li key={n.id} className="px-3 py-2 text-sm hover:bg-zinc-50">
                    <p className="text-zinc-700">{n.text}</p>
                    <p className="text-xs text-zinc-400">{n.time}</p>
                  </li>
                ))}
              </ul>
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
