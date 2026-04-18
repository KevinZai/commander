// 14 Commander MCP tools
// Each tool handler receives parsed args and returns a result object.

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

export const TOOL_SCHEMAS: Record<ToolName, object> = {
  commander_list_skills: {
    description: "Returns paginated skill catalog with metadata (name, domain, tier, description).",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 1 },
        pageSize: { type: "number", default: 50, maximum: 100 },
        domain: { type: "string", description: "Filter by domain (e.g. ccc-design)" },
      },
    },
  },
  commander_get_skill: {
    description: "Fetch full SKILL.md content for a specific skill by name.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
  },
  commander_search: {
    description: "Search across 456+ skills — returns ranked matches.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 10, maximum: 20 },
      },
    },
  },
  commander_suggest_for: {
    description: "Given a task description, returns top 3-5 relevant skills.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: { task: { type: "string" } },
    },
  },
  commander_invoke_skill: {
    description: "Trigger a skill by name, passing context.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        context: { type: "string" },
      },
    },
  },
  commander_list_agents: {
    description: "Returns available agents (free vs Pro gated).",
    inputSchema: { type: "object", properties: {} },
  },
  commander_get_agent: {
    description: "Fetch full agent definition.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
  },
  commander_invoke_agent: {
    description: "Trigger an agent by name with task context.",
    inputSchema: {
      type: "object",
      required: ["name", "task"],
      properties: {
        name: { type: "string" },
        task: { type: "string" },
      },
    },
  },
  commander_status: {
    description: "Health check — version, license tier, usage this month.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_update: {
    description: "Check for Commander updates, return changelog delta.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_init: {
    description: "Generate a project CLAUDE.md from CCC template.",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          enum: ["web-app", "api", "cli", "mobile", "saas", "mcp-server"],
        },
        ide: { type: "string" },
      },
    },
  },
  commander_notes_pin: {
    description: "Pin a note to Commander's cross-session knowledge store.",
    inputSchema: {
      type: "object",
      required: ["note"],
      properties: { note: { type: "string" } },
    },
  },
  commander_tasks_push: {
    description: "Push a task to Linear (if connected).",
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
    description: "Import an existing plan into Commander's session context.",
    inputSchema: {
      type: "object",
      required: ["plan"],
      properties: { plan: { type: "string" } },
    },
  },
};
