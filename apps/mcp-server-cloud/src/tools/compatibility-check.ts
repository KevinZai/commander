import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRepoRoot, resolveSkillSource } from "./skill-source.js";
import type { TargetEnv } from "./install-skill.js";
import { TARGET_ENVS } from "./install-skill.js";

export type CompatibilityCheckArgs = {
  skill_name: string;
  target_env: TargetEnv;
};

export type CompatibilityCheckResult = {
  compatible: boolean;
  missing_capabilities: string[];
  required_hooks: string[];
  required_mcps: string[];
  notes: string;
};

type EnvCapabilities = {
  tools: ReadonlySet<string>;
  hooks: ReadonlySet<string>;
  mcps: ReadonlySet<string>;
  notes: string;
};

type CodexHookMap = {
  events: Record<string, { codex: string | null; status: string; note?: string }>;
};

const HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "SubagentStop",
  "Notification",
  "PreCompact",
  "SessionEnd",
  "PermissionRequest",
] as const;

const COMMON_CLAUDE_TOOLS = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "Bash",
  "Glob",
  "Grep",
  "LS",
  "Agent",
  "Task",
  "AskUserQuestion",
  "TodoWrite",
  "EnterPlanMode",
  "ExitPlanMode",
  "WebFetch",
  "WebSearch",
]);

const CODEX_TOOLS = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "Bash",
  "Glob",
  "Grep",
  "LS",
  "TodoWrite",
  "WebFetch",
  "WebSearch",
]);

const CURSOR_TOOLS = new Set(["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebFetch", "WebSearch"]);

const ENV_CAPABILITIES: Record<TargetEnv, EnvCapabilities> = {
  "claude-cli": {
    tools: COMMON_CLAUDE_TOOLS,
    hooks: new Set(["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStop", "Notification", "PreCompact"]),
    mcps: new Set(["context7", "sequential-thinking"]),
    notes: "Claude CLI supports Claude-style tools and lifecycle hooks. Desktop-only plan UI hooks are not guaranteed.",
  },
  "claude-desktop": {
    tools: COMMON_CLAUDE_TOOLS,
    hooks: new Set(["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStop", "Notification", "PreCompact"]),
    mcps: new Set(["context7", "sequential-thinking", "ccd_session", "linear"]),
    notes: "Claude Desktop has the broadest compatibility with Commander plugin flows.",
  },
  "codex-cli": {
    tools: CODEX_TOOLS,
    hooks: new Set(["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SessionEnd", "PermissionRequest"]),
    mcps: new Set(["context7", "sequential-thinking"]),
    notes: "Codex compatibility applies the commander/adapters/codex hook event map.",
  },
  cursor: {
    tools: CURSOR_TOOLS,
    hooks: new Set(),
    mcps: new Set(["context7"]),
    notes: "Cursor can use MCP tools, but Claude plugin hooks and Claude-specific interactive tools are not assumed.",
  },
};

