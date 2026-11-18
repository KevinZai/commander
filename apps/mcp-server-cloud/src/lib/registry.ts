// Registry-driven skill and agent catalog.
//
// Two local sources, never the network:
//   - "repo":   a repository checkout (development and tests). Reads
//               commander/core/registry.yaml and resolves each listed path
//               against the real source roots (repo root, then
//               commander/cowork-plugin/), so either path spelling works.
//   - "bundle": the release-pinned data/ directory baked into the image by
//               scripts/bundle-catalog.mjs (manifest.json + skill/agent bodies).
// COMMANDER_CATALOG_DIR forces bundle mode from that directory. When neither
// source exists the catalog is empty and /health reports it as unavailable;
// there is no fallback agent list and no remote index.
//
// Rebuilds on SIGHUP or every 10 min.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Walk up from apps/mcp-server-cloud/{src,dist}/lib/ → repo root
const ROOT = path.resolve(HERE, "../../../../");
const REGISTRY_PATH = path.join(ROOT, "commander/core/registry.yaml");
const PLUGIN_ROOT_REL = "commander/cowork-plugin";
const AGENTS_DIR_REL = `${PLUGIN_ROOT_REL}/agents`;
const BUNDLED_DATA_DIR = path.resolve(HERE, "../../data");

export type SkillEntry = {
  id: string;
  name: string;
  domain: string;
  tier: "free" | "pro";
  description: string;
  /** Repo-relative path of the resolved source file (used for GitHub links). */
  path: string;
};

export type AgentEntry = {
  name: string;
  tier: "free" | "pro";
  description: string;
  githubUrl: string;
};

export type CatalogSource = "repo" | "bundle" | "none";
export type SkillOrigin = "plugin" | "ecosystem";

type InternalSkill = SkillEntry & { contentFile: string; licenseFile: string | null; origin: SkillOrigin };

const LICENSE_NAMES = ["LICENSE.txt", "LICENSE", "LICENSE.md"];

/** A LICENSE beside the skill's SKILL.md, else in its pack dir; absolute path or null. */
function findLicenseFile(contentFile: string): string | null {
  const dir = path.dirname(contentFile);
  const dirs = [dir];
  const parent = path.dirname(dir);
  if (path.basename(parent) !== "skills" && parent !== dir) dirs.push(parent);
  for (const d of dirs) {
    for (const name of LICENSE_NAMES) {
      const file = path.join(d, name);
      if (existsSync(file)) return file;
    }
  }
  return null;
}
type InternalAgent = AgentEntry & { contentFile: string };

type RegistryState = {
  source: CatalogSource;
  release: string | null;
  gitCommit: string | null;
  skills: InternalSkill[];
  agents: InternalAgent[];
  skillsMissingContent: string[];
  loadedAt: number;
  uptimeStart: number;
};

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

let state: RegistryState = {
  source: "none",
  release: null,
  gitCommit: null,
  skills: [],
  agents: [],
  skillsMissingContent: [],
  loadedAt: 0,
  uptimeStart: Date.now(),
};

// ─── Parsing helpers (mirrored by scripts/bundle-catalog.mjs) ───────────────

type RawEntry = { id: string; name: string; path: string; source: string; domain: string; tier: "free" | "pro"; description: string };

/** Strips YAML quotes; double-quoted values are JSON-parsed so escapes survive. */
function unquote(value: string): string {
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

/** Parses only the `skills:` and `agents:` sections; other sections' ids are ignored. */
export function parseRegistrySections(raw: string): { version: string; skills: RawEntry[]; agents: RawEntry[] } {
  const out = { version: "", skills: [] as RawEntry[], agents: [] as RawEntry[] };
  let section = "";
  let current: RawEntry | null = null;
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
    if (current && field) {
      const key = field[1] as "name" | "path" | "source" | "domain" | "tier" | "description";
      const value = unquote(field[2]);
      if (key === "tier") current.tier = value === "pro" ? "pro" : "free";
      else if (key === "domain") current.domain = value || "general";
      else current[key] = value;
    }
  }
  flush();
  return out;
}

