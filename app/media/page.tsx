"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { deleteAdminMedia, IMAGE_ACCEPT, imageFileProblem, listAdminMedia, MEDIA_LIST_LIMIT, uploadMedia, type ApiMedia } from "@/lib/api/media";
import { getSessionToken } from "@/lib/auth/session";
import { formatBytes, formatDate } from "@/lib/utils";

type Loaded = { key: number; media: ApiMedia[] } | { key: number; error: ApiError };

export default function MediaPage() {
  const { logout } = useAdminSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApiMedia | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiMedia | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isLoading = result?.key !== reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const key = reloadCount;
    listAdminMedia(getSessionToken() ?? "", controller.signal)
      .then((media) => setResult({ key, media }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the media library.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const media = useMemo(() => (result && "media" in result ? result.media : []), [result]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? media.filter((item) => item.filename.toLowerCase().includes(term) || (item.altText ?? "").toLowerCase().includes(term)) : media;
  }, [media, search]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setNotice(null);
    const token = getSessionToken() ?? "";
    const problems: string[] = [];
    let uploaded = 0;
    for (const file of files) {
      const problem = imageFileProblem(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      try {
        await uploadMedia(token, file);
        uploaded += 1;
      } catch (error) {
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
        if (apiError.status === 401) return logout();
        problems.push(`“${file.name}”: ${apiError.message}`);
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    if (uploaded > 0) setReloadCount((n) => n + 1);
    const done = uploaded > 0 ? `Uploaded ${uploaded} ${uploaded === 1 ? "image" : "images"}.` : "";
    if (problems.length > 0) setNotice({ tone: "error", text: [done, ...problems].filter(Boolean).join(" ") });
    else setNotice({ tone: "success", text: done });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setDeleting(true);
    try {
      await deleteAdminMedia(getSessionToken() ?? "", item.id);
      setNotice({ tone: "success", text: `Deleted “${item.filename}”.` });
      setSelected(null);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't delete the file.");
      if (apiError.status === 401) return logout();
      setNotice({
        tone: apiError.status === 404 ? "success" : "error",
        text:
          apiError.status === 404
            ? `“${item.filename}” was already deleted.`
            : apiError.status === 409
              ? `“${item.filename}” can't be deleted because a product still uses it. Remove it from the product first.`
              : `Couldn't delete “${item.filename}”: ${apiError.message}`,
      });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading media..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the media library"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (media.length === 0) {
    content = <EmptyState icon={ImageIcon} title="No media yet" description="Upload a JPEG, PNG or WebP image (up to 5 MB) to get started." />;
  } else if (filtered.length === 0) {
    content = <EmptyState icon={ImageIcon} title="No matching files" description="Try a different search." />;
  } else {
    content = (
      <>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-colors hover:border-zinc-400"
            >
              <div className="aspect-square bg-zinc-50">
                <ImagePreview size="lg" label={item.filename} src={item.url} className="rounded-none" />
              </div>
              <div className="border-t border-zinc-100 p-2">
                <p className="truncate text-xs font-medium text-zinc-700">{item.filename}</p>
                <p className="text-[11px] text-zinc-400">{item.size == null ? "External file" : formatBytes(item.size)}</p>
              </div>
            </button>
          ))}
        </div>
        {media.length >= MEDIA_LIST_LIMIT && (
          <p className="text-xs text-zinc-500">Showing the {MEDIA_LIST_LIMIT} most recent files.</p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Media Library"
        description="Images uploaded to the Chamaro API, used on products and banners."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="sr-only"
              aria-label="Choose images to upload"
              onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))}
            />
            <Button
              variant="primary"
              disabled={uploading}
              icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </>
        }
      />

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <SearchBar placeholder="Search media..." value={search} onChange={setSearch} className="sm:w-72" />

      {content}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete file"
        description={`Delete "${pendingDelete?.filename}"? This can't be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setSelected(null)} aria-hidden="true" />
          <div role="dialog" aria-label={selected.filename} className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
            <div className="aspect-video bg-zinc-50">
              <ImagePreview size="lg" label={selected.filename} src={selected.url} className="rounded-none" />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <p className="break-all text-sm font-medium text-zinc-900">{selected.filename}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <div>
                  <dt className="text-zinc-400">Type</dt>
                  <dd>{selected.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">Size</dt>
                  <dd>{selected.size == null ? "External file" : formatBytes(selected.size)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">Uploaded</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
                {selected.altText && (
                  <div>
                    <dt className="text-zinc-400">Alt text</dt>
                    <dd>{selected.altText}</dd>
                  </div>
                )}
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
