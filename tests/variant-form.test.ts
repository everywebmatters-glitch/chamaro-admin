import test from "node:test";
import assert from "node:assert/strict";
import {
  fromVariantOptions,
  parseOtherOptions,
  moveItem,
  productTotals,
  sortByPosition,
  splitImages,
  suggestedShade,
  toVariantOptions,
  variantName,
} from "../lib/variant-form.ts";

test("options round-trip through the form fields", () => {
  const options = { Color: "Beige", ColorHex: "#C8A97E", Size: "L", images: ["m1", "m2"] };
  const fields = fromVariantOptions(options, "Beige / L");
  assert.deepEqual(fields, { colour: "Beige", hex: "#c8a97e", other: "Size: L", imageIds: ["m1", "m2"] });
  assert.deepEqual(toVariantOptions(fields), { Color: "Beige", ColorHex: "#c8a97e", Size: "L", images: ["m1", "m2"] });
});

test("legacy variants without a colour keep their name as the colour", () => {
  assert.deepEqual(fromVariantOptions({}, "Standard"), { colour: "Standard", hex: "", other: "", imageIds: [] });
  assert.deepEqual(fromVariantOptions({ Colour: "Black", Size: "M" }, "x"), { colour: "Black", hex: "", other: "Size: M", imageIds: [] });
});

test("a known colour name gets its shade when none was picked", () => {
  assert.equal(suggestedShade(" Light Blue "), "#a7bcd6");
  assert.equal(suggestedShade("Sunset"), "");
  assert.deepEqual(toVariantOptions({ colour: "Black", hex: "", other: "", imageIds: [] }), { Color: "Black", ColorHex: "#111111" });
  assert.deepEqual(toVariantOptions({ colour: "Sunset", hex: "", other: "", imageIds: [] }), { Color: "Sunset" });
});

test("extra options must be Name: Value and can't reuse the reserved keys", () => {
  assert.deepEqual(parseOtherOptions("Size: L, Finish: Matte"), { Size: "L", Finish: "Matte" });
  assert.equal(parseOtherOptions("Size L"), null);
  assert.equal(parseOtherOptions("Colour: Red"), null);
  assert.equal(parseOtherOptions("images: x"), null);
  assert.equal(toVariantOptions({ colour: "Black", hex: "", other: "oops", imageIds: [] }), null);
});

test("variant name is the colour plus extra option values", () => {
  assert.equal(variantName({ colour: "Beige", other: "" }), "Beige");
  assert.equal(variantName({ colour: "Beige", other: "Size: L" }), "Beige / L");
});

test("compare-at price and stock round-trip and are never extra options", () => {
  const fields = fromVariantOptions({ Color: "Beige", compareAtPrice: 9999, stock: "12" }, "Beige");
  assert.equal(fields.compareAtPrice, 9999);
  assert.equal(fields.stock, 12);
  assert.equal(fields.other, "");
  assert.deepEqual(toVariantOptions({ ...fields, imageIds: [] }), { Color: "Beige", ColorHex: "#c8a97e", compareAtPrice: 9999, stock: 12 });
  assert.equal(parseOtherOptions("stock: 3"), null);
});

test("productTotals: first active attribute's prices, total stock of active attributes", () => {
  assert.deepEqual(
    productTotals([
      { status: "DRAFT", price: 5000, stock: 9 },
      { status: "ACTIVE", price: 7499, compareAtPrice: 9999, stock: 4 },
      { status: "ACTIVE", price: 7000, stock: 6 },
    ]),
    { price: 7499, compareAtPrice: 9999, quantity: 10 }
  );
  assert.deepEqual(productTotals([{ status: "DRAFT", price: 5000, stock: 3 }]), { price: 5000, compareAtPrice: undefined, quantity: 0 });
});

test("position is saved, never an extra option, and drives the order", () => {
  assert.deepEqual(toVariantOptions({ colour: "Sunset", hex: "", other: "", imageIds: [], position: 2 }), { Color: "Sunset", position: 2 });
  assert.equal(parseOtherOptions("position: 1"), null);
  assert.equal(fromVariantOptions({ Color: "Black", position: 1 }, "Black").other, "");
  const sorted = sortByPosition([
    { id: "a", options: { position: 2 } },
    { id: "b", options: {} },
    { id: "c", options: { position: 0 } },
    { id: "d", options: { position: 1 } },
  ]);
  assert.deepEqual(sorted.map((v) => v.id), ["c", "d", "a", "b"]);
});

test("moveItem moves one item and leaves the rest in order", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b"], 1, 1), ["a", "b"]);
  assert.deepEqual(moveItem(["a", "b"], 0, 9), ["b", "a"]);
});

test("splitImages separates the main gallery from each variant's photos, in the variant's order", () => {
  const images = [{ mediaId: "a" }, { mediaId: "v2" }, { mediaId: "v1" }, { mediaId: null }, { mediaId: "w1" }];
  const { main, byVariant } = splitImages(images, [{ options: { images: ["v1", "v2"] } }, { options: { images: ["w1", "gone"] } }, { options: {} }]);
  assert.deepEqual(main.map((i) => i.mediaId), ["a", null]);
  assert.deepEqual(byVariant.map((list) => list.map((i) => i.mediaId)), [["v1", "v2"], ["w1"], []]);
});
