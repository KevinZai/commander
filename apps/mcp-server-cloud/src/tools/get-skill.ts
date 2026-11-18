import { getSkills, getSkillContent, getSkillLicense, getCatalogCommit } from "../lib/registry.js";
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

  const [content, license] = await Promise.all([getSkillContent(skill.id), getSkillLicense(skill.id)]);
  // Link the exact revision the catalog was built from, never a moving branch.
  const commit = getCatalogCommit();
  const ref = commit && /^[0-9a-f]{7,40}$/.test(commit) ? commit : null;
  const skillDir = skill.path.replace(/\/SKILL\.md$/, "");
  const localName = skillDir.split("/").pop() || skill.id;

  return {
    name: skill.name,
    domain: skill.domain,
    tier: skill.tier,
    description: skill.description,
    path: skill.path,
    // No executable fallback: a missing body is reported, not replaced by an install command.
    content: content ?? `# ${skill.name}\n\nSkill file unavailable on this server. Do not install it from another source; read it at the linked revision instead.`,
    ...(license ? { license } : {}),
    installHint: `With the Commander CLI installed: ccc --skills install ${localName}. If \`ccc\` is not available, stop; do not substitute another installer.`,
    githubUrl: `https://github.com/KevinZai/commander/blob/${ref ?? "main"}/${skill.path}`,
  };
}
