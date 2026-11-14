// "Release orphaned reservation": reserved units of a product that no order holds are given back to available stock.
// Pure functions (no React, no fetch) so they can be unit-tested with `node --test`. The numbers always come from the
// API's current view of the product (never typed in or assumed); the API re-checks everything under a lock.

export const REASON_MIN = 10;
export const REASON_MAX = 191;

export interface OrphanReleaseView {
  productId: string;
  name: string;
  stockLevel: "PRODUCT" | "VARIANT";
  stock: { onHand: number; reserved: number; available: number; updatedAt: string } | null;
  heldByOrders: number;
  releasable: number;
  history: {
    id: string;
    quantity: number;
    reservedBefore: number | null;
    reservedAfter: number | null;
    actorUserId: string | null;
    actorName: string | null;
    reason: string | null;
    reference: string | null;
    createdAt: string;
  }[];
}

export interface StockFigures {
  onHand: number;
  reserved: number;
  available: number;
}

export interface ReleasePlan {
  quantity: number;
  reason: string;
  before: StockFigures;
  after: StockFigures;
}

// Why the release can't be offered at all for this product (null = it can).
export function unavailableReason(view: OrphanReleaseView): string | null {
  if (view.stockLevel !== "PRODUCT") return "This product keeps stock per variant; product-level reservations can't be released here.";
  if (!view.stock) return "This product has no stock record.";
  if (view.stock.reserved === 0) return "Nothing is reserved for this product.";
  if (view.releasable === 0) return `All ${view.stock.reserved} reserved unit(s) belong to orders; none can be released.`;
  return null;
}

// Validates the form against the current view and returns the exact expected result, or the problems to show.
export function planRelease(view: OrphanReleaseView, quantityText: string, reasonText: string): { plan: ReleasePlan; errors: null } | { plan: null; errors: { quantity?: string; reason?: string; general?: string } } {
  const general = unavailableReason(view);
  if (general) return { plan: null, errors: { general } };
  const stock = view.stock!;
  const errors: { quantity?: string; reason?: string } = {};
  const trimmedQuantity = quantityText.trim();
  const quantity = /^\d+$/.test(trimmedQuantity) ? Number(trimmedQuantity) : NaN;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) errors.quantity = "Enter a whole number of 1 or more.";
  else if (quantity > stock.reserved) errors.quantity = `Only ${stock.reserved} unit(s) are reserved.`;
  else if (quantity > view.releasable) errors.quantity = `At most ${view.releasable} unit(s) can be released; ${view.heldByOrders} belong to orders.`;
  const reason = reasonText.trim();
  if (reason.length < REASON_MIN) errors.reason = `Explain why, in at least ${REASON_MIN} characters.`;
  else if (reason.length > REASON_MAX) errors.reason = `Keep the reason to ${REASON_MAX} characters.`;
  if (errors.quantity || errors.reason) return { plan: null, errors };
  const before = { onHand: stock.onHand, reserved: stock.reserved, available: stock.onHand - stock.reserved };
  const after = { onHand: stock.onHand, reserved: stock.reserved - quantity, available: stock.onHand - (stock.reserved - quantity) };
  return { plan: { quantity, reason, before, after }, errors: null };
}

// A fresh idempotency/reference key (8–80 of [A-Za-z0-9._:-], starting with a letter or digit). One per attempt: a
// retried submit of the same attempt reuses it, so the API refuses a second release.
export function newReference(random: () => string = () => globalThis.crypto.randomUUID()): string {
  return `orphan-${random()}`;
}

// What to tell the admin for an API refusal of a release.
export function releaseErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case "STALE_STOCK":
      return "Stock changed since you opened this. The current numbers have been reloaded; check them and try again.";
    case "DUPLICATE_REFERENCE":
      return "This release was already submitted. Reload the page to see the current stock.";
    case "HELD_BY_ORDERS":
    case "EXCEEDS_RESERVED":
      return `${fallback} The current numbers have been reloaded.`;
    default:
      return fallback;
  }
}

// Errors after which the dialog reloads the current view (and starts a new attempt with a new reference).
export const RELOAD_ON = new Set(["STALE_STOCK", "HELD_BY_ORDERS", "EXCEEDS_RESERVED"]);
