import test from "node:test";
import assert from "node:assert/strict";
import { parcelToText, parseParcel } from "../lib/parcel-form.ts";

test("a complete parcel is stored in grams and whole centimetres; all empty clears it", () => {
  assert.deepEqual(parseParcel({ weightKg: "12.5", lengthCm: "70", widthCm: "60", heightCm: "100" }), { values: { weightGrams: 12500, lengthCm: 70, widthCm: 60, heightCm: 100 } });
  assert.deepEqual(parseParcel({ weightKg: " ", lengthCm: "", widthCm: "", heightCm: "" }), { values: { weightGrams: null, lengthCm: null, widthCm: null, heightCm: null } });
  assert.deepEqual(parcelToText({ weightGrams: 12500, lengthCm: 70, widthCm: 60, heightCm: 100 }), { weightKg: "12.5", lengthCm: "70", widthCm: "60", heightCm: "100" });
  assert.deepEqual(parcelToText(undefined), { weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });
});

test("a partial or out-of-range parcel is refused, never completed with guesses", () => {
  for (const bad of [
    { weightKg: "12", lengthCm: "70", widthCm: "", heightCm: "100" },
    { weightKg: "0", lengthCm: "70", widthCm: "60", heightCm: "100" },
    { weightKg: "101", lengthCm: "70", widthCm: "60", heightCm: "100" },
    { weightKg: "12kg", lengthCm: "70", widthCm: "60", heightCm: "100" },
    { weightKg: "12", lengthCm: "70.5", widthCm: "60", heightCm: "100" },
    { weightKg: "12", lengthCm: "70", widthCm: "60", heightCm: "501" },
  ]) assert.ok("error" in parseParcel(bad), JSON.stringify(bad));
});
