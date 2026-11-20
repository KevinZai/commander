import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sessionDiagnose } from "../src/tools/session-diagnose.js";
import { resetContentRootCache } from "../src/lib/content-root.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);

// The category count comes from the diagnostics module itself, so adding a
// /ccc-doctor check does not break this test.
function expectedCategoryCount(): number {
  const mod = require(path.join(REPO_ROOT, "commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics.js")) as {
    runDiagnostics: (root: string) => unknown[];
  };
  return mod.runDiagnostics(REPO_ROOT).length;
}

describe("commander_session_diagnose", () => {
  afterEach(() => {
    delete process.env.CCC_CONTENT_ROOT;
    resetContentRootCache();
  });

  it("runs every /ccc-doctor diagnostic category by default in a repo checkout", () => {
    const expected = expectedCategoryCount();
    assert.ok(expected >= 14, `at least 14 categories (got ${expected})`);
    const result = sessionDiagnose({});

    assert.ok(Array.isArray(result.findings));
    assert.equal(result.findings.length, expected);
    assert.equal(result.summary.total, expected);
    assert.equal(result.summary.ok + result.summary.warn + result.summary.fail, expected);
    assert.ok(result.findings.every((finding) => ["ok", "warn", "fail"].includes(finding.status)));
  });

  it("filters categories and reports unknown categories as warnings", () => {
    const result = sessionDiagnose({ categories: ["critical-files", "not-real"] });

    assert.equal(result.summary.total, 2);
    assert.ok(result.findings.some((finding) => finding.category === "critical-files"));
    const unknown = result.findings.find((finding) => finding.category === "not-real");
    assert.equal(unknown?.status, "warn");
    assert.match(unknown?.message ?? "", /Unknown diagnostic category/);
  });

  it("returns one explicit warning (not a load failure) on a hosted bundle", () => {
    const bundle = mkdtempSync(path.join(tmpdir(), "ccc-bundle-"));
    try {
      writeFileSync(path.join(bundle, "manifest.json"), JSON.stringify({ schema: 1, counts: {}, files: {}, excluded: [] }));
      process.env.CCC_CONTENT_ROOT = bundle;
      resetContentRootCache();
      const result = sessionDiagnose({ categories: ["critical-files"] });
      assert.equal(result.findings.length, 1);
      assert.equal(result.findings[0].status, "warn");
      assert.match(result.findings[0].message, /do not run on the hosted server/);
    } finally {
      rmSync(bundle, { recursive: true, force: true });
    }
  });
});
