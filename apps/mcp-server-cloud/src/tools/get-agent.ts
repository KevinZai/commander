import { getAgents, getAgentContent } from "../lib/registry.js";

export type GetAgentArgs = { name: string };

export async function getAgent(args: GetAgentArgs): Promise<Record<string, unknown>> {
  const agents = getAgents();
  const agent = agents.find((a) => a.name === args.name);

  if (!agent) {
    return {
      error: `Agent '${args.name}' not found. Use commander_list_agents to see available agents.`,
    };
  }

  const content = await getAgentContent(agent.name);

  return {
    name: agent.name,
    tier: agent.tier,
    description: agent.description,
    githubUrl: agent.githubUrl,
    content: content ?? `# ${agent.name}\n\nAgent definition available at: ${agent.githubUrl}`,
  };
}
