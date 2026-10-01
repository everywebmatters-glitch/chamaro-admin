"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer } from "@/lib/types";

interface CustomerDetailModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
  if (!customer) return null;

  return (
    <Modal
      open={Boolean(customer)}
      onClose={onClose}
      title={customer.name}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Joined {formatDate(customer.joinedAt)}</span>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={customer.type} />
            <StatusBadge status={customer.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-400">Email</dt>
            <dd className="text-zinc-800">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Phone</dt>
            <dd className="text-zinc-800">{customer.phone}</dd>
          </div>
        </dl>

        {customer.type === "Retail" ? (
          <>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Retail summary</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-400">Orders</dt>
                  <dd className="text-zinc-800">{customer.ordersCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Total spent</dt>
                  <dd className="text-zinc-800">{formatCurrency(customer.totalSpent ?? 0)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Recent orders</h3>
              <ul className="flex flex-col divide-y divide-zinc-100 rounded-md border border-zinc-100">
                {customer.recentOrders?.map((order) => (
                  <li key={order.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-zinc-800">{order.id}</span>
                    <span className="text-zinc-500">{formatDate(order.date)}</span>
                    <span className="text-zinc-700">{formatCurrency(order.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Company information</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-400">Company</dt>
                  <dd className="text-zinc-800">{customer.companyName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Contact person</dt>
                  <dd className="text-zinc-800">{customer.contactPerson}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Enquiries</dt>
                  <dd className="text-zinc-800">{customer.enquiriesCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Quotation status</dt>
                  <dd className="text-zinc-800">{customer.quotationStatus ?? "—"}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Recent B2B activity</h3>
              <ul className="flex flex-col divide-y divide-zinc-100 rounded-md border border-zinc-100">
                {customer.recentActivity?.map((activity, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-zinc-800">{activity.label}</span>
                    <span className="text-zinc-500">{formatDate(activity.date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
