"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { createAdminCmsPage, listAdminCmsPages, setAdminCmsPagePublished, updateAdminCmsPage, type ApiCmsPage } from "@/lib/api/cms-pages";
import { listAllAdminProducts, type ApiProduct } from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";
import { BEST_SELLERS_PAGE_SLUG, MAX_BEST_SELLERS, fromPage, toPageInput } from "@/lib/best-sellers";

type LoadState = "loading" | "ready" | { error: ApiError };

export function BestSellersForm() {
  const { logout } = useAdminSession();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [page, setPage] = useState<ApiCmsPage | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reloadCount, setReloadCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const token = getSessionToken() ?? "";
    Promise.all([listAdminCmsPages(token, controller.signal), listAllAdminProducts(token, controller.signal)])
      .then(([{ pages }, rows]) => {
        const existing = pages.find((item) => item.slug === BEST_SELLERS_PAGE_SLUG) ?? null;
        setPage(existing);
        setProducts(rows);
        setSlugs(fromPage(existing));
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the best sellers.");
        if (apiError.status === 401) return logout();
        setLoadState({ error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const available = products.filter((product) => product.status === "ACTIVE" && !slugs.includes(product.slug));

  const add = (slug: string) => {
    if (!slug || slugs.length >= MAX_BEST_SELLERS) return;
    setSlugs((current) => [...current, slug]);
    setNotice(null);
  };
  const remove = (index: number) => {
    setSlugs((current) => current.filter((_, i) => i !== index));
    setNotice(null);
  };
  const move = (index: number, by: -1 | 1) =>
    setSlugs((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const token = getSessionToken() ?? "";
      const input = toPageInput(slugs);
      let saved: ApiCmsPage;
      if (page) saved = await updateAdminCmsPage(token, page.id, input);
      else saved = await createAdminCmsPage(token, input);
      // The storefront only reads published pages.
      if (saved.status !== "PUBLISHED") saved = { ...saved, ...(await setAdminCmsPagePublished(token, saved.id, true)) };
      setPage(saved);
      setNotice({ tone: "success", text: "Saved. The home page shows the change within about a minute." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the best sellers.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Loading best sellers..." />;
  if (loadState !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the best sellers"
        description={loadState.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setLoadState("loading");
              setReloadCount((n) => n + 1);
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <PageHeader
        title="Best Sellers"
        description="The products shown in “Best Sellers” on the home page."
        actions={
          <Button type="submit" variant="primary" disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Only the products chosen here appear in Best Sellers, in this order. With none chosen the section is hidden. Changes can take about a minute to show.</p>
      </div>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Products" description={`Choose up to ${MAX_BEST_SELLERS} active products.`}>
          <select
            aria-label="Add a product"
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:opacity-50"
            value=""
            disabled={slugs.length >= MAX_BEST_SELLERS || available.length === 0}
            onChange={(event) => add(event.target.value)}
          >
            <option value="">{available.length === 0 ? "No more active products" : "Add a product..."}</option>
            {available.map((product) => (
              <option key={product.id} value={product.slug}>
                {product.name}
              </option>
            ))}
          </select>

          {slugs.length > 0 && (
            <ul className="flex flex-col gap-3">
              {slugs.map((slug, index) => {
                const product = bySlug.get(slug);
                return (
                  <li key={slug} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{product?.name ?? slug}</p>
                      {(!product || product.status !== "ACTIVE") && <p className="text-xs text-amber-600">Not on sale, so it is not shown on the storefront.</p>}
                    </div>
                    <button type="button" aria-label={`Move ${product?.name ?? slug} up`} disabled={index === 0} onClick={() => move(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Move ${product?.name ?? slug} down`} disabled={index === slugs.length - 1} onClick={() => move(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Remove ${product?.name ?? slug}`} onClick={() => remove(index)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </FormSection>
      </div>
    </form>
  );
}