function isTargetEnv(value: string): value is TargetEnv {
  return TARGET_ENVS.includes(value as TargetEnv);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function extractFrontmatter(content: string): string {
  if (!content.startsWith("---")) return "";
  const end = content.indexOf("\n---", 3);
  if (end < 0) return "";
  return content.slice(3, end);
}

function collectYamlList(frontmatter: string, key: string): string[] {
  const lines = frontmatter.split("\n");
  const values: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.match(new RegExp(`^${key}:\\s*$`))) {
      inList = true;
      continue;
    }
    if (inList && /^[A-Za-z0-9_-]+:/.test(line)) break;
    const match = inList ? line.match(/^\s*-\s*(.+?)\s*$/) : null;
    if (match) values.push(match[1].replace(/^["']|["']$/g, ""));
  }

  return values;
}

function collectFrontmatterHooks(frontmatter: string): string[] {
  const lines = frontmatter.split("\n");
  const hooks: string[] = [];
  let inHooks = false;

  for (const line of lines) {
    if (/^hooks:\s*$/.test(line)) {
      inHooks = true;
      continue;
    }
    if (inHooks && /^[A-Za-z0-9_-]+:/.test(line)) break;
    const match = inHooks ? line.match(/^  ([A-Za-z][A-Za-z0-9]+):\s*$/) : null;
    if (match) hooks.push(match[1]);
  }

  return hooks;
}

function extractHookMentions(content: string): string[] {
  const hooks: string[] = [];
  for (const event of HOOK_EVENTS) {
    if (new RegExp(`\\b${event}\\b`).test(content)) hooks.push(event);
  }
  return hooks;
}

function extractRequiredMcps(content: string): string[] {
  const mcps: string[] = [];
  for (const match of content.matchAll(/\bmcp__([A-Za-z0-9_-]+)__[A-Za-z0-9_-]+\b/g)) {
    mcps.push(match[1]);
  }
  return uniqueSorted(mcps);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function loadCodexHookMap(): Promise<CodexHookMap | null> {
  const mapPath = path.join(getRepoRoot(), "commander/adapters/codex/hook-event-map.json");
  try {
    const raw = await readFile(mapPath, "utf8");
    const parsed = asRecord(JSON.parse(raw));
    const events = asRecord(parsed?.events);
    if (!events) return null;
    const normalized: CodexHookMap["events"] = {};
    for (const [eventName, value] of Object.entries(events)) {
      const row = asRecord(value);
      if (!row) continue;
      const codex = typeof row.codex === "string" || row.codex === null ? row.codex : null;
      const status = typeof row.status === "string" ? row.status : "unknown";
      const note = typeof row.note === "string" ? row.note : undefined;
      normalized[eventName] = { codex, status, note };
    }
    return { events: normalized };
  } catch {
    return null;
  }
}

function missingToolCapabilities(allowedTools: string[], env: EnvCapabilities): string[] {
  return allowedTools
    .filter((tool) => !tool.startsWith("mcp__"))
    .filter((tool) => !env.tools.has(tool))
    .map((tool) => `tool:${tool}`);
}

function missingMcpCapabilities(requiredMcps: string[], env: EnvCapabilities): string[] {
  return requiredMcps
    .filter((mcp) => !env.mcps.has(mcp))
    .map((mcp) => `mcp:${mcp}`);
}

function missingHookCapabilities(requiredHooks: string[], env: EnvCapabilities): string[] {
  return requiredHooks
    .filter((hook) => !env.hooks.has(hook))
    .map((hook) => `hook:${hook}`);
}

function codexHookNotes(requiredHooks: string[], hookMap: CodexHookMap | null): string[] {
  if (!hookMap) return ["Codex hook map unavailable; hook compatibility used built-in defaults."];
  return requiredHooks.flatMap((hook) => {
    const mapped = hookMap.events[hook];
    if (!mapped) return [];
    if (mapped.status === "drop") return [`Codex drops ${hook}: ${mapped.note ?? "no equivalent event"}`];
    if (mapped.status === "remap") return [`Codex remaps ${hook} to ${mapped.codex ?? "another event"}: ${mapped.note ?? "verify before relying on it"}`];
    return [];
  });
}

export async function compatibilityCheck(args: CompatibilityCheckArgs): Promise<CompatibilityCheckResult> {
  if (!args.skill_name || typeof args.skill_name !== "string") {
    return {
      compatible: false,
      missing_capabilities: ["skill_name"],
      required_hooks: [],
      required_mcps: [],
      notes: "skill_name is required.",
    };
  }

  if (!isTargetEnv(args.target_env)) {
    return {
      compatible: false,
      missing_capabilities: ["target_env"],
      required_hooks: [],
      required_mcps: [],
      notes: `Unsupported target_env '${String(args.target_env)}'. Expected one of: ${TARGET_ENVS.join(", ")}.`,
    };
  }

  const source = resolveSkillSource(args.skill_name);
  if (!source || !source.exists) {
    return {
      compatible: false,
      missing_capabilities: ["skill-source"],
      required_hooks: [],
      required_mcps: [],
      notes: `Skill '${args.skill_name}' source was not available for compatibility analysis.`,
    };
  }

  const content = await readFile(source.fullPath, "utf8");
  const frontmatter = extractFrontmatter(content);
  const allowedTools = collectYamlList(frontmatter, "allowed-tools");
  const requiredHooks = uniqueSorted([
    ...collectFrontmatterHooks(frontmatter),
    ...extractHookMentions(content),
  ]);
  const requiredMcps = extractRequiredMcps(content);
  const env = ENV_CAPABILITIES[args.target_env];
  const codexMap = args.target_env === "codex-cli" ? await loadCodexHookMap() : null;

  let missing = [
    ...missingToolCapabilities(allowedTools, env),
    ...missingMcpCapabilities(requiredMcps, env),
    ...missingHookCapabilities(requiredHooks, env),
  ];

  if (args.target_env === "codex-cli" && codexMap) {
    const droppedHooks = requiredHooks.filter((hook) => codexMap.events[hook]?.status === "drop");
    missing = uniqueSorted([...missing, ...droppedHooks.map((hook) => `hook:${hook}`)]);
  } else {
    missing = uniqueSorted(missing);
  }

  const notes = [
    env.notes,
    `Analyzed ${source.path}.`,
    ...codexHookNotes(requiredHooks, codexMap),
  ].join(" ");

  return {
    compatible: missing.length === 0,
    missing_capabilities: missing,
    required_hooks: requiredHooks,
    required_mcps: requiredMcps,
    notes,
  };
}
