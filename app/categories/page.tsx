"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
  type ApiCategory,
  type CategoryInput,
} from "@/lib/api/categories";
import { listAllAdminProducts, type ProductStatusCode } from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_TEXT = 191;
const MAX_DESCRIPTION = 10000;
const statusLabels: Record<ProductStatusCode, string> = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };

// Same rule as backend/src/shared/slug.ts normalizeSlug().
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type Notice = { tone: "success" | "error"; text: string };
type Result = { key: string; categories: ApiCategory[]; productCounts: Map<string, number> } | { key: string; error: ApiError };

export default function CategoriesPage() {
  const { logout } = useAdminSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<ApiCategory | "new" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queryKey = JSON.stringify({ search: debouncedSearch, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    const token = getSessionToken() ?? "";
    Promise.all([listAdminCategories(token, controller.signal, debouncedSearch || undefined), listAllAdminProducts(token, controller.signal)])
      .then(([categories, products]) => {
        const productCounts = new Map<string, number>();
        for (const p of products) productCounts.set(p.categoryId, (productCounts.get(p.categoryId) ?? 0) + 1);
        setResult({ key, categories, productCounts });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load categories.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
    // queryKey already encodes every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const category = pendingDelete;
    setDeleting(true);
    try {
      await deleteAdminCategory(getSessionToken() ?? "", category.id);
      setNotice({ tone: "success", text: `Category “${category.name}” deleted.` });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't delete the category.");
      if (apiError.status === 401) return logout();
      const text =
        apiError.status === 404
          ? `“${category.name}” was already deleted.`
          : apiError.status === 409
            ? `“${category.name}” still has products. Move or delete them first.`
            : `Couldn't delete “${category.name}”: ${apiError.message}`;
      setNotice({ tone: apiError.status === 404 ? "success" : "error", text });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  const productCounts = result && "productCounts" in result ? result.productCounts : new Map<string, number>();

  const columns: DataTableColumn<ApiCategory>[] = [
    {
      key: "name",
      header: "Category",
      render: (c) => (
        <div>
          <p className="font-medium text-zinc-900">{c.name}</p>
          <p className="text-xs text-zinc-400">/{c.slug}</p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      render: (c) => {
        const count = productCounts.get(c.id) ?? 0;
        return `${count} ${count === 1 ? "product" : "products"}`;
      },
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={statusLabels[c.status]} /> },
    { key: "updated", header: "Updated", render: (c) => <span className="text-zinc-500">{formatDate(c.updatedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            aria-label={`Edit ${c.name}`}
            onClick={() => setEditing(c)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${c.name}`}
            onClick={() => setPendingDelete(c)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading categories..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load categories"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.categories.length === 0) {
    content = debouncedSearch ? (
      <EmptyState title="No categories found" description="Try a different search term." />
    ) : (
      <EmptyState title="No categories yet" description="Products need a category, so add one first." />
    );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.categories} getRowKey={(c) => c.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Categories"
        description="Organize products into categories. Only Active categories appear in the storefront."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add Category
          </Button>
        }
      />

      {notice && (
        <div
          role={notice.tone === "success" ? "status" : "alert"}
          className={
            notice.tone === "success"
              ? "flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
              : "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          }
        >
          {notice.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <p className="flex-1">{notice.text}</p>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <SearchBar placeholder="Search categories..." value={search} onChange={setSearch} className="sm:w-72" />

      {content}

      {editing !== null && (
        <CategoryModal
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            setNotice({ tone: "success", text: `Category “${saved.name}” ${created ? "created" : "updated"}.` });
            setReloadCount((n) => n + 1);
          }}
          onUnauthorized={logout}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category"
        description={`Delete "${pendingDelete?.name}"? Categories that still have products can't be deleted.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
  onUnauthorized,
}: {
  category?: ApiCategory;
  onClose: () => void;
  onSaved: (category: ApiCategory, created: boolean) => void;
  onUnauthorized: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(category));
  const [description, setDescription] = useState(category?.description ?? "");
  const [active, setActive] = useState(category ? category.status === "ACTIVE" : true);
  const [errors, setErrors] = useState<{ name?: string; slug?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    const trimmedName = name.trim();
    const normalizedSlug = toSlug(slug);
    const nextErrors: typeof errors = {};
    if (!trimmedName || trimmedName.length > MAX_TEXT) nextErrors.name = "Enter a name (up to 191 characters).";
    if (!normalizedSlug || normalizedSlug.length > MAX_TEXT) nextErrors.slug = "Enter a URL handle using letters or numbers.";
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.slug) return;

    // The checkbox maps to ACTIVE; unchecking keeps an archived category archived, otherwise makes it a draft.
    const status: ProductStatusCode = active ? "ACTIVE" : category?.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT";
    const input: CategoryInput = {
      name: trimmedName,
      slug: normalizedSlug,
      status,
      ...(description.trim() || category?.description ? { description: description.trim() } : {}),
    };

    setSaving(true);
    try {
      const token = getSessionToken() ?? "";
      const saved = category ? await updateAdminCategory(token, category.id, input) : await createAdminCategory(token, input);
      onSaved(saved, !category);
    } catch (error) {
      setSaving(false);
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the category.");
      if (apiError.status === 401) return onUnauthorized();
      if (apiError.status === 409) setErrors({ slug: "Another category already uses this URL handle.", form: "A category with this URL handle already exists." });
      else if (apiError.status === 404) setErrors({ form: "This category no longer exists. It may have been deleted." });
      else if (apiError.status === 400) setErrors({ form: `The server rejected these details: ${apiError.message}.` });
      else setErrors({ form: apiError.message });
    }
  }

  return (
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      title={category ? `Edit ${category.name}` : "Add Category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={save} noValidate>
        {errors.form && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{errors.form}</p>
          </div>
        )}
        <Input
          label="Category name"
          name="categoryName"
          placeholder="e.g. Office Chairs"
          value={name}
          maxLength={MAX_TEXT}
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(toSlug(e.target.value));
          }}
        />
        <Input
          label="URL handle"
          name="categorySlug"
          value={slug}
          maxLength={MAX_TEXT}
          hint="Used in storefront links, e.g. /products?category=office-chairs."
          error={errors.slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          onBlur={() => setSlug((value) => toSlug(value))}
        />
        <Textarea
          label="Description"
          name="categoryDescription"
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
          Active (visible in the storefront)
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
