import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionDiagnose } from "../src/tools/session-diagnose.js";

describe("commander_session_diagnose", () => {
  it("runs all eight /ccc-doctor diagnostic categories by default", () => {
    const result = sessionDiagnose({});

    assert.ok(Array.isArray(result.findings));
    assert.equal(result.findings.length, 8);
    assert.equal(result.summary.total, 8);
    assert.equal(result.summary.ok + result.summary.warn + result.summary.fail, 8);
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
});
