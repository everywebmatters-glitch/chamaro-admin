"use client";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ApiOrder } from "@/lib/api/orders";
import { addressLines, itemName, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TONES, shortOrderId } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

// Read-only: orders are created by customers; the API has no endpoint for admins to change status or payment yet.
export function OrderDetailDialog({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const address = addressLines(order.shippingAddress);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={`Order ${shortOrderId(order.id)}`} className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Order {shortOrderId(order.id)}</h2>
            <p className="text-xs text-zinc-500">Placed {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={PAYMENT_STATUS_LABELS[order.paymentStatus]} tone={PAYMENT_TONES[order.paymentStatus]} />
            <StatusBadge status={ORDER_STATUS_LABELS[order.status]} />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 text-sm">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-400">Customer</dt>
              <dd className="text-zinc-800">{order.customer.user.name}</dd>
              <dd className="break-words text-zinc-500">{order.customer.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Delivery address</dt>
              {address.length === 0 ? <dd className="text-zinc-500">Not recorded</dd> : address.map((line, index) => <dd key={index} className={index === 0 ? "text-zinc-800" : "text-zinc-500"}>{line}</dd>)}
            </div>
          </dl>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-400">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-2 text-zinc-800">
                    {itemName(item)}
                    {item.sku && <span className="block text-xs text-zinc-400">{item.sku}</span>}
                  </td>
                  <td className="py-2 text-right text-zinc-600">{item.quantity}</td>
                  <td className="py-2 text-right text-zinc-600">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="py-2 text-right text-zinc-800">{formatCurrency(Number(item.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-1">
            <dt className="text-zinc-500">Subtotal</dt>
            <dd className="text-right text-zinc-800">{formatCurrency(Number(order.subtotal))}</dd>
            <dt className="text-zinc-500">Shipping{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</dt>
            <dd className="text-right text-zinc-800">{formatCurrency(Number(order.shippingTotal))}</dd>
            <dt className="border-t border-zinc-200 pt-1 font-medium text-zinc-900">Total</dt>
            <dd className="border-t border-zinc-200 pt-1 text-right font-medium text-zinc-900">{formatCurrency(Number(order.total))}</dd>
          </dl>

          {order.note && (
            <div>
              <p className="text-xs text-zinc-400">Customer note</p>
              <p className="whitespace-pre-wrap text-zinc-700">{order.note}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-zinc-200 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
