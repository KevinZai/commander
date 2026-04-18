export type ListAgentsArgs = Record<string, never>;

const FREE_AGENTS = [
  { name: "reviewer", tier: "free", description: "Severity-rated code reviewer. Files P0-P3 findings with fix suggestions." },
  { name: "builder", tier: "free", description: "MVP-first implementer. Ships the simplest thing that works." },
  { name: "researcher", tier: "free", description: "Source-cited analyst. Facts, inferences, and opinions are always separated." },
  { name: "debugger", tier: "free", description: "Root-cause detective. Iron Law: no fix without confirmed root cause." },
  { name: "fleet-worker", tier: "free", description: "Strict-report executor. Non-overlapping file domains, structured output." },
];

export function listAgents(_args: ListAgentsArgs) {
  return {
    agents: FREE_AGENTS,
    total: FREE_AGENTS.length,
    note: "All 15 agents available in Pro tier — specialized personas with role-specific voice layers.",
  };
}
