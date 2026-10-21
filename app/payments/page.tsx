"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAdminPayments, syncAdminPayment, type ApiPayment, type PaymentStatusCode } from "@/lib/api/payments";
import { getSessionToken } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels: Record<PaymentStatusCode, string> = {
  CREATED: "Opened",
  FAILED: "Failed",
  AUTHORIZED: "Authorized",
  CAPTURED: "Captured",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
};
const badgeTone = { CREATED: "zinc", FAILED: "red", AUTHORIZED: "blue", CAPTURED: "green", PARTIALLY_REFUNDED: "amber", REFUNDED: "purple" } as const;

// What a person should do about each reason the server flags money.
const reviewText: Record<string, string> = {
  SECOND_PAYMENT_ON_GATEWAY_ORDER: "A second payment was taken for the same order. Refund the extra one in Razorpay.",
  DUPLICATE_PAYMENT: "The order was already paid by another payment. Refund this one in Razorpay.",
  PAYMENT_FOR_CLOSED_ORDER: "Money arrived for an order that was cancelled or expired. Refund it in Razorpay.",
  AMOUNT_MISMATCH: "The amount paid doesn't match the order total. The order was not marked paid; check and refund in Razorpay.",
  REFUNDED_AFTER_DISPATCH: "Refunded after the order was dispatched. Arrange the return; the order was not cancelled.",
};

const viewOptions = [
  { value: "attention", label: "Needs attention" },
  ...(Object.keys(statusLabels) as PaymentStatusCode[]).map((value) => ({ value, label: statusLabels[value] })),
];

type Result = { key: string; payments: ApiPayment[]; totalPages: number } | { key: string; error: ApiError };

function attentionText(p: ApiPayment) {
  const parts: string[] = [];
  if (p.needsReview) parts.push(reviewText[p.reviewReason ?? ""] ?? `Flagged: ${p.reviewReason ?? "needs review"}.`);
  if (p.lastErrorCode === "REFUND_FAILED") parts.push("A refund for this payment failed at Razorpay. Retry it there, then press Check with Razorpay.");
  return parts;
}

export default function PaymentsPage() {
  const { logout } = useAdminSession();
  const [view, setView] = useState<string>("attention");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queryKey = JSON.stringify({ page, view, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    const query = view === "attention" ? { page, attention: true } : { page, status: (view || undefined) as PaymentStatusCode | undefined };
    listAdminPayments(getSessionToken() ?? "", query, controller.signal)
      .then(({ payments, meta }) => setResult({ key, payments, totalPages: meta?.totalPages ?? 1 }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load payments.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [queryKey, page, view, logout]);

  async function sync(payment: ApiPayment) {
    setBusyId(payment.id);
    setNotice(null);
    try {
      const updated = await syncAdminPayment(getSessionToken() ?? "", payment.id);
      setNotice({ tone: "success", text: `Checked with Razorpay: ${statusLabels[updated.status].toLowerCase()}.` });
      setReloadCount((n) => n + 1);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't check this payment.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.message });
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<ApiPayment>[] = [
    {
      key: "payment",
      header: "Payment",
      primary: true,
      render: (p) => (
        <div className="flex max-w-xl flex-col gap-1">
          <span className="font-medium text-zinc-900">
            {formatCurrency(p.amountMinor / 100)}
            {p.amountRefundedMinor > 0 && <span className="ml-2 text-xs text-zinc-500">({formatCurrency(p.amountRefundedMinor / 100)} refunded)</span>}
            {p.mode === "test" && <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">Test mode</span>}
          </span>
          <span className="text-xs text-zinc-500">
            Order {p.orderId} · {p.providerPaymentId ?? p.providerOrderId}
            {p.method ? ` · ${p.method}` : ""}
          </span>
          {attentionText(p).map((text) => (
            <p key={text} className="text-xs text-amber-700">
              {text}
            </p>
          ))}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={statusLabels[p.status]} tone={badgeTone[p.status]} /> },
    { key: "date", header: "Opened", render: (p) => <span className="text-zinc-500">{formatDate(p.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (p) => (
        <div className="flex justify-end">
          <button type="button" aria-label="Check with Razorpay" title="Check with Razorpay" disabled={busyId === p.id} onClick={() => void sync(p)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
            <RefreshCw className={busyId === p.id ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading payments..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load payments"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.payments.length === 0) {
    content = (
      <EmptyState
        icon={CreditCard}
        title={view === "attention" ? "Nothing needs attention" : "No payments found"}
        description={view === "attention" ? "Payments that need a person (a refund to make, or a refund that failed) appear here." : "Try a different status."}
      />
    );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.payments} getRowKey={(p) => p.id} />
        <Pagination page={page} totalPages={result.totalPages} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Payments" description="Razorpay payments as the server last read them. Refunds are made in the Razorpay dashboard; they count here once Razorpay has processed them." />
      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterDropdown
          label="Show"
          value={view}
          options={viewOptions}
          onChange={(value) => {
            setView(value);
            setPage(1);
          }}
        />
      </div>
      {content}
    </div>
  );
}
