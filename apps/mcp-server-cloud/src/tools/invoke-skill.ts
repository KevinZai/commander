import { getSkill } from "./get-skill.js";

export type InvokeSkillArgs = { name: string; context?: string };

export async function invokeSkill(args: InvokeSkillArgs) {
  const skill = await getSkill({ name: args.name });
  if ("error" in skill) return skill;

  return {
    skill: skill.name,
    domain: skill.domain,
    githubUrl: skill.githubUrl,
    invocationGuide: [
      `You are now operating in ${skill.name as string} mode.`,
      skill.description as string,
      args.context
        ? `Task context: ${args.context}`
        : "Apply this skill to the current task.",
      `Full instructions:\n\n${(skill.content as string).slice(0, 4000)}`,
    ].join("\n\n"),
  };
}
