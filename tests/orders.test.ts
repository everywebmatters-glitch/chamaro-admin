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
  assert.match(shipBlockReason({ ...base, shipment: { waybill: "123", status: "MANIFESTED" } as never })!, /Delhivery/);
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

test("Delhivery booking actions: book or retry only paid, unshipped orders whose booking is not done or running", async () => {
  const { canBookCourier, courierBookingUnsent, shipBlockReason } = await import("../lib/orders.ts");
  const paid = { status: "CONFIRMED" as const, paymentStatus: "PAID" as const, trackingNumber: null };
  const ship = (status: string, extra: object = {}) => ({ status, waybill: null, needsReconcile: false, lockedUntil: null, ...extra }) as never;
  assert.equal(canBookCourier({ ...paid, shipment: null }), true);
  assert.equal(canBookCourier({ ...paid, paymentStatus: "UNPAID", shipment: null }), false);
  assert.equal(canBookCourier({ ...paid, shipment: ship("QUEUED") }), true);
  assert.equal(canBookCourier({ ...paid, shipment: ship("CREATE_FAILED", { needsReconcile: true }) }), true);
  assert.equal(canBookCourier({ ...paid, shipment: ship("CREATING", { lockedUntil: new Date(Date.now() + 60_000).toISOString() }) }), false, "running");
  assert.equal(canBookCourier({ ...paid, shipment: ship("CREATING", { lockedUntil: new Date(Date.now() - 1000).toISOString() }) }), true, "lease ran out");
  assert.equal(canBookCourier({ ...paid, status: "PROCESSING", shipment: ship("MANIFESTED", { waybill: "123" }) }), false);
  assert.equal(canBookCourier({ ...paid, trackingNumber: "BD1", shipment: null }), false, "shipped by hand");

  // Shipping by hand stays possible while the booking never reached Delhivery.
  assert.equal(courierBookingUnsent(ship("QUEUED")), true);
  assert.equal(courierBookingUnsent(ship("CREATE_FAILED")), true);
  assert.equal(courierBookingUnsent(ship("CREATE_FAILED", { needsReconcile: true })), false, "Delhivery may have it");
  assert.equal(shipBlockReason({ ...paid, shipment: ship("QUEUED") }), null);
  assert.match(shipBlockReason({ ...paid, shipment: ship("CREATE_FAILED", { needsReconcile: true }) })!, /Delhivery/);
});

test("every booking problem the server can record has a plain-language message", async () => {
  const { BOOKING_PROBLEMS } = await import("../lib/orders.ts");
  for (const code of ["PARCEL_DETAILS_MISSING", "MULTI_PARCEL_ORDER", "DELHIVERY_NOT_CONFIGURED", "BOOKED_FOR_INELIGIBLE_ORDER"]) assert.ok(BOOKING_PROBLEMS[code], code);
});

test("the list's shipping column: what each order shows and whether the button says Ship", async () => {
  const { shippingSummary } = await import("../lib/orders.ts");
  const base = { trackingNumber: null, shipment: null };
  assert.deepEqual(shippingSummary({ ...base, status: "CONFIRMED", paymentStatus: "PAID" }), { label: "Not shipped yet", tone: "amber", ship: true, action: true });
  assert.equal(shippingSummary({ ...base, status: "PENDING", paymentStatus: "UNPAID" }).action, false);
  assert.equal(shippingSummary({ ...base, status: "CANCELLED", paymentStatus: "UNPAID" }).action, false);
  assert.equal(shippingSummary({ ...base, status: "SHIPPED", paymentStatus: "PAID", trackingNumber: "ABC123" }).label, "Shipped by hand");
  const queued = shippingSummary({ status: "CONFIRMED", paymentStatus: "PAID", trackingNumber: null, shipment: { status: "QUEUED", waybill: null, needsReconcile: false } as never });
  assert.deepEqual([queued.label, queued.ship], ["Booking queued", true]);
  const booked = shippingSummary({ status: "PROCESSING", paymentStatus: "PAID", trackingNumber: "9300", shipment: { status: "MANIFESTED", waybill: "9300", needsReconcile: false } as never });
  assert.deepEqual([booked.label, booked.ship], ["Booked, awaiting pickup", false]);
});
