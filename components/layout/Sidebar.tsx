"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Store } from "lucide-react";
import { navSections } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const allNavHrefs = navSections.flatMap((section) => (section.href ? [section.href] : section.items?.map((i) => i.href) ?? []));

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  // Match the single most specific nav href for the current path, so sibling
  // routes that share a prefix (e.g. /settings and /settings/admin-users)
  // don't both light up.
  const activeHref = allNavHrefs
    .filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === activeHref;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
          "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white">
            <Store className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-zinc-900">CHAMARO</span>
              <span className="text-[11px] text-zinc-400">Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
          <ul className="flex flex-col gap-4">
            {navSections.map((section) => (
              <li key={section.label}>
                {section.href ? (
                  <NavItem
                    href={section.href}
                    label={section.label}
                    icon={section.icon}
                    active={isActive(section.href)}
                    collapsed={collapsed}
                    onNavigate={onCloseMobile}
                  />
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {!collapsed && (
                      <span className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {section.label}
                      </span>
                    )}
                    <ul className="flex flex-col gap-0.5">
                      {section.items?.map((item) => (
                        <li key={item.href}>
                          <NavItem
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isActive(item.href)}
                            collapsed={collapsed}
                            onNavigate={onCloseMobile}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-zinc-200 p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden w-full items-center justify-center gap-2 rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        collapsed && "lg:justify-center lg:px-0",
        active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn(collapsed && "lg:hidden")}>{label}</span>
    </Link>
  );
}
