import { SKILLS_CATALOG } from "../lib/skills-catalog.js";

export type GetSkillArgs = { name: string };

export function getSkill(args: GetSkillArgs) {
  const skill = SKILLS_CATALOG.find(
    (s) => s.name === args.name || s.path.includes(args.name)
  );

  if (!skill) {
    return {
      error: `Skill '${args.name}' not found. Use commander_list_skills to browse the catalog.`,
    };
  }

  // In production: read from bundled skill files or GitHub raw API.
  // For beta: return metadata + install hint.
  return {
    name: skill.name,
    domain: skill.domain,
    tier: skill.tier,
    description: skill.description,
    path: skill.path,
    installHint: `npx skills@latest add KevinZai/commander/${skill.path.replace("/SKILL.md", "")}`,
    githubUrl: `https://github.com/KevinZai/commander/blob/main/${skill.path}`,
  };
}
