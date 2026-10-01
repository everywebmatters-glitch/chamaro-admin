"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { mockMedia } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>(mockMedia);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);

  const filtered = useMemo(
    () => media.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
    [media, search]
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Media Library"
        description="Manage images used across products and banners."
        actions={
          <Button variant="primary" icon={<Upload className="h-4 w-4" />}>
            Upload
          </Button>
        }
      />

      <SearchBar placeholder="Search media..." value={search} onChange={setSearch} className="sm:w-72" />

      {filtered.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No media found" description="Upload an image to get started." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-colors hover:border-zinc-300"
            >
              <div className="flex aspect-square items-center justify-center bg-zinc-50 text-zinc-300">
                <ImageIcon className="h-8 w-8" />
              </div>
              <div className="border-t border-zinc-100 p-2">
                <p className="truncate text-xs font-medium text-zinc-700">{item.name}</p>
                <p className="text-[11px] text-zinc-400">{item.size}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete file"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          setMedia((prev) => prev.filter((m) => m.id !== pendingDelete?.id));
          setPendingDelete(null);
          setSelected(null);
        }}
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setSelected(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="flex aspect-video items-center justify-center bg-zinc-50 text-zinc-300">
              <ImageIcon className="h-10 w-10" />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm font-medium text-zinc-900">{selected.name}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <div>
                  <dt className="text-zinc-400">Type</dt>
                  <dd>{selected.type}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">Size</dt>
                  <dd>{selected.size}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">Uploaded</dt>
                  <dd>{formatDate(selected.uploadedAt)}</dd>
                </div>
              </dl>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setPendingDelete(selected)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