function isSafeRelative(rel: string): boolean {
  return rel.length > 0 && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes("..");
}

/** Resolves a registry path against the repo root, then commander/cowork-plugin/. */
export function resolveSourcePath(repoRoot: string, rel: string): string | null {
  if (!isSafeRelative(rel)) return null;
  const candidates = [rel];
  if (!rel.startsWith(`${PLUGIN_ROOT_REL}/`)) candidates.push(`${PLUGIN_ROOT_REL}/${rel}`);
  for (const candidate of candidates) {
    if (existsSync(path.join(repoRoot, candidate))) return candidate;
  }
  return null;
}

export function frontmatterDescription(content: string): string {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return "";
  const lines = fm[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/);
    if (!m) continue;
    const value = m[1].trim();
    if (value && !/^[>|][+-]?$/.test(value)) return unquote(value).slice(0, 300);
    const block: string[] = [];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) block.push(lines[j].trim());
    return block.join(" ").slice(0, 300);
  }
  return "";
}

/** Registry `source:` when present (plugin | ecosystem), else inferred from the resolved path. */
function originOf(declared: string | undefined, sourceRel: string): SkillOrigin {
  if (declared === "plugin" || declared === "ecosystem") return declared;
  return sourceRel.startsWith(`${PLUGIN_ROOT_REL}/skills/`) ? "plugin" : "ecosystem";
}

function agentGithubUrl(sourceRel: string): string {
  return `https://github.com/KevinZai/commander/blob/main/${sourceRel}`;
}

// ─── Loaders ────────────────────────────────────────────────────────────────

type Loaded = Pick<RegistryState, "source" | "release" | "gitCommit" | "skills" | "agents">;

async function loadFromRepo(repoRoot: string): Promise<Loaded> {
  const raw = await readFile(path.join(repoRoot, "commander/core/registry.yaml"), "utf8");
  const parsed = parseRegistrySections(raw);

  const skills: InternalSkill[] = [];
  const seen = new Set<string>();
  for (const entry of parsed.skills) {
    if (seen.has(entry.id)) continue; // generated registry can repeat an entry
    seen.add(entry.id);
    const source = resolveSourcePath(repoRoot, entry.path) ?? entry.path;
    const contentFile = path.join(repoRoot, source);
    let description = entry.description.startsWith("name:") ? "" : entry.description;
    if (!description) {
      description = frontmatterDescription(await readFile(contentFile, "utf8").catch(() => ""));
    }
    skills.push({
      id: entry.id,
      name: entry.name || entry.id,
      domain: entry.domain,
      tier: entry.tier,
      description: description || entry.name || entry.id,
      path: source,
      contentFile,
      licenseFile: findLicenseFile(contentFile),
      origin: originOf(entry.source, source),
    });
  }

  let agentEntries = parsed.agents;
  if (agentEntries.length === 0) {
    // Older registries have no agents section: scan the plugin agents dir.
    const dir = path.join(repoRoot, AGENTS_DIR_REL);
    const files = existsSync(dir) ? await readdir(dir) : [];
    agentEntries = files
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ id: f.slice(0, -3), name: "", path: `${AGENTS_DIR_REL}/${f}`, source: "", domain: "", tier: "free" as const, description: "" }));
  }
  const agents: InternalAgent[] = [];
  for (const entry of agentEntries) {
    const source = resolveSourcePath(repoRoot, entry.path || `agents/${entry.id}.md`);
    if (!source) continue;
    const contentFile = path.join(repoRoot, source);
    const content = await readFile(contentFile, "utf8").catch(() => "");
    agents.push({
      name: entry.id,
      tier: entry.tier,
      description: frontmatterDescription(content) || entry.id,
      githubUrl: agentGithubUrl(source),
      contentFile,
    });
  }

  return { source: "repo", release: parsed.version || null, gitCommit: null, skills, agents };
}

