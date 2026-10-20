// Pure helpers for the "Category display" form (type-only imports, unit-tested with `node --test`).
// Stored as the published CMS page CATEGORY_DISPLAY_PAGE_SLUG with one section of type CATEGORY_DISPLAY_SECTION_TYPE
// whose content is { items: [{ slug, iconUrl }] } in display order; the storefront reads it for the category
// menus and the home page strip. Categories not listed keep the API's order after the listed ones.
import type { ApiCmsPage, CmsPageInput } from "@/lib/api/cms-pages";

export const CATEGORY_DISPLAY_PAGE_SLUG = "category-display";
export const CATEGORY_DISPLAY_PAGE_TITLE = "Storefront: category order and icons";
export const CATEGORY_DISPLAY_SECTION_TYPE = "category-display";

export interface CategoryDisplayValue {
  slug: string;
  iconUrl: string; // "" = the storefront's built-in icon
}

const asText = (value: unknown) => (typeof value === "string" ? value : "");

export function fromPage(page: ApiCmsPage | null): CategoryDisplayValue[] {
  const section = page?.sections?.find((item) => item.type === CATEGORY_DISPLAY_SECTION_TYPE);
  const items = section?.content?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry): CategoryDisplayValue[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    return asText(item.slug) ? [{ slug: asText(item.slug), iconUrl: asText(item.iconUrl) }] : [];
  });
}

// The saved order first (dropping categories that no longer exist), then any new categories in API order.
export function mergeWithCategories<T extends { slug: string }>(saved: CategoryDisplayValue[], categories: T[]): { category: T; iconUrl: string }[] {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const listed = saved.flatMap((item) => {
    const category = bySlug.get(item.slug);
    return category ? [{ category, iconUrl: item.iconUrl }] : [];
  });
  const listedSlugs = new Set(listed.map((row) => row.category.slug));
  return [...listed, ...categories.filter((category) => !listedSlugs.has(category.slug)).map((category) => ({ category, iconUrl: "" }))];
}

// PUT/POST body: replaces the page's sections with the one section.
export function toPageInput(rows: { slug: string; iconUrl: string }[]): CmsPageInput {
  return {
    title: CATEGORY_DISPLAY_PAGE_TITLE,
    slug: CATEGORY_DISPLAY_PAGE_SLUG,
    sections: [
      {
        type: CATEGORY_DISPLAY_SECTION_TYPE,
        position: 0,
        content: { items: rows.map((row) => ({ slug: row.slug, iconUrl: row.iconUrl })) },
      },
    ],
  };
}
