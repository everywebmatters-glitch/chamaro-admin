// Pure helpers for the "Collection section" form (type-only imports, unit-tested with `node --test`).
// The section is stored as the published CMS page COLLECTION_PAGE_SLUG with one section of type COLLECTION_SECTION_TYPE;
// the storefront (app/lib/collection-feature.ts there) reads it and falls back to its built-in content for anything missing.
import type { ApiCmsPage, CmsPageInput } from "@/lib/api/cms-pages";

export const COLLECTION_PAGE_SLUG = "home-collection";
export const COLLECTION_PAGE_TITLE = "Home page: collection section";
export const COLLECTION_SECTION_TYPE = "collection-feature";
export const MAX_COLLECTION_IMAGES = 6;

export interface CollectionImageValue {
  url: string;
  alt: string;
}

export interface CollectionFormValues {
  heading: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  images: CollectionImageValue[];
}

// What the storefront shows until the admin saves something (its photos are built in, so the list starts empty).
export const DEFAULT_COLLECTION_VALUES: CollectionFormValues = {
  heading: "A Collection Made for Comfort",
  text: "Discover thoughtfully designed seating that brings together comfort, quality, and contemporary design across every Chamaro collection.",
  buttonLabel: "Explore Collection",
  buttonUrl: "/products",
  images: [],
};

export interface CollectionErrors {
  heading?: string;
  text?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  images?: string;
}

const asText = (value: unknown) => (typeof value === "string" ? value : "");

export function fromPage(page: ApiCmsPage | null): CollectionFormValues {
  const section = page?.sections?.find((item) => item.type === COLLECTION_SECTION_TYPE);
  if (!section) return DEFAULT_COLLECTION_VALUES;
  const c = section.content;
  const images = Array.isArray(c.images)
    ? c.images.flatMap((entry): CollectionImageValue[] => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Record<string, unknown>;
        return asText(item.url) ? [{ url: asText(item.url), alt: asText(item.alt) }] : [];
      })
    : [];
  return {
    heading: asText(c.heading) || DEFAULT_COLLECTION_VALUES.heading,
    text: asText(c.text) || DEFAULT_COLLECTION_VALUES.text,
    buttonLabel: asText(c.buttonLabel) || DEFAULT_COLLECTION_VALUES.buttonLabel,
    buttonUrl: asText(c.buttonUrl) || DEFAULT_COLLECTION_VALUES.buttonUrl,
    images,
  };
}

function isWebUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// A page of the store ("/products", "/products?c=chairs") or a web address.
export function isButtonLink(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\") && !/\s/.test(value);
  return isWebUrl(value);
}

export function validateCollection(values: CollectionFormValues): CollectionErrors {
  const errors: CollectionErrors = {};
  if (!values.heading.trim()) errors.heading = "Enter a heading.";
  else if (values.heading.trim().length > 191) errors.heading = "Use 191 characters or fewer.";
  if (!values.text.trim()) errors.text = "Enter a short description.";
  else if (values.text.trim().length > 1000) errors.text = "Use 1000 characters or fewer.";
  if (!values.buttonLabel.trim()) errors.buttonLabel = "Enter the button text.";
  else if (values.buttonLabel.trim().length > 60) errors.buttonLabel = "Use 60 characters or fewer.";
  if (!values.buttonUrl.trim()) errors.buttonUrl = "Enter where the button leads.";
  else if (!isButtonLink(values.buttonUrl.trim())) errors.buttonUrl = "Use a page of the store like /products, or an address starting with https://.";
  if (values.images.length > MAX_COLLECTION_IMAGES) errors.images = `Use ${MAX_COLLECTION_IMAGES} images or fewer.`;
  else if (values.images.some((image) => !isWebUrl(image.url.trim()))) errors.images = "Every image needs a web address starting with http:// or https://.";
  else if (values.images.some((image) => image.alt.length > 500)) errors.images = "Image descriptions can have 500 characters or fewer.";
  return errors;
}

export function hasErrors(errors: CollectionErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// PUT/POST body: replaces the page's sections with the one section.
export function toPageInput(values: CollectionFormValues): CmsPageInput {
  return {
    title: COLLECTION_PAGE_TITLE,
    slug: COLLECTION_PAGE_SLUG,
    sections: [
      {
        type: COLLECTION_SECTION_TYPE,
        position: 0,
        content: {
          heading: values.heading.trim(),
          text: values.text.trim(),
          buttonLabel: values.buttonLabel.trim(),
          buttonUrl: values.buttonUrl.trim(),
          images: values.images.map((image) => ({ url: image.url.trim(), alt: image.alt.trim() })),
        },
      },
    ],
  };
}
