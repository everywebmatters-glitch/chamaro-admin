import test from "node:test";
import assert from "node:assert/strict";
import { duplicateProductInput } from "../lib/product-duplicate.ts";

const product = {
  id: "p1", name: "Aero Chair", slug: "aero-chair", description: "Nice", features: ["a"], materials: null, specifications: [{ label: "W", value: "1" }],
  returnPolicy: null, warranty: "1 year", price: "249.99", compareAtPrice: "299.00", sku: "AERO", status: "ACTIVE", categoryId: "c1",
  createdAt: "", updatedAt: "", category: { id: "c1", name: "Chairs", slug: "chairs" },
  images: [{ id: "i1", mediaId: "m1", url: "/x", altText: "front", position: 0, isPrimary: true }, { id: "i2", mediaId: null, url: "https://old", altText: null, position: 1, isPrimary: false }],
  variants: [{ id: "v1", name: "Black", sku: "AERO-BLK", price: null, options: { Colour: "Black" }, status: "ACTIVE" }],
  inventory: { id: "n1", quantity: 7, reservedQuantity: 2 },
} as const;

test("a copy is a draft with unique name, slug and variant SKUs and no product SKU", () => {
  const copy = duplicateProductInput(product as never);
  assert.equal(copy.name, "Aero Chair (Copy)");
  assert.equal(copy.slug, "aero-chair-copy");
  assert.equal(copy.status, "DRAFT");
  assert.equal(copy.sku, undefined);
  assert.equal(copy.price, 249.99);
  assert.equal(copy.compareAtPrice, 299);
  assert.equal(copy.quantity, 7);
  assert.deepEqual(copy.variants, [{ name: "Black", sku: "AERO-BLK-COPY", options: { Colour: "Black" }, status: "ACTIVE" }]);
  assert.deepEqual(copy.images, [{ mediaId: "m1", position: 0, isPrimary: true, altText: "front" }]);
  assert.equal("materials" in copy, false);
  assert.equal("returnPolicy" in copy, false);
});

test("later attempts count up", () => {
  const copy = duplicateProductInput(product as never, 3);
  assert.equal(copy.name, "Aero Chair (Copy 3)");
  assert.equal(copy.slug, "aero-chair-copy-3");
  assert.equal(copy.variants![0].sku, "AERO-BLK-COPY-3");
});
