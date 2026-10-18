"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { listAdminOrders, type ApiOrder, type OrderStatusCode, type PaymentStatusCode } from "@/lib/api/orders";
import { getSessionToken } from "@/lib/auth/session";
import { itemCount, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TONES, shortOrderId, statusOptions } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;
const statusFilterOptions = statusOptions(ORDER_STATUS_LABELS);
const paymentFilterOptions = statusOptions(PAYMENT_STATUS_LABELS);

type Loaded = { key: string; orders: ApiOrder[]; meta?: PageMeta } | { key: string; error: ApiError };

export default function OrdersPage() {
  const { logout } = useAdminSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<ApiOrder | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryKey = JSON.stringify({ debouncedSearch, status, payment, page, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    listAdminOrders(
      getSessionToken() ?? "",
      { page, limit: PAGE_SIZE, status: (status || undefined) as OrderStatusCode | undefined, paymentStatus: (payment || undefined) as PaymentStatusCode | undefined, search: debouncedSearch || undefined },
      controller.signal,
    )
      .then(({ orders, meta }) => setResult({ key: queryKey, orders, meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load orders.");
        if (apiError.status === 401) return logout();
        setResult({ key: queryKey, error: apiError });
      });
    return () => controller.abort();
    // queryKey already encodes every input of the request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, logout]);

  const columns: DataTableColumn<ApiOrder>[] = useMemo(
    () => [
      {
        key: "order",
        header: "Order",
        render: (order) => (
          <button type="button" onClick={() => setSelected(order)} className="font-medium text-zinc-900 hover:underline">
            {shortOrderId(order.id)}
          </button>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (order) => (
          <div>
            <p className="text-zinc-800">{order.customer.user.name}</p>
            <p className="text-xs text-zinc-400">{order.customer.user.email}</p>
          </div>
        ),
      },
      { key: "items", header: "Items", render: (order) => itemCount(order) },
      { key: "total", header: "Total", render: (order) => formatCurrency(Number(order.total)) },
      { key: "payment", header: "Payment", render: (order) => <StatusBadge status={PAYMENT_STATUS_LABELS[order.paymentStatus]} tone={PAYMENT_TONES[order.paymentStatus]} /> },
      { key: "status", header: "Status", render: (order) => <StatusBadge status={ORDER_STATUS_LABELS[order.status]} /> },
      { key: "date", header: "Placed", render: (order) => <span className="text-zinc-500">{formatDate(order.createdAt)}</span> },
    ],
    [],
  );

  const filtered = Boolean(debouncedSearch || status || payment);
  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading orders..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load orders"
        description={result.error.message}
        action={
          <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </Button>
        }
      />
    );
  } else if (result.orders.length === 0) {
    content = filtered ? (
      <EmptyState icon={ShoppingCart} title="No matching orders" description="Try a different search or filter." />
    ) : (
      <EmptyState icon={ShoppingCart} title="No orders yet" description="Orders appear here once customers place them." />
    );
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.orders} getRowKey={(order) => order.id} />
        <Pagination page={page} totalPages={result.meta?.totalPages ?? 1} totalItems={result.meta?.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Retail Orders" description="Orders placed by customers on the website. Payment is confirmed separately; no order is marked paid by the admin panel." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search order ID, customer name or email..." value={search} onChange={setSearch} className="sm:w-80" />
        <FilterDropdown label="Order status" value={status} options={statusFilterOptions} onChange={(value) => { setStatus(value); setPage(1); }} />
        <FilterDropdown label="Payment" value={payment} options={paymentFilterOptions} onChange={(value) => { setPayment(value); setPage(1); }} />
      </div>

      {content}

      {selected && <OrderDetailDialog order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
