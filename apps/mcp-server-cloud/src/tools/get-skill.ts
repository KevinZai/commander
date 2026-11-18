import { getSkills, getSkillDelivery, getCatalogCommit } from "../lib/registry.js";
import { skillNotFound, invalidParam, internalError } from "../lib/errors.js";

export type GetSkillArgs = { name: string };

// `ccc --skills install <name>` (bin/kc.js) accepts only names matching its
// SKILL_SLUG rule, reused verbatim here (tests/skill-slug-parity.test.js), and
// links only the top-level directory skills/<name>. A hint is emitted only
// when the served skill's source is exactly that directory's SKILL.md;
// nested pack skills and plugin skills would install nothing or a
// different skill, so they get the githubUrl alone.
const SKILL_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CLI_INSTALLABLE_PATH = /^skills\/([^/]+)\/SKILL\.md$/;

/** The name `ccc --skills install` resolves to this exact source path, or null. */
export function cliInstallName(sourcePath: string): string | null {
  const m = CLI_INSTALLABLE_PATH.exec(sourcePath);
  return m && SKILL_SLUG.test(m[1]) ? m[1] : null;
}

export async function getSkill(args: GetSkillArgs): Promise<Record<string, unknown>> {
  if (!args.name || typeof args.name !== "string" || args.name.trim().length === 0) {
    return invalidParam("name", "must be a non-empty string (e.g. 'ccc-design', 'tdd-workflow')");
  }

  const skills = getSkills();
  const listed = skills.find(
    (s) => s.id === args.name || s.name === args.name || s.path.includes(`/${args.name}/`)
  );

  if (!listed) {
    return skillNotFound(args.name);
  }

  // Metadata, body and license all come from one registry entry.
  let delivery: Awaited<ReturnType<typeof getSkillDelivery>>;
  try {
    delivery = await getSkillDelivery(listed.id);
  } catch {
    // A copied skill is never served without its license notice.
    return internalError("license-unreadable", `License notice for '${listed.name}' could not be read; the skill is not served without it.`);
  }
  if (!delivery) return skillNotFound(args.name);
  const { skill, content, license } = delivery;
  // Link the exact revision the catalog was built from, never a moving branch.
  const commit = getCatalogCommit();
  const ref = commit && /^[0-9a-f]{7,40}$/.test(commit) ? commit : null;
  const installName = cliInstallName(skill.path);

  return {
    name: skill.name,
    domain: skill.domain,
    tier: skill.tier,
    description: skill.description,
    path: skill.path,
    // No executable fallback: a missing body is reported, not replaced by an install command.
    content: content ?? `# ${skill.name}\n\nSkill file unavailable on this server. Do not install it from another source; read it at the linked revision instead.`,
    ...(license ? { license } : {}),
    ...(installName
      ? {
          installHint: `With the Commander CLI installed: ccc --skills install ${installName}. If \`ccc\` is not available, stop; do not substitute another installer.`,
        }
      : {}),
    githubUrl: `https://github.com/KevinZai/commander/blob/${ref ?? "main"}/${skill.path}`,
  };
}
