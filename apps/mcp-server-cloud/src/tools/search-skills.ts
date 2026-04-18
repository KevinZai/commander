import { SKILLS_CATALOG } from "../lib/skills-catalog.js";

export type SearchSkillsArgs = { query: string; limit?: number };

export function searchSkills(args: SearchSkillsArgs) {
  const query = args.query.toLowerCase();
  const limit = Math.min(20, args.limit ?? 10);

  const scored = SKILLS_CATALOG.map((skill) => {
    const nameMatch = skill.name.toLowerCase().includes(query) ? 3 : 0;
    const domainMatch = skill.domain.toLowerCase().includes(query) ? 2 : 0;
    const descMatch = skill.description.toLowerCase().includes(query) ? 1 : 0;
    return { skill, score: nameMatch + domainMatch + descMatch };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.skill);

  return { results: scored, query, total: scored.length };
}
