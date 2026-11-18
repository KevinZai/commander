import { getSkills, getSkillContent } from "../lib/registry.js";
import { skillNotFound, invalidParam } from "../lib/errors.js";

export type GetSkillArgs = { name: string };

export async function getSkill(args: GetSkillArgs): Promise<Record<string, unknown>> {
  if (!args.name || typeof args.name !== "string" || args.name.trim().length === 0) {
    return invalidParam("name", "must be a non-empty string (e.g. 'ccc-design', 'tdd-workflow')");
  }

  const skills = getSkills();
  const skill = skills.find(
    (s) => s.id === args.name || s.name === args.name || s.path.includes(`/${args.name}/`)
  );

  if (!skill) {
    return skillNotFound(args.name);
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
