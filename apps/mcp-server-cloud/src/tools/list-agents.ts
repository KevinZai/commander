import { getAgents } from "../lib/registry.js";

export type ListAgentsArgs = { tier?: string };

export function listAgents(args: ListAgentsArgs) {
  let agents = getAgents();
  if (args.tier) agents = agents.filter((a) => a.tier === args.tier);

  return {
    agents: agents.map((a) => ({
      name: a.name,
      tier: a.tier,
      description: a.description,
      githubUrl: a.githubUrl,
    })),
    total: agents.length,
    note: "Pro tier includes specialized personas with role-specific voice layers.",
  };
}
