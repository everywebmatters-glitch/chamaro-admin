"use client";

import { useMemo, useState } from "react";
import { Eye, Handshake, Inbox, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EnquiryDetailModal } from "@/components/b2b/EnquiryDetailModal";
import { mockB2BEnquiries } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { B2BEnquiry, EnquiryStatus } from "@/lib/types";

const statusOptions: EnquiryStatus[] = [
  "New",
  "Contacted",
  "Requirement Received",
  "Quotation Sent",
  "Negotiating",
  "Converted",
  "Closed",
];

export default function B2BEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<B2BEnquiry[]>(mockB2BEnquiries);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<B2BEnquiry | null>(null);

  const filtered = useMemo(() => {
    return enquiries.filter((e) => {
      const matchesSearch =
        e.companyName.toLowerCase().includes(search.toLowerCase()) ||
        e.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !status || e.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [enquiries, search, status]);

  const newCount = enquiries.filter((e) => e.status === "New").length;
  const activeCount = enquiries.filter((e) => !["Converted", "Closed"].includes(e.status)).length;

  const updateStatus = (id: string, next: EnquiryStatus) => {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: next } : e)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev));
  };

  const columns: DataTableColumn<B2BEnquiry>[] = [
    { key: "id", header: "Enquiry ID", render: (e) => <span className="font-medium text-zinc-900">{e.id}</span> },
    { key: "company", header: "Company", render: (e) => e.companyName },
    { key: "contact", header: "Contact Person", render: (e) => e.contactPerson },
    {
      key: "contactInfo",
      header: "Email/Phone",
      render: (e) => (
        <div>
          <p className="text-zinc-700">{e.email}</p>
          <p className="text-xs text-zinc-400">{e.phone}</p>
        </div>
      ),
    },
    { key: "requirement", header: "Requirement", render: (e) => <span className="text-zinc-600">{e.requirement}</span> },
    { key: "quantity", header: "Est. Quantity", render: (e) => e.estimatedQuantity.toLocaleString() },
    { key: "date", header: "Date", render: (e) => <span className="text-zinc-500">{formatDate(e.date)}</span> },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (e) => (
        <button
          type="button"
          aria-label={`View enquiry ${e.id}`}
          onClick={() => setSelected(e)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="B2B Enquiries"
        description="Manage wholesale and bulk requirement enquiries from businesses."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total enquiries" value={enquiries.length.toString()} icon={Inbox} />
        <StatCard label="New enquiries" value={newCount.toString()} icon={Handshake} />
        <StatCard label="Active leads" value={activeCount.toString()} icon={Users} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search by company, contact, or ID..." value={search} onChange={setSearch} className="sm:w-72" />
        <FilterDropdown label="Status" value={status} options={statusOptions} onChange={setStatus} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Handshake} title="No enquiries found" description="Try adjusting your search or filters." />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <DataTable columns={columns} data={filtered} getRowKey={(e) => e.id} />
        </div>
      )}

      <EnquiryDetailModal enquiry={selected} onClose={() => setSelected(null)} onUpdateStatus={updateStatus} />
    </div>
  );
}
