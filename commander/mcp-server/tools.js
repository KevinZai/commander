'use strict';

/**
 * CC Commander MCP Server — Tool Definitions
 * 14 tools: discovery + routing hints (no skill execution). notes_pin,
 * tasks_push and plan_integrate persist a local record before reporting
 * success and return its id.
 */

var TOOLS = [
  {
    name: 'commander_list_skills',
    description: 'Returns paginated skill catalog with metadata (name, domain, tier, description). Use this to browse available Commander skills before invoking one.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Filter by domain (e.g. ccc-design, ccc-devops)' },
        tier: { type: 'string', enum: ['free', 'pro'], description: 'Filter by access tier' },
        page: { type: 'number', description: 'Page number (1-based, default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 20, max 50)' },
      },
    },
  },
  {
    name: 'commander_get_skill',
    description: 'Fetch full SKILL.md content for a specific skill by name. Use after commander_list_skills to load a skill on demand (lazy loading — ~85% token savings vs loading all at session start).',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Skill name (e.g. ccc-design, tdd-workflow)' },
      },
    },
  },
  {
    name: 'commander_search',
    description: 'Semantic search across 453+ skills. Returns ranked matches with relevance scores.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Natural language query (e.g. "how to write tests", "deploy to fly.io")' },
        limit: { type: 'number', description: 'Max results (default 5, max 20)' },
      },
    },
  },
  {
    name: 'commander_suggest_for',
    description: 'Given a task description, returns the top 3-5 most relevant Commander skills to use.',
    inputSchema: {
      type: 'object',
      required: ['task'],
      properties: {
        task: { type: 'string', description: 'Task description (e.g. "build a Stripe checkout page")' },
      },
    },
  },
  {
    name: 'commander_invoke_skill',
    description: 'Trigger a skill by name, passing context. Returns guided output and a confidence score.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Skill name to invoke' },
        context: { type: 'string', description: 'Task context or user request to pass to the skill' },
      },
    },
  },
  {
    name: 'commander_list_agents',
    description: 'Returns available Commander agents with tier information (free vs Pro gated).',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['free', 'pro'], description: 'Filter by tier' },
      },
    },
  },
  {
    name: 'commander_get_agent',
    description: 'Fetch full agent definition (frontmatter + description) by agent name.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Agent name (e.g. reviewer, builder, researcher, debugger, fleet-worker)' },
      },
    },
  },
  {
    name: 'commander_invoke_agent',
    description: 'Trigger a Commander agent by name with a task context. Returns routing hints for Claude Code dispatch.',
    inputSchema: {
      type: 'object',
      required: ['name', 'task'],
      properties: {
        name: { type: 'string', description: 'Agent name to invoke' },
        task: { type: 'string', description: 'Task context for the agent' },
      },
    },
  },
  {
    name: 'commander_status',
    description: 'Health check — returns Commander version, license tier, usage this month, and auth diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'commander_update',
    description: 'Check for Commander updates. Returns current version, latest version, and changelog delta if an update is available.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'commander_init',
    description: 'Generate a project CLAUDE.md from CCC template. Cross-IDE equivalent of /ccc-init.',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: 'Project name to inject into the template' },
        stack: { type: 'string', description: 'Tech stack description (e.g. "Next.js + Supabase")' },
        template: { type: 'string', description: 'Template name (web-app, api, cli-tool, mobile, saas, mcp-server)' },
      },
    },
  },
  {
    name: 'commander_notes_pin',
    description: "Pin a note to Commander's local cross-session knowledge store (~/.claude/commander/pinned-notes.json). Returns the saved note id; a failed save is a tool error.",
    inputSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', description: 'Note content to pin' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for retrieval' },
      },
    },
  },
  {
    name: 'commander_tasks_push',
    description: 'Save a task to the local Commander task store (~/.claude/commander/tasks.json), then push it to Linear when a Linear token is set and offline mode is off. Returns the local record id and linear.status: pushed, failed or not_configured.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description (markdown)' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'], description: 'Task priority' },
      },
    },
  },
  {
    name: 'commander_plan_integrate',
    description: "Import an existing plan into Commander's local plan store (~/.claude/commander/plans.json) for tracking. Returns the saved plan id; a failed save is a tool error.",
    inputSchema: {
      type: 'object',
      required: ['plan'],
      properties: {
        plan: { type: 'string', description: 'Plan content (markdown or plain text)' },
        title: { type: 'string', description: 'Optional plan title' },
      },
    },
  },
];

module.exports = TOOLS;
