"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Handshake } from "lucide-react";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { getSessionToken } from "@/lib/auth/session";
import { listAdminB2BEnquiries, type ApiB2BEnquiry, type B2BEnquiryStatus } from "@/lib/api/b2b-enquiries";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<B2BEnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  REQUIREMENT_RECEIVED: "Requirement Received",
  QUOTATION_SENT: "Quotation Sent",
  NEGOTIATING: "Negotiating",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

type Loaded =
  | { key: string; enquiries: ApiB2BEnquiry[]; meta?: PageMeta }
  | { key: string; error: ApiError };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function B2BEnquiriesPage() {
  const { logout } = useAdminSession();
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const queryKey = `${page}:${reloadCount}`;
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    listAdminB2BEnquiries(getSessionToken() ?? "", page, PAGE_SIZE, controller.signal)
      .then(({ enquiries, meta }) => setResult({ key: queryKey, enquiries, meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load B2B enquiries.");
        if (apiError.status === 401) return logout();
        setResult({ key: queryKey, error: apiError });
      });
    return () => controller.abort();
    // queryKey includes every input used in this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, logout]);

  const columns: DataTableColumn<ApiB2BEnquiry>[] = useMemo(
    () => [
      {
        key: "company",
        header: "Company",
        primary: true,
        render: (enquiry) => (
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{enquiry.companyName}</p>
            <p className="text-xs text-zinc-500">{enquiry.name}</p>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        render: (enquiry) => (
          <div className="break-words">
            <a className="text-blue-700 hover:underline" href={`mailto:${enquiry.email}`}>
              {enquiry.email}
            </a>
            {enquiry.phone && <p className="mt-1 text-xs text-zinc-500">{enquiry.phone}</p>}
          </div>
        ),
      },
      {
        key: "items",
        header: "Requirement",
        render: (enquiry) => (
          <ul className="space-y-1">
            {enquiry.items.map((item) => (
              <li key={item.id}>
                {item.requirements ?? "Product request"} <span className="text-zinc-500">× {item.quantity}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        key: "message",
        header: "Message",
        className: "min-w-64 max-w-lg whitespace-pre-wrap",
        render: (enquiry) => enquiry.message || "—",
      },
      {
        key: "status",
        header: "Status",
        render: (enquiry) => <StatusBadge status={STATUS_LABELS[enquiry.status]} />,
      },
      {
        key: "created",
        header: "Received",
        render: (enquiry) => <span className="whitespace-nowrap text-zinc-500">{formatDateTime(enquiry.createdAt)}</span>,
      },
    ],
    [],
  );

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading B2B enquiries..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load B2B enquiries"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((count) => count + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.enquiries.length === 0) {
    content = <EmptyState icon={Handshake} title="No B2B enquiries yet" description="New quote requests will appear here." />;
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.enquiries} getRowKey={(enquiry) => enquiry.id} />
        <Pagination
          page={page}
          totalPages={result.meta?.totalPages ?? 1}
          totalItems={result.meta?.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="B2B Enquiries" description="Wholesale and bulk quote requests submitted by businesses." />
      {content}
    </div>
  );
}
