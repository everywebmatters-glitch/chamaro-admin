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
