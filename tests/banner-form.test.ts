import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BANNER, fromBanner, toBannerInput, toLocalInput, validateBanner } from "../lib/banner-form.ts";

const valid = { ...EMPTY_BANNER, title: "Autumn", imageUrl: "https://example.com/a.jpg" };

test("a minimal valid banner has no errors and sends only the filled fields", () => {
  assert.deepEqual(validateBanner(valid), {});
  assert.deepEqual(toBannerInput(valid), { title: "Autumn", subtitle: "", imageUrl: "https://example.com/a.jpg", status: "DRAFT", position: 0 });
});

test("title and image are required; addresses must be http(s)", () => {
  const errors = validateBanner({ ...EMPTY_BANNER, mobileImageUrl: "javascript:alert(1)", linkUrl: "/relative" });
  assert.ok(errors.title && errors.imageUrl && errors.mobileImageUrl && errors.linkUrl);
  assert.ok(validateBanner({ ...valid, imageUrl: "data:image/png;base64,AAAA" }).imageUrl);
  assert.ok(validateBanner({ ...valid, imageUrl: "https://" }).imageUrl);
});

test("position must be a whole number, 0 or more", () => {
  for (const bad of ["", "-1", "1.5", "abc"]) assert.ok(validateBanner({ ...valid, position: bad }).position, bad);
  assert.equal(validateBanner({ ...valid, position: "7" }).position, undefined);
});

test("the schedule end must be after the start; dates are sent as ISO strings", () => {
  assert.ok(validateBanner({ ...valid, startAt: "2026-10-20T10:00", endAt: "2026-10-20T09:00" }).endAt);
  assert.ok(validateBanner({ ...valid, startAt: "2026-10-20T10:00", endAt: "2026-10-20T10:00" }).endAt);
  const ok = { ...valid, startAt: "2026-10-20T10:00", endAt: "2026-10-21T10:00" };
  assert.deepEqual(validateBanner(ok), {});
  const input = toBannerInput(ok);
  assert.match(input.startAt!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(new Date(input.endAt!) > new Date(input.startAt!));
});

test("form values round-trip through a stored banner", () => {
  const stored = { id: "b", title: "T", subtitle: "Sub", imageUrl: "https://x/y.png", mobileImageUrl: null, linkUrl: "https://x/shop", altText: null, status: "ACTIVE", position: 3, pageId: null, publishedAt: null, startAt: "2026-10-20T04:30:00.000Z", endAt: null, createdAt: "", updatedAt: "" } as const;
  const values = fromBanner(stored);
  assert.equal(values.position, "3");
  assert.equal(values.subtitle, "Sub");
  assert.equal(values.mobileImageUrl, "");
  assert.equal(new Date(values.startAt).toISOString(), "2026-10-20T04:30:00.000Z");
  assert.equal(toLocalInput(null), "");
  assert.equal(toLocalInput("not a date"), "");
  assert.equal(toBannerInput(values).linkUrl, "https://x/shop");
});
