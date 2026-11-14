import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { productEditHref } from "../lib/product-links.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("productEditHref builds the canonical trailing-slash edit URL", () => {
  assert.equal(productEditHref("cmvj6qbsm003d01s6l1jxjddu"), "/products/cmvj6qbsm003d01s6l1jxjddu/edit/");
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

// Regression: <Link> (or router.push) to /products/:id/edit made Next.js request
// /products/:id/edit/__next._tree.txt and index.txt, which don't exist for real ids in the static export (404).
test("no client-side router navigation to product edit pages", () => {
  const patterns = [
    /<Link\b[^>]*\bhref=\{\s*`\/products\/\$\{[^}]+\}\/edit/,
    /<Link\b[^>]*\bhref=\{\s*productEditHref\(/,
    /router\.(push|replace|prefetch)\(\s*`\/products\/\$\{[^}]+\}\/edit/,
    /router\.(push|replace|prefetch)\(\s*productEditHref\(/,
  ];
  const offenders = ["app", "components"]
    .flatMap((dir) => sourceFiles(join(ROOT, dir)))
    .filter((file) => patterns.some((pattern) => pattern.test(readFileSync(file, "utf8"))))
    .map((file) => relative(ROOT, file));
  assert.deepEqual(offenders, []);
});
