"use client";

import { useState } from "react";
import { ExternalLink, PackageCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { bookCourier, refreshCourierTracking, type ApiOrder } from "@/lib/api/orders";
import { getSessionToken } from "@/lib/auth/session";
import { BOOKING_PROBLEMS, canBookCourier, SHIPMENT_STATUS_LABELS } from "@/lib/orders";
import { parcelToText, parseParcel } from "@/lib/parcel-form";
import { formatDate } from "@/lib/utils";

const tone = (status: string) =>
  status === "DELIVERED" ? "green" : status === "CREATE_FAILED" || status === "RETURNED" ? "red" : status === "CANCELLED" ? "zinc" : status === "QUEUED" || status === "CREATING" ? "amber" : "blue";

// Delhivery booking for one order: its state as the server last recorded it, and the two safe actions. "Book" / "Retry
// booking" never creates a second shipment (the server claims the booking, and an attempt whose outcome was unknown is
// looked up at Delhivery first); it never touches the payment.
export function CourierBooking({ order, onChanged }: { order: ApiOrder; onChanged: (order: ApiOrder) => void }) {
  const { logout } = useAdminSession();
  const shipment = order.shipment ?? null;
  const [parcel, setParcel] = useState(() => parcelToText(shipment));
  const [busy, setBusy] = useState<"book" | "refresh" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const bookable = canBookCourier(order);

  if (!shipment && !bookable) return null;

  async function run(kind: "book" | "refresh") {
    setMessage(null);
    let body = {};
    if (kind === "book") {
      const parsed = parseParcel(parcel);
      if ("error" in parsed) return setMessage({ tone: "error", text: parsed.error });
      const { weightGrams, lengthCm, widthCm, heightCm } = parsed.values;
      if (weightGrams === null) {
        if (!shipment?.weightGrams) return setMessage({ tone: "error", text: "Enter the parcel weight and size to book." });
      } else body = { weightGrams, lengthCm, widthCm, heightCm };
    }
    setBusy(kind);
    try {
      const token = getSessionToken() ?? "";
      const updated = kind === "book" ? await bookCourier(token, order.id, body) : await refreshCourierTracking(token, order.id);
      onChanged(updated);
      setMessage({ tone: "info", text: kind === "book" ? "Booked with Delhivery." : "Tracking refreshed from Delhivery." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "The request failed.");
      if (apiError.status === 401) return logout();
      setMessage({ tone: "error", text: BOOKING_PROBLEMS[apiError.code] ?? apiError.message });
    } finally {
      setBusy(null);
    }
  }

  const problem = shipment?.lastErrorCode && (shipment.status === "CREATE_FAILED" || shipment.status === "CANCELLED") ? shipment.lastErrorCode : null;

  return (
    <div className="flex flex-col gap-3">
      {shipment && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900">Delhivery</span>
            <StatusBadge status={SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status} tone={tone(shipment.status)} />
            {shipment.autoBooked && <span className="text-xs text-zinc-400">booked automatically after payment</span>}
          </div>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-400">AWB</dt>
              <dd className="break-all font-medium text-zinc-900">{shipment.waybill ?? "Not assigned yet"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Booking reference</dt>
              <dd className="break-all text-zinc-700">{shipment.uploadWbn ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Tracking</dt>
              <dd className="text-zinc-700">
                {shipment.trackingUrl ? (
                  <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                ) : shipment.waybill ? (
                  "Search the AWB in Delhivery's panel"
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {shipment.providerStatus && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-zinc-400">Latest Delhivery scan</dt>
                <dd className="text-zinc-700">
                  {shipment.providerStatus}
                  {shipment.providerStatusLocation ? `, ${shipment.providerStatusLocation}` : ""}
                  {shipment.providerStatusAt ? ` · ${formatDate(shipment.providerStatusAt)}` : ""}
                </dd>
              </div>
            )}
            {shipment.weightGrams && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-zinc-400">Parcel booked</dt>
                <dd className="text-zinc-700">
                  {shipment.weightGrams / 1000} kg · {shipment.lengthCm} × {shipment.widthCm} × {shipment.heightCm} cm
                </dd>
              </div>
            )}
          </dl>
          {shipment.waybill && <p className="text-xs text-zinc-500">Print the shipping label for this AWB from Delhivery&apos;s panel. The customer is emailed the tracking details when Delhivery picks the parcel up.</p>}
          {shipment.status === "QUEUED" && <p className="text-zinc-500">The shipment worker books this with Delhivery within a few minutes. You can also book it now.</p>}
          {shipment.status === "CREATE_FAILED" && shipment.needsReconcile && shipment.nextAttemptAt && (
            <p className="text-zinc-500">Retrying automatically after {formatDate(shipment.nextAttemptAt)} (attempt {shipment.attempts} so far).</p>
          )}
          {problem && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
              {BOOKING_PROBLEMS[problem] ?? problem}
              {shipment.lastErrorRemark && <span className="block text-xs text-amber-700">Delhivery: {shipment.lastErrorRemark}</span>}
            </p>
          )}
        </>
      )}

      {bookable && (
        <div className="flex flex-col gap-2">
          <p className="text-zinc-500">{shipment ? "Parcel to book (one packed parcel):" : "Book this order with Delhivery. Parcel (one packed parcel):"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="Weight (kg)" name="bookWeight" inputMode="decimal" value={parcel.weightKg} onChange={(e) => setParcel({ ...parcel, weightKg: e.target.value })} />
            <Input label="Length (cm)" name="bookLength" inputMode="numeric" value={parcel.lengthCm} onChange={(e) => setParcel({ ...parcel, lengthCm: e.target.value })} />
            <Input label="Width (cm)" name="bookWidth" inputMode="numeric" value={parcel.widthCm} onChange={(e) => setParcel({ ...parcel, widthCm: e.target.value })} />
            <Input label="Height (cm)" name="bookHeight" inputMode="numeric" value={parcel.heightCm} onChange={(e) => setParcel({ ...parcel, heightCm: e.target.value })} />
          </div>
          <div>
            <Button type="button" variant="primary" disabled={busy !== null} onClick={() => void run("book")} icon={<PackageCheck className="h-4 w-4" />}>
              {busy === "book" ? "Booking…" : shipment ? "Retry booking with Delhivery" : "Book with Delhivery"}
            </Button>
          </div>
        </div>
      )}

      {shipment?.waybill && (
        <div>
          <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => void run("refresh")} icon={<RefreshCw className="h-4 w-4" />}>
            {busy === "refresh" ? "Refreshing…" : "Refresh tracking"}
          </Button>
        </div>
      )}

      {message && (
        <p className={message.tone === "error" ? "text-sm text-red-600" : "text-sm text-green-700"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
