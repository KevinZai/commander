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
export { installSkill } from "./install-skill.js";
export { compatibilityCheck } from "./compatibility-check.js";
export { sessionDiagnose } from "./session-diagnose.js";
export { composePlan } from "./compose-plan.js";

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
  "commander_install_skill",
  "commander_compatibility_check",
  "commander_session_diagnose",
  "commander_compose_plan",
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
    description: "List Commander skills with metadata. Returns a paginated catalog including name, domain, tier, and description for each skill. Use this to browse or filter available skills before fetching full content.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number, starting at 1. Default: 1.", default: 1 },
        pageSize: { type: "number", description: "Results per page. Min: 1, max: 100. Default: 50.", default: 50, maximum: 100 },
        domain: { type: "string", description: "Filter by domain slug (e.g. 'ccc-design', 'ccc-devops', 'ccc-saas')." },
        tier: { type: "string", enum: ["free", "pro"], description: "Filter by access tier: 'free' or 'pro'." },
      },
    },
  },
  commander_get_skill: {
    description: "Fetch full SKILL.md content for a named Commander skill. Returns the skill's complete instructions, install hint, and GitHub URL. Loads on demand to avoid token overhead at session start.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Skill name or path segment (e.g. 'ccc-design', 'tdd-workflow', 'systematic-debugging')." },
      },
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
        query: { type: "string", description: "Natural language query matched against skill names, domains, and descriptions (e.g. 'write unit tests', 'deploy to Fly.io', 'fix performance')." },
        limit: { type: "number", description: "Maximum results to return. Default: 10, max: 20.", default: 10, maximum: 20 },
      },
    },
  },
  commander_suggest_for: {
    description: "Recommend Commander skills for a task description. Returns the top 3 to 5 most relevant skills ranked by keyword and domain match, with a usage tip.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        task: { type: "string", description: "Plain-English task description (e.g. 'build a Stripe checkout page', 'fix a flaky Playwright test')." },
      },
    },
  },
  commander_invoke_skill: {
    description: "Activate a Commander skill by name and return its full instructions. Pass optional context to focus the skill on your current task. Returns the invocation guide the AI should follow.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Skill name to activate (e.g. 'ccc-plan', 'tdd-workflow', 'ccc-review')." },
        context: { type: "string", description: "Task-specific context injected into the invocation guide (e.g. 'Add OAuth login to the Next.js app')." },
      },
    },
  },
  commander_list_agents: {
    description: "List available Commander specialist agents. Returns each agent's name, description, persona tier, and model preference. Filter by tier to see only free or Pro agents.",
    inputSchema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: ["free", "pro"], description: "Filter by access tier: 'free' or 'pro'. Omit to return all agents." },
      },
    },
  },
  commander_get_agent: {
    description: "Fetch full agent definition for a named Commander specialist. Returns frontmatter, persona voice, and complete instructions. Use before commander_invoke_agent to inspect the agent.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Agent name (e.g. 'reviewer', 'builder', 'researcher', 'security-auditor')." },
      },
    },
  },
  commander_invoke_agent: {
    description: "Activate a Commander specialist agent for a given task. Returns a persona-loaded invocation guide the AI should adopt for the task.",
    inputSchema: {
      type: "object",
      required: ["name", "task"],
      properties: {
        name: { type: "string", description: "Agent name to activate (e.g. 'reviewer', 'debugger', 'architect')." },
        task: { type: "string", description: "Task description the agent should work on (e.g. 'Review the auth module for security issues')." },
      },
    },
  },
  commander_status: {
    description: "Return the authenticated user's Commander status. Includes server version, license tier, calls used this month, remaining cap, and reset date.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_update: {
    description: "Check whether a newer Commander version is available. Returns the current version, latest version, and a changelog URL if an update exists.",
    inputSchema: { type: "object", properties: {} },
  },
  commander_init: {
    description: "Generate project initialization files for a Commander-powered workflow. Returns template URLs, install commands, and MCP config for the specified project type and IDE.",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          enum: ["web-app", "api", "cli", "mobile", "saas", "mcp-server"],
          description: "Project category that determines the CLAUDE.md template and skill pre-selection.",
        },
        ide: {
          type: "string",
          description: "Target IDE or agent environment (e.g. 'claude-code', 'cursor', 'windsurf', 'codex-cli'). Default: 'claude-code'.",
        },
      },
    },
  },
  commander_notes_pin: {
    description: "Save a note to the Commander cross-session knowledge store. Returns confirmation with a preview of the pinned content. Notes persist across sessions for later retrieval.",
    inputSchema: {
      type: "object",
      required: ["note"],
      properties: {
        note: { type: "string", description: "Note text to persist (max 2000 characters; e.g. a decision, a pattern, a lesson learned)." },
      },
    },
  },
  commander_tasks_push: {
    description: "Push a task to a connected Linear workspace. Returns setup instructions if Linear is not yet configured. Set COMMANDER_LINEAR_KEY in your environment to enable.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", description: "Task title (e.g. 'Add rate limiting to /api/auth')." },
        description: { type: "string", description: "Optional task body in markdown." },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"], description: "Linear priority level. Default: 'medium'." },
      },
    },
  },
  commander_plan_integrate: {
    description: "Parse a markdown or plain-text plan and extract its task list for tracking. Returns the task count, parsed tasks, and a plan preview for confirmation.",
    inputSchema: {
      type: "object",
      required: ["plan"],
      properties: {
        plan: { type: "string", description: "Plan content in markdown or plain text. Bullet lines and numbered items are parsed as tasks." },
        title: { type: "string", description: "Optional plan title shown in the confirmation response." },
      },
    },
  },
  commander_install_skill: {
    description: "Generate a shell command that installs a Commander skill into a target AI environment. The command is idempotent — it reports 'already-present' if the skill is installed. Returns the command string to run locally.",
    inputSchema: {
      type: "object",
      required: ["skill_name", "target_env"],
      properties: {
        skill_name: { type: "string", description: "Skill directory name from the Commander catalog (e.g. 'ccc-plan', 'tdd-workflow', 'build')." },
        target_env: {
          type: "string",
          enum: ["claude-cli", "claude-desktop", "codex-cli", "cursor"],
          description: "Target environment where the skill will be installed.",
        },
        dry_run: { type: "boolean", description: "If true, returns the command without marking it as executed. Default: false.", default: false },
      },
    },
  },
  commander_compatibility_check: {
    description: "Check whether a Commander skill is compatible with a target AI environment. Analyzes the skill's required tools, lifecycle hooks, and MCP dependencies against what the target environment supports. Returns a compatibility report.",
    inputSchema: {
      type: "object",
      required: ["skill_name", "target_env"],
      properties: {
        skill_name: { type: "string", description: "Skill name to analyze for compatibility (e.g. 'ccc-fleet', 'ccc-design')." },
        target_env: {
          type: "string",
          enum: ["claude-cli", "claude-desktop", "codex-cli", "cursor"],
          description: "Target environment to check compatibility against.",
        },
      },
    },
  },
  commander_session_diagnose: {
    description: "Run Commander's built-in diagnostics and return a structured health report. Checks critical files, hook chain, skill counts, version parity, and more. Returns findings with status, message, and remediation per category.",
    inputSchema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Diagnostic category filter (e.g. ['critical-files', 'hook-chain']). Omit to run all categories.",
        },
      },
    },
  },
  commander_compose_plan: {
    description: "Generate a structured implementation plan from a feature description. Returns a markdown plan with problem statement, evals, phased tasks, recommended skills, risks, and effort estimate (S/M/L/XL).",
    inputSchema: {
      type: "object",
      required: ["feature_description"],
      properties: {
        feature_description: { type: "string", description: "Feature or bug-fix description in plain English (e.g. 'Add OAuth login with GitHub and Google providers')." },
        project_context: {
          type: "object",
          description: "Optional project metadata to improve plan quality.",
          properties: {
            stack: { type: "string", description: "Tech stack (e.g. 'Next.js, Supabase, Tailwind')." },
            repo_root: { type: "string", description: "Absolute path to the project root." },
            recent_commits: { type: "array", items: { type: "string" }, description: "Up to 5 recent commit messages for context." },
          },
        },
      },
    },
  },
};
