// Registry-driven skill catalog.
// Reads the registry's `skills:` section, SKILL.md bodies and agent files from
// the content root (lib/content-root.ts): a repo checkout in dev, the bundled
// data/ dir (scripts/bundle-catalog.mjs) in production. No network fetch.
// Rebuilds on SIGHUP or every 10 min. An absent content root yields an empty
// catalog and an error log, never a crash.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { logger } from "./logger.js";
import { AGENTS_REL, REGISTRY_REL, contentPath, resolveContentRoot } from "./content-root.js";
import { frontmatterDescription, parseRegistrySkills, type SkillEntry } from "./registry-parse.js";

export { frontmatterDescription, parseRegistrySkills, type SkillEntry };

export type AgentEntry = {
  name: string;
  tier: "free" | "pro";
  description: string;
  githubUrl: string;
};

type RegistryState = {
  skills: SkillEntry[];
  agents: AgentEntry[];
  loadedAt: number;
  skillsLoaded: number;
  agentsLoaded: number;
  uptimeStart: number;
};

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const STATIC_AGENTS: AgentEntry[] = [
  { name: "reviewer", tier: "free", description: "Severity-rated code reviewer. Files P0-P3 findings with fix suggestions.", githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/reviewer.md" },
  { name: "builder", tier: "free", description: "MVP-first implementer. Ships the simplest thing that works.", githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/builder.md" },
  { name: "researcher", tier: "free", description: "Source-cited analyst. Facts, inferences, and opinions are always separated.", githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/researcher.md" },
  { name: "debugger", tier: "free", description: "Root-cause detective. Iron Law: no fix without confirmed root cause.", githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/debugger.md" },
  { name: "fleet-worker", tier: "free", description: "Strict-report executor. Non-overlapping file domains. Structured output.", githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/fleet-worker.md" },
];

let state: RegistryState = {
  skills: [],
  agents: STATIC_AGENTS,
  loadedAt: 0,
  skillsLoaded: 0,
  agentsLoaded: 0,
  uptimeStart: Date.now(),
};

async function loadSkillDescriptions(skills: SkillEntry[]): Promise<SkillEntry[]> {
  return Promise.all(
    skills.map(async (skill) => {
      if (skill.description && !skill.description.startsWith("name:")) return skill;
      const file = contentPath(skill.path);
      if (!file) return { ...skill, description: skill.name };
      try {
        const description = frontmatterDescription(await readFile(file, "utf8"));
        return { ...skill, description: (description || skill.name).slice(0, 300) };
      } catch {
        return { ...skill, description: skill.name };
      }
    })
  );
}

async function loadAgentsFromFs(): Promise<AgentEntry[]> {
  const agentsDir = contentPath(AGENTS_REL);
  if (!agentsDir || !existsSync(agentsDir)) return STATIC_AGENTS;
  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    const agents: AgentEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const name = entry.name.replace(".md", "");
      const existing = STATIC_AGENTS.find((a) => a.name === name);
      const agentFile = contentPath(`${AGENTS_REL}/${entry.name}`);
      const content = agentFile ? await readFile(agentFile, "utf8").catch(() => "") : "";
      let description = existing?.description ?? "";
      if (!description) {
        description = frontmatterDescription(content);
      }
      if (!description) {
        for (const line of content.split("\n")) {
          const t = line.trim();
          if (t && !t.startsWith("#") && !t.startsWith("---") && !t.startsWith("**")) {
            description = t.slice(0, 150);
            break;
          }
        }
      }
      agents.push({
        name,
        tier: existing?.tier ?? "free",
        description: description || name,
        githubUrl: `https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/${entry.name}`,
      });
    }
    return agents.length > 0 ? agents : STATIC_AGENTS;
  } catch {
    return STATIC_AGENTS;
  }
}

async function buildIndex(): Promise<void> {
  try {
    const resolved = resolveContentRoot();
    const registryFile = contentPath(REGISTRY_REL);
    let skills: SkillEntry[] = [];

    if (!resolved || !registryFile || !existsSync(registryFile)) {
      logger.error(
        { contentRoot: resolved?.root ?? null },
        "No content root with a registry (bundle missing?) — serving an empty skill catalog"
      );
    } else {
      skills = await loadSkillDescriptions(parseRegistrySkills(await readFile(registryFile, "utf8")));
      logger.info({ count: skills.length, mode: resolved.mode }, "Registry loaded");
    }

    const agents = await loadAgentsFromFs();

    state = {
      ...state,
      skills,
      agents,
      loadedAt: Date.now(),
      skillsLoaded: skills.length,
      agentsLoaded: agents.length,
    };
  } catch (err) {
    logger.error({ err }, "Registry build failed — keeping previous state");
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

export function getSkills(): SkillEntry[] {
  return state.skills;
}

export function getAgents(): AgentEntry[] {
  return state.agents;
}

export function getRegistryState() {
  return {
    skillsLoaded: state.skillsLoaded,
    agentsLoaded: state.agentsLoaded,
    uptimeSeconds: Math.floor((Date.now() - state.uptimeStart) / 1000),
    lastRefreshed: state.loadedAt,
  };
}

export async function getSkillContent(skillId: string): Promise<string | null> {
  const skill = state.skills.find((s) => s.id === skillId || s.name === skillId);
  if (!skill?.path) return null;
  // Null for skills the bundle's license gate excluded (file not bundled).
  const fullPath = contentPath(skill.path);
  if (!fullPath) return null;
  try {
    return await readFile(fullPath, "utf8");
  } catch {
    return null;
  }
}

const AGENT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;

export async function getAgentContent(agentName: string): Promise<string | null> {
  if (!AGENT_NAME_RE.test(agentName)) return null;
  const resolved = contentPath(`${AGENTS_REL}/${agentName}.md`);
  if (!resolved) return null;
  try {
    return await readFile(resolved, "utf8");
  } catch {
    return null;
  }
}
