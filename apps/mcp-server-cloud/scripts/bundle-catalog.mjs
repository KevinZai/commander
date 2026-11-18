#!/usr/bin/env node
/**
 * Bakes the release-pinned hosted catalog into apps/mcp-server-cloud/data/.
 *
 *   node scripts/bundle-catalog.mjs            bundle from the repo checkout, then verify
 *   node scripts/bundle-catalog.mjs --verify   verify an existing data/ bundle only
 *
 * The Docker build context is apps/mcp-server-cloud/, so the repository
 * registry and skill sources are not visible inside the image build. CI (or a
 * local `npm run build`) runs this script from the checkout first; the
 * Dockerfile copies data/ into the image and runs `--verify`, which fails the
 * image build when the bundle is absent, incomplete or altered.
 *
 * Bundle layout:
 *   data/manifest.json             release, source commit, counts, sha256 per file
 *   data/registry.yaml             the registry the bundle was built from
 *   data/skills/<id>/SKILL.md      every skill body listed under `skills:`
 *   data/skills/<id>/LICENSE.txt   the skill's license notice, when its source
 *                                  dir (or its pack dir) carries one
 *   data/agents/<name>.md          every agent listed under `agents:`
 *
 * Registry paths are resolved against the real source roots: the repository
 * root first, then commander/cowork-plugin/ (plugin skills live under
 * commander/cowork-plugin/skills/, while older registry entries spell them
 * skills/<id>/SKILL.md). Either spelling is accepted. Any entry that resolves
 * to no file fails the build; nothing is fetched from the network.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const DEFAULT_REPO_ROOT = path.resolve(APP_ROOT, "../..");
const DEFAULT_DATA_DIR = path.join(APP_ROOT, "data");

export const MANIFEST_SCHEMA = 1;
const PLUGIN_ROOT_REL = "commander/cowork-plugin";

export class CatalogError extends Error {}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const LICENSE_NAMES = ["LICENSE.txt", "LICENSE", "LICENSE.md"];

/**
 * The license notice that travels with a copied skill: a LICENSE file beside
 * its SKILL.md, else one in its pack dir (the parent, when that is not a
 * top-level skills root). Repo-relative path, or null.
 */
export function findSkillLicense(repoRoot, source) {
  const dir = path.dirname(source);
  const dirs = [dir];
  const parent = path.dirname(dir);
  if (!/(^|\/)skills$/.test(parent) && parent !== "." && parent !== dir) dirs.push(parent);
  for (const d of dirs) {
    for (const name of LICENSE_NAMES) {
      const rel = path.join(d, name);
      if (existsSync(path.join(repoRoot, rel))) return rel;
    }
  }
  return null;
}

function unquote(value) {
  const v = value.trim();
  if (v.startsWith('"')) {
    try {
      return String(JSON.parse(v));
    } catch {
      // fall through to a plain strip
    }
  }
  return v.replace(/^["']|["']$/g, "");
}

// Ids may carry a source prefix (`plugin/ccc-data`, `ecosystem/<dir>`).
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/**
 * Parses the `skills:` and `agents:` sections of commander/core/registry.yaml.
 * Other top-level sections (modes, commands, hooks, vendors) are ignored, so
 * their `- id:` entries are never counted as skills.
 */
export function parseRegistrySections(raw) {
  const out = { version: "", skills: [], agents: [] };
  let section = "";
  let current = null;
  const flush = () => {
    if (current?.id && (section === "skills" || section === "agents")) out[section].push(current);
    current = null;
  };
  for (const line of raw.split("\n")) {
    const top = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (top) {
      flush();
      section = top[1];
      if (section === "version") out.version = unquote(top[2]);
      continue;
    }
    if (section !== "skills" && section !== "agents") continue;
    const item = line.match(/^  - id:\s*(.*)$/);
    if (item) {
      flush();
      current = { id: unquote(item[1]), name: "", path: "", source: "", domain: "general", tier: "free", description: "" };
      continue;
    }
    const field = current && line.match(/^    (name|path|source|domain|tier|description):\s*(.*)$/);
    if (field) {
      const value = unquote(field[2]);
      if (field[1] === "tier") current.tier = value === "pro" ? "pro" : "free";
      else if (field[1] === "domain") current.domain = value || "general";
      else current[field[1]] = value;
    }
  }
  flush();
  return out;
}

function isSafeRelative(rel) {
  return typeof rel === "string" && rel.length > 0 && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes("..");
}

/** Candidate repo-relative locations for a registry path, in lookup order. */
export function candidatePaths(rel) {
  if (!isSafeRelative(rel)) return [];
  const out = [rel];
  if (!rel.startsWith(`${PLUGIN_ROOT_REL}/`)) out.push(`${PLUGIN_ROOT_REL}/${rel}`);
  return out;
}

/** Resolves a registry path to an existing file under repoRoot, or null. */
export function resolveSourcePath(repoRoot, rel) {
  for (const candidate of candidatePaths(rel)) {
    if (existsSync(path.join(repoRoot, candidate))) return candidate;
  }
  return null;
}

/** First `description:` value from YAML frontmatter, single-line or block form. */
export function frontmatterDescription(content) {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return "";
  const lines = fm[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/);
    if (!m) continue;
    const value = m[1].trim();
    if (value && !/^[>|][+-]?$/.test(value)) return unquote(value).slice(0, 300);
    const block = [];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) block.push(lines[j].trim());
    return block.join(" ").slice(0, 300);
  }
  return "";
}

