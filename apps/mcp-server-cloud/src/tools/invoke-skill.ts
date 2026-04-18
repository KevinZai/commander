import { getSkill } from "./get-skill.js";

export type InvokeSkillArgs = { name: string; context?: string };

export function invokeSkill(args: InvokeSkillArgs) {
  const skill = getSkill({ name: args.name });
  if ("error" in skill) return skill;

  return {
    skill: skill.name,
    domain: skill.domain,
    githubUrl: skill.githubUrl,
    invocationGuide: [
      `You are now operating in ${skill.name} mode.`,
      skill.description,
      args.context
        ? `Task context: ${args.context}`
        : "Apply this skill to the current task.",
      `For full instructions, see: ${skill.githubUrl}`,
    ].join("\n\n"),
  };
}
