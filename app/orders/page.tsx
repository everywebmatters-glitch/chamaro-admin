"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList, Clock, PackageCheck, XCircle } from "lucide-react";
import { mockOrders } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const statusOptions: OrderStatus[] = ["Pending", "Confirmed", "Processing", "Shipped", "Completed", "Cancelled"];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    return mockOrders.filter((o) => {
      const matchesSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !status || o.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  const pendingCount = mockOrders.filter((o) => o.status === "Pending").length;
  const shippedCount = mockOrders.filter((o) => o.status === "Shipped").length;
  const cancelledCount = mockOrders.filter((o) => o.status === "Cancelled").length;

  const columns: DataTableColumn<Order>[] = [
    { key: "id", header: "Order ID", render: (o) => <span className="font-medium text-zinc-900">{o.id}</span> },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <p className="text-zinc-700">{o.customer}</p>
          <p className="text-xs text-zinc-400">{o.email}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (o) => <span className="text-zinc-500">{formatDate(o.date)}</span> },
    { key: "items", header: "Items", render: (o) => o.items },
    { key: "total", header: "Total", render: (o) => formatCurrency(o.total) },
    { key: "payment", header: "Payment", render: (o) => <StatusBadge status={o.payment} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (o) => (
        <button
          type="button"
          aria-label={`View order ${o.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Retail Orders" description="View and manage orders placed directly by customers on the website." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={mockOrders.length.toString()} icon={ClipboardList} />
        <StatCard label="Pending" value={pendingCount.toString()} icon={Clock} />
        <StatCard label="Shipped" value={shippedCount.toString()} icon={PackageCheck} />
        <StatCard label="Cancelled" value={cancelledCount.toString()} icon={XCircle} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search by order ID or customer..." value={search} onChange={setSearch} className="sm:w-72" />
        <FilterDropdown label="Status" value={status} options={statusOptions} onChange={setStatus} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No orders found" description="Try adjusting your search or filters." />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <DataTable columns={columns} data={filtered} getRowKey={(o) => o.id} />
        </div>
      )}
    </div>
  );
}
