import test from "node:test";
import assert from "node:assert/strict";
import { infoBoxesToSave, readInfoBoxes, validateInfo } from "../lib/product-info.ts";

const empty = { title: "", text: "" };

test("boxes are read from whatever the API returned", () => {
  assert.deepEqual(readInfoBoxes(null), [empty, empty]);
  assert.deepEqual(readInfoBoxes("nope"), [empty, empty]);
  assert.deepEqual(readInfoBoxes([{ title: "Shipping", text: "3 days" }]), [{ title: "Shipping", text: "3 days" }, empty]);
  assert.deepEqual(readInfoBoxes([null, { title: 5, text: "x" }]), [empty, { title: "", text: "x" }]);
});

test("two empty boxes save nothing; otherwise both are saved, trimmed, in order", () => {
  assert.deepEqual(infoBoxesToSave([empty, { title: " ", text: " " }]), []);
  assert.deepEqual(infoBoxesToSave([{ title: " Shipping ", text: " Free " }, empty]), [{ title: "Shipping", text: "Free" }, empty]);
});

test("length limits", () => {
  assert.deepEqual(validateInfo("ok", [empty, empty]), {});
  assert.ok(validateInfo("x".repeat(501), [empty, empty]).shortDescription);
  assert.ok(validateInfo("", [{ title: "x".repeat(61), text: "" }, empty]).infoBoxes);
  assert.ok(validateInfo("", [empty, { title: "", text: "x".repeat(1001) }]).infoBoxes);
});
