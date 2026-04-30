import { getAgents, getAgentContent } from "../lib/registry.js";
import { agentNotFound, invalidParam } from "../lib/errors.js";

export type GetAgentArgs = { name: string };

export async function getAgent(args: GetAgentArgs): Promise<Record<string, unknown>> {
  if (!args.name || typeof args.name !== "string" || args.name.trim().length === 0) {
    return invalidParam("name", "must be a non-empty string (e.g. 'reviewer', 'builder', 'researcher')");
  }

  const agents = getAgents();
  const agent = agents.find((a) => a.name === args.name);

  if (!agent) {
    return agentNotFound(args.name);
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
