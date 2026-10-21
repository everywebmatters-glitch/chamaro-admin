import test from "node:test";
import assert from "node:assert/strict";
import { addressLines, itemCount, itemName, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, shortOrderId, statusOptions } from "../lib/orders.ts";

test("every status has a label and the filter options list them all", () => {
  assert.equal(statusOptions(ORDER_STATUS_LABELS).length, 6);
  assert.deepEqual(statusOptions(PAYMENT_STATUS_LABELS), [{ value: "UNPAID", label: "Unpaid" }, { value: "PAID", label: "Paid" }, { value: "REFUNDED", label: "Refunded" }]);
});

test("order ids are shortened to their last characters", () => {
  assert.equal(shortOrderId("cmvdkp8gw0009qcc94osfecd2"), "#4OSFECD2");
});

test("item count adds quantities; names include the variant and cope with missing snapshots", () => {
  assert.equal(itemCount({ items: [{ quantity: 2 }, { quantity: 3 }] as never }), 5);
  assert.equal(itemName({ productName: "Boss Chair", variantName: "Black" }), "Boss Chair (Black)");
  assert.equal(itemName({ productName: "Boss Chair", variantName: null }), "Boss Chair");
  assert.equal(itemName({ productName: null, variantName: null }), "Product");
});

test("address lines skip empty parts", () => {
  assert.deepEqual(addressLines(null), []);
  assert.deepEqual(
    addressLines({ name: "Asha Rao", phone: "+91 98765 43210", addressLine1: "12 MG Road", addressLine2: null, city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "IN" }),
    ["Asha Rao", "12 MG Road", "Bengaluru, Karnataka 560001", "IN", "+91 98765 43210"],
  );
});

test("the ship form is offered only for paid orders that aren't shipped, cancelled or with Delhivery", async () => {
  const { shipBlockReason } = await import("../lib/orders.ts");
  const base = { status: "CONFIRMED" as const, paymentStatus: "PAID" as const, trackingNumber: null, shipment: null };
  assert.equal(shipBlockReason(base), null);
  assert.equal(shipBlockReason({ ...base, status: "PROCESSING" }), null);
  assert.match(shipBlockReason({ ...base, paymentStatus: "UNPAID" })!, /paid/);
  assert.match(shipBlockReason({ ...base, paymentStatus: "REFUNDED" })!, /paid/);
  assert.match(shipBlockReason({ ...base, status: "CANCELLED" })!, /Cancelled/);
  assert.match(shipBlockReason({ ...base, status: "SHIPPED", trackingNumber: "AWB1" })!, /already/);
  assert.match(shipBlockReason({ ...base, shipment: { waybill: "123", status: "MANIFESTED" } })!, /Delhivery/);
});

test("carrier and tracking number follow the API's limits", async () => {
  const { validateShipment } = await import("../lib/orders.ts");
  assert.deepEqual(validateShipment({ carrier: " Blue Dart ", trackingNumber: " BD-12345/A " }), {});
  assert.ok(validateShipment({ carrier: "", trackingNumber: "BD1" }).carrier);
  assert.ok(validateShipment({ carrier: "x".repeat(65), trackingNumber: "BD1" }).carrier);
  assert.ok(validateShipment({ carrier: "DTDC", trackingNumber: "" }).trackingNumber);
  assert.ok(validateShipment({ carrier: "DTDC", trackingNumber: "<script>" }).trackingNumber);
  assert.ok(validateShipment({ carrier: "DTDC", trackingNumber: "-starts-with-dash" }).trackingNumber);
});
