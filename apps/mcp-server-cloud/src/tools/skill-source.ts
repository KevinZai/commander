import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILLS_CATALOG } from "../lib/skills-catalog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");
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

let cachedRegistryRefs: RegistrySkillRef[] | null = null;

export function getRepoRoot(): string {
  return ROOT;
}

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
  if (cachedRegistryRefs) return cachedRegistryRefs;
  const registryPath = path.join(ROOT, "commander/core/registry.yaml");
  const refs: RegistrySkillRef[] = [];

  try {
    const raw = readFileSync(registryPath, "utf8");
    const lines = raw.split("\n");
    let current: Partial<RegistrySkillRef> | null = null;
    for (const line of lines) {
      if (line.match(/^  - id:/)) {
        if (current?.id && current.path) refs.push(current as RegistrySkillRef);
        const id = line.replace(/^  - id:\s*/, "").trim();
        current = { id, name: id, path: "" };
      } else if (current && line.match(/^    path:/)) {
        current.path = line.replace(/^    path:\s*/, "").trim();
      }
    }
    if (current?.id && current.path) refs.push(current as RegistrySkillRef);
  } catch {
    // Hosted images may omit the full source tree. Static catalog and direct
    // path candidates still allow command generation for known skills.
  }

  cachedRegistryRefs = refs;
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

  return [
    ...registryMatches,
    ...staticMatches,
    ...explicitPath,
    `skills/${normalized}/SKILL.md`,
    `commander/cowork-plugin/skills/${normalized}/SKILL.md`,
  ];
}

function skillRefMatches(skillName: string, skill: { id?: string; name: string; path: string }): boolean {
  const pathName = stripSkillMd(skill.path).split("/").pop();
  return skill.id === skillName || skill.name === skillName || pathName === skillName;
}

function safeResolve(relPath: string): string | null {
  const resolved = path.resolve(ROOT, relPath);
  if (!resolved.startsWith(ROOT + path.sep)) return null;
  return resolved;
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
