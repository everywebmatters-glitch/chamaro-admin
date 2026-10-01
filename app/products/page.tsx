"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, MoreHorizontal, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { deleteAdminProduct, listAdminProducts, type ApiProduct, type ProductStatusCode } from "@/lib/api/products";
import { listAdminCategories, type ApiCategory } from "@/lib/api/categories";
import { getSessionToken } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const statusLabels: Record<ProductStatusCode, string> = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };
const statusOptions = (Object.keys(statusLabels) as ProductStatusCode[]).map((value) => ({ value, label: statusLabels[value] }));

type Result = { key: string; products: ApiProduct[]; hasNextPage: boolean } | { key: string; error: ApiError };

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsList />
    </Suspense>
  );
}

type Notice = { tone: "success" | "error"; text: string };

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const success = notice.tone === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={
        success
          ? "flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
          : "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{notice.text}</p>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className={success ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Set by ProductForm after a successful save: /products?created=<name> or ?updated=<name>.
function SavedBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const created = params.get("created");
  const updated = params.get("updated");
  if (!created && !updated) return null;
  const text = created ? `Product “${created}” created.` : `Product “${updated}” updated.`;
  return <NoticeBanner notice={{ tone: "success", text }} onDismiss={() => router.replace("/products")} />;
}

function ProductsList() {
  const { logout } = useAdminSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const product = pendingDelete;
    setDeleting(true);
    try {
      await deleteAdminProduct(getSessionToken() ?? "", product.id);
      setNotice({ tone: "success", text: `Product “${product.name}” deleted.` });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't delete the product.");
      if (apiError.status === 401) return logout();
      const text =
        apiError.status === 404
          ? `“${product.name}” was already deleted.`
          : apiError.status === 409
            ? `“${product.name}” can't be deleted because it's on an order or quotation. Archive it instead.`
            : `Couldn't delete “${product.name}”: ${apiError.message}`;
      setNotice({ tone: apiError.status === 404 ? "success" : "error", text });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  // Every filter is applied by the API; this key identifies the request the table should show.
  const queryKey = JSON.stringify({ page, search: debouncedSearch, categoryId, status, reloadCount });
  const isLoading = result?.key !== queryKey;
  const hasFilters = Boolean(debouncedSearch || categoryId || status);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    listAdminCategories(getSessionToken() ?? "", controller.signal)
      .then(setCategories)
      // The category filter is optional; the product list still works without its options.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    // Ask for one extra row to know whether a next page exists (apiRequest returns only `data`, not `meta`).
    listAdminProducts(
      getSessionToken() ?? "",
      {
        page,
        limit: PAGE_SIZE + 1,
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        status: (status || undefined) as ProductStatusCode | undefined,
      },
      controller.signal
    )
      .then((rows) => setResult({ key, products: rows.slice(0, PAGE_SIZE), hasNextPage: rows.length > PAGE_SIZE }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load products.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
    // queryKey already encodes every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId("");
    setStatus("");
    setPage(1);
  }

  const columns: DataTableColumn<ApiProduct>[] = [
    {
      key: "product",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <ImagePreview label={p.name} src={(p.images.find((i) => i.isPrimary) ?? p.images[0])?.url} />
          <div>
            <p className="font-medium text-zinc-900">{p.name}</p>
            <p className="text-xs text-zinc-400">{p.sku ?? "No SKU"}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => p.category.name },
    { key: "price", header: "Price", render: (p) => formatCurrency(Number(p.price)) },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        if (!p.inventory) return <span className="text-zinc-400">—</span>;
        const stock = p.inventory.quantity;
        return <span className={stock === 0 ? "text-red-600" : stock <= 15 ? "text-amber-600" : "text-zinc-700"}>{stock}</span>;
      },
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={statusLabels[p.status]} /> },
    { key: "updated", header: "Updated", render: (p) => <span className="text-zinc-500">{formatDate(p.updatedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/products/${p.id}/edit`}
            aria-label={`Edit ${p.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${p.name}`}
            onClick={() => setPendingDelete(p)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`More actions for ${p.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading products..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load products"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.products.length === 0 && !hasFilters && page === 1) {
    content = (
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Products you add will appear here."
        action={
          <Link href="/products/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Product
            </Button>
          </Link>
        }
      />
    );
  } else if (result.products.length === 0) {
    content = (
      <EmptyState
        title="No products found"
        description="Try adjusting your search or filters."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.products} getRowKey={(p) => p.id} />
        <Pagination page={page} totalPages={page} hasNextPage={result.hasNextPage} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="Manage your product catalog."
        actions={
          <Link href="/products/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Product
            </Button>
          </Link>
        }
      />

      <SavedBanner />
      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search products or SKU..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:w-72" />
        <FilterDropdown
          label="Category"
          value={categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => { setCategoryId(v); setPage(1); }}
        />
        <FilterDropdown
          label="Status"
          value={status}
          options={statusOptions}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />
      </div>

      {content}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        description={`Delete "${pendingDelete?.name}"? Its images, variants and inventory are deleted too, and it disappears from the storefront. This can't be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
