import { getSkill } from "./get-skill.js";

export type InvokeSkillArgs = { name: string; context?: string };

export async function invokeSkill(args: InvokeSkillArgs) {
  const skill = await getSkill({ name: args.name });
  if ("ok" in skill && !skill.ok) return skill;
  if ("error" in skill) return skill;

  // The full body is returned (no length cut), so a notice embedded at the end
  // of SKILL.md survives; a sibling LICENSE travels as its own field too.
  return {
    skill: skill.name,
    domain: skill.domain,
    githubUrl: skill.githubUrl,
    ...(typeof skill.license === "string" ? { license: skill.license } : {}),
    invocationGuide: [
      `You are now operating in ${skill.name as string} mode.`,
      skill.description as string,
      args.context
        ? `Task context: ${args.context}`
        : "Apply this skill to the current task.",
      `Full instructions:\n\n${skill.content as string}`,
      ...(typeof skill.license === "string" ? [`License notice for this skill (keep with any copy):\n\n${skill.license}`] : []),
    ].join("\n\n"),
  };
}
