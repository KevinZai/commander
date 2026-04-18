export type GetAgentArgs = { name: string };

const AGENT_DEFINITIONS: Record<string, object> = {
  reviewer: {
    name: "reviewer",
    model: "sonnet",
    effort: "high",
    persona: "personas/reviewer",
    description: "Severity-rated change analyzer. Finds P0 blockers before they ship.",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/reviewer.md",
  },
  builder: {
    name: "builder",
    model: "sonnet",
    effort: "high",
    persona: "personas/builder",
    description: "MVP-first implementer. Boring solutions win. 100 lines > 1000 lines when both work.",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/builder.md",
  },
  researcher: {
    name: "researcher",
    model: "sonnet",
    effort: "high",
    persona: "personas/researcher",
    description: "Structured findings synthesizer. Every claim cites a source.",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/researcher.md",
  },
  debugger: {
    name: "debugger",
    model: "sonnet",
    effort: "high",
    persona: "personas/debugger",
    description: "Root-cause detective. Reproduce → hypothesize → verify → fix.",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/debugger.md",
  },
  "fleet-worker": {
    name: "fleet-worker",
    model: "sonnet",
    effort: "medium",
    persona: "personas/fleet-worker",
    description: "Strict-report executor. Non-overlapping file domains. Structured output the parent can parse.",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/fleet-worker.md",
  },
};

export function getAgent(args: GetAgentArgs) {
  const agent = AGENT_DEFINITIONS[args.name];
  if (!agent) {
    return {
      error: `Agent '${args.name}' not found. Use commander_list_agents to see available agents.`,
    };
  }
  return agent;
}
