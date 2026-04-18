import { getSkills } from "../lib/registry.js";

export type ListSkillsArgs = {
  page?: number;
  pageSize?: number;
  domain?: string;
  tier?: string;
};

export function listSkills(args: ListSkillsArgs) {
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));
  const domain = args.domain;
  const tier = args.tier;

  let filtered = getSkills();
  if (domain) filtered = filtered.filter((s) => s.domain === domain);
  if (tier) filtered = filtered.filter((s) => s.tier === tier);

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    skills: items.map((s) => ({
      name: s.name,
      domain: s.domain,
      tier: s.tier,
      description: s.description,
      path: s.path,
    })),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}