type ManifestEntry = {
  id?: string;
  name?: string;
  domain?: string;
  tier?: string;
  description?: string;
  source: string;
  origin?: string;
  bundled: string;
  licenseBundled?: string;
};

async function loadFromBundle(dataDir: string): Promise<Loaded> {
  const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as {
    release?: string;
    gitCommit?: string | null;
    skills?: ManifestEntry[];
    agents?: ManifestEntry[];
  };
  const safeFile = (rel: string) => {
    if (!isSafeRelative(rel)) throw new Error(`unsafe bundled path ${rel}`);
    return path.join(dataDir, rel);
  };
  const skills: InternalSkill[] = (manifest.skills ?? []).map((s) => ({
    id: String(s.id),
    name: s.name || String(s.id),
    domain: s.domain || "general",
    tier: s.tier === "pro" ? "pro" : "free",
    description: s.description || String(s.id),
    path: s.source,
    contentFile: safeFile(s.bundled),
    licenseFile: s.licenseBundled ? safeFile(s.licenseBundled) : null,
    origin: originOf(s.origin, s.source),
  }));
  const agents: InternalAgent[] = (manifest.agents ?? []).map((a) => ({
    name: String(a.name),
    tier: a.tier === "pro" ? "pro" : "free",
    description: a.description || String(a.name),
    githubUrl: agentGithubUrl(a.source),
    contentFile: safeFile(a.bundled),
  }));
  return { source: "bundle", release: manifest.release ?? null, gitCommit: manifest.gitCommit ?? null, skills, agents };
}

/** Which local source this process would load from. Exported for tests. */
export function selectCatalogSource(): { source: CatalogSource; location: string | null } {
  const forced = process.env.COMMANDER_CATALOG_DIR;
  if (forced) {
    const dir = path.resolve(forced);
    return existsSync(path.join(dir, "manifest.json")) ? { source: "bundle", location: dir } : { source: "none", location: dir };
  }
  if (existsSync(REGISTRY_PATH)) return { source: "repo", location: ROOT };
  if (existsSync(path.join(BUNDLED_DATA_DIR, "manifest.json"))) return { source: "bundle", location: BUNDLED_DATA_DIR };
  return { source: "none", location: null };
}

async function buildIndex(): Promise<void> {
  try {
    const selected = selectCatalogSource();
    let loaded: Loaded;
    if (selected.source === "repo") loaded = await loadFromRepo(selected.location!);
    else if (selected.source === "bundle") loaded = await loadFromBundle(selected.location!);
    else {
      logger.error({ location: selected.location }, "No local catalog found (no repo registry, no data/manifest.json) — serving an empty catalog");
      loaded = { source: "none", release: null, gitCommit: null, skills: [], agents: [] };
    }

    const skillsMissingContent = loaded.skills.filter((s) => !existsSync(s.contentFile)).map((s) => s.id);
    if (skillsMissingContent.length > 0) {
      logger.error({ count: skillsMissingContent.length, sample: skillsMissingContent.slice(0, 5) }, "Catalog skills without readable content");
    }

    state = { ...state, ...loaded, skillsMissingContent, loadedAt: Date.now() };
    logger.info(
      { source: loaded.source, release: loaded.release, skills: loaded.skills.length, agents: loaded.agents.length },
      "Registry loaded"
    );
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Registry build failed — keeping previous state");
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export async function initRegistry(): Promise<void> {
  await buildIndex();

  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      buildIndex().catch((err) => logger.error({ err }, "Registry refresh failed"));
    }, REFRESH_INTERVAL_MS);
    refreshTimer.unref();

    process.on("SIGHUP", () => {
      logger.info("SIGHUP received — rebuilding registry");
      buildIndex().catch((err) => logger.error({ err }, "SIGHUP registry rebuild failed"));
    });
  }
}

