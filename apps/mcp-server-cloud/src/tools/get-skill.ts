import { getSkills, getSkillContent } from "../lib/registry.js";

export type GetSkillArgs = { name: string };

export async function getSkill(args: GetSkillArgs): Promise<Record<string, unknown>> {
  const skills = getSkills();
  const skill = skills.find(
    (s) => s.id === args.name || s.name === args.name || s.path.includes(`/${args.name}/`)
  );

  if (!skill) {
    return {
      error: `Skill '${args.name}' not found. Use commander_list_skills to browse the catalog.`,
    };
  }

  const content = await getSkillContent(skill.id);

  return {
    name: skill.name,
    domain: skill.domain,
    tier: skill.tier,
    description: skill.description,
    path: skill.path,
    content: content ?? `# ${skill.name}\n\nSkill file unavailable. Install via:\nnpx skills@latest add KevinZai/commander/${skill.path.replace("/SKILL.md", "")}`,
    installHint: `npx skills@latest add KevinZai/commander/${skill.path.replace("/SKILL.md", "")}`,
    githubUrl: `https://github.com/KevinZai/commander/blob/main/${skill.path}`,
  };
}
