"use client";

import { useMemo, useState } from "react";
import { Eye, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { mockCustomers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { Customer, CustomerType } from "@/lib/types";

const typeOptions: CustomerType[] = ["Retail", "B2B"];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    return mockCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchesType = !type || c.type === type;
      return matchesSearch && matchesType;
    });
  }, [search, type]);

  const retailCount = mockCustomers.filter((c) => c.type === "Retail").length;
  const b2bCount = mockCustomers.filter((c) => c.type === "B2B").length;

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (c) => (
        <div>
          <p className="font-medium text-zinc-900">{c.name}</p>
          {c.type === "B2B" && <p className="text-xs text-zinc-400">{c.contactPerson}</p>}
        </div>
      ),
    },
    { key: "type", header: "Type", render: (c) => <StatusBadge status={c.type} /> },
    {
      key: "contact",
      header: "Email/Phone",
      render: (c) => (
        <div>
          <p className="text-zinc-700">{c.email}</p>
          <p className="text-xs text-zinc-400">{c.phone}</p>
        </div>
      ),
    },
    {
      key: "activity",
      header: "Orders/Enquiries",
      render: (c) => (c.type === "Retail" ? `${c.ordersCount ?? 0} orders` : `${c.enquiriesCount ?? 0} enquiries`),
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "joined", header: "Joined", render: (c) => <span className="text-zinc-500">{formatDate(c.joinedAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (c) => (
        <button
          type="button"
          aria-label={`View ${c.name}`}
          onClick={() => setSelected(c)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" description="Retail customers and B2B business accounts in one place." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total customers" value={mockCustomers.length.toString()} icon={Users} />
        <StatCard label="Retail customers" value={retailCount.toString()} icon={Users} />
        <StatCard label="B2B accounts" value={b2bCount.toString()} icon={Users} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search by name or email..." value={search} onChange={setSearch} className="sm:w-72" />
        <FilterDropdown label="Customer type" value={type} options={typeOptions} onChange={setType} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No customers found" description="Try adjusting your search or filters." />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <DataTable columns={columns} data={filtered} getRowKey={(c) => c.id} />
        </div>
      )}

      <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
