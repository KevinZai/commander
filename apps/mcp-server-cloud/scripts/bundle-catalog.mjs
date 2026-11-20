#!/usr/bin/env node
/**
 * Bundle the hosted server's content into apps/mcp-server-cloud/data/.
 *
 * The Fly image is built from apps/mcp-server-cloud/ only, so everything the
 * server serves at runtime is copied here first, with the same repo-relative
 * layout, plus data/manifest.json (counts + sha256 of every file). The server
 * reads only this bundle in production; it never fetches content from GitHub.
 *
 * Bundled:
 *   commander/core/registry.yaml
 *   every SKILL.md listed in the registry's `skills:` section, plus LICENSE* /
 *     NOTICE* files beside it, and skills/<pack>/licenses/*
 *   commander/cowork-plugin/agents/*.md
 *   commander/adapters/codex/hook-event-map.json
 *   LICENSE, NOTICE.md
 *
 * License gate (same classes commander/scripts/audit-licenses.js fails or
 * cannot verify): a SKILL.md is NOT bundled when copied-content.json lists it
 * with an unverified, unknown, copyleft or proprietary license, or when its
 * frontmatter `license:` or a LICENSE file beside it is proprietary/copyleft.
 * Excluded files are listed in manifest.excluded with the reason.
 *
 * Usage:
 *   node scripts/bundle-catalog.mjs                     # repo -> data/
 *   node scripts/bundle-catalog.mjs --out <dir> [--source <repo>] [--copies <file>]
 *   node scripts/bundle-catalog.mjs --verify [<dir>]    # check manifest + hashes
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = path.resolve(APP_ROOT, "../..");
const DEFAULT_OUT = path.join(APP_ROOT, "data");
const REGISTRY_REL = "commander/core/registry.yaml";
const AGENTS_REL = "commander/cowork-plugin/agents";
const HOOK_MAP_REL = "commander/adapters/codex/hook-event-map.json";
const COPIES_REL = "commander/scripts/copied-content.json";
const ROOT_NOTICES = ["LICENSE", "NOTICE.md"];
const MANIFEST = "manifest.json";

// Licenses whose redistribution cannot be vouched for in a hosted copy.
const REJECT_SPDX = new Set([
  "LicenseRef-Unverified",
  "UNKNOWN",
  "AGPL-3.0",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-2.1",
  "MPL-2.0",
  "LicenseRef-Anthropic-Proprietary",
]);

const REJECT_TEXT = [
  { re: /Anthropic, PBC\. All rights reserved/i, reason: "proprietary license text" },
  { re: /GNU AFFERO GENERAL PUBLIC LICENSE/i, reason: "AGPL license text" },
  { re: /GNU (LESSER )?GENERAL PUBLIC LICENSE/i, reason: "GPL license text" },
  { re: /Mozilla Public License/i, reason: "MPL license text" },
];

function fail(message) {
  console.error(`bundle-catalog: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { out: DEFAULT_OUT, source: DEFAULT_SOURCE, copies: null, verify: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--verify") {
      const next = argv[i + 1];
      opts.verify = next && !next.startsWith("--") ? path.resolve(argv[++i]) : DEFAULT_OUT;
    } else if (arg === "--out" || arg === "--source" || arg === "--copies") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail(`${arg} needs a path`);
      opts[arg.slice(2)] = path.resolve(value);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Repo-relative POSIX path is safe: relative, no "..", no NUL. */
function safeRel(rel) {
  if (typeof rel !== "string" || !rel || rel.includes("\0") || path.isAbsolute(rel)) return false;
  return !rel.split(/[\\/]/).includes("..");
}

