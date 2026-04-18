// commander_list_skills — returns paginated skill metadata (name, domain, tier, description)
// Skills are read from the static catalog embedded in this server build.

import { SKILLS_CATALOG } from "../lib/skills-catalog.js";

export type ListSkillsArgs = {
  page?: number;
  pageSize?: number;
  domain?: string;
};

export function listSkills(args: ListSkillsArgs) {
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));
  const domain = args.domain;

  const filtered = domain
    ? SKILLS_CATALOG.filter((s) => s.domain === domain)
    : SKILLS_CATALOG;

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    skills: items,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}
