import test from "node:test";
import assert from "node:assert/strict";
import { detailsToSave, PRESET_DETAIL_LABELS, withPresetDetails } from "../lib/product-details.ts";

test("preset labels are added after the saved rows, without duplicating them", () => {
  const rows = withPresetDetails([{ label: "product type", value: "Boss chair" }, { label: "Colour", value: "Tan" }]);
  assert.deepEqual(rows.slice(0, 2), [{ label: "product type", value: "Boss chair" }, { label: "Colour", value: "Tan" }]);
  assert.equal(rows.length, 2 + PRESET_DETAIL_LABELS.length - 1);
  assert.ok(!rows.slice(2).some((row) => row.label === "Product Type"));
  assert.ok(rows.slice(2).every((row) => row.value === ""));
});

test("rows without a value are not saved; a value needs a label", () => {
  assert.deepEqual(detailsToSave([{ label: " Assembly ", value: " Required " }, { label: "Material", value: "" }]), {
    rows: [{ label: "Assembly", value: "Required" }],
  });
  assert.equal(detailsToSave([{ label: "", value: "45 cm" }]).error, "Each detail with a value needs a label.");
});
