"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/ui/LoadingState";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { getOrphanReleaseView, releaseOrphanedReservation, type OrphanReleaseResponse } from "@/lib/api/inventory";
import { getSessionToken } from "@/lib/auth/session";
import { newReference, planRelease, RELOAD_ON, REASON_MAX, releaseErrorMessage, unavailableReason, type OrphanReleaseView, type ReleasePlan, type StockFigures } from "@/lib/orphan-release";

// Release reserved units that no order holds. Three steps: the current numbers (always fetched from the API, never
// assumed) and the form; a review of the exact before/after; the result. The API re-checks every number under a lock
// and refuses if anything changed since this dialog loaded it.
export function OrphanReleaseDialog({ productId, productName, onClose, onReleased }: { productId: string; productName: string; onClose: () => void; onReleased: () => void }) {
  const { logout } = useAdminSession();
  const [loadKey, setLoadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; view: OrphanReleaseView } | { key: number; error: string } | null>(null);
  const [step, setStep] = useState<"form" | "review">("form");
  const [quantityText, setQuantityText] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  // One reference key per attempt: resubmitting the same attempt (e.g. after a network error) reuses it, so the API
  // can never release twice. A new attempt (after reloading the numbers) gets a new key.
  const [reference, setReference] = useState(() => newReference());
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [done, setDone] = useState<{ plan: ReleasePlan; result: OrphanReleaseResponse } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const key = loadKey;
    getOrphanReleaseView(getSessionToken() ?? "", productId, controller.signal)
      .then((view) => setLoaded({ key, view }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the current stock.");
        if (apiError.status === 401) return logout();
        setLoaded({ key, error: apiError.message });
      });
    return () => controller.abort();
  }, [loadKey, productId, logout]);

  const isLoading = loaded?.key !== loadKey;
  const view = loaded && "view" in loaded ? loaded.view : null;
  const planned = useMemo(() => (view ? planRelease(view, quantityText, reasonText) : null), [view, quantityText, reasonText]);
  const errors = planned && planned.errors && showErrors ? planned.errors : {};

  function reload() {
    setReference(newReference());
    setStep("form");
    setLoadKey((n) => n + 1);
  }

  async function submit() {
    if (!planned?.plan) return;
    const plan = planned.plan;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await releaseOrphanedReservation(getSessionToken() ?? "", productId, {
        quantity: plan.quantity,
        expectedOnHand: plan.before.onHand,
        expectedReserved: plan.before.reserved,
        reason: plan.reason,
        reference,
      });
      setDone({ plan, result });
      onReleased();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "The release failed.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: releaseErrorMessage(apiError.code, apiError.message) });
      if (RELOAD_ON.has(apiError.code)) reload();
    } finally {
      setSubmitting(false);
    }
  }

  const close = submitting ? () => undefined : onClose;
  let body;
  let footer;

  if (done) {
    body = (
      <div className="flex flex-col gap-4">
        <NoticeBanner notice={{ tone: "success", text: `Released ${done.result.movement.quantity} reserved unit(s) of ${productName}. Recorded in the stock ledger.` }} onDismiss={onClose} />
        <FiguresTable before={done.plan.before} after={done.result.stock} afterLabel="Now" />
        <p className="text-xs text-zinc-500">Reference {done.result.movement.reference}</p>
      </div>
    );
    footer = <Button variant="primary" onClick={onClose}>Close</Button>;
  } else if (isLoading) {
    body = <LoadingState label="Loading current stock..." />;
  } else if (!view) {
    body = <NoticeBanner notice={{ tone: "error", text: loaded && "error" in loaded ? loaded.error : "Couldn't load the current stock." }} onDismiss={onClose} />;
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => setLoadKey((n) => n + 1)}>Try again</Button>
      </>
    );
  } else if (step === "form") {
    const blocked = unavailableReason(view);
    body = (
      <div className="flex flex-col gap-4">
        {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
        <p>
          Gives reserved units of <span className="font-medium text-zinc-900">{view.name}</span> that no order holds back to available stock. On-hand stock is not changed.
        </p>
        {view.stock && <FiguresTable before={{ onHand: view.stock.onHand, reserved: view.stock.reserved, available: view.stock.available }} />}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">Held by orders</dt>
          <dd className="text-right font-medium text-zinc-900">{view.heldByOrders}</dd>
          <dt className="text-zinc-500">Can be released</dt>
          <dd className="text-right font-medium text-zinc-900">{view.releasable}</dd>
        </dl>
        {blocked ? (
          <p className="rounded-md bg-zinc-50 px-3 py-2 text-zinc-700">{blocked}</p>
        ) : (
          <>
            <Input
              label="Quantity to release"
              name="orphan-quantity"
              inputMode="numeric"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              hint={`Whole number, 1 to ${view.releasable}.`}
              error={errors.quantity}
            />
            <Textarea
              label="Reason (required)"
              name="orphan-reason"
              rows={3}
              maxLength={REASON_MAX}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              hint="Saved permanently in the stock ledger with your name, e.g. how you confirmed that no order or physical units are behind these reservations."
              error={errors.reason}
            />
          </>
        )}
        {view.history.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Previous releases</p>
            <ul className="flex flex-col gap-1 text-xs text-zinc-600">
              {view.history.slice(0, 5).map((row) => (
                <li key={row.id}>
                  {new Date(row.createdAt).toLocaleString()} · {row.quantity} unit(s) ({row.reservedBefore}→{row.reservedAfter} reserved) by {row.actorName ?? "unknown"}: {row.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {!blocked && (
          <Button
            variant="primary"
            onClick={() => {
              setShowErrors(true);
              if (planned?.plan) setStep("review");
            }}
          >
            Review release
          </Button>
        )}
      </>
    );
  } else {
    const plan = planned?.plan;
    body = plan ? (
      <div className="flex flex-col gap-4">
        {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
        <p>
          Release <span className="font-semibold text-zinc-900">{plan.quantity}</span> reserved unit(s) of <span className="font-medium text-zinc-900">{view.name}</span>. Expected result:
        </p>
        <FiguresTable before={plan.before} after={plan.after} />
        <div className="rounded-md bg-zinc-50 px-3 py-2">
          <p className="text-xs font-medium text-zinc-500">Reason</p>
          <p className="whitespace-pre-wrap text-zinc-800">{plan.reason}</p>
        </div>
        <p className="text-xs text-zinc-500">
          The release is refused if the stock changed since these numbers were loaded. It is recorded permanently in the stock ledger with your name and can&apos;t be undone from here.
        </p>
      </div>
    ) : null;
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep("form")} disabled={submitting}>Back</Button>
        <Button variant="danger" onClick={submit} disabled={submitting || !plan}>
          {submitting ? "Releasing..." : `Release ${plan?.quantity ?? ""} unit(s)`}
        </Button>
      </>
    );
  }

  return (
    <Modal open onClose={close} title="Release orphaned reservation" footer={footer}>
      {body}
    </Modal>
  );
}

function FiguresTable({ before, after, afterLabel = "After" }: { before: StockFigures; after?: StockFigures; afterLabel?: string }) {
  const rows: [string, keyof StockFigures][] = [["On hand", "onHand"], ["Reserved", "reserved"], ["Available", "available"]];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
          <th className="py-1.5 font-medium">Field</th>
          <th className="py-1.5 text-right font-medium">{after ? "Before" : "Current"}</th>
          {after && <th className="py-1.5 text-right font-medium">{afterLabel}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, key]) => (
          <tr key={key} className="border-b border-zinc-100 last:border-0">
            <td className="py-1.5 text-zinc-600">{label}</td>
            <td className="py-1.5 text-right font-medium text-zinc-900">{before[key]}</td>
            {after && <td className={`py-1.5 text-right font-medium ${after[key] !== before[key] ? "text-zinc-900 underline decoration-zinc-300 underline-offset-4" : "text-zinc-900"}`}>{after[key]}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
