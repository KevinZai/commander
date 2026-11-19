// Content root — the one place the hosted server decides where skill bodies,
// agents and the registry come from. Nothing is fetched over the network.
//
// Resolution, first match wins:
//   1. CCC_CONTENT_ROOT — must be a bundle (contains manifest.json).
//   2. A repo checkout around the app (dev / tests): <repo>/commander/core/registry.yaml.
//   3. The bundled data/ dir next to dist/ (production image), which must hold
//      manifest.json written by scripts/bundle-catalog.mjs.
// No match → null; callers serve an empty catalog and log it.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // src/lib or dist/lib
export const APP_ROOT = path.resolve(HERE, "../..");
const REPO_CANDIDATE = path.resolve(APP_ROOT, "../..");
export const BUNDLED_DATA_DIR = path.join(APP_ROOT, "data");
export const REGISTRY_REL = "commander/core/registry.yaml";
export const AGENTS_REL = "commander/cowork-plugin/agents";
export const PLUGIN_SKILLS_REL = "commander/cowork-plugin/skills";
export const MANIFEST_FILE = "manifest.json";

export type ContentMode = "env" | "repo" | "bundle";
export type ContentRoot = { root: string; mode: ContentMode };

let cache: { key: string; value: ContentRoot | null } | null = null;

export function resolveContentRoot(): ContentRoot | null {
  const override = process.env.CCC_CONTENT_ROOT ?? "";
  if (cache && cache.key === override) return cache.value;

  let value: ContentRoot | null = null;
  if (override) {
    const root = path.resolve(override);
    value = existsSync(path.join(root, MANIFEST_FILE)) ? { root, mode: "env" } : null;
  } else if (existsSync(path.join(REPO_CANDIDATE, REGISTRY_REL))) {
    value = { root: REPO_CANDIDATE, mode: "repo" };
  } else if (existsSync(path.join(BUNDLED_DATA_DIR, MANIFEST_FILE))) {
    value = { root: BUNDLED_DATA_DIR, mode: "bundle" };
  }
  cache = { key: override, value };
  return value;
}

/** Test hook: forget the cached resolution. */
export function resetContentRootCache(): void {
  cache = null;
}

export function contentRoot(): string | null {
  return resolveContentRoot()?.root ?? null;
}

/**
 * Resolve a repo-relative path inside `root`. Rejects absolute paths, NUL
 * bytes and anything whose path.relative from the root escapes it.
 */
export function resolveWithin(root: string, relPath: string): string | null {
  if (typeof relPath !== "string" || relPath.length === 0 || relPath.includes("\0")) return null;
  if (path.isAbsolute(relPath) || path.win32.isAbsolute(relPath)) return null;
  const full = path.resolve(root, relPath);
  const relative = path.relative(root, full);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return full;
}

/** Resolve inside the active content root; null when there is none or the path escapes. */
export function contentPath(relPath: string): string | null {
  const root = contentRoot();
  return root ? resolveWithin(root, relPath) : null;
}

export type BundleManifest = {
  schema: number;
  source_version: string;
  counts: Record<string, number>;
  excluded: Array<{ path: string; reason: string }>;
};

/** Manifest of the active bundle, or null in repo mode / when unreadable. */
export function readManifest(): BundleManifest | null {
  const resolved = resolveContentRoot();
  if (!resolved || resolved.mode === "repo") return null;
  try {
    return JSON.parse(readFileSync(path.join(resolved.root, MANIFEST_FILE), "utf8")) as BundleManifest;
  } catch {
    return null;
  }
}
