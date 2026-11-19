import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SKILLS_CATALOG } from "../lib/skills-catalog.js";
import { REGISTRY_REL, contentPath, contentRoot } from "../lib/content-root.js";
import { parseRegistrySkills } from "../lib/registry-parse.js";

const SAFE_SKILL_LOOKUP = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,160}$/;

export type ResolvedSkillSource = {
  id: string;
  name: string;
  path: string;
  sourceDir: string;
  fullPath: string;
  exists: boolean;
};

type RegistrySkillRef = {
  id: string;
  name: string;
  path: string;
};

let cachedRegistryRefs: { root: string; refs: RegistrySkillRef[] } | null = null;

export function isSafeSkillLookup(skillName: string): boolean {
  if (!SAFE_SKILL_LOOKUP.test(skillName)) return false;
  if (skillName.includes("..")) return false;
  return !path.isAbsolute(skillName);
}

function normalizeSkillName(skillName: string): string {
  return skillName.trim().replace(/^\/+|\/+$/g, "");
}

function stripSkillMd(relPath: string): string {
  return relPath.replace(/\/SKILL\.md$/i, "");
}

function loadRegistryRefs(): RegistrySkillRef[] {
  const root = contentRoot() ?? "";
  if (cachedRegistryRefs && cachedRegistryRefs.root === root) return cachedRegistryRefs.refs;
  let refs: RegistrySkillRef[] = [];

  const registryPath = contentPath(REGISTRY_REL);
  if (registryPath) {
    try {
      refs = parseRegistrySkills(readFileSync(registryPath, "utf8"))
        .filter((skill) => skill.path)
        .map((skill) => ({ id: skill.id, name: skill.name, path: skill.path }));
    } catch {
      // No registry: the static catalog and direct path candidates still
      // allow command generation for known skills.
    }
  }

  cachedRegistryRefs = { root, refs };
  return refs;
}

function candidatePaths(skillName: string): string[] {
  const normalized = normalizeSkillName(skillName);
  const registryMatches = loadRegistryRefs()
    .filter((skill) => {
      const pathName = stripSkillMd(skill.path).split("/").pop();
      return skill.id === normalized || skill.name === normalized || pathName === normalized;
    })
    .map((skill) => skill.path);

  const staticMatches = SKILLS_CATALOG.filter((skill) => {
    const pathName = stripSkillMd(skill.path).split("/").pop();
    return skill.name === normalized || pathName === normalized;
  }).map((skill) => skill.path);

  const explicitPath = normalized.endsWith("/SKILL.md") ? [normalized] : [];

  // A bare name such as "build" also resolves to the plugin skill /ccc-build,
  // which is how users refer to plugin workflows in the hosted tools.
  const pluginAlias = normalized.startsWith("ccc-") || normalized.includes("/")
    ? []
    : [`commander/cowork-plugin/skills/ccc-${normalized}/SKILL.md`];

  return [
    ...registryMatches,
    ...staticMatches,
    ...explicitPath,
    `skills/${normalized}/SKILL.md`,
    `commander/cowork-plugin/skills/${normalized}/SKILL.md`,
    ...pluginAlias,
  ];
}

function skillRefMatches(skillName: string, skill: { id?: string; name: string; path: string }): boolean {
  const pathName = stripSkillMd(skill.path).split("/").pop();
  return skill.id === skillName || skill.name === skillName || pathName === skillName;
}

function safeResolve(relPath: string): string | null {
  // path.relative containment inside the content root (lib/content-root.ts).
  return contentPath(relPath);
}

export function resolveSkillSource(skillName: string): ResolvedSkillSource | null {
  const normalized = normalizeSkillName(skillName);
  if (!isSafeSkillLookup(normalized)) return null;
  const knownByRegistry = loadRegistryRefs().some((skill) => skillRefMatches(normalized, skill));
  const knownByStaticCatalog = SKILLS_CATALOG.some((skill) => skillRefMatches(normalized, skill));
  const knownPluginCommand = normalized.startsWith("ccc-");

  const seen = new Set<string>();
  const candidates = candidatePaths(normalized).filter((candidate) => {
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });

  let firstSafe: ResolvedSkillSource | null = null;
  for (const relPath of candidates) {
    const fullPath = safeResolve(relPath);
    if (!fullPath) continue;
    const source: ResolvedSkillSource = {
      id: normalized,
      name: normalized.split("/").pop() ?? normalized,
      path: relPath,
      sourceDir: stripSkillMd(relPath),
      fullPath,
      exists: existsSync(fullPath),
    };
    if (!firstSafe) firstSafe = source;
    if (source.exists) return source;
  }

  return knownByRegistry || knownByStaticCatalog || knownPluginCommand ? firstSafe : null;
}
