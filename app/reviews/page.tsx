"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, EyeOff, MessageSquare, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { deleteAdminReview, listAdminReviews, setAdminReviewStatus, type ApiReview, type ReviewStatusCode } from "@/lib/api/reviews";
import { getSessionToken } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

const statusLabels: Record<ReviewStatusCode, string> = { PENDING: "Pending", APPROVED: "Approved", HIDDEN: "Hidden" };
const statusOptions = (Object.keys(statusLabels) as ReviewStatusCode[]).map((value) => ({ value, label: statusLabels[value] }));
const badgeTone = { PENDING: "amber", APPROVED: "green", HIDDEN: "zinc" } as const;

type Result = { key: string; reviews: ApiReview[]; totalPages: number } | { key: string; error: ApiError };

export default function ReviewsPage() {
  const { logout } = useAdminSession();
  const [status, setStatus] = useState<string>("PENDING");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiReview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queryKey = JSON.stringify({ page, status, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    listAdminReviews(getSessionToken() ?? "", { page, status: (status || undefined) as ReviewStatusCode | undefined }, controller.signal)
      .then(({ reviews, meta }) => setResult({ key, reviews, totalPages: meta?.totalPages ?? 1 }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load reviews.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [queryKey, page, status, logout]);

  async function change(review: ApiReview, next: ReviewStatusCode) {
    setBusyId(review.id);
    setNotice(null);
    try {
      await setAdminReviewStatus(getSessionToken() ?? "", review.id, next);
      setNotice({ tone: "success", text: next === "APPROVED" ? "Review approved: it now shows on the product page." : "Review hidden from the product page." });
      setReloadCount((n) => n + 1);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't update the review.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.message });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const review = pendingDelete;
    setBusyId(review.id);
    try {
      await deleteAdminReview(getSessionToken() ?? "", review.id);
      setNotice({ tone: "success", text: "Review deleted." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't delete the review.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: apiError.status === 404 ? "success" : "error", text: apiError.status === 404 ? "That review was already deleted." : apiError.message });
    } finally {
      setBusyId(null);
      setPendingDelete(null);
      setReloadCount((n) => n + 1);
    }
  }

  const columns: DataTableColumn<ApiReview>[] = [
    {
      key: "review",
      header: "Review",
      primary: true,
      render: (r) => (
        <div className="flex max-w-xl flex-col gap-1">
          <span className="text-amber-500" aria-label={`${r.rating} out of 5`}>
            {"★".repeat(r.rating)}
            <span className="text-zinc-300">{"★".repeat(5 - r.rating)}</span>
          </span>
          <p className="whitespace-pre-line text-zinc-800">{r.body}</p>
          <p className="text-xs text-zinc-500">
            {r.authorName} · {r.product.name}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={statusLabels[r.status]} tone={badgeTone[r.status]} /> },
    { key: "date", header: "Written", render: (r) => <span className="text-zinc-500">{formatDate(r.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status !== "APPROVED" && (
            <button type="button" aria-label="Approve review" title="Approve" disabled={busyId === r.id} onClick={() => void change(r, "APPROVED")} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-green-50 hover:text-green-700 disabled:opacity-50">
              <Check className="h-4 w-4" />
            </button>
          )}
          {r.status !== "HIDDEN" && (
            <button type="button" aria-label="Hide review" title="Hide" disabled={busyId === r.id} onClick={() => void change(r, "HIDDEN")} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
              <EyeOff className="h-4 w-4" />
            </button>
          )}
          <button type="button" aria-label="Delete review" title="Delete" disabled={busyId === r.id} onClick={() => setPendingDelete(r)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading reviews..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load reviews"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.reviews.length === 0) {
    content = (
      <EmptyState
        icon={MessageSquare}
        title={status === "PENDING" ? "No reviews waiting" : "No reviews found"}
        description={status === "PENDING" ? "New customer reviews wait here until you approve them." : "Try a different status."}
      />
    );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.reviews} getRowKey={(r) => r.id} />
        <Pagination page={page} totalPages={result.totalPages} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reviews" description="Customer reviews wait here until you approve them. Only approved reviews show on the product page." />
      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterDropdown
          label="Status"
          value={status}
          options={statusOptions}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>
      {content}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete review"
        description="Delete this review for good? Hide it instead if you might want it back."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