/** Paths from the registry's top-level `skills:` section only. */
export function registrySkillPaths(raw) {
  const paths = [];
  let inSkills = false;
  for (const line of raw.split("\n")) {
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      inSkills = /^skills:\s*$/.test(line);
      continue;
    }
    if (!inSkills) continue;
    const m = line.match(/^    path:\s*(.+?)\s*$/);
    if (m) paths.push(m[1].replace(/^["']|["']$/g, ""));
  }
  return paths;
}

function frontmatterLicense(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return "";
  const line = m[1].split("\n").find((l) => /^license:/.test(l));
  return line ? line.replace(/^license:\s*/, "").trim() : "";
}

function siblingNoticeFiles(sourceRoot, skillRel) {
  const dirRel = path.posix.dirname(skillRel);
  const dir = path.join(sourceRoot, dirRel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^(LICENSE|LICENCE|NOTICE)(\.[a-z]+)?$/i.test(e.name))
    .map((e) => path.posix.join(dirRel, e.name));
}

function licenseGate(sourceRoot, skillRel, copies) {
  const copy = copies.get(skillRel);
  if (copy) {
    const spdx = copy.license && copy.license.trim() ? copy.license.trim() : "UNKNOWN";
    if (REJECT_SPDX.has(spdx)) return `copied-content.json license ${spdx}`;
  }
  const content = readFileSync(path.join(sourceRoot, skillRel), "utf8");
  const declared = frontmatterLicense(content);
  if (/proprietary|all rights reserved/i.test(declared)) return `frontmatter license "${declared}"`;
  for (const rel of siblingNoticeFiles(sourceRoot, skillRel)) {
    const text = readFileSync(path.join(sourceRoot, rel), "utf8");
    const hit = REJECT_TEXT.find((r) => r.re.test(text));
    if (hit) return `${hit.reason} in ${rel}`;
  }
  return null;
}

function loadCopies(file) {
  if (!existsSync(file)) fail(`copies provenance map not found: ${file}`);
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const map = new Map();
  for (const copy of parsed.copies ?? []) {
    if (copy && typeof copy.file === "string") map.set(copy.file.replace(/\\/g, "/"), copy);
  }
  return map;
}

function bundle(opts) {
  const sourceRoot = opts.source;
  const registryFile = path.join(sourceRoot, REGISTRY_REL);
  if (!existsSync(registryFile)) fail(`registry not found at ${registryFile}`);
  const copies = loadCopies(opts.copies ?? path.join(sourceRoot, COPIES_REL));

  const registryRaw = readFileSync(registryFile, "utf8");
  const version = (registryRaw.match(/^version:\s*(\S+)/m) ?? [])[1] ?? "unknown";
  const skillPaths = registrySkillPaths(registryRaw);
  if (skillPaths.length === 0) fail("registry skills: section is empty");

  const toCopy = new Set([REGISTRY_REL]);
  const excluded = [];
  let bundledSkills = 0;

  for (const rel of skillPaths) {
    if (!safeRel(rel)) {
      excluded.push({ path: String(rel), reason: "unsafe path" });
      continue;
    }
    if (!existsSync(path.join(sourceRoot, rel))) {
      excluded.push({ path: rel, reason: "missing in source" });
      continue;
    }
    const rejected = licenseGate(sourceRoot, rel, copies);
    if (rejected) {
      excluded.push({ path: rel, reason: rejected });
      continue;
    }
    toCopy.add(rel);
    for (const notice of siblingNoticeFiles(sourceRoot, rel)) toCopy.add(notice);
    bundledSkills += 1;
  }

  // Pack-level license directories (skills/<pack>/licenses/*).
  const skillsDir = path.join(sourceRoot, "skills");
  if (existsSync(skillsDir)) {
    for (const pack of readdirSync(skillsDir, { withFileTypes: true })) {
      const licensesDir = path.join(skillsDir, pack.name, "licenses");
      if (!pack.isDirectory() || !existsSync(licensesDir)) continue;
      for (const f of readdirSync(licensesDir, { withFileTypes: true })) {
        if (f.isFile()) toCopy.add(`skills/${pack.name}/licenses/${f.name}`);
      }
    }
  }

  let agents = 0;
  const agentsDir = path.join(sourceRoot, AGENTS_REL);
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir, { withFileTypes: true })) {
      if (f.isFile() && f.name.endsWith(".md")) {
        toCopy.add(`${AGENTS_REL}/${f.name}`);
        agents += 1;
      }
    }
  }
  if (existsSync(path.join(sourceRoot, HOOK_MAP_REL))) toCopy.add(HOOK_MAP_REL);
  for (const rel of ROOT_NOTICES) {
    if (!existsSync(path.join(sourceRoot, rel))) fail(`${rel} missing in source; refusing to bundle without it`);
    toCopy.add(rel);
  }

  rmSync(opts.out, { recursive: true, force: true });
  mkdirSync(opts.out, { recursive: true });

  const files = {};
  for (const rel of [...toCopy].sort()) {
    const from = path.join(sourceRoot, rel);
    const to = path.join(opts.out, rel);
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(from, to);
    files[rel] = { sha256: sha256(to), bytes: statSync(to).size };
  }

  const manifest = {
    schema: 1,
    source_version: version,
    counts: {
      registry_skills: skillPaths.length,
      bundled_skills: bundledSkills,
      excluded_skills: excluded.length,
      agents,
      files: Object.keys(files).length,
    },
    files,
    excluded,
  };
  writeFileSync(path.join(opts.out, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `bundle-catalog: ${bundledSkills}/${skillPaths.length} skills, ${agents} agents, ` +
      `${excluded.length} excluded, ${manifest.counts.files} files -> ${opts.out}`
  );
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

function verify(dir) {
  const manifestFile = path.join(dir, MANIFEST);
  if (!existsSync(manifestFile)) fail(`no ${MANIFEST} in ${dir}; run scripts/bundle-catalog.mjs first`);
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (manifest.schema !== 1 || !manifest.files || !manifest.counts) fail("manifest has an unknown shape");
  const problems = [];
  for (const [rel, meta] of Object.entries(manifest.files)) {
    const full = path.join(dir, rel);
    if (!safeRel(rel)) problems.push(`unsafe path ${rel}`);
    else if (!existsSync(full)) problems.push(`missing ${rel}`);
    else if (sha256(full) !== meta.sha256) problems.push(`sha256 mismatch ${rel}`);
  }
  for (const rel of listFiles(dir)) {
    if (rel !== MANIFEST && !manifest.files[rel]) problems.push(`unlisted file ${rel}`);
  }
  if (!manifest.files[REGISTRY_REL]) problems.push("registry missing from manifest");
  if (manifest.counts.bundled_skills + manifest.counts.excluded_skills !== manifest.counts.registry_skills) {
    problems.push("skill counts do not add up");
  }
  if (manifest.counts.bundled_skills < 1) problems.push("no skills bundled");
  if (problems.length) fail(`bundle verification failed:\n  ${problems.slice(0, 20).join("\n  ")}`);
  console.log(`bundle-catalog: verified ${Object.keys(manifest.files).length} files in ${dir}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.verify) verify(opts.verify);
  else bundle(opts);
}
