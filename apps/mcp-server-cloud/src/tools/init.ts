export type InitProjectArgs = {
  projectType?: string;
  ide?: string;
};

const PROJECT_TYPE_NOTES: Record<string, string> = {
  "web-app": "Next.js + Tailwind + Supabase stack. CLAUDE.md pre-configured for frontend-first dev.",
  api: "Node.js/TypeScript API. CLAUDE.md pre-configured for TDD-first backend dev.",
  cli: "Node.js CLI. CLAUDE.md pre-configured with commander/yargs patterns.",
  mobile: "React Native + Expo. CLAUDE.md pre-configured for cross-platform mobile.",
  saas: "Full-stack SaaS. CLAUDE.md pre-configured with auth, billing, multi-tenant patterns.",
  "mcp-server": "MCP server template. CLAUDE.md pre-configured with tool + resource patterns.",
};

export function initProject(args: InitProjectArgs) {
  const projectType = args.projectType ?? "web-app";
  const ide = args.ide ?? "claude-code";
  const note = PROJECT_TYPE_NOTES[projectType] ?? "Generic project. Customize as needed.";

  return {
    projectType,
    ide,
    note,
    files: [
      {
        path: "CLAUDE.md",
        description: "Project instructions for Claude. Customize with your stack specifics.",
        templateUrl: `https://github.com/KevinZai/commander/blob/main/CLAUDE.md.template`,
      },
      {
        path: ".claude/settings.json",
        description: "Claude Code settings with Commander pre-configured.",
        templateUrl: "https://github.com/KevinZai/commander/blob/main/settings.json.template",
      },
    ],
    installCommand: `/plugin marketplace add KevinZai/commander && /plugin install commander`,
    mcpConfig: {
      commander: {
        url: "https://mcp.cc-commander.com/sse",
        headers: { Authorization: "Bearer ${COMMANDER_TOKEN}" },
      },
    },
    nextSteps: [
      "1. Copy CLAUDE.md.template to your project root and customize",
      "2. Add your MCP config block to your IDE settings",
      "3. Run /ccc:init in Claude Code to start the project wizard",
    ],
  };
}
