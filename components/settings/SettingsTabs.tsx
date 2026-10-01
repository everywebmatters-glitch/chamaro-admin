"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, routePath } from "@/lib/utils";

const tabs = [
  { label: "Store Settings", href: "/settings" },
  { label: "Admin Users", href: "/settings/admin-users" },
];

export function SettingsTabs() {
  const pathname = routePath(usePathname());

  return (
    <div className="flex gap-1 border-b border-zinc-200">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