/** Rebuilds the index now. Exported for tests. */
export async function reloadRegistry(): Promise<void> {
  await buildIndex();
}

const publicSkill = ({ contentFile: _c, licenseFile: _l, origin: _o, ...rest }: InternalSkill): SkillEntry => rest;
const publicAgent = ({ contentFile: _c, ...rest }: InternalAgent): AgentEntry => rest;

export function getSkills(): SkillEntry[] {
  return state.skills.map(publicSkill);
}

export function getAgents(): AgentEntry[] {
  return state.agents.map(publicAgent);
}

export type CatalogHealth = {
  ok: boolean;
  problems: string[];
  source: CatalogSource;
  release: string | null;
  gitCommit: string | null;
  skillsLoaded: number;
  pluginSkills: number;
  ecosystemSkills: number;
  skillsMissingContent: number;
  agentsLoaded: number;
};

/** Readiness of the catalog: non-empty skills and agents, and every listed skill body readable. */
export function getCatalogHealth(): CatalogHealth {
  const problems: string[] = [];
  if (state.source === "none") problems.push("no_catalog_source");
  if (state.skills.length === 0) problems.push("zero_skills");
  if (state.agents.length === 0) problems.push("zero_agents");
  if (state.skillsMissingContent.length > 0) problems.push("skill_content_missing");
  return {
    ok: problems.length === 0,
    problems,
    source: state.source,
    release: state.release,
    gitCommit: state.gitCommit,
    skillsLoaded: state.skills.length,
    pluginSkills: state.skills.filter((s) => s.origin === "plugin").length,
    ecosystemSkills: state.skills.filter((s) => s.origin === "ecosystem").length,
    skillsMissingContent: state.skillsMissingContent.length,
    agentsLoaded: state.agents.length,
  };
}

export function getRegistryState() {
  return {
    skillsLoaded: state.skills.length,
    agentsLoaded: state.agents.length,
    uptimeSeconds: Math.floor((Date.now() - state.uptimeStart) / 1000),
    lastRefreshed: state.loadedAt,
  };
}

/**
 * Finds a skill the way tools/skill-source.ts does: exact id first, then the
 * first registry row whose `name` or last path directory matches, so bare
 * lookups such as `ccc-data` still resolve after ids gained source prefixes.
 */
export function findSkill(lookup: string): SkillEntry | null {
  const skill = findInternalSkill(lookup);
  return skill ? publicSkill(skill) : null;
}

function findInternalSkill(lookup: string): InternalSkill | undefined {
  const key = lookup.trim().replace(/^\/+|\/+$/g, "");
  if (!key) return undefined;
  return (
    state.skills.find((s) => s.id === key) ??
    state.skills.find((s) => s.name === key || s.path.replace(/\/SKILL\.md$/i, "").split("/").pop() === key)
  );
}

export async function getSkillContent(skillId: string): Promise<string | null> {
  const skill = findInternalSkill(skillId);
  if (!skill) return null;
  try {
    return await readFile(skill.contentFile, "utf8");
  } catch {
    return null;
  }
}

/** The license notice shipped with a copied skill, or null when it has none. */
export async function getSkillLicense(skillId: string): Promise<string | null> {
  const skill = findInternalSkill(skillId);
  if (!skill?.licenseFile) return null;
  try {
    return await readFile(skill.licenseFile, "utf8");
  } catch {
    return null;
  }
}

/** Source commit of the served catalog, when known (bundle builds record it). */
export function getCatalogCommit(): string | null {
  return state.gitCommit;
}

export async function getAgentContent(agentName: string): Promise<string | null> {
  const agent = state.agents.find((a) => a.name === agentName);
  if (!agent) return null;
  try {
    return await readFile(agent.contentFile, "utf8");
  } catch {
    return null;
  }
}
