// Run: node --test site/app/api/creator/signup/route.test.mjs
//
// The site has no installed test runner, so this checks the route source and
// executes its POST handler against a minimal `next/server` stand-in.
// Guards Codex audit #34: signup must not report success (slug/redirect)
// until a creator record is actually persisted.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

async function loadHandler() {
  // Strip the TypeScript-only import and evaluate the module with a stub NextResponse.
  const body = source.replace(/^import .*from "next\/server";\s*$/m, "");
  const NextResponse = {
    json: (data, init = {}) =>
      new Response(JSON.stringify(data), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      }),
  };
  const url = `data:text/javascript;base64,${Buffer.from(
    `const NextResponse = globalThis.__nextResponseStub;\n${body}`
  ).toString("base64")}`;
  globalThis.__nextResponseStub = NextResponse;
  return import(url);
}

test("creator signup answers 503 not_available and never returns a slug or redirect", async () => {
  const { POST } = await loadHandler();
  const res = await POST();
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, "not_available");
  assert.equal(typeof data.error, "string");
  assert.equal(data.slug, undefined);
  assert.equal(data.redirect, undefined);
});

test("route source contains no success path while persistence is unimplemented", () => {
  assert.doesNotMatch(source, /redirect:\s*`\/r\//);
  assert.doesNotMatch(source, /status:\s*200/);
});
