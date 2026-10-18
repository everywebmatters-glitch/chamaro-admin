// Pure helpers for the CMS page form (type-only imports, unit-tested with `node --test`).
import type { ApiCmsPage, CmsPageInput } from "@/lib/api/cms-pages";

export interface SectionFormValues {
  type: string;
  // The section's content as JSON text (an object); the API stores it as-is.
  content: string;
}

export interface PageFormValues {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  sections: SectionFormValues[];
}

export const EMPTY_PAGE: PageFormValues = { title: "", slug: "", seoTitle: "", seoDescription: "", sections: [] };
export const NEW_SECTION: SectionFormValues = { type: "text", content: '{\n  "title": "",\n  "body": ""\n}' };

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

export function fromPage(page: ApiCmsPage): PageFormValues {
  return {
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    sections: [...(page.sections ?? [])].sort((a, b) => a.position - b.position).map((section) => ({ type: section.type, content: JSON.stringify(section.content, null, 2) })),
  };
}

// Returns the parsed object, or an error message for the section editor.
export function parseSectionContent(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "Content must be valid JSON." };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, error: "Content must be a JSON object, like { \"body\": \"...\" }." };
  return { ok: true, value: value as Record<string, unknown> };
}

export interface PageErrors {
  title?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: (string | undefined)[];
}

export function validatePage(values: PageFormValues): PageErrors {
  const errors: PageErrors = { sections: values.sections.map(() => undefined) };
  if (!values.title.trim()) errors.title = "Enter a title.";
  else if (values.title.trim().length > 191) errors.title = "Use 191 characters or fewer.";
  if (!values.slug.trim()) errors.slug = "Enter a slug.";
  else if (!SLUG_PATTERN.test(values.slug.trim()) || values.slug.trim().length > 191) errors.slug = "Use lowercase letters, numbers and single hyphens, like shipping-policy.";
  if (values.seoTitle.length > 191) errors.seoTitle = "Use 191 characters or fewer.";
  if (values.seoDescription.length > 500) errors.seoDescription = "Use 500 characters or fewer.";
  values.sections.forEach((section, index) => {
    if (!section.type.trim()) errors.sections[index] = "Enter a section type.";
    else if (section.type.trim().length > 100) errors.sections[index] = "The type must be 100 characters or fewer.";
    else {
      const parsed = parseSectionContent(section.content);
      if (!parsed.ok) errors.sections[index] = parsed.error;
    }
  });
  return errors;
}

export function hasErrors(errors: PageErrors): boolean {
  return Boolean(errors.title || errors.slug || errors.seoTitle || errors.seoDescription || errors.sections.some(Boolean));
}

// Optional text is sent only when filled in (the API accepts values, it cannot blank a stored one with null).
export function toPageInput(values: PageFormValues): CmsPageInput {
  const seoTitle = values.seoTitle.trim();
  const seoDescription = values.seoDescription.trim();
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    sections: values.sections.map((section, position) => {
      const parsed = parseSectionContent(section.content);
      if (!parsed.ok) throw new Error(parsed.error);
      return { type: section.type.trim(), content: parsed.value, position };
    }),
  };
}
