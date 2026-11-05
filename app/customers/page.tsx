"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { listAdminCustomers, type ApiCustomer, type CustomerType } from "@/lib/api/customers";
import { getSessionToken } from "@/lib/auth/session";

type Result = { key: string; customers: ApiCustomer[]; meta?: PageMeta } | { key: string; error: ApiError };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export default function CustomersPage() {
  const { logout } = useAdminSession();
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const queryKey = JSON.stringify({ page, search, customerType, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    listAdminCustomers(
      getSessionToken() ?? "",
      { page, search: search || undefined, customerType: (customerType || undefined) as CustomerType | undefined },
      controller.signal,
    )
      .then(({ customers, meta }) => setResult({ key, customers, meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load customers.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [queryKey, page, search, customerType, logout]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  }

  const columns: DataTableColumn<ApiCustomer>[] = useMemo(
    () => [
      {
        key: "customer",
        header: "Customer",
        primary: true,
        render: (customer) => (
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{customer.customer.companyName || customer.name}</p>
            {customer.customer.companyName && <p className="text-xs text-zinc-500">{customer.name}</p>}
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        render: (customer) => (
          <div className="break-words">
            <a className="text-blue-700 hover:underline" href={`mailto:${customer.email}`}>{customer.email}</a>
            {customer.customer.phone && <p className="mt-1 text-xs text-zinc-500">{customer.customer.phone}</p>}
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (customer) => <StatusBadge status={customer.customer.customerType === "B2B" ? "B2B" : "Retail"} />,
      },
      {
        key: "orders",
        header: "Retail orders",
        render: (customer) => customer.customer._count.retailOrders,
      },
      {
        key: "joined",
        header: "Joined",
        render: (customer) => <span className="whitespace-nowrap text-zinc-500">{formatDate(customer.createdAt)}</span>,
      },
    ],
    [],
  );

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading customers..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load customers"
        description={result.error.message}
        action={<Button variant="secondary" onClick={() => setReloadCount((count) => count + 1)}>Try again</Button>}
      />
    );
  } else if (result.customers.length === 0) {
    content = <EmptyState icon={Users} title="No customers found" description="Customer accounts will appear here when they register." />;
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.customers} getRowKey={(customer) => customer.id} />
        <Pagination
          page={page}
          totalPages={result.meta?.totalPages ?? 1}
          totalItems={result.meta?.total}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" description="Retail customers and B2B business accounts in one place." />
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Input label="Search customers" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Name, email, phone or company" />
        </div>
        <FilterDropdown
          label="Customer type"
          value={customerType}
          options={[{ value: "RETAIL", label: "Retail" }, { value: "B2B", label: "B2B" }]}
          onChange={(value) => {
            setCustomerType(value);
            setPage(1);
          }}
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {content}
    </div>
  );
}
