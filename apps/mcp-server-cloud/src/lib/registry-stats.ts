// Runtime-derived counts for the hosted MCP's metadata advertising.
// Pulls live numbers from the registry + filesystem so docstrings and discovery
// payloads stay honest as the catalog grows. Cached for the process lifetime
// after first call (counts only change on restart or SIGHUP).

import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { getRegistryState } from "./registry.js";
import { TOOL_NAMES } from "../tools/index.js";
import { AGENTS_REL, PLUGIN_SKILLS_REL, contentPath } from "./content-root.js";

let cachedPluginSkills: number | null = null;
let cachedPluginAgents: number | null = null;

function countMarkdownDirs(dir: string | null): number {
  if (!dir || !existsSync(dir)) return 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    let n = 0;
    for (const e of entries) {
      if (e.isDirectory()) n++;
      else if (e.isFile() && e.name.endsWith(".md")) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

export function getToolCount(): number {
  return TOOL_NAMES.length;
}

export function getEcosystemSkillCount(): number {
  // Skills tracked in commander/core/registry.yaml — the broad CCC catalog.
  return getRegistryState().skillsLoaded;
}

export function getPluginSkillCount(): number {
  if (cachedPluginSkills !== null) return cachedPluginSkills;
  cachedPluginSkills = countMarkdownDirs(contentPath(PLUGIN_SKILLS_REL));
  return cachedPluginSkills;
}

export function getAgentCount(): number {
  // Prefer registry-derived count; fall back to plugin agents dir scan.
  const reg = getRegistryState().agentsLoaded;
  if (reg > 0) return reg;
  if (cachedPluginAgents !== null) return cachedPluginAgents;
  cachedPluginAgents = countMarkdownDirs(contentPath(AGENTS_REL));
  return cachedPluginAgents;
}

export function getServerTagline(): string {
  const ecosystem = getEcosystemSkillCount();
  const plugin = getPluginSkillCount();
  const tools = getToolCount();
  // Show the bigger number when ecosystem is loaded; fall back to plugin-only otherwise.
  const skillBlurb = ecosystem > 0 ? `${ecosystem}+ skills` : `${plugin} plugin skills`;
  return `${skillBlurb}. ${tools} tools. Every AI IDE.`;
}

export function getSearchSkillBlurb(): string {
  const ecosystem = getEcosystemSkillCount();
  const plugin = getPluginSkillCount();
  const count = ecosystem > 0 ? `${ecosystem}+` : `${plugin}`;
  return `Search across ${count} skills — returns ranked matches with relevance scores.`;
}
