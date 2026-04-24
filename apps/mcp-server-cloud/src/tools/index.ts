// Commander MCP tool catalog.
// Each tool handler receives parsed args and returns a result object.
// Tool count is derived at runtime from TOOL_NAMES.length — never hardcode.

export { listSkills } from "./list-skills.js";
export { getSkill } from "./get-skill.js";
export { searchSkills } from "./search-skills.js";
export { suggestFor } from "./suggest-for.js";
export { invokeSkill } from "./invoke-skill.js";
export { listAgents } from "./list-agents.js";
export { getAgent } from "./get-agent.js";
export { invokeAgent } from "./invoke-agent.js";
export { getStatus } from "./status.js";
export { checkUpdate } from "./update.js";
export { initProject } from "./init.js";
export { pinNote } from "./notes-pin.js";
export { pushTask } from "./tasks-push.js";
export { integratePlan } from "./plan-integrate.js";

export const TOOL_NAMES = [
  "commander_list_skills",
  "commander_get_skill",
  "commander_search",
  "commander_suggest_for",
  "commander_invoke_skill",
  "commander_list_agents",
  "commander_get_agent",
  "commander_invoke_agent",
  "commander_status",
  "commander_update",
  "commander_init",
  "commander_notes_pin",
  "commander_tasks_push",
  "commander_plan_integrate",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

// Lazy import to avoid circular dep (registry-stats imports TOOL_NAMES from here).
import { getRegistryState } from "../lib/registry.js";

function searchSkillsBlurb(): string {
  const loaded = getRegistryState().skillsLoaded;
  const count = loaded > 0 ? `${loaded}+` : "all";
  return `Search across ${count} skills — returns ranked matches with relevance scores.`;
}

export const TOOL_SCHEMAS: Record<ToolName, object> = {
  commander_list_skills: {
    description: "Returns paginated skill catalog with metadata (name, domain, tier, description). Use this to browse available Commander skills.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 1 },
        pageSize: { type: "number", default: 50, maximum: 100 },
        domain: { type: "string", description: "Filter by domain (e.g. ccc-design, ccc-devops)" },
        tier: { type: "string", enum: ["free", "pro"], description: "Filter by access tier" },
      },
    },
  },
  commander_get_skill: {
    description: "Fetch full SKILL.md content for a specific skill by name. Lazy loads skill on demand (~85% token savings vs loading all at session start).",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string", description: "Skill name (e.g. ccc-design, tdd-workflow)" } },
    },
  },
  commander_search: {
    // Description is registry-derived; resolved on access so the live skill
    // count is reflected in the discovery payload.
    get description() {
      return searchSkillsBlurb();
    },
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Natural language query (e.g. 'write tests', 'deploy to fly.io')" },
        limit: { type: "number", default: 10, maximum: 20 },
      },
    },
  },
  commander_suggest_for: {
    description: "Given a task description, returns top 3-5 most relevant Commander skills.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: { task: { type: "string", description: "Task description (e.g. 'build a Stripe checkout page')" } },
    },
  },
  commander_invoke_skill: {
    description: "Trigger a skill by name, passing context. Returns the full skill instructions for execution.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Skill name to invoke" },
        context: { type: "string", description: "Task context to pass to the skill" },
      },
    },
  },
  commander_list_agents: {
    description: "Returns available Commander agents with tier information (free vs Pro gated).",
    inputSchema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: ["free", "pro"], description: "Filter by tier" },
      },
    },
  },
  commander_get_agent: {
    description: "Fetch full agent definition (frontmatter + instructions) by agent name.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string", description: "Agent name (e.g. reviewer, builder, researcher)" } },
    },
  },
  commander_invoke_agent: {
    description: "Trigger a Commander agent by name with a task context.",
    inputSchema: {
      type: "object",
      required: ["name", "task"],
      properties: {
        name: { type: "string", description: "Agent name to invoke" },
        task: { type: "string", description: "Task context for the agent" },
      },
    },
  },
  commander_status: {
    description: "Health check — version, license tier, usage this month, call cap remaining.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_update: {
    description: "Check for Commander updates, return changelog delta if available.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_init: {
    description: "Generate a project CLAUDE.md from CCC template. Cross-IDE equivalent of /ccc:init.",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          enum: ["web-app", "api", "cli", "mobile", "saas", "mcp-server"],
        },
        ide: { type: "string", description: "Target IDE (claude-code, cursor, windsurf, zed)" },
      },
    },
  },
  commander_notes_pin: {
    description: "Pin a note to Commander's cross-session knowledge store.",
    inputSchema: {
      type: "object",
      required: ["note"],
      properties: { note: { type: "string", description: "Note content to pin (max 2000 chars)" } },
    },
  },
  commander_tasks_push: {
    description: "Push a task to Linear (if connected via Commander settings).",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
      },
    },
  },
  commander_plan_integrate: {
    description: "Import an existing plan into Commander's session context for tracking.",
    inputSchema: {
      type: "object",
      required: ["plan"],
      properties: {
        plan: { type: "string", description: "Plan content (markdown or plain text)" },
        title: { type: "string", description: "Optional plan title" },
      },
    },
  },
};
