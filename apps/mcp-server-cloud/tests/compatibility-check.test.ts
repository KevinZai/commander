import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compatibilityCheck } from "../src/tools/compatibility-check.js";

describe("commander_compatibility_check", () => {
  it("reports a Claude Desktop compatible skill as compatible", async () => {
    const result = await compatibilityCheck({
      skill_name: "build",
      target_env: "claude-desktop",
    });

    assert.equal(typeof result.compatible, "boolean");
    assert.ok(Array.isArray(result.missing_capabilities));
    assert.ok(Array.isArray(result.required_hooks));
    assert.ok(Array.isArray(result.required_mcps));
    assert.equal(typeof result.notes, "string");
    assert.equal(result.compatible, true);
    assert.deepEqual(result.missing_capabilities, []);
  });

  it("flags missing Codex capabilities for Claude-specific interactive skills", async () => {
    const result = await compatibilityCheck({
      skill_name: "guard",
      target_env: "codex-cli",
    });

    assert.equal(result.compatible, false);
    assert.ok(result.missing_capabilities.includes("tool:AskUserQuestion"));
    assert.ok(result.required_hooks.includes("PreToolUse"));
    assert.match(result.notes, /Codex/);
  });
});
