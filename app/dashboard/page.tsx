"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, FolderTree, ImageIcon, FolderPlus, Package, PackageX, Plus, ShoppingCart } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAdminCategories, type ApiCategory } from "@/lib/api/categories";
import { listAdminOrders, type ApiOrder } from "@/lib/api/orders";
import { listAllAdminProducts, type ApiProduct } from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";
import { availableUnits, LOW_STOCK_THRESHOLD, summarizeCatalog } from "@/lib/inventory";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TONES, shortOrderId } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

const quickActions = [
  { label: "Add Product", href: "/products/new", icon: Plus },
  { label: "Add Banner", href: "/banners/new", icon: ImageIcon },
  { label: "Add Category", href: "/categories", icon: FolderPlus },
];

const STATUS_LABELS = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" } as const;

type Loaded = { key: number; products: ApiProduct[]; categories: ApiCategory[] } | { key: number; error: ApiError };

// Everything here comes from the live API. Customers and B2B enquiries have no endpoints yet, so they are not
// shown (and no numbers are made up for them). There is no revenue figure: no order is paid yet.
type OrdersLoaded = { key: number; total: number; awaitingPayment: number; recent: ApiOrder[] } | { key: number; error: ApiError };
export default function DashboardPage() {
  const { logout } = useAdminSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [orders, setOrders] = useState<OrdersLoaded | null>(null);
  const isLoading = result?.key !== reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    const token = getSessionToken() ?? "";
    Promise.all([listAllAdminProducts(token, controller.signal), listAdminCategories(token, controller.signal)])
      .then(([products, categories]) => setResult({ key, products, categories }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the dashboard.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  // Orders load separately, so a problem there never hides the catalogue figures.
  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    const token = getSessionToken() ?? "";
    Promise.all([
      listAdminOrders(token, { page: 1, limit: 5 }, controller.signal),
      listAdminOrders(token, { page: 1, limit: 1, paymentStatus: "UNPAID", status: "PENDING" }, controller.signal),
    ])
      .then(([all, unpaid]) => setOrders({ key, total: all.meta?.total ?? all.orders.length, awaitingPayment: unpaid.meta?.total ?? unpaid.orders.length, recent: all.orders }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load orders.");
        if (apiError.status === 401) return logout();
        setOrders({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const ordersReady = orders && orders.key === reloadCount ? orders : null;

  const summary = useMemo(() => (result && "products" in result ? summarizeCatalog(result.products) : null), [result]);
  const categoryCount = result && "categories" in result ? result.categories.length : 0;

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading dashboard..." />;
  } else if ("error" in result || !summary) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the dashboard"
        description={"error" in result ? result.error.message : undefined}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Products"
            value={summary.total.toString()}
            note={`${summary.active} active · ${summary.draft} draft · ${summary.archived} archived`}
            icon={Package}
          />
          <StatCard label="Categories" value={categoryCount.toString()} icon={FolderTree} />
          <StatCard
            label="Low stock"
            value={summary.lowStock.toString()}
            note={`Active products with ${LOW_STOCK_THRESHOLD} or fewer units`}
            icon={AlertTriangle}
          />
          <StatCard
            label="Out of stock"
            value={summary.outOfStock.toString()}
            note={summary.notTracked ? `${summary.notTracked} active product(s) don't track stock` : undefined}
            icon={PackageX}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Orders" value={ordersReady && "total" in ordersReady ? ordersReady.total.toString() : "—"} note={ordersReady && "error" in ordersReady ? "Couldn't load orders" : undefined} icon={ShoppingCart} />
          <StatCard label="Awaiting payment" value={ordersReady && "awaitingPayment" in ordersReady ? ordersReady.awaitingPayment.toString() : "—"} note="Pending and unpaid" icon={Clock} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white lg:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Needs restocking</h2>
              <Link href="/inventory" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                Inventory
              </Link>
            </div>
            {summary.needsRestock.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">
                {summary.active === 0 ? "No active products yet." : "Every stock-tracked active product has enough units."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-100">
                {summary.needsRestock.slice(0, 8).map((product) => {
                  const units = availableUnits(product) ?? 0;
                  return (
                    <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <Link href={`/products/${product.id}/edit`} className="truncate font-medium text-zinc-800 hover:underline">
                        {product.name}
                      </Link>
                      <span className={units <= 0 ? "font-medium text-red-600" : "font-medium text-amber-600"}>
                        {units <= 0 ? "Out of stock" : `${units} left`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Quick actions</h2>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button variant="secondary" className="w-full justify-start" icon={<action.icon className="h-4 w-4" />}>
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Recently added products</h2>
              <Link href="/products" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                View all
              </Link>
            </div>
            {summary.recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No products yet. Add your first one to get started.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-100">
                {summary.recent.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`/products/${product.id}/edit`} className="block truncate font-medium text-zinc-800 hover:underline">
                        {product.name}
                      </Link>
                      <p className="truncate text-xs text-zinc-400">
                        {product.category.name} · added {formatDate(product.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={STATUS_LABELS[product.status]} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Recent orders</h2>
              <Link href="/orders" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                View all
              </Link>
            </div>
            {!ordersReady ? (
              <p className="px-5 py-6 text-sm text-zinc-500">Loading orders...</p>
            ) : "error" in ordersReady ? (
              <p className="px-5 py-6 text-sm text-red-600">Couldn&apos;t load orders: {ordersReady.error.message}</p>
            ) : ordersReady.recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No orders yet. Orders appear here once customers place them.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-100">
                {ordersReady.recent.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href="/orders" className="block truncate font-medium text-zinc-800 hover:underline">
                        {shortOrderId(order.id)} · {order.customer.user.name}
                      </Link>
                      <p className="truncate text-xs text-zinc-400">
                        {formatCurrency(Number(order.total))} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <StatusBadge status={PAYMENT_STATUS_LABELS[order.paymentStatus]} tone={PAYMENT_TONES[order.paymentStatus]} />
                      <StatusBadge status={ORDER_STATUS_LABELS[order.status]} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Live catalogue and stock from the Chamaro API.</p>
      </div>
      {content}
    </div>
  );
}
