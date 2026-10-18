"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { deleteAdminBanner, listAdminBanners, type ApiBanner } from "@/lib/api/banners";
import { getSessionToken } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" } as const;

type Loaded = { key: number; banners: ApiBanner[] } | { key: number; error: ApiError };

function schedule(banner: ApiBanner): string {
  if (!banner.startAt && !banner.endAt) return "Always";
  const from = banner.startAt ? formatDate(banner.startAt) : "any time";
  const to = banner.endAt ? formatDate(banner.endAt) : "no end";
  return `${from} → ${to}`;
}

export default function BannersPage() {
  const { logout } = useAdminSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ApiBanner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isLoading = result?.key !== reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    listAdminBanners(getSessionToken() ?? "", controller.signal)
      .then((banners) => setResult({ key, banners }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load banners.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const banners = useMemo(() => (result && "banners" in result ? result.banners : []), [result]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? banners.filter((banner) => banner.title.toLowerCase().includes(term)) : banners;
  }, [banners, search]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const banner = pendingDelete;
    setDeleting(true);
    try {
      await deleteAdminBanner(getSessionToken() ?? "", banner.id);
      setNotice({ tone: "success", text: `Deleted “${banner.title}”.` });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't delete the banner.");
      if (apiError.status === 401) return logout();
      setNotice({
        tone: apiError.status === 404 ? "success" : "error",
        text: apiError.status === 404 ? `“${banner.title}” was already deleted.` : `Couldn't delete “${banner.title}”: ${apiError.message}`,
      });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  const columns: DataTableColumn<ApiBanner>[] = [
    {
      key: "preview",
      header: "Preview",
      render: (banner) => <ImagePreview label={banner.title} size="md" src={banner.imageUrl} />,
    },
    {
      key: "title",
      header: "Title",
      render: (banner) => (
        <div>
          <Link href={`/banners/edit/?id=${encodeURIComponent(banner.id)}`} className="font-medium text-zinc-900 hover:underline">
            {banner.title}
          </Link>
          {banner.linkUrl && <p className="max-w-xs truncate text-xs text-zinc-400">{banner.linkUrl}</p>}
        </div>
      ),
    },
    { key: "position", header: "Order", render: (banner) => banner.position },
    { key: "status", header: "Status", render: (banner) => <StatusBadge status={STATUS_LABELS[banner.status]} /> },
    { key: "schedule", header: "Schedule", render: (banner) => <span className="text-zinc-500">{schedule(banner)}</span> },
    { key: "updated", header: "Updated", render: (banner) => <span className="text-zinc-500">{formatDate(banner.updatedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (banner) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/banners/edit/?id=${encodeURIComponent(banner.id)}`}
            aria-label={`Edit ${banner.title}`}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${banner.title}`}
            onClick={() => setPendingDelete(banner)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading banners..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load banners"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (banners.length === 0) {
    content = (
      <EmptyState
        icon={ImageIcon}
        title="No banners yet"
        description="Create a banner to store it in the API."
        action={
          <Link href="/banners/new/">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Banner
            </Button>
          </Link>
        }
      />
    );
  } else if (filtered.length === 0) {
    content = <EmptyState title="No matching banners" description="Try a different search." />;
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={filtered} getRowKey={(banner) => banner.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Banners"
        description="Homepage banners stored in the Chamaro API. The storefront does not display them yet."
        actions={
          <Link href="/banners/new/">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Banner
            </Button>
          </Link>
        }
      />

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <SearchBar placeholder="Search banners..." value={search} onChange={setSearch} className="sm:w-72" />

      {content}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete banner"
        description={`Delete "${pendingDelete?.title}"? This can't be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
