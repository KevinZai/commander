/**
 * Hosted catalog (Codex audit #10): the bundler bakes a release-pinned,
 * hash-verified catalog; the registry loads it with no network fallback; and
 * /health reports not-ok, with its counting basis, when the catalog is empty.
 *
 * Fixtures are written to a temp dir. The registry excerpt uses the
 * regenerated format (prefixed ids, `name`, `source`, JSON-quoted
 * descriptions) and the older one (bare ids, `description: "name: x"`).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token"; // cp-secret-ok: test-only fixture
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.METRICS_AUTH_TOKEN = "";

// Any network access during catalog loading is a failure.
const fetchCalls: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  fetchCalls.push(String(input instanceof Request ? input.url : input));
  throw new Error("network disabled in catalog tests");
}) as typeof fetch;

const bundler = (await import("../scripts/bundle-catalog.mjs")) as {
  bundleCatalog: (o: { repoRoot: string; dataDir: string }) => Manifest;
  verifyCatalog: (o: { dataDir: string }) => Manifest;
  parseRegistrySections: (raw: string) => { version: string; skills: RawEntry[]; agents: RawEntry[] };
  CatalogError: new (...a: unknown[]) => Error;
};
const registry = await import("../src/lib/registry.js");
const { app } = await import("../src/index.js");

type RawEntry = { id: string; name: string; path: string; source: string; description: string; tier: string };
type Manifest = {
  release: string;
  counts: { skills: number; pluginSkills: number; ecosystemSkills: number; agents: number };
  skills: Array<{ id: string; name: string; source: string; origin: string; bundled: string; description: string }>;
  agents: Array<{ name: string; tier: string; bundled: string }>;
  duplicateRegistryEntries: number;
};

const REGISTRY = `# fixture
generated: 2026-11-18
version: 9.9.9
skills:
  - id: ecosystem/ab-test-setup
    name: ab-test-setup
    path: skills/ab-test-setup/SKILL.md
    source: ecosystem
    domain: general
    tier: free
    description: Structured guide for A/B tests.
  - id: ecosystem/ccc-data
    name: ccc-data
    path: skills/ccc-data/SKILL.md
    source: ecosystem
    domain: ccc-data
    tier: free
    description: "Route data work: \\"ETL\\", SQL — dashboards."
  - id: ecosystem/ccc-devops/performance-monitoring
    name: Performance Monitoring
    path: skills/ccc-devops/performance-monitoring/SKILL.md
    source: ecosystem
    domain: ccc-devops
    tier: pro
    description: "APM and RUM."
  - id: plugin/ccc-data
    name: ccc-data
    path: commander/cowork-plugin/skills/ccc-data/SKILL.md
    source: plugin
    domain: ccc-data
    tier: free
    description: "Data router."
  - id: ccc-build
    path: skills/ccc-build/SKILL.md
    domain: ccc-build
    tier: free
    description: "name: ccc-build"
  - id: ccc-build
    path: skills/ccc-build/SKILL.md
    domain: ccc-build
    tier: free
    description: "name: ccc-build"
agents:
  - id: architect
    path: commander/cowork-plugin/agents/architect.md
    tier: free
  - id: builder
    path: commander/cowork-plugin/agents/builder.md
    tier: pro
modes:
  - id: race
    trigger: /mode race
commands:
  - id: ccc-ao
    path: commands/ccc-ao.md
`;

function writeFile(root: string, rel: string, content: string) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function makeRepo(opts: { version?: string; omit?: string[] } = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "ccc-catalog-repo-"));
  writeFile(root, "package.json", JSON.stringify({ version: opts.version ?? "9.9.9" }));
  writeFile(root, "commander/core/registry.yaml", REGISTRY);
  const files: Record<string, string> = {
    "skills/ab-test-setup/SKILL.md": "---\nname: ab-test-setup\n---\n# A/B\n",
    "skills/ccc-data/SKILL.md": "---\nname: ccc-data\n---\n# Ecosystem data router\n",
    "skills/ccc-devops/performance-monitoring/SKILL.md": "# Perf\n",
    "commander/cowork-plugin/skills/ccc-data/SKILL.md": "---\nname: ccc-data\n---\n# Plugin data router\n",
    // Old-style path: listed as skills/ccc-build but lives under the plugin root.
    "commander/cowork-plugin/skills/ccc-build/SKILL.md":
      "---\nname: ccc-build\ndescription: >\n  Build wizard for\n  web and API projects.\n---\n# Build\n",
    "commander/cowork-plugin/agents/architect.md": "---\nname: architect\ndescription: \"Designs systems.\"\n---\n# Architect\n",
    "commander/cowork-plugin/agents/builder.md": "---\nname: builder\ndescription: Builds things.\n---\n# Builder\n",
  };
  for (const [rel, content] of Object.entries(files)) {
    if (!opts.omit?.includes(rel)) writeFile(root, rel, content);
  }
  return root;
}

const tempDirs: string[] = [];
const tmp = (prefix: string) => {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(d);
  return d;
};
after(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
  delete process.env.COMMANDER_CATALOG_DIR;
});

describe("registry parsing", () => {
  it("reads only the skills and agents sections, with names, sources and JSON-quoted descriptions", () => {
    const parsed = bundler.parseRegistrySections(REGISTRY);
    assert.equal(parsed.version, "9.9.9");
    assert.equal(parsed.skills.length, 6, "modes/commands ids are not skills");
    assert.equal(parsed.agents.length, 2);
    const eco = parsed.skills.find((s) => s.id === "ecosystem/ccc-data")!;
    assert.equal(eco.name, "ccc-data");
    assert.equal(eco.source, "ecosystem");
    assert.equal(eco.description, 'Route data work: "ETL", SQL — dashboards.');
    // The server-side parser agrees with the bundler.
    assert.deepEqual(registry.parseRegistrySections(REGISTRY), parsed);
  });

  it("resolves a registry path against the repo root, then commander/cowork-plugin/", () => {
    const repo = makeRepo();
    tempDirs.push(repo);
    assert.equal(registry.resolveSourcePath(repo, "skills/ccc-data/SKILL.md"), "skills/ccc-data/SKILL.md");
    assert.equal(
      registry.resolveSourcePath(repo, "skills/ccc-build/SKILL.md"),
      "commander/cowork-plugin/skills/ccc-build/SKILL.md"
    );
    assert.equal(registry.resolveSourcePath(repo, "../etc/passwd"), null);
    assert.equal(registry.resolveSourcePath(repo, "skills/missing/SKILL.md"), null);
  });
});

describe("bundle-catalog.mjs", () => {
  it("bakes every skill body and agent with hashes, counts plugin vs ecosystem, and verifies", () => {
    const repo = makeRepo();
    tempDirs.push(repo);
    const dataDir = tmp("ccc-catalog-data-");
    const manifest = bundler.bundleCatalog({ repoRoot: repo, dataDir });
    assert.equal(manifest.release, "9.9.9");
    assert.deepEqual(manifest.counts, { skills: 5, pluginSkills: 2, ecosystemSkills: 3, agents: 2 });
    assert.equal(manifest.duplicateRegistryEntries, 1);
    const build = manifest.skills.find((s) => s.id === "ccc-build")!;
    assert.equal(build.source, "commander/cowork-plugin/skills/ccc-build/SKILL.md");
    assert.equal(build.origin, "plugin", "origin is inferred from the resolved path when `source:` is absent");
    assert.equal(build.description, "Build wizard for web and API projects.");
    assert.equal(manifest.agents.find((a) => a.name === "builder")!.tier, "pro");
    for (const entry of [...manifest.skills, ...manifest.agents]) {
      assert.ok(existsSync(path.join(dataDir, entry.bundled)), entry.bundled);
    }
    assert.equal(bundler.verifyCatalog({ dataDir }).counts.skills, 5);
  });

  it("fails the build when a listed skill body is missing", () => {
    const repo = makeRepo({ omit: ["skills/ccc-devops/performance-monitoring/SKILL.md"] });
    tempDirs.push(repo);
    assert.throws(
      () => bundler.bundleCatalog({ repoRoot: repo, dataDir: tmp("ccc-catalog-data-") }),
      /missing content[\s\S]*performance-monitoring/
    );
  });

  it("fails the build when an agent is missing", () => {
    const repo = makeRepo({ omit: ["commander/cowork-plugin/agents/builder.md"] });
    tempDirs.push(repo);
    assert.throws(() => bundler.bundleCatalog({ repoRoot: repo, dataDir: tmp("ccc-catalog-data-") }), /agent builder/);
  });

  it("fails when the registry is not pinned to the release version", () => {
    const repo = makeRepo({ version: "9.9.10" });
    tempDirs.push(repo);
    assert.throws(() => bundler.bundleCatalog({ repoRoot: repo, dataDir: tmp("ccc-catalog-data-") }), /does not match release/);
  });

  it("--verify fails without a bundle and on a tampered file", () => {
    assert.throws(() => bundler.verifyCatalog({ dataDir: tmp("ccc-catalog-empty-") }), /no catalog bundle/);
    const repo = makeRepo();
    tempDirs.push(repo);
    const dataDir = tmp("ccc-catalog-data-");
    const manifest = bundler.bundleCatalog({ repoRoot: repo, dataDir });
    writeFileSync(path.join(dataDir, manifest.skills[0].bundled), "tampered");
    assert.throws(() => bundler.verifyCatalog({ dataDir }), /hash mismatch/);
  });

  it("the real repository registry bundles with no missing content", () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const manifest = bundler.bundleCatalog({ repoRoot, dataDir: tmp("ccc-catalog-real-") });
    assert.ok(manifest.counts.skills > 0 && manifest.counts.agents > 0);
    assert.equal(manifest.counts.skills, manifest.counts.pluginSkills + manifest.counts.ecosystemSkills);
  });
});

describe("registry loading and /health", () => {
  let dataDir: string;

  before(() => {
    const repo = makeRepo();
    tempDirs.push(repo);
    dataDir = tmp("ccc-catalog-data-");
    bundler.bundleCatalog({ repoRoot: repo, dataDir });
  });

  it("serves skill and agent bodies from the bundle, never the network", async () => {
    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    assert.deepEqual(registry.selectCatalogSource(), { source: "bundle", location: path.resolve(dataDir) });
    assert.equal(registry.getSkills().length, 5);
    assert.match((await registry.getSkillContent("plugin/ccc-data"))!, /Plugin data router/);
    assert.match((await registry.getAgentContent("architect"))!, /# Architect/);
    assert.equal(registry.getAgents().find((a) => a.name === "builder")!.tier, "pro");
    assert.deepEqual(fetchCalls, []);
  });

  it("looks skills up by id, then name, then last path segment", async () => {
    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    // Bare name: first registry row with that name (same order as skill-source.ts).
    assert.match((await registry.getSkillContent("ccc-data"))!, /Ecosystem data router/);
    assert.equal(registry.findSkill("ccc-data")!.id, "ecosystem/ccc-data");
    assert.equal(registry.findSkill("performance-monitoring")!.id, "ecosystem/ccc-devops/performance-monitoring");
    assert.equal(registry.findSkill("Performance Monitoring")!.id, "ecosystem/ccc-devops/performance-monitoring");
    assert.equal(registry.findSkill("nope"), null);
  });

  it("/health is ok with a loaded catalog and states its counting basis", async () => {
    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    const res = await app.fetch(new Request("http://test/health"));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.skills_loaded, 5);
    assert.equal(body.agents_loaded, 2);
    assert.equal(body.catalog.counting_basis, "hosted_catalog");
    assert.equal(body.catalog.source, "bundle");
    assert.equal(body.catalog.release, "9.9.9");
    assert.equal(body.catalog.plugin_skills, 2);
    assert.equal(body.catalog.ecosystem_skills, 3);
    assert.deepEqual(body.catalog.problems, []);
  });

  it("/health returns 503 when no catalog is present (zero skills, zero agents, no fallback)", async () => {
    process.env.COMMANDER_CATALOG_DIR = tmp("ccc-catalog-empty-");
    await registry.reloadRegistry();
    assert.equal(registry.getAgents().length, 0, "no static fallback agents");
    const res = await app.fetch(new Request("http://test/health"));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, "unavailable");
    assert.deepEqual(body.catalog.problems.sort(), ["no_catalog_source", "zero_agents", "zero_skills"]);
    assert.deepEqual(fetchCalls, []);
  });

  it("/health returns 503 when a listed skill body is unreadable", async () => {
    const broken = tmp("ccc-catalog-broken-");
    for (const rel of ["manifest.json", "registry.yaml"]) {
      writeFileSync(path.join(broken, rel), readFileSync(path.join(dataDir, rel)));
    }
    process.env.COMMANDER_CATALOG_DIR = broken; // manifest present, bodies absent
    await registry.reloadRegistry();
    const res = await app.fetch(new Request("http://test/health"));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.ok(body.catalog.problems.includes("skill_content_missing"));
    assert.equal(body.catalog.skills_missing_content, 5);
  });

  it("falls back to the repository checkout when no bundle dir is forced", async () => {
    delete process.env.COMMANDER_CATALOG_DIR;
    await registry.reloadRegistry();
    assert.equal(registry.selectCatalogSource().source, "repo");
    const res = await app.fetch(new Request("http://test/health"));
    assert.equal(res.status, 200);
  });
});

describe("license notices travel with served skills", () => {
  const MIT = "MIT License\n\nCopyright (c) 2026 Upstream Author\n\nPermission is hereby granted...\n";
  const longBody = "---\nname: ab-test-setup\n---\n# A/B\n" + "x".repeat(5000) + "\n\n## License\n\nEMBEDDED-NOTICE-TAIL\n";

  it("bundles a skill's own LICENSE and a pack-level LICENSE, hash-verified", async () => {
    const repo = makeRepo();
    tempDirs.push(repo);
    writeFile(repo, "skills/ab-test-setup/SKILL.md", longBody);
    writeFile(repo, "skills/ab-test-setup/LICENSE.txt", MIT);
    writeFile(repo, "skills/ccc-devops/LICENSE", "PACK LICENSE\n");
    const dataDir = tmp("ccc-catalog-lic-");
    const manifest = bundler.bundleCatalog({ repoRoot: repo, dataDir }) as Manifest & { skills: Array<{ id: string; licenseBundled?: string }> };
    const ab = manifest.skills.find((s) => s.id === "ecosystem/ab-test-setup")!;
    const perf = manifest.skills.find((s) => s.id === "ecosystem/ccc-devops/performance-monitoring")!;
    assert.equal(ab.licenseBundled, "skills/ecosystem/ab-test-setup/LICENSE.txt");
    assert.equal(perf.licenseBundled, "skills/ecosystem/ccc-devops/performance-monitoring/LICENSE.txt");
    assert.equal(manifest.skills.find((s) => s.id === "plugin/ccc-data")!.licenseBundled, undefined);
    bundler.verifyCatalog({ dataDir });
    writeFileSync(path.join(dataDir, ab.licenseBundled!), "tampered");
    assert.throws(() => bundler.verifyCatalog({ dataDir }), /LICENSE\.txt hash mismatch/);
    writeFileSync(path.join(dataDir, ab.licenseBundled!), MIT);

    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    const { getSkill } = await import("../src/tools/get-skill.js");
    const { invokeSkill } = await import("../src/tools/invoke-skill.js");
    const got = await getSkill({ name: "ecosystem/ab-test-setup" });
    assert.equal(got.license, MIT);
    assert.doesNotMatch(String(got.installHint), /npx|@latest/);
    assert.match(String(got.installHint), /ccc --skills install ab-test-setup/);
    assert.match(String(got.githubUrl), /^https:\/\/github.com\/KevinZai\/commander\/blob\//);
    const inv = (await invokeSkill({ name: "ecosystem/ab-test-setup" })) as Record<string, unknown>;
    assert.equal(inv.license, MIT);
    assert.match(String(inv.invocationGuide), /EMBEDDED-NOTICE-TAIL/, "no length cut drops an embedded notice");
    assert.match(String(inv.invocationGuide), /Permission is hereby granted/);
    const plain = await getSkill({ name: "plugin/ccc-data" });
    assert.equal(plain.license, undefined);
  });

  it("never turns a missing body into install instructions", async () => {
    const repo = makeRepo();
    tempDirs.push(repo);
    const dataDir = tmp("ccc-catalog-nobody-");
    const manifest = bundler.bundleCatalog({ repoRoot: repo, dataDir });
    rmSync(path.join(dataDir, manifest.skills.find((s) => s.id === "plugin/ccc-data")!.bundled));
    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    const { getSkill } = await import("../src/tools/get-skill.js");
    const got = await getSkill({ name: "plugin/ccc-data" });
    assert.match(String(got.content), /unavailable/);
    assert.doesNotMatch(String(got.content), /npx|install via/i);
  });
});

describe("an unreadable license notice blocks serving", () => {
  it("get_skill and invoke_skill return an error instead of an unlicensed body", async () => {
    const repo = makeRepo();
    tempDirs.push(repo);
    writeFile(repo, "skills/ab-test-setup/LICENSE.txt", "MIT License\n");
    const dataDir = tmp("ccc-catalog-unreadable-");
    const manifest = bundler.bundleCatalog({ repoRoot: repo, dataDir }) as Manifest & { skills: Array<{ id: string; licenseBundled?: string }> };
    const lic = manifest.skills.find((s) => s.id === "ecosystem/ab-test-setup")!.licenseBundled!;
    // Replace the notice with a directory: it exists but cannot be read as a file (works as root too).
    rmSync(path.join(dataDir, lic));
    mkdirSync(path.join(dataDir, lic));
    process.env.COMMANDER_CATALOG_DIR = dataDir;
    await registry.reloadRegistry();
    const { getSkill } = await import("../src/tools/get-skill.js");
    const { invokeSkill } = await import("../src/tools/invoke-skill.js");
    const got = await getSkill({ name: "ecosystem/ab-test-setup" });
    assert.equal(got.ok, false);
    assert.equal(got.content, undefined);
    const inv = (await invokeSkill({ name: "ecosystem/ab-test-setup" })) as Record<string, unknown>;
    assert.equal(inv.ok, false);
    assert.equal(inv.invocationGuide, undefined);
  });
});
