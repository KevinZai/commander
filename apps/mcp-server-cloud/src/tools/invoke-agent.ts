import { getAgent } from "./get-agent.js";

export type InvokeAgentArgs = { name: string; task: string };

export async function invokeAgent(args: InvokeAgentArgs) {
  const agent = await getAgent({ name: args.name });
  if ("error" in agent) return agent;

  return {
    agent: agent.name,
    task: args.task,
    invocationGuide: [
      `You are now the ${agent.name as string} agent.`,
      agent.description as string,
      `Task: ${args.task}`,
      `For full persona instructions, see: ${agent.githubUrl as string}`,
    ].join("\n\n"),
    githubUrl: agent.githubUrl,
  };
}
