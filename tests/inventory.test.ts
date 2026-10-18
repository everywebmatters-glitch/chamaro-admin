import test from "node:test";
import assert from "node:assert/strict";
import { availableUnits, LOW_STOCK_THRESHOLD, stockStatus, summarizeCatalog } from "../lib/inventory.ts";

type P = Parameters<typeof summarizeCatalog>[0][number];
const product = (name: string, status: string, inventory: { quantity: number; reservedQuantity: number } | null, createdAt = "2026-01-01T00:00:00.000Z") =>
  ({ id: name, name, status, inventory: inventory && { id: "i", ...inventory }, createdAt }) as unknown as P;

test("available units are on hand minus reserved; untracked stock is null", () => {
  assert.equal(availableUnits({ inventory: null }), null);
  assert.equal(availableUnits({ inventory: { id: "i", quantity: 10, reservedQuantity: 3 } }), 7);
});

test("stock status boundaries", () => {
  const status = (quantity: number, reservedQuantity = 0) => stockStatus({ inventory: { id: "i", quantity, reservedQuantity } });
  assert.equal(status(0), "Out of stock");
  assert.equal(status(5, 5), "Out of stock");
  assert.equal(status(1), "Low stock");
  assert.equal(status(LOW_STOCK_THRESHOLD), "Low stock");
  assert.equal(status(LOW_STOCK_THRESHOLD + 1), "In stock");
  assert.equal(status(LOW_STOCK_THRESHOLD + 1, 2), "Low stock");
  assert.equal(stockStatus({ inventory: null }), "Not tracked");
});

test("summary counts catalogue status for all products but stock only for active ones", () => {
  const summary = summarizeCatalog([
    product("A", "ACTIVE", { quantity: 50, reservedQuantity: 0 }),
    product("B", "ACTIVE", { quantity: 3, reservedQuantity: 0 }),
    product("C", "ACTIVE", { quantity: 0, reservedQuantity: 0 }),
    product("D", "ACTIVE", null),
    product("E", "DRAFT", { quantity: 0, reservedQuantity: 0 }),
    product("F", "ARCHIVED", { quantity: 1, reservedQuantity: 0 }),
  ]);
  assert.deepEqual([summary.total, summary.active, summary.draft, summary.archived], [6, 4, 1, 1]);
  assert.deepEqual([summary.inStock, summary.lowStock, summary.outOfStock, summary.notTracked], [1, 1, 1, 1]);
  assert.deepEqual(summary.needsRestock.map((p) => p.name), ["C", "B"], "lowest stock first; drafts and archived never listed");
});

test("recent products are newest first and limited", () => {
  const products = Array.from({ length: 8 }, (_, index) => product(`P${index}`, "ACTIVE", null, `2026-01-0${index + 1}T00:00:00.000Z`));
  assert.deepEqual(summarizeCatalog(products, 3).recent.map((p) => p.name), ["P7", "P6", "P5"]);
});

test("an empty catalogue summarises to zeros", () => {
  const summary = summarizeCatalog([]);
  assert.deepEqual([summary.total, summary.inStock, summary.needsRestock.length, summary.recent.length], [0, 0, 0, 0]);
});
