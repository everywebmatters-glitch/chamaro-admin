"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { deleteAdminCmsPage, listAdminCmsPages, setAdminCmsPagePublished, type ApiCmsPage } from "@/lib/api/cms-pages";
import { getSessionToken } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

type Loaded = { key: number; pages: ApiCmsPage[]; meta?: PageMeta } | { key: number; error: ApiError };

export default function CmsPagesPage() {
  const { logout } = useAdminSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ApiCmsPage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isLoading = result?.key !== reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    listAdminCmsPages(getSessionToken() ?? "", controller.signal)
      .then(({ pages, meta }) => setResult({ key, pages, meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load pages.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const pages = useMemo(() => (result && "pages" in result ? result.pages : []), [result]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? pages.filter((page) => page.title.toLowerCase().includes(term) || page.slug.toLowerCase().includes(term)) : pages;
  }, [pages, search]);

  async function run(page: ApiCmsPage, action: () => Promise<unknown>, success: string, failure: string) {
    setBusyId(page.id);
    try {
      await action();
      setNotice({ tone: "success", text: success });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", failure);
      if (apiError.status === 401) return logout();
      setNotice({ tone: apiError.status === 404 ? "success" : "error", text: apiError.status === 404 ? `“${page.title}” no longer exists.` : `${failure}: ${apiError.message}` });
    } finally {
      setBusyId(null);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  const togglePublished = (page: ApiCmsPage) =>
    run(
      page,
      () => setAdminCmsPagePublished(getSessionToken() ?? "", page.id, page.status !== "PUBLISHED"),
      page.status === "PUBLISHED" ? `“${page.title}” is now a draft.` : `“${page.title}” is published.`,
      `Couldn't ${page.status === "PUBLISHED" ? "unpublish" : "publish"} “${page.title}”`,
    );

  const columns: DataTableColumn<ApiCmsPage>[] = [
    {
      key: "title",
      header: "Page",
      render: (page) => (
        <div>
          <Link href={`/cms-pages/edit/?id=${encodeURIComponent(page.id)}`} className="font-medium text-zinc-900 hover:underline">
            {page.title}
          </Link>
          <p className="text-xs text-zinc-400">/{page.slug}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (page) => <StatusBadge status={page.status === "PUBLISHED" ? "Active" : "Draft"} /> },
    { key: "sections", header: "Sections", render: (page) => page.sections?.length ?? 0 },
    { key: "updated", header: "Updated", render: (page) => <span className="text-zinc-500">{formatDate(page.updatedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (page) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={busyId === page.id}
            onClick={() => void togglePublished(page)}
            className="mr-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {page.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </button>
          <Link href={`/cms-pages/edit/?id=${encodeURIComponent(page.id)}`} aria-label={`Edit ${page.title}`} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800">
            <Pencil className="h-4 w-4" />
          </Link>
          <button type="button" aria-label={`Delete ${page.title}`} onClick={() => setPendingDelete(page)} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading pages..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load pages"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (pages.length === 0) {
    content = (
      <EmptyState
        icon={FileText}
        title="No pages yet"
        description="Create a page to store its content in the API."
        action={
          <Link href="/cms-pages/new/">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Page
            </Button>
          </Link>
        }
      />
    );
  } else if (filtered.length === 0) {
    content = <EmptyState title="No matching pages" description="Try a different search." />;
  } else {
    content = (
      <>
        <div className="rounded-lg border border-zinc-200 bg-white">
          <DataTable columns={columns} data={filtered} getRowKey={(page) => page.id} />
        </div>
        {result.meta && result.meta.total > pages.length && <p className="text-xs text-zinc-500">Showing the {pages.length} most recently updated of {result.meta.total} pages.</p>}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pages"
        description="Content pages stored in the Chamaro API. The storefront does not render them yet."
        actions={
          <Link href="/cms-pages/new/">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Page
            </Button>
          </Link>
        }
      />

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <SearchBar placeholder="Search pages..." value={search} onChange={setSearch} className="sm:w-72" />

      {content}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete page"
        description={`Delete "${pendingDelete?.title}" and its sections? This can't be undone.`}
        confirmLabel={busyId ? "Deleting..." : "Delete"}
        busy={Boolean(busyId)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void run(pendingDelete, () => deleteAdminCmsPage(getSessionToken() ?? "", pendingDelete.id), `Deleted “${pendingDelete.title}”.`, `Couldn't delete “${pendingDelete.title}”`)}
      />
    </div>
  );
}
