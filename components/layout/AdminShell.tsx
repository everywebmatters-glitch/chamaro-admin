"use client";

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { routePath } from "@/lib/utils";

// Routes that render without the admin chrome (sidebar/header) — public/auth screens.
const CHROMELESS_ROUTES = ["/login"];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = routePath(usePathname());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (CHROMELESS_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Every non-public route is gated: nothing below renders until the API confirms the admin session.
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
          <Header onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
