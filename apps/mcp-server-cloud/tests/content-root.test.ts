/**
 * Hosted content root (H7 + hosted M6): bundled catalog, license gate,
 * manifest verification, path containment, skills-only registry parsing, and
 * serving skill bodies with the network disabled.
 *
 * Run:  node --import tsx --test tests/content-root.test.ts
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token"; // cp-secret-ok: test-only fixture
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const BUNDLER = path.join(APP_ROOT, "scripts/bundle-catalog.mjs");

const { resolveWithin, resolveContentRoot, resetContentRootCache } = await import("../src/lib/content-root.js");
const { parseRegistrySkills } = await import("../src/lib/registry-parse.js");
const registry = await import("../src/lib/registry.js");
const { getSkill } = await import("../src/tools/get-skill.js");
const { getAgent } = await import("../src/tools/get-agent.js");
const { resolveSkillSource } = await import("../src/tools/skill-source.js");

const registryRaw = readFileSync(path.join(REPO_ROOT, "commander/core/registry.yaml"), "utf8");
const scratch = mkdtempSync(path.join(tmpdir(), "ccc-content-root-"));

function runBundler(args: string[]) {
  return spawnSync(process.execPath, [BUNDLER, ...args], { encoding: "utf8" });
}

after(() => {
  delete process.env.CCC_CONTENT_ROOT;
  resetContentRootCache();
  rmSync(scratch, { recursive: true, force: true });
});

describe("resolveWithin (path.relative containment)", () => {
  const root = path.join(scratch, "root");
  it("allows paths inside the root", () => {
    assert.equal(resolveWithin(root, "skills/a/SKILL.md"), path.join(root, "skills/a/SKILL.md"));
  });
  it("rejects escapes, absolute paths, NUL bytes, the root itself and prefix siblings", () => {
    for (const bad of ["../x", "skills/../../x", "/etc/passwd", "C:\\x", "a\0b", "", ".", "../root-sibling/x"]) {
      assert.equal(resolveWithin(root, bad), null, JSON.stringify(bad));
    }
  });
});

describe("registry parsing reads only the skills: section", () => {
  const skills = parseRegistrySkills(registryRaw);
  const expected = (() => {
    const section = registryRaw.slice(registryRaw.indexOf("\nskills:\n"), registryRaw.indexOf("\nagents:\n"));
    return (section.match(/^  - id:/gm) ?? []).length;
  })();

  it("returns exactly the skills: entries (673 at 8.1.7), not agents/commands/hooks", () => {
    assert.equal(skills.length, expected);
    assert.ok(expected >= 600, `sanity: ${expected}`);
    assert.ok(!skills.some((s) => s.path.startsWith("commands/") || s.path.includes("/agents/")));
  });
  it("has unique ids, a path for every entry, and no description starting with name:", () => {
    assert.equal(new Set(skills.map((s) => s.id)).size, skills.length);
    assert.ok(skills.every((s) => s.path.endsWith("SKILL.md")));
    assert.ok(skills.every((s) => s.description && !s.description.startsWith("name:")));
  });
  it("unescapes double-quoted YAML descriptions", () => {
    const quoted = skills.find((s) => s.id === "ecosystem/ad-creative");
    assert.ok(quoted && !quoted.description.startsWith('"') && quoted.description.includes("'ad copy variations,'"));
  });
});

describe("bundle-catalog.mjs", () => {
  const out = path.join(scratch, "bundle");
  let manifest: {
    counts: Record<string, number>;
    files: Record<string, { sha256: string }>;
    excluded: Array<{ path: string; reason: string }>;
  };

  before(() => {
    // License-gate fixture: the real provenance map plus one skill marked unverified.
    const copies = JSON.parse(readFileSync(path.join(REPO_ROOT, "commander/scripts/copied-content.json"), "utf8"));
    copies.copies.push({ file: "skills/acpx/SKILL.md", vendor: "fixture", license: "LicenseRef-Unverified", notes: "upstream unreachable (fixture)" });
    const copiesFile = path.join(scratch, "copies.json");
    writeFileSync(copiesFile, JSON.stringify(copies));
    const res = runBundler(["--out", out, "--copies", copiesFile]);
    assert.equal(res.status, 0, res.stderr);
    manifest = JSON.parse(readFileSync(path.join(out, "manifest.json"), "utf8"));
  });

  it("bundles registry skills, agents, notices and a manifest with sha256 per file", () => {
    const skills = parseRegistrySkills(registryRaw);
    assert.equal(manifest.counts.registry_skills, skills.length);
    assert.equal(manifest.counts.bundled_skills, skills.length - 1);
    assert.ok(manifest.counts.agents >= 20);
    for (const rel of ["commander/core/registry.yaml", "LICENSE", "NOTICE.md", "commander/cowork-plugin/skills/ccc-build/SKILL.md"]) {
      assert.match(manifest.files[rel]?.sha256 ?? "", /^[0-9a-f]{64}$/, rel);
    }
    assert.ok(Object.keys(manifest.files).some((f) => /\/LICENSE\.txt$/.test(f)), "per-skill LICENSE files ride along");
  });

  it("honours the license gate: an unverified copy is excluded and not copied", () => {
    assert.deepEqual(manifest.excluded, [{ path: "skills/acpx/SKILL.md", reason: "copied-content.json license LicenseRef-Unverified" }]);
    assert.ok(!existsSync(path.join(out, "skills/acpx/SKILL.md")));
  });

  it("--verify passes on the bundle and fails after tampering or on a missing manifest", () => {
    assert.equal(runBundler(["--verify", out]).status, 0);
    const tampered = path.join(scratch, "tampered");
    assert.equal(runBundler(["--out", tampered]).status, 0);
    appendFileSync(path.join(tampered, "commander/core/registry.yaml"), "\n# tampered\n");
    const bad = runBundler(["--verify", tampered]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /sha256 mismatch commander\/core\/registry\.yaml/);
    assert.notEqual(runBundler(["--verify", path.join(scratch, "nope")]).status, 0);
  });

  it("serves bodies from the bundle with fetch disabled; excluded skills get the placeholder", async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
      throw new Error("network disabled: content must come from the bundle");
    });
    process.env.CCC_CONTENT_ROOT = out;
    resetContentRootCache();
    assert.equal(resolveContentRoot()?.mode, "env");

    await registry.initRegistry();
    assert.equal(registry.getSkills().length, manifest.counts.registry_skills);

    const build = (await getSkill({ name: "ccc-build" })) as { content: string; path: string };
    assert.equal(build.content, readFileSync(path.join(out, build.path), "utf8"));
    assert.match(build.content, /^---/);

    const excluded = (await getSkill({ name: "acpx" })) as { content: string };
    assert.match(excluded.content, /Skill file unavailable/);

    const agent = (await getAgent({ name: "builder" })) as { content: string };
    assert.match(agent.content, /^---/);

    const source = resolveSkillSource("ccc-build");
    assert.ok(source?.exists && source.fullPath.startsWith(out + path.sep));
    assert.equal(resolveSkillSource("../../etc/passwd"), null);
  });

  it("a CCC_CONTENT_ROOT without manifest.json is refused", () => {
    process.env.CCC_CONTENT_ROOT = path.join(scratch, "root");
    resetContentRootCache();
    assert.equal(resolveContentRoot(), null);
  });
});

describe("no runtime fetch of the repository", () => {
  it("registry and skill-source contain no GitHub content URL", () => {
    for (const rel of ["src/lib/registry.ts", "src/tools/skill-source.ts", "src/lib/content-root.ts"]) {
      assert.doesNotMatch(readFileSync(path.join(APP_ROOT, rel), "utf8"), /raw\.githubusercontent|fetch\(/, rel);
    }
  });
});
