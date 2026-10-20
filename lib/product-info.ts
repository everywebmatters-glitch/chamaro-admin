// Pure helpers for the product page extras: the short line under the price and the two Delivery & Return boxes
// (unit-tested with `node --test`). The boxes are stored on the product as [{ title, text }], at most two; the
// storefront shows its own "Delivery" / "Returns" wording for any box left empty.

export const MAX_SHORT_DESCRIPTION = 500;
export const MAX_BOX_TITLE = 60;
export const MAX_BOX_TEXT = 1000;

export interface InfoBox {
  title: string;
  text: string;
}

// The two boxes as the form shows them, from whatever the API returned (null on older products).
export function readInfoBoxes(value: unknown): [InfoBox, InfoBox] {
  const list = Array.isArray(value) ? value : [];
  const at = (index: number): InfoBox => {
    const entry = list[index];
    if (!entry || typeof entry !== "object") return { title: "", text: "" };
    const item = entry as Record<string, unknown>;
    return { title: typeof item.title === "string" ? item.title : "", text: typeof item.text === "string" ? item.text : "" };
  };
  return [at(0), at(1)];
}

export interface InfoBoxProblems {
  shortDescription?: string;
  infoBoxes?: string;
}

export function validateInfo(shortDescription: string, boxes: [InfoBox, InfoBox]): InfoBoxProblems {
  const problems: InfoBoxProblems = {};
  if (shortDescription.trim().length > MAX_SHORT_DESCRIPTION) problems.shortDescription = `Use ${MAX_SHORT_DESCRIPTION} characters or fewer.`;
  if (boxes.some((box) => box.title.trim().length > MAX_BOX_TITLE)) problems.infoBoxes = `Box headings can have ${MAX_BOX_TITLE} characters or fewer.`;
  else if (boxes.some((box) => box.text.trim().length > MAX_BOX_TEXT)) problems.infoBoxes = `Box text can have ${MAX_BOX_TEXT} characters or fewer.`;
  return problems;
}

// Both boxes empty = nothing to store (the storefront's wording is shown); otherwise both are saved, in order.
export function infoBoxesToSave(boxes: [InfoBox, InfoBox]): InfoBox[] {
  const trimmed = boxes.map((box) => ({ title: box.title.trim(), text: box.text.trim() }));
  return trimmed.every((box) => !box.title && !box.text) ? [] : trimmed;
}
