/**
 * commander_update: hermetic tests. The published version is read through an
 * injected fetch, so nothing here touches the network or depends on the live
 * GitHub version.
 *
 * Run:  node --import tsx --test tests/update.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkUpdate } from "../src/tools/update.js";
import { SERVER_VERSION } from "../src/lib/version.js";

const manifest = (version: unknown): typeof fetch =>
  (async () => Response.json({ version })) as unknown as typeof fetch;

describe("checkUpdate (injected fetch)", () => {
  it("is up to date when the published version equals the server version", async () => {
    const r = await checkUpdate({}, manifest(SERVER_VERSION));
    assert.equal(r.checked, true);
    assert.equal(r.upToDate, true);
    assert.equal(r.currentVersion, SERVER_VERSION);
    assert.equal(r.latestVersion, SERVER_VERSION);
  });

  it("reports behind when the published version is newer", async () => {
    const r = await checkUpdate({}, manifest("99.0.0"));
    assert.equal(r.checked, true);
    assert.equal(r.upToDate, false);
    assert.equal(r.latestVersion, "99.0.0");
  });

  it("does not claim a check when the fetch fails or returns junk", async () => {
    const failing = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    for (const f of [failing, manifest(undefined), manifest("not-a-version")]) {
      const r = await checkUpdate({}, f);
      assert.equal(r.checked, false);
      assert.equal(r.upToDate, true);
      assert.equal(r.latestVersion, SERVER_VERSION);
    }
  });
});
