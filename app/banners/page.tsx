"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { mockBanners } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { Banner } from "@/lib/types";

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>(mockBanners);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);

  const toggleActive = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: b.status === "Active" ? "Inactive" : "Active" } : b))
    );
  };

  const columns: DataTableColumn<Banner>[] = [
    {
      key: "preview",
      header: "Preview",
      render: (b) => <ImagePreview label={b.title} size="md" />,
    },
    {
      key: "title",
      header: "Title",
      render: (b) => (
        <div>
          <p className="font-medium text-zinc-900">{b.title}</p>
          <p className="text-xs text-zinc-400">{b.subtitle}</p>
        </div>
      ),
    },
    { key: "order", header: "Order", render: (b) => b.order },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
    { key: "updated", header: "Updated", render: (b) => <span className="text-zinc-500">{formatDate(b.updatedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (b) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => toggleActive(b.id)}
            className="mr-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {b.status === "Active" ? "Deactivate" : "Activate"}
          </button>
          <Link
            href={`/banners/${b.id}/edit`}
            aria-label={`Edit ${b.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${b.title}`}
            onClick={() => setPendingDelete(b)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Banners"
        description="Manage the promotional banners shown on the customer homepage."
        actions={
          <Link href="/banners/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Banner
            </Button>
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Globe className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Changes made here update the banners shown live on the Chamaro customer-facing homepage. Deactivating a
          banner removes it from the site immediately.
        </p>
      </div>

      {banners.length === 0 ? (
        <EmptyState title="No banners yet" description="Add your first homepage banner." />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <DataTable columns={columns} data={banners} getRowKey={(b) => b.id} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete banner"
        description={`Are you sure you want to delete "${pendingDelete?.title}"? It will be removed from the homepage immediately.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          setBanners((prev) => prev.filter((b) => b.id !== pendingDelete?.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
