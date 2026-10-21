// The packed parcel for one unit of a product (no imports, unit-tested with `node --test`). Delhivery is booked with
// these values automatically after a verified payment for a one-unit order; without them an admin enters the parcel
// on the order instead. All four or none: a partial parcel can't be booked.

export type ParcelValues = { weightGrams: number | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null };
export type ParcelText = { weightKg: string; lengthCm: string; widthCm: string; heightCm: string };

const MAX_GRAMS = 100_000; // the API's limits (product.routes.ts)
const MAX_CM = 500;

// Weight is entered in kilograms (e.g. 12.5) and stored in grams.
export function parcelToText(values: Partial<ParcelValues> | null | undefined): ParcelText {
  const cm = (value: number | null | undefined) => (value ? String(value) : "");
  return {
    weightKg: values?.weightGrams ? String(values.weightGrams / 1000) : "",
    lengthCm: cm(values?.lengthCm),
    widthCm: cm(values?.widthCm),
    heightCm: cm(values?.heightCm),
  };
}

export function parseParcel(text: ParcelText): { values: ParcelValues } | { error: string } {
  const entries = [text.weightKg, text.lengthCm, text.widthCm, text.heightCm].map((value) => value.trim());
  if (entries.every((value) => value === "")) return { values: { weightGrams: null, lengthCm: null, widthCm: null, heightCm: null } };
  if (entries.some((value) => value === "")) return { error: "Enter the weight and all three sizes, or leave all four empty." };
  const [weight, length, width, height] = entries;
  if (!/^\d+(\.\d{1,3})?$/.test(weight)) return { error: "Enter the weight in kilograms, e.g. 12.5." };
  const weightGrams = Math.round(Number(weight) * 1000);
  if (weightGrams < 1 || weightGrams > MAX_GRAMS) return { error: `The weight must be more than 0 and at most ${MAX_GRAMS / 1000} kg.` };
  const sizes = [length, width, height];
  if (sizes.some((value) => !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > MAX_CM)) return { error: `Enter each size in whole centimetres, from 1 to ${MAX_CM}.` };
  return { values: { weightGrams, lengthCm: Number(length), widthCm: Number(width), heightCm: Number(height) } };
}
