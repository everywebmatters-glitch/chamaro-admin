/* =========================================================
   FLATTEN STATIC-EXPORT SEGMENT FILES
   On Windows, `next build` (output: "export") writes each page's
   prefetch segment files with backslash-joined names, which become
   nested folders: out/b2b/__next.b2b/__PAGE__.txt. The client router
   requests the flat name, out/b2b/__next.b2b.__PAGE__.txt, so Apache
   returns 404 for every client-side navigation. This renames them to
   the flat form. Builds on Linux/macOS already emit flat files, so
   there is nothing to do there.
========================================================= */

import { readdir, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out");
const SEGMENT_DIR_PREFIX = "__next.";

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
    })
  );
  return nested.flat();
}

async function flatten(directory) {
  let moved = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(directory, entry.name);

    if (!entry.name.startsWith(SEGMENT_DIR_PREFIX)) {
      moved += await flatten(fullPath);
      continue;
    }

    // __next.products/$d$slug/__PAGE__.txt → __next.products.$d$slug.__PAGE__.txt
    for (const file of await filesUnder(fullPath)) {
      const segments = path.relative(fullPath, file).split(path.sep);
      await rename(file, path.join(directory, [entry.name, ...segments].join(".")));
      moved++;
    }
    await rm(fullPath, { recursive: true });
  }
  return moved;
}

if (existsSync(OUT_DIR)) {
  const moved = await flatten(OUT_DIR);
  if (moved > 0) console.log(`Flattened ${moved} static-export segment file(s) in out/`);
}
