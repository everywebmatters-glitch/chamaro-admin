import test from "node:test";
import assert from "node:assert/strict";
import {
  B2B_HERO_SECTION_TYPE,
  B2B_PAGE_SLUG,
  DEFAULT_B2B_HERO_VALUES,
  fromB2bPage,
  toB2bPageInput,
  validateB2bHero,
} from "../lib/b2b-hero.ts";

test("missing hero section uses the built-in B2B content", () => {
  assert.deepEqual(fromB2bPage(null), DEFAULT_B2B_HERO_VALUES);
  assert.deepEqual(
    fromB2bPage({
      id: "p1",
      title: "B2B",
      slug: B2B_PAGE_SLUG,
      status: "PUBLISHED",
      seoTitle: null,
      seoDescription: null,
      publishedAt: null,
      unpublishedAt: null,
      createdAt: "",
      updatedAt: "",
      sections: [],
    }),
    DEFAULT_B2B_HERO_VALUES,
  );
});

test("page input preserves other CMS sections and replaces the B2B hero", () => {
  const input = toB2bPageInput(
    { ...DEFAULT_B2B_HERO_VALUES, title: "Team seating", imageUrl: "https://cdn.example.com/hero.webp" },
    {
      id: "p1",
      title: "B2B",
      slug: B2B_PAGE_SLUG,
      status: "PUBLISHED",
      seoTitle: null,
      seoDescription: null,
      publishedAt: null,
      unpublishedAt: null,
      createdAt: "",
      updatedAt: "",
      sections: [
        { id: "s1", type: "faq", content: { title: "FAQ" }, position: 0 },
        { id: "s2", type: B2B_HERO_SECTION_TYPE, content: { title: "Old" }, position: 1 },
      ],
    },
  );

  assert.equal(input.slug, B2B_PAGE_SLUG);
  assert.deepEqual(input.sections, [
    { type: "faq", content: { title: "FAQ" }, position: 0 },
    {
      type: B2B_HERO_SECTION_TYPE,
      content: {
        ...DEFAULT_B2B_HERO_VALUES,
        title: "Team seating",
        imageUrl: "https://cdn.example.com/hero.webp",
      },
      position: 1,
    },
  ]);
});

test("hero validation rejects unsafe links and overlong fields", () => {
  assert.deepEqual(validateB2bHero(DEFAULT_B2B_HERO_VALUES), {});
  assert.equal(validateB2bHero({ ...DEFAULT_B2B_HERO_VALUES, buttonUrl: "javascript:alert(1)" }).buttonUrl, "Use a site path, #section anchor, or http(s) address.");
  assert.equal(validateB2bHero({ ...DEFAULT_B2B_HERO_VALUES, title: "x".repeat(192) }).title, "Use 191 characters or fewer.");
});
