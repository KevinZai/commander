import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { installSkill } from "../src/tools/install-skill.js";

describe("commander_install_skill", () => {
  it("returns an idempotent install command for a known skill", () => {
    const result = installSkill({
      skill_name: "build",
      target_env: "codex-cli",
      dry_run: true,
    });

    assert.equal(result.status, "would-install");
    assert.equal(typeof result.install_path, "string");
    assert.match(result.install_path, /\.codex\/skills\/build$/);
    assert.equal(typeof result.message, "string");
    assert.equal(typeof result.command, "string");
    assert.match(result.command!, /git clone/);
    assert.match(result.command!, /commander\/cowork-plugin\/skills\/build|skills\/build/);
  });

  it("returns an error for an unknown skill", () => {
    const result = installSkill({
      skill_name: "not-a-real-skill",
      target_env: "claude-cli",
    });

    assert.equal(result.status, "error");
    assert.equal(result.install_path, "");
    assert.match(result.message, /not found/i);
  });
});
