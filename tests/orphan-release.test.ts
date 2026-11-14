import test from "node:test";
import assert from "node:assert/strict";
import { newReference, planRelease, RELOAD_ON, releaseErrorMessage, unavailableReason, type OrphanReleaseView } from "../lib/orphan-release.ts";

const REASON = "Orphaned reservation: isolated backup investigation confirmed no matching order lines and no physical units held.";
const view = (stock: { onHand: number; reserved: number } | null, heldByOrders = 0, stockLevel: "PRODUCT" | "VARIANT" = "PRODUCT"): OrphanReleaseView => ({
  productId: "p1",
  name: "Test chair",
  stockLevel,
  stock: stock && { ...stock, available: stock.onHand - stock.reserved, updatedAt: "2026-11-14T00:00:00.000Z" },
  heldByOrders,
  releasable: stock && stockLevel === "PRODUCT" ? Math.max(0, stock.reserved - heldByOrders) : 0,
  history: [],
});

test("the expected result comes from the fetched numbers: 20 on hand / 4 reserved, release 4 → 20 / 0 / 20", () => {
  const result = planRelease(view({ onHand: 20, reserved: 4 }), "4", REASON);
  assert.equal(result.errors, null);
  assert.deepEqual(result.plan, { quantity: 4, reason: REASON, before: { onHand: 20, reserved: 4, available: 16 }, after: { onHand: 20, reserved: 0, available: 20 } });
});

test("other numbers give other results (nothing is hard-coded); on hand never changes", () => {
  const result = planRelease(view({ onHand: 7, reserved: 5 }, 2), " 2 ", "  counted twice, no order behind it  ");
  assert.deepEqual(result.plan, { quantity: 2, reason: "counted twice, no order behind it", before: { onHand: 7, reserved: 5, available: 2 }, after: { onHand: 7, reserved: 3, available: 4 } });
});

test("quantity must be a whole number from 1 to the releasable units", () => {
  const v = view({ onHand: 20, reserved: 4 }, 1); // 3 releasable
  for (const text of ["", "0", "-1", "1.5", "abc", "1e2", " "]) assert.match(planRelease(v, text, REASON).errors?.quantity ?? "", /whole number/, text);
  assert.match(planRelease(view({ onHand: 20, reserved: 4 }), "5", REASON).errors?.quantity ?? "", /Only 4 unit/);
  assert.match(planRelease(v, "4", REASON).errors?.quantity ?? "", /At most 3 .* 1 belong to orders/);
  assert.equal(planRelease(v, "3", REASON).errors, null);
});

test("a reason of 10 to 191 characters is required", () => {
  const v = view({ onHand: 20, reserved: 4 });
  for (const text of ["", "   ", "too short"]) assert.match(planRelease(v, "4", text).errors?.reason ?? "", /at least 10/, JSON.stringify(text));
  assert.match(planRelease(v, "4", "x".repeat(192)).errors?.reason ?? "", /191/);
  assert.equal(planRelease(v, "4", "x".repeat(191)).errors, null);
});

test("the action is not offered when nothing can be released", () => {
  assert.match(unavailableReason(view({ onHand: 20, reserved: 0 })) ?? "", /Nothing is reserved/);
  assert.match(unavailableReason(view({ onHand: 20, reserved: 4 }, 4)) ?? "", /All 4 reserved unit\(s\) belong to orders/);
  assert.match(unavailableReason(view(null)) ?? "", /no stock record/);
  assert.match(unavailableReason(view({ onHand: 20, reserved: 4 }, 0, "VARIANT")) ?? "", /per variant/);
  assert.equal(unavailableReason(view({ onHand: 20, reserved: 4 })), null);
  assert.ok(planRelease(view({ onHand: 20, reserved: 0 }), "1", REASON).errors?.general);
});

test("reference keys match the API's format and are unique per attempt", () => {
  const pattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/; // backend REFERENCE_PATTERN
  const a = newReference();
  const b = newReference();
  assert.match(a, pattern);
  assert.notEqual(a, b);
  assert.equal(newReference(() => "fixed"), "orphan-fixed");
});

test("refusals reload the numbers when they may have changed; a duplicate says it was already submitted", () => {
  assert.ok(RELOAD_ON.has("STALE_STOCK") && RELOAD_ON.has("HELD_BY_ORDERS") && RELOAD_ON.has("EXCEEDS_RESERVED"));
  assert.ok(!RELOAD_ON.has("DUPLICATE_REFERENCE"));
  assert.match(releaseErrorMessage("DUPLICATE_REFERENCE", "x"), /already submitted/);
  assert.match(releaseErrorMessage("STALE_STOCK", "x"), /changed since you opened/);
  assert.equal(releaseErrorMessage("FORBIDDEN", "You don't have permission to do that."), "You don't have permission to do that.");
});
