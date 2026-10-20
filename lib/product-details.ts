// The product page's Additional Information box: a fixed set of labels the admin fills in, plus any
// extra rows they add. Pure, so `node --test` can load it.

// Shown on every product form, in this order; rows left without a value aren't saved.
export const PRESET_DETAIL_LABELS = [
  "Product Type",
  "Assembly",
  "Material",
  "Dimensions",
  "Seat Height",
  "Weight Capacity",
  "Product Weight",
  "Country of Origin",
];

export interface DetailRow {
  label: string;
  value: string;
}

// The saved rows, with every preset label the product doesn't have yet added (empty) after them.
export function withPresetDetails(saved: DetailRow[]): DetailRow[] {
  const have = new Set(saved.map((row) => row.label.trim().toLowerCase()));
  return [...saved, ...PRESET_DETAIL_LABELS.filter((label) => !have.has(label.toLowerCase())).map((label) => ({ label, value: "" }))];
}

// Rows to save: trimmed, without the ones that have no value. Returns an error for a value without a label.
export function detailsToSave(rows: DetailRow[]): { rows: DetailRow[]; error?: string } {
  const trimmed = rows.map((row) => ({ label: row.label.trim(), value: row.value.trim() }));
  if (trimmed.some((row) => row.value && !row.label)) return { rows: [], error: "Each detail with a value needs a label." };
  return { rows: trimmed.filter((row) => row.value) };
}
