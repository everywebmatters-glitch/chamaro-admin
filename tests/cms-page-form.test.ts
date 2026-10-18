import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PAGE, fromPage, hasErrors, NEW_SECTION, parseSectionContent, slugify, toPageInput, validatePage } from "../lib/cms-page-form.ts";

const valid = { ...EMPTY_PAGE, title: "Shipping policy", slug: "shipping-policy" };

test("slugify makes URL-safe slugs", () => {
  assert.equal(slugify("Shipping & Returns Policy!"), "shipping-returns-policy");
  assert.equal(slugify("  Café  Chairs  "), "cafe-chairs");
  assert.equal(slugify("---"), "");
  assert.equal(slugify("x".repeat(300)).length, 191);
});

test("title and slug are required; slugs must be lowercase words joined by single hyphens", () => {
  assert.ok(validatePage(EMPTY_PAGE).title && validatePage(EMPTY_PAGE).slug);
  for (const bad of ["Shipping", "shipping policy", "shipping--policy", "-shipping", "shipping-", "ship_ping", "ship/ping"]) {
    assert.ok(validatePage({ ...valid, slug: bad }).slug, bad);
  }
  assert.equal(hasErrors(validatePage(valid)), false);
  assert.equal(hasErrors(validatePage({ ...valid, slug: "a1-b2-c3" })), false);
});

test("limits on the SEO fields", () => {
  assert.ok(validatePage({ ...valid, seoTitle: "x".repeat(192) }).seoTitle);
  assert.ok(validatePage({ ...valid, seoDescription: "x".repeat(501) }).seoDescription);
  assert.equal(hasErrors(validatePage({ ...valid, seoTitle: "x".repeat(191), seoDescription: "x".repeat(500) })), false);
});

test("section content must be a JSON object and each section needs a type", () => {
  assert.deepEqual(parseSectionContent('{"body":"hi"}'), { ok: true, value: { body: "hi" } });
  for (const bad of ["", "{", "[1]", "null", '"text"', "12"]) assert.equal(parseSectionContent(bad).ok, false, bad);
  const errors = validatePage({ ...valid, sections: [NEW_SECTION, { type: "  ", content: "{}" }, { type: "text", content: "nope" }, { type: "t".repeat(101), content: "{}" }] });
  assert.deepEqual(errors.sections.map(Boolean), [false, true, true, true]);
  assert.equal(hasErrors(errors), true);
});

test("the request sends trimmed values, positions follow the order, and empty SEO fields are left out", () => {
  const input = toPageInput({ ...valid, title: "  Shipping policy ", seoTitle: "", seoDescription: " Delivery times ", sections: [{ type: " text ", content: '{"body":"a"}' }, { type: "faq", content: "{}" }] });
  assert.deepEqual(input, { title: "Shipping policy", slug: "shipping-policy", seoDescription: "Delivery times", sections: [{ type: "text", content: { body: "a" }, position: 0 }, { type: "faq", content: {}, position: 1 }] });
  assert.throws(() => toPageInput({ ...valid, sections: [{ type: "text", content: "{" }] }));
});

test("a stored page becomes form values with sections in order and pretty-printed content", () => {
  const values = fromPage({ id: "p", title: "T", slug: "t", status: "DRAFT", seoTitle: null, seoDescription: "d", publishedAt: null, unpublishedAt: null, createdAt: "", updatedAt: "", sections: [{ id: "b", type: "faq", content: { q: 1 }, position: 1 }, { id: "a", type: "text", content: { body: "x" }, position: 0 }] });
  assert.deepEqual(values.sections.map((section) => section.type), ["text", "faq"]);
  assert.equal(values.seoTitle, "");
  assert.equal(values.seoDescription, "d");
  assert.deepEqual(JSON.parse(values.sections[0].content), { body: "x" });
});