/** `source:` from the registry when present, else inferred from the resolved path. */
function originOf(declared, sourceRel) {
  if (declared === "plugin" || declared === "ecosystem") return declared;
  return sourceRel.startsWith(`${PLUGIN_ROOT_REL}/skills/`) ? "plugin" : "ecosystem";
}

function gitCommit(repoRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** Builds data/ from a repository checkout. Throws CatalogError on any missing content. */
export function bundleCatalog({ repoRoot = DEFAULT_REPO_ROOT, dataDir = DEFAULT_DATA_DIR } = {}) {
  const registrySrc = path.join(repoRoot, "commander/core/registry.yaml");
  if (!existsSync(registrySrc)) throw new CatalogError(`registry not found at ${registrySrc}`);
  const registryRaw = readFileSync(registrySrc);
  const registry = parseRegistrySections(registryRaw.toString("utf8"));

  let repoVersion = null;
  try {
    repoVersion = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")).version ?? null;
  } catch {
    repoVersion = null;
  }
  if (!registry.version) throw new CatalogError("registry.yaml has no top-level version");
  if (repoVersion && repoVersion !== registry.version) {
    throw new CatalogError(`registry version ${registry.version} does not match release ${repoVersion}; regenerate the registry`);
  }
  if (registry.skills.length === 0) throw new CatalogError("registry lists zero skills");
  if (registry.agents.length === 0) throw new CatalogError("registry lists zero agents");

  const missing = [];
  const skills = [];
  const seen = new Map();
  let duplicates = 0;
  for (const s of registry.skills) {
    // The generated registry can repeat an entry; identical repeats collapse,
    // conflicting ones (same id, different path) fail the build.
    if (seen.has(s.id)) {
      if (seen.get(s.id) !== s.path) throw new CatalogError(`skill id ${s.id} listed with conflicting paths ${seen.get(s.id)} and ${s.path}`);
      duplicates++;
      continue;
    }
    seen.set(s.id, s.path);
    if (!SAFE_ID.test(s.id)) throw new CatalogError(`unsafe skill id ${JSON.stringify(s.id)}`);
    const source = resolveSourcePath(repoRoot, s.path);
    if (!source) {
      missing.push(`skill ${s.id}: ${s.path}`);
      continue;
    }
    const body = readFileSync(path.join(repoRoot, source));
    if (body.length === 0) {
      missing.push(`skill ${s.id}: ${source} is empty`);
      continue;
    }
    const registryDescription = s.description.startsWith("name:") ? "" : s.description;
    const licenseSource = findSkillLicense(repoRoot, source);
    const licenseBody = licenseSource ? readFileSync(path.join(repoRoot, licenseSource)) : null;
    skills.push({
      id: s.id,
      name: s.name || s.id,
      domain: s.domain,
      tier: s.tier,
      description: registryDescription || frontmatterDescription(body.toString("utf8")) || s.id,
      registryPath: s.path,
      source,
      origin: originOf(s.source, source),
      bundled: `skills/${s.id}/SKILL.md`,
      bytes: body.length,
      sha256: sha256(body),
      ...(licenseBody ? { licenseSource, licenseBundled: `skills/${s.id}/LICENSE.txt`, licenseSha256: sha256(licenseBody) } : {}),
      body,
      licenseBody,
    });
  }

  const agents = [];
  for (const a of registry.agents) {
    if (!SAFE_ID.test(a.id) || a.id.includes("/")) throw new CatalogError(`unsafe agent id ${JSON.stringify(a.id)}`);
    const source = resolveSourcePath(repoRoot, a.path || `agents/${a.id}.md`);
    if (!source) {
      missing.push(`agent ${a.id}: ${a.path}`);
      continue;
    }
    const body = readFileSync(path.join(repoRoot, source));
    agents.push({
      name: a.id,
      tier: a.tier,
      description: frontmatterDescription(body.toString("utf8")) || a.id,
      source,
      bundled: `agents/${a.id}.md`,
      bytes: body.length,
      sha256: sha256(body),
      body,
    });
  }

  if (missing.length > 0) {
    throw new CatalogError(`${missing.length} catalog entr${missing.length === 1 ? "y" : "ies"} missing content:\n  ${missing.join("\n  ")}`);
  }

  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, "registry.yaml"), registryRaw);
  for (const entry of [...skills, ...agents]) {
    const dest = path.join(dataDir, entry.bundled);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, entry.body);
    if (entry.licenseBody) writeFileSync(path.join(dataDir, entry.licenseBundled), entry.licenseBody);
  }

  const strip = ({ body, licenseBody, ...rest }) => rest;
  const manifest = {
    schema: MANIFEST_SCHEMA,
    release: registry.version,
    repoVersion,
    gitCommit: gitCommit(repoRoot),
    generatedAt: new Date().toISOString(),
    registrySha256: sha256(registryRaw),
    duplicateRegistryEntries: duplicates,
    counts: {
      skills: skills.length,
      pluginSkills: skills.filter((s) => s.origin === "plugin").length,
      ecosystemSkills: skills.filter((s) => s.origin === "ecosystem").length,
      agents: agents.length,
    },
    skills: skills.map(strip),
    agents: agents.map(strip),
  };
  writeFileSync(path.join(dataDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** Verifies an existing bundle: manifest present, counts non-zero, every file present with its recorded hash. */
export function verifyCatalog({ dataDir = DEFAULT_DATA_DIR } = {}) {
  const manifestPath = path.join(dataDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new CatalogError(`no catalog bundle at ${manifestPath}; run \`node scripts/bundle-catalog.mjs\` from the repository checkout before building the image`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== MANIFEST_SCHEMA) throw new CatalogError(`unsupported manifest schema ${manifest.schema}`);
  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) throw new CatalogError("bundle has zero skills");
  if (!Array.isArray(manifest.agents) || manifest.agents.length === 0) throw new CatalogError("bundle has zero agents");
  if (manifest.counts?.skills !== manifest.skills.length || manifest.counts?.agents !== manifest.agents.length) {
    throw new CatalogError("manifest counts do not match its entries");
  }

  const problems = [];
  const registryPath = path.join(dataDir, "registry.yaml");
  if (!existsSync(registryPath)) problems.push("registry.yaml missing");
  else if (sha256(readFileSync(registryPath)) !== manifest.registrySha256) problems.push("registry.yaml hash mismatch");

  for (const entry of [...manifest.skills, ...manifest.agents]) {
    if (!isSafeRelative(entry.bundled)) {
      problems.push(`unsafe bundled path ${entry.bundled}`);
      continue;
    }
    const file = path.join(dataDir, entry.bundled);
    if (!existsSync(file)) problems.push(`${entry.bundled} missing`);
    else if (sha256(readFileSync(file)) !== entry.sha256) problems.push(`${entry.bundled} hash mismatch`);
    if (entry.licenseBundled) {
      const lic = isSafeRelative(entry.licenseBundled) ? path.join(dataDir, entry.licenseBundled) : null;
      if (!lic) problems.push(`unsafe bundled path ${entry.licenseBundled}`);
      else if (!existsSync(lic)) problems.push(`${entry.licenseBundled} missing`);
      else if (sha256(readFileSync(lic)) !== entry.licenseSha256) problems.push(`${entry.licenseBundled} hash mismatch`);
    }
  }
  if (problems.length > 0) {
    throw new CatalogError(`catalog bundle failed verification:\n  ${problems.slice(0, 20).join("\n  ")}`);
  }
  return manifest;
}

function main(argv) {
  const verifyOnly = argv.includes("--verify");
  try {
    if (!verifyOnly) {
      const built = bundleCatalog();
      console.log(`✓ Bundled release ${built.release}: ${built.counts.skills} skills (${built.counts.pluginSkills} plugin, ${built.counts.ecosystemSkills} ecosystem), ${built.counts.agents} agents`);
    }
    const manifest = verifyCatalog();
    console.log(`✓ Catalog bundle verified (release ${manifest.release}, commit ${manifest.gitCommit ?? "unknown"})`);
  } catch (err) {
    console.error(`✗ Catalog bundle failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
