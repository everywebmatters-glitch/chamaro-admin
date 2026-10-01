"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { B2BEnquiry, EnquiryStatus } from "@/lib/types";

interface EnquiryDetailModalProps {
  enquiry: B2BEnquiry | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: EnquiryStatus) => void;
}

const actionSteps: { label: string; status: EnquiryStatus }[] = [
  { label: "Mark as Contacted", status: "Contacted" },
  { label: "Mark Requirement Received", status: "Requirement Received" },
  { label: "Mark Quotation Sent", status: "Quotation Sent" },
  { label: "Mark Negotiating", status: "Negotiating" },
  { label: "Mark Converted", status: "Converted" },
];

export function EnquiryDetailModal({ enquiry, onClose, onUpdateStatus }: EnquiryDetailModalProps) {
  if (!enquiry) return null;

  return (
    <Modal
      open={Boolean(enquiry)}
      onClose={onClose}
      title={enquiry.id}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {enquiry.status !== "Closed" && (
            <Button variant="danger" onClick={() => onUpdateStatus(enquiry.id, "Closed")}>
              Close Enquiry
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Received {formatDate(enquiry.date)}</span>
          <StatusBadge status={enquiry.status} />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Company information</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Company name</dt>
              <dd className="text-zinc-800">{enquiry.companyName}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Contact person</dt>
              <dd className="text-zinc-800">{enquiry.contactPerson}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Email</dt>
              <dd className="text-zinc-800">{enquiry.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Phone</dt>
              <dd className="text-zinc-800">{enquiry.phone}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Requirement</h3>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Products requested</dt>
              <dd className="text-zinc-800">{enquiry.productsRequested}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-zinc-400">Estimated quantity</dt>
                <dd className="text-zinc-800">{enquiry.estimatedQuantity.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Expected timeline</dt>
                <dd className="text-zinc-800">{enquiry.expectedTimeline ?? "Not specified"}</dd>
              </div>
            </div>
            {enquiry.notes && (
              <div>
                <dt className="text-xs text-zinc-400">Notes</dt>
                <dd className="text-zinc-800">{enquiry.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Admin actions</h3>
          <div className="flex flex-wrap gap-2">
            {actionSteps.map((step) => (
              <Button
                key={step.status}
                variant={enquiry.status === step.status ? "primary" : "secondary"}
                size="sm"
                onClick={() => onUpdateStatus(enquiry.id, step.status)}
              >
                {step.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
