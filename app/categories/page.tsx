"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { ApiError, resolveApiUrl } from "@/lib/api/client";
import { createAdminCmsPage, listAdminCmsPages, setAdminCmsPagePublished, updateAdminCmsPage, type ApiCmsPage } from "@/lib/api/cms-pages";
import { IMAGE_ACCEPT, imageFileProblem, uploadMedia } from "@/lib/api/media";
import { CATEGORY_DISPLAY_PAGE_SLUG, fromPage, mergeWithCategories, toPageInput, type CategoryDisplayValue } from "@/lib/category-display";
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
  // The storefront order and icons, kept as a published CMS page (see lib/category-display.ts).
  const [cmsPage, setCmsPage] = useState<ApiCmsPage | null>(null);
  const [display, setDisplay] = useState<CategoryDisplayValue[]>([]);

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
    Promise.all([
      listAdminCategories(token, controller.signal, debouncedSearch || undefined),
      listAllAdminProducts(token, controller.signal),
      listAdminCmsPages(token, controller.signal),
    ])
      .then(([categories, products, { pages }]) => {
        const productCounts = new Map<string, number>();
        for (const p of products) productCounts.set(p.categoryId, (productCounts.get(p.categoryId) ?? 0) + 1);
        const existing = pages.find((item) => item.slug === CATEGORY_DISPLAY_PAGE_SLUG) ?? null;
        setCmsPage(existing);
        setDisplay(fromPage(existing));
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

  // Saves the order and icons; the storefront only reads published pages.
  async function saveDisplay(next: CategoryDisplayValue[]) {
    const token = getSessionToken() ?? "";
    const input = toPageInput(next);
    let saved: ApiCmsPage = cmsPage ? await updateAdminCmsPage(token, cmsPage.id, input) : await createAdminCmsPage(token, input);
    if (saved.status !== "PUBLISHED") saved = { ...saved, ...(await setAdminCmsPagePublished(token, saved.id, true)) };
    setCmsPage(saved);
    setDisplay(next);
  }

  const orderedRows = result && "categories" in result ? mergeWithCategories(display, result.categories) : [];
  const iconOf = (slug: string) => display.find((item) => item.slug === slug)?.iconUrl ?? "";

  async function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= orderedRows.length) return;
    const next = orderedRows.map((row) => ({ slug: row.category.slug, iconUrl: row.iconUrl }));
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await saveDisplay(next);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the order.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: `Couldn't save the order: ${apiError.message}` });
    }
  }

  const productCounts = result && "productCounts" in result ? result.productCounts : new Map<string, number>();

  const columns: DataTableColumn<ApiCategory>[] = [
    {
      key: "name",
      header: "Category",
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
            {iconOf(c.slug) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconOf(c.slug)} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <span className="text-[9px] text-zinc-400">default</span>
            )}
          </span>
          <div>
            <p className="font-medium text-zinc-900">{c.name}</p>
            <p className="text-xs text-zinc-400">/{c.slug}</p>
          </div>
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
          {(() => {
            const index = orderedRows.findIndex((row) => row.category.id === c.id);
            const locked = Boolean(debouncedSearch);
            return (
              <>
                <button
                  type="button"
                  aria-label={`Move ${c.name} up`}
                  title={locked ? "Clear the search to change the order" : "Move up"}
                  disabled={locked || index <= 0}
                  onClick={() => void move(index, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${c.name} down`}
                  title={locked ? "Clear the search to change the order" : "Move down"}
                  disabled={locked || index === orderedRows.length - 1}
                  onClick={() => void move(index, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </>
            );
          })()}
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
        <DataTable columns={columns} data={orderedRows.map((row) => row.category)} getRowKey={(c) => c.id} />
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
          iconUrl={editing === "new" ? "" : iconOf(editing.slug)}
          onClose={() => setEditing(null)}
          onSaved={async (saved, created, iconUrl) => {
            const previousSlug = editing === "new" ? undefined : editing.slug;
            setEditing(null);
            let text = `Category “${saved.name}” ${created ? "created" : "updated"}.`;
            let tone: Notice["tone"] = "success";
            // Keep the icon with the category (also when its URL handle changed) and add new ones at the end.
            const rows = orderedRows.map((row) => ({ slug: row.category.slug === previousSlug ? saved.slug : row.category.slug, iconUrl: row.category.slug === previousSlug ? iconUrl : row.iconUrl }));
            if (!rows.some((row) => row.slug === saved.slug)) rows.push({ slug: saved.slug, iconUrl });
            if (JSON.stringify(rows) !== JSON.stringify(display)) {
              try {
                await saveDisplay(rows);
              } catch (error) {
                tone = "error";
                text = `Category saved, but the icon and order couldn't be: ${error instanceof ApiError ? error.message : "unknown error"}`;
              }
            }
            setNotice({ tone, text });
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
  iconUrl: initialIconUrl,
  onClose,
  onSaved,
  onUnauthorized,
}: {
  category?: ApiCategory;
  iconUrl: string;
  onClose: () => void;
  onSaved: (category: ApiCategory, created: boolean, iconUrl: string) => void;
  onUnauthorized: () => void;
}) {
  const [iconUrl, setIconUrl] = useState(initialIconUrl);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function uploadIcon(file: File | undefined) {
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) return setErrors((current) => ({ ...current, form: problem }));
    setUploading(true);
    setErrors((current) => ({ ...current, form: undefined }));
    try {
      const media = await uploadMedia(getSessionToken() ?? "", file);
      // The storefront needs an absolute web address; uploaded files are served from the API's own origin.
      setIconUrl(resolveApiUrl(media.url));
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
      if (apiError.status === 401) return onUnauthorized();
      setErrors((current) => ({ ...current, form: apiError.message }));
    } finally {
      setUploading(false);
    }
  }

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
      onSaved(saved, !category, iconUrl);
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
          <Button variant="primary" onClick={() => save()} disabled={saving || uploading}>
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
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">Icon</span>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconUrl} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-[10px] text-zinc-400">default</span>
              )}
            </span>
            <input ref={fileInput} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { void uploadIcon(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="secondary" disabled={uploading || saving} icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} onClick={() => fileInput.current?.click()}>
              {iconUrl ? "Change icon" : "Upload icon"}
            </Button>
            {iconUrl && (
              <button type="button" aria-label="Use the default icon" onClick={() => setIconUrl("")} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500">Shown in the store&apos;s category strip and search. A small square PNG or WebP works best; without one the built-in icon is used.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
          Active (visible in the storefront)
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
