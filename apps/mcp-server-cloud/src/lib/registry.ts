// Registry-driven skill catalog.
// On cold start: reads commander/core/registry.yaml + skill files from skills/ dir.
// Rebuilds on SIGHUP or every 10 min. Fails gracefully if skills dir is absent.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger.js";

// Walk up from apps/mcp-server-cloud/src/lib/ → repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");
const REGISTRY_PATH = path.join(ROOT, "commander/core/registry.yaml");
const SKILLS_DIR = path.join(ROOT, "skills");
const AGENTS_DIR = path.join(ROOT, "commander/cowork-plugin/agents");

export type SkillEntry = {
  id: string;
  name: string;
  domain: string;
  tier: "free" | "pro";
  description: string;
  path: string;
};

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

// Parse minimal YAML subset (key: value, list items with -)
function parseYamlRegistry(raw: string): SkillEntry[] {
  const skills: SkillEntry[] = [];
  const lines = raw.split("\n");
  let current: Partial<SkillEntry> | null = null;

  for (const line of lines) {
    if (line.match(/^  - id:/)) {
      if (current?.id) skills.push(current as SkillEntry);
      const id = line.replace(/^  - id:\s*/, "").trim();
      current = { id, name: id, domain: "general", tier: "free", description: "", path: "" };
    } else if (current && line.match(/^    path:/)) {
      current.path = line.replace(/^    path:\s*/, "").trim();
    } else if (current && line.match(/^    domain:/)) {
      current.domain = line.replace(/^    domain:\s*/, "").trim() || "general";
    } else if (current && line.match(/^    tier:/)) {
      const tier = line.replace(/^    tier:\s*/, "").trim();
      current.tier = tier === "pro" ? "pro" : "free";
    } else if (current && line.match(/^    description:/)) {
      const raw_desc = line.replace(/^    description:\s*/, "").trim().replace(/^["']|["']$/g, "");
      current.description = raw_desc;
    }
  }
  if (current?.id) skills.push(current as SkillEntry);
  return skills;
}

async function loadSkillDescriptions(skills: SkillEntry[]): Promise<SkillEntry[]> {
  if (!existsSync(SKILLS_DIR)) return skills;

  const enriched = await Promise.all(
    skills.map(async (skill) => {
      if (skill.description && !skill.description.startsWith("name:")) return skill;
      const skillMdPath = path.join(ROOT, skill.path);
      try {
        const content = await readFile(skillMdPath, "utf8");
        const lines = content.split("\n");
        let description = "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("**")) {
            description = trimmed.slice(0, 150);
            break;
          }
        }
        return { ...skill, description: description || skill.name };
      } catch {
        return skill;
      }
    })
  );
  return enriched;
}

async function loadAgentsFromFs(): Promise<AgentEntry[]> {
  if (!existsSync(AGENTS_DIR)) return STATIC_AGENTS;
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    const agents: AgentEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const name = entry.name.replace(".md", "");
      const existing = STATIC_AGENTS.find((a) => a.name === name);
      const content = await readFile(path.join(AGENTS_DIR, entry.name), "utf8").catch(() => "");
      let description = existing?.description ?? "";
      if (!description) {
        const lines = content.split("\n");
        for (const line of lines) {
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
    let skills: SkillEntry[] = [];
    if (existsSync(REGISTRY_PATH)) {
      const raw = await readFile(REGISTRY_PATH, "utf8");
      skills = parseYamlRegistry(raw);
      skills = await loadSkillDescriptions(skills);
      logger.info({ count: skills.length }, "Registry loaded");
    } else {
      logger.warn({ path: REGISTRY_PATH }, "registry.yaml not found — using empty catalog");
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
  }

  process.on("SIGHUP", () => {
    logger.info("SIGHUP received — rebuilding registry");
    buildIndex().catch((err) => logger.error({ err }, "SIGHUP registry rebuild failed"));
  });
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
  const fullPath = path.join(ROOT, skill.path);
  try {
    return await readFile(fullPath, "utf8");
  } catch {
    return null;
  }
}

export async function getAgentContent(agentName: string): Promise<string | null> {
  const resolved = path.resolve(AGENTS_DIR, `${agentName}.md`);
  if (!resolved.startsWith(path.resolve(AGENTS_DIR) + path.sep)) {
    return null;
  }
  try {
    return await readFile(resolved, "utf8");
  } catch {
    return null;
  }
}
