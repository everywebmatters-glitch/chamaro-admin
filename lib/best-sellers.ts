// Pure helpers for the "Best Sellers" form (type-only imports, unit-tested with `node --test`).
// The picks are stored as the published CMS page BEST_SELLERS_PAGE_SLUG with one section of type BEST_SELLERS_SECTION_TYPE
// whose content is { slugs: string[] } in display order; the storefront shows only those products.
import type { ApiCmsPage, CmsPageInput } from "@/lib/api/cms-pages";

export const BEST_SELLERS_PAGE_SLUG = "home-best-sellers";
export const BEST_SELLERS_PAGE_TITLE = "Home page: best sellers";
export const BEST_SELLERS_SECTION_TYPE = "best-sellers";
export const MAX_BEST_SELLERS = 8;

export function fromPage(page: ApiCmsPage | null): string[] {
  const section = page?.sections?.find((item) => item.type === BEST_SELLERS_SECTION_TYPE);
  const slugs = section?.content?.slugs;
  if (!Array.isArray(slugs)) return [];
  return [...new Set(slugs.filter((slug): slug is string => typeof slug === "string" && slug !== ""))].slice(0, MAX_BEST_SELLERS);
}

// PUT/POST body: replaces the page's sections with the one section.
export function toPageInput(slugs: string[]): CmsPageInput {
  return {
    title: BEST_SELLERS_PAGE_TITLE,
    slug: BEST_SELLERS_PAGE_SLUG,
    sections: [{ type: BEST_SELLERS_SECTION_TYPE, position: 0, content: { slugs } }],
  };
}
