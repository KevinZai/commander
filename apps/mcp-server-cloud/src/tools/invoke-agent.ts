import { getAgent } from "./get-agent.js";

export type InvokeAgentArgs = { name: string; task: string };

export function invokeAgent(args: InvokeAgentArgs) {
  const agent = getAgent({ name: args.name });
  if ("error" in agent) return agent;

  const def = agent as { name: string; description: string; githubUrl: string; persona: string };

  return {
    agent: def.name,
    task: args.task,
    invocationGuide: [
      `You are now the ${def.name} agent.`,
      def.description,
      `Task: ${args.task}`,
      `For full persona instructions, see: ${def.githubUrl}`,
    ].join("\n\n"),
    persona: def.persona,
  };
}
