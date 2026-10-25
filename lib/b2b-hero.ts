import type { ApiCmsPage, CmsPageInput } from "@/lib/api/cms-pages";

export const B2B_PAGE_SLUG = "b2b";
export const B2B_HERO_SECTION_TYPE = "b2b-hero";

export interface B2bHeroValues {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface B2bHeroErrors {
  eyebrow?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

export const DEFAULT_B2B_HERO_VALUES: B2bHeroValues = {
  eyebrow: "Chamaro for Business",
  title: "Seating for teams of every size",
  description:
    "Furnishing a new office, a co-working floor or a café? Order in bulk with volume pricing, GST invoices and one team handling everything from quote to delivery.",
  imageUrl: "",
  imageAlt: "Ergonomic office chair",
  buttonLabel: "Request a quote",
  buttonUrl: "#quote",
};

function value(content: Record<string, unknown>, key: keyof B2bHeroValues, fallback: string): string {
  const raw = content[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

export function fromB2bPage(page: ApiCmsPage | null): B2bHeroValues {
  const content = page?.sections?.find((section) => section.type === B2B_HERO_SECTION_TYPE)?.content;
  if (!content) return DEFAULT_B2B_HERO_VALUES;
  return {
    eyebrow: value(content, "eyebrow", DEFAULT_B2B_HERO_VALUES.eyebrow),
    title: value(content, "title", DEFAULT_B2B_HERO_VALUES.title),
    description: value(content, "description", DEFAULT_B2B_HERO_VALUES.description),
    imageUrl: value(content, "imageUrl", DEFAULT_B2B_HERO_VALUES.imageUrl),
    imageAlt: value(content, "imageAlt", DEFAULT_B2B_HERO_VALUES.imageAlt),
    buttonLabel: value(content, "buttonLabel", DEFAULT_B2B_HERO_VALUES.buttonLabel),
    buttonUrl: value(content, "buttonUrl", DEFAULT_B2B_HERO_VALUES.buttonUrl),
  };
}

export function validateB2bHero(values: B2bHeroValues): B2bHeroErrors {
  const errors: B2bHeroErrors = {};
  if (!values.eyebrow.trim()) errors.eyebrow = "Enter an eyebrow.";
  else if (values.eyebrow.trim().length > 120) errors.eyebrow = "Use 120 characters or fewer.";
  if (!values.title.trim()) errors.title = "Enter a heading.";
  else if (values.title.trim().length > 191) errors.title = "Use 191 characters or fewer.";
  if (!values.description.trim()) errors.description = "Enter a description.";
  else if (values.description.trim().length > 1000) errors.description = "Use 1,000 characters or fewer.";
  if (values.imageUrl.length > 2048) errors.imageUrl = "Use 2,048 characters or fewer.";
  if (values.imageAlt.length > 500) errors.imageAlt = "Use 500 characters or fewer.";
  if (!values.buttonLabel.trim()) errors.buttonLabel = "Enter button text.";
  else if (values.buttonLabel.trim().length > 60) errors.buttonLabel = "Use 60 characters or fewer.";
  if (!values.buttonUrl.trim()) errors.buttonUrl = "Enter a button link.";
  else if (!isSafeLink(values.buttonUrl.trim())) errors.buttonUrl = "Use a site path, #section anchor, or http(s) address.";
  return errors;
}

function isSafeLink(raw: string): boolean {
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return true;
  if (/^#[a-zA-Z][\w:-]*$/.test(raw)) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function toB2bPageInput(values: B2bHeroValues, page: ApiCmsPage | null): CmsPageInput {
  const sections = (page?.sections ?? [])
    .filter((section) => section.type !== B2B_HERO_SECTION_TYPE)
    .map((section) => ({ type: section.type, content: section.content }));
  sections.push({
    type: B2B_HERO_SECTION_TYPE,
    content: {
      eyebrow: values.eyebrow.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
      imageUrl: values.imageUrl.trim(),
      imageAlt: values.imageAlt.trim(),
      buttonLabel: values.buttonLabel.trim(),
      buttonUrl: values.buttonUrl.trim(),
    },
  });

  return {
    title: page?.title || "B2B Page",
    slug: B2B_PAGE_SLUG,
    ...(page?.seoTitle ? { seoTitle: page.seoTitle } : {}),
    ...(page?.seoDescription ? { seoDescription: page.seoDescription } : {}),
    sections: sections.map((section, position) => ({ ...section, position })),
  };
}
