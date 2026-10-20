import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_COLLECTION_VALUES, fromPage, hasErrors, isButtonLink, toPageInput, validateCollection } from "../lib/collection-feature.ts";

const valid = { ...DEFAULT_COLLECTION_VALUES, images: [{ url: "https://api.example.com/api/v1/media/m1", alt: "Chair" }] };

test("the defaults are valid and a page with no section loads them", () => {
  assert.deepEqual(validateCollection(DEFAULT_COLLECTION_VALUES), {});
  assert.deepEqual(fromPage(null), DEFAULT_COLLECTION_VALUES);
  assert.deepEqual(fromPage({ sections: [{ id: "s", type: "other", content: {}, position: 0 }] } as never), DEFAULT_COLLECTION_VALUES);
});

test("heading, description, button text and link are required; limits are enforced", () => {
  const errors = validateCollection({ ...valid, heading: " ", text: "", buttonLabel: "", buttonUrl: "" });
  assert.ok(errors.heading && errors.text && errors.buttonLabel && errors.buttonUrl);
  assert.ok(validateCollection({ ...valid, heading: "x".repeat(192) }).heading);
  assert.ok(validateCollection({ ...valid, text: "x".repeat(1001) }).text);
  assert.ok(validateCollection({ ...valid, buttonLabel: "x".repeat(61) }).buttonLabel);
  assert.equal(hasErrors({}), false);
});

test("the button leads to a store page or a web address, nothing else", () => {
  for (const ok of ["/products", "/products?c=chairs", "https://shop.example.com/x"]) assert.equal(isButtonLink(ok), true, ok);
  for (const bad of ["javascript:alert(1)", "//evil.com", "/\\evil.com", "products", "/a b", "data:text/html,x", "https://"]) assert.equal(isButtonLink(bad), false, bad);
});

test("photos: at most six, each a web address", () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ url: `https://cdn.example.com/${i}.jpg`, alt: "" }));
  assert.ok(validateCollection({ ...valid, images: many }).images);
  assert.ok(validateCollection({ ...valid, images: [{ url: "/relative.jpg", alt: "" }] }).images);
  assert.ok(validateCollection({ ...valid, images: [{ url: "https://x.com/a.jpg", alt: "a".repeat(501) }] }).images);
  assert.equal(validateCollection({ ...valid, images: [] }).images, undefined);
});

test("values round-trip through the stored page", () => {
  const input = toPageInput({ ...valid, heading: " Autumn ", buttonUrl: " /products " });
  assert.equal(input.slug, "home-collection");
  assert.equal(input.sections?.[0].type, "collection-feature");
  assert.equal(input.sections?.[0].content.heading, "Autumn");
  const loaded = fromPage({ sections: [{ id: "s", ...input.sections![0] }] } as never);
  assert.equal(loaded.heading, "Autumn");
  assert.equal(loaded.buttonUrl, "/products");
  assert.deepEqual(loaded.images, valid.images);
});
