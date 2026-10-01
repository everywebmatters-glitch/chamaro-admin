"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAllAdminProducts, type ApiProduct } from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";

// Stock is the shared Inventory record (quantity, reservedQuantity) returned with each product.
// It's edited on the product form; the API has no separate inventory endpoint or stock filter,
// so the status filter below runs on the loaded list.
const stockFilters = ["In stock", "Low stock", "Out of stock", "Not tracked"];
const LOW_STOCK = 15;

function available(p: ApiProduct): number | null {
  return p.inventory ? p.inventory.quantity - p.inventory.reservedQuantity : null;
}

function stockStatus(p: ApiProduct): (typeof stockFilters)[number] {
  const units = available(p);
  if (units === null) return "Not tracked";
  if (units <= 0) return "Out of stock";
  if (units <= LOW_STOCK) return "Low stock";
  return "In stock";
}

export default function InventoryPage() {
  const { logout } = useAdminSession();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{ key: number; products: ApiProduct[] } | { key: number; error: ApiError } | null>(null);
  const isLoading = result?.key !== reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    listAllAdminProducts(getSessionToken() ?? "", controller.signal)
      .then((products) => setResult({ key, products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load inventory.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const products = useMemo(() => (result && "products" in result ? result.products : []), [result]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term);
      const matchesStock = !stockFilter || stockStatus(p) === stockFilter;
      return matchesSearch && matchesStock;
    });
  }, [products, search, stockFilter]);

  const inStockCount = products.filter((p) => stockStatus(p) === "In stock").length;
  const lowStockCount = products.filter((p) => stockStatus(p) === "Low stock").length;
  const outOfStockCount = products.filter((p) => stockStatus(p) === "Out of stock").length;

  const columns: DataTableColumn<ApiProduct>[] = [
    {
      key: "product",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <ImagePreview label={p.name} src={(p.images.find((i) => i.isPrimary) ?? p.images[0])?.url} />
          <div>
            <Link href={`/products/${p.id}/edit`} className="font-medium text-zinc-900 hover:underline">
              {p.name}
            </Link>
            <p className="text-xs text-zinc-400">{p.sku ?? "No SKU"}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => p.category.name },
    {
      key: "stock",
      header: "Stock on hand",
      render: (p) => {
        if (!p.inventory) return <span className="text-zinc-400">—</span>;
        const s = stockStatus(p);
        return (
          <span className="inline-flex items-center gap-1.5 font-medium">
            {s === "Out of stock" && <PackageX className="h-3.5 w-3.5 text-red-500" />}
            {s === "Low stock" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <span className={s === "Out of stock" ? "text-red-600" : s === "Low stock" ? "text-amber-600" : "text-zinc-700"}>
              {p.inventory.quantity} units
            </span>
            {p.inventory.reservedQuantity > 0 && <span className="font-normal text-zinc-400">({p.inventory.reservedQuantity} reserved)</span>}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Stock status",
      render: (p) => stockStatus(p),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading inventory..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load inventory"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (filtered.length === 0) {
    content =
      products.length === 0 ? (
        <EmptyState title="No products yet" description="Stock appears here once products are added." />
      ) : (
        <EmptyState title="No matching products" description="Try adjusting your search or filter." />
      );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={filtered} getRowKey={(p) => p.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Inventory" description="Track stock levels across your catalog. Edit a product to change its stock." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="In stock" value={inStockCount.toString()} icon={PackageX} />
        <StatCard label="Low stock" value={lowStockCount.toString()} icon={AlertTriangle} />
        <StatCard label="Out of stock" value={outOfStockCount.toString()} icon={PackageX} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search products or SKU..." value={search} onChange={setSearch} className="sm:w-72" />
        <FilterDropdown label="Stock status" value={stockFilter} options={stockFilters} onChange={setStockFilter} />
      </div>

      {content}
    </div>
  );
}
