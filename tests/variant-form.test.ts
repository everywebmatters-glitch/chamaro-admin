import test from "node:test";
import assert from "node:assert/strict";
import {
  fromVariantOptions,
  parseOtherOptions,
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

test("splitImages separates the main gallery from each variant's photos, in the variant's order", () => {
  const images = [{ mediaId: "a" }, { mediaId: "v2" }, { mediaId: "v1" }, { mediaId: null }, { mediaId: "w1" }];
  const { main, byVariant } = splitImages(images, [{ options: { images: ["v1", "v2"] } }, { options: { images: ["w1", "gone"] } }, { options: {} }]);
  assert.deepEqual(main.map((i) => i.mediaId), ["a", null]);
  assert.deepEqual(byVariant.map((list) => list.map((i) => i.mediaId)), [["v1", "v2"], ["w1"], []]);
});
