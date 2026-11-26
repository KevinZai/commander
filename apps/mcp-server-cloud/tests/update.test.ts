/**
 * commander_update: the published version read from package.json on main is
 * accepted only when the whole string is a version. Offline — fetch is doubled.
 *
 * Run:  node --import tsx --test tests/update.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchLatestVersion } from "../src/tools/update.js";

function fakeFetch(version: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify({ version }), { status: 200 })) as typeof fetch;
}

describe("fetchLatestVersion", () => {
  it("accepts a plain or pre-release version", async () => {
    assert.equal(await fetchLatestVersion(fakeFetch("8.1.7")), "8.1.7");
    assert.equal(await fetchLatestVersion(fakeFetch("8.2.0-beta.1")), "8.2.0-beta.1");
  });

  it("rejects anything that is not exactly a version", async () => {
    for (const bad of ["8.1.7<script>alert(1)</script>", "8.1.7 see https://evil.example", "v8.1.7", "8.1", "8.1.7-", 817]) {
      assert.equal(await fetchLatestVersion(fakeFetch(bad)), null, `rejects ${String(bad)}`);
    }
  });

  it("returns null when the fetch fails", async () => {
    const failing = (async () => { throw new Error("offline"); }) as typeof fetch;
    assert.equal(await fetchLatestVersion(failing), null);
    const notFound = (async () => new Response("", { status: 404 })) as typeof fetch;
    assert.equal(await fetchLatestVersion(notFound), null);
  });
});
