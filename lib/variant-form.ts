// Colour variants: how the product form reads and writes a variant's `options` JSON.
// Type-only imports, so `node --test` can load this file directly.
//
// The storefront (webapp/app/lib/product-variants.ts) reads the same keys:
//   Color      colour name shown as a swatch, e.g. "Beige"
//   ColorHex   the swatch shade, e.g. "#c8a97e"
//   images     media ids of the variant's own photos. They are also sent as product images,
//              which keeps the API from deleting their files; the storefront shows them only
//              for this variant.
//   any other  extra options such as Size, shown as pills
import type { ApiProductImage } from "@/lib/api/products";

export const COLOUR_KEY = "Color";
export const HEX_KEY = "ColorHex";
export const IMAGES_KEY = "images";

const COLOUR_KEYS = /^colou?r$/i;
const HEX_KEYS = /^colou?r ?hex$/i;
const HEX = /^#[0-9a-f]{6}$/i;

// Default swatch shades for common names (same table as the storefront).
const NAMED_SHADES: Record<string, string> = {
  beige: "#c8a97e", black: "#111111", blue: "#3b5b92", "light blue": "#a7bcd6", "sky blue": "#a7bcd6",
  navy: "#1f2a44", "navy blue": "#1f2a44", brown: "#5d3f2b", "dark brown": "#3e2a1e", tan: "#b5774a",
  camel: "#b98b5e", cream: "#efe6d2", "off white": "#f2efe8", white: "#ffffff", grey: "#8a8a8a",
  gray: "#8a8a8a", "light grey": "#c9c9c9", "light gray": "#c9c9c9", "dark grey": "#4a4a4a",
  "dark gray": "#4a4a4a", charcoal: "#36383b", red: "#b3261e", maroon: "#6d1f2a", burgundy: "#6d1f2a",
  green: "#3d6b4a", olive: "#6b6b3a", orange: "#d9772b", yellow: "#e2b93b", pink: "#e6a6b5", purple: "#6a4c93",
};

// The shade a colour name gets when the admin hasn't picked one ("" when the name is unknown).
export function suggestedShade(colour: string): string {
  return NAMED_SHADES[colour.trim().toLowerCase()] ?? "";
}

export interface VariantFields {
  colour: string;
  // "#rrggbb", or "" for the storefront's default shade
  hex: string;
  // Extra options as "Size: L, Finish: Matte"
  other: string;
  imageIds: string[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

export function imageIdsOf(options: Record<string, unknown> | null | undefined): string[] {
  const list = options?.[IMAGES_KEY];
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

// options JSON → the form's fields. A variant saved before colours existed keeps its name as the colour.
export function fromVariantOptions(options: Record<string, unknown>, name: string): VariantFields {
  const entries = Object.entries(options ?? {});
  const colourEntry = entries.find(([key]) => COLOUR_KEYS.test(key));
  const hexEntry = entries.find(([key]) => HEX_KEYS.test(key));
  const hex = text(hexEntry?.[1]);
  const other = entries
    .filter(([key, value]) => key !== IMAGES_KEY && !COLOUR_KEYS.test(key) && !HEX_KEYS.test(key) && text(value))
    .map(([key, value]) => `${key}: ${text(value)}`)
    .join(", ");
  return {
    colour: colourEntry ? text(colourEntry[1]) : name,
    hex: HEX.test(hex) ? hex.toLowerCase() : "",
    other,
    imageIds: imageIdsOf(options),
  };
}

// "Size: L, Finish: Matte" → { Size: "L", Finish: "Matte" }; null when a part isn't Name: Value.
export function parseOtherOptions(textValue: string): Record<string, string> | null {
  const options: Record<string, string> = {};
  for (const part of textValue.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [key, ...rest] = part.split(":");
    const value = rest.join(":").trim();
    if (!key.trim() || !value) return null;
    if (COLOUR_KEYS.test(key.trim()) || HEX_KEYS.test(key.trim()) || key.trim() === IMAGES_KEY) return null;
    options[key.trim()] = value;
  }
  return options;
}

// Form fields → options JSON. Returns null when the extra options can't be read.
export function toVariantOptions(fields: VariantFields): Record<string, string | string[]> | null {
  const other = parseOtherOptions(fields.other);
  if (!other) return null;
  const hex = fields.hex || suggestedShade(fields.colour);
  return {
    [COLOUR_KEY]: fields.colour.trim(),
    ...(hex ? { [HEX_KEY]: hex.toLowerCase() } : {}),
    ...other,
    ...(fields.imageIds.length ? { [IMAGES_KEY]: fields.imageIds } : {}),
  };
}

// The variant's display name: its colour, then any extra option values ("Beige / L").
export function variantName(fields: Pick<VariantFields, "colour" | "other">): string {
  const other = parseOtherOptions(fields.other) ?? {};
  return [fields.colour.trim(), ...Object.values(other)].filter(Boolean).join(" / ");
}

// Product images split into the main gallery and each variant's own photos (by variant index).
export function splitImages<T extends Pick<ApiProductImage, "mediaId">>(
  images: T[],
  variants: { options: Record<string, unknown> }[]
): { main: T[]; byVariant: T[][] } {
  const owner = new Map<string, number>();
  variants.forEach((variant, index) => {
    for (const id of imageIdsOf(variant.options)) if (!owner.has(id)) owner.set(id, index);
  });
  const byVariant: T[][] = variants.map(() => []);
  const main: T[] = [];
  for (const image of images) {
    const index = image.mediaId ? owner.get(image.mediaId) : undefined;
    if (index === undefined) main.push(image);
    else byVariant[index].push(image);
  }
  // Keep each variant's photos in the order its options list them.
  byVariant.forEach((list, index) => {
    const order = imageIdsOf(variants[index].options);
    list.sort((a, b) => order.indexOf(a.mediaId!) - order.indexOf(b.mediaId!));
  });
  return { main, byVariant };
}
