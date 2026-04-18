import { getSkills } from "../lib/registry.js";

export type SearchSkillsArgs = { query: string; limit?: number };

export function searchSkills(args: SearchSkillsArgs) {
  const query = args.query.toLowerCase();
  const limit = Math.min(20, args.limit ?? 10);

  const terms = query
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = getSkills()
    .map((skill) => {
      const nameText = skill.name.toLowerCase();
      const domainText = skill.domain.toLowerCase();
      const descText = skill.description.toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (nameText === term) score += 10;
        else if (nameText.startsWith(term)) score += 5;
        else if (nameText.includes(term)) score += 3;
        if (domainText.includes(term)) score += 2;
        if (descText.includes(term)) score += 1;
      }
      return { skill, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({
      name: r.skill.name,
      domain: r.skill.domain,
      tier: r.skill.tier,
      description: r.skill.description,
      relevance: r.score,
    }));

  return { results: scored, query, total: scored.length };
}
