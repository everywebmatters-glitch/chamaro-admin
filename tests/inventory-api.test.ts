import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as nodeModule from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Regression: the inventory API paths once repeated the /api/v1 prefix that NEXT_PUBLIC_API_URL already ends in,
// so every call went to /api/v1/api/v1/... and got a 404. These tests import the real client and API module and check
// the exact URL handed to fetch.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://api.example.test/api/v1";

// node --test has no tsconfig path support: resolve the app's "@/..." imports to the TypeScript sources. Node's default
// type stripping rejects TypeScript-only syntax such as constructor parameter properties (ApiError), so the app's lib/
// sources are transformed instead of only stripped.
// (Node 22.15+/24 APIs; the project's @types/node 20 doesn't declare them.)
type Resolved = { url: string; format?: string | null; shortCircuit?: boolean };
type Loaded = { format: string; source?: string | ArrayBuffer | Uint8Array | null; shortCircuit?: boolean };
const { registerHooks, stripTypeScriptTypes } = nodeModule as unknown as {
  registerHooks(hooks: {
    resolve(specifier: string, context: object, nextResolve: (specifier: string, context: object) => Resolved): Resolved;
    load(url: string, context: object, nextLoad: (url: string, context: object) => Loaded): Loaded;
  }): void;
  stripTypeScriptTypes(code: string, options: { mode: "transform" }): string;
};
const LIB_URL = pathToFileURL(join(ROOT, "lib")).href + "/";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = join(ROOT, specifier.slice(2));
      return nextResolve(pathToFileURL(existsSync(file) ? file : `${file}.ts`).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(LIB_URL) && url.endsWith(".ts")) {
      const source = readFileSync(fileURLToPath(url), "utf8");
      return { format: "module", source: stripTypeScriptTypes(source, { mode: "transform" }), shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

// client.ts reads the base URL when it loads; a trailing slash is configured on purpose (the client strips it).
process.env.NEXT_PUBLIC_API_URL = `${BASE}/`;
const { getOrphanReleaseView, releaseOrphanedReservation } = await import("../lib/api/inventory.ts");
const { ApiError } = await import("../lib/api/client.ts");

type Call = { url: string; init: RequestInit };
function stubFetch(status: number, payload: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

function assertSinglePrefix(url: string) {
  assert.ok(!url.includes("/api/v1/api/v1"), `duplicated prefix in ${url}`);
  assert.equal(new URL(url).pathname.split("/api/v1/").length - 1, 1, `expected exactly one /api/v1 in ${url}`);
}

const realFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = realFetch;
});

test("orphan-release view: GET to the exact admin inventory URL with the bearer token", async () => {
  const calls = stubFetch(200, { success: true, data: { productId: "p/1" } });
  const controller = new AbortController();
  const view = await getOrphanReleaseView("tok-123", "p/1", controller.signal);

  assert.deepEqual(view, { productId: "p/1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${BASE}/admin/inventory/products/p%2F1/orphan-release`);
  assertSinglePrefix(calls[0].url);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.signal, controller.signal);
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer tok-123");
});

test("orphan release: POST to the exact URL with the unchanged JSON body", async () => {
  const body = { quantity: 4, expectedOnHand: 20, expectedReserved: 4, reason: "No order holds these units.", reference: "orphan-0b6f4f0e-1f5c-4b8e-9a4a-3c2f1d0e9b7a" };
  const calls = stubFetch(201, { success: true, data: { movement: { id: "m1" }, stock: { onHand: 20, reserved: 0, available: 20 } } });
  const result = await releaseOrphanedReservation("tok-123", "cmvi9nwnz000701s6cvn6jgfc", body);

  assert.equal(result.stock.reserved, 0);
  assert.equal(calls[0].url, `${BASE}/admin/inventory/products/cmvi9nwnz000701s6cvn6jgfc/orphan-releases`);
  assertSinglePrefix(calls[0].url);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), body);
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer tok-123");
  assert.equal(headers["Content-Type"], "application/json");
});

test("orphan release: an API refusal still surfaces as ApiError with the API's code", async () => {
  stubFetch(409, { success: false, error: { code: "STALE_STOCK", message: "Stock changed." } });
  await assert.rejects(
    releaseOrphanedReservation("tok", "p1", { quantity: 1, expectedOnHand: 5, expectedReserved: 1, reason: "Reason long enough.", reference: "orphan-ref-12345" }),
    (error: unknown) => error instanceof ApiError && error.status === 409 && error.code === "STALE_STOCK",
  );
});

test("no lib/api module passes a path that already starts with /api/ (the base URL carries the prefix)", () => {
  const dir = join(ROOT, "lib", "api");
  const offenders = readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .flatMap((name) => [...readFileSync(join(dir, name), "utf8").matchAll(/apiRequest(?:WithMeta)?\s*(?:<[^(]*>)?\s*\(\s*[`'"]\/api\//g)].map(() => name));
  assert.deepEqual(offenders, []);
});
