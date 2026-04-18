// Skills catalog — lightweight metadata only.
// Full SKILL.md content is served on-demand via commander_get_skill.
// This catalog is embedded at build time from the commander skill index.

export type SkillMeta = {
  name: string;
  domain: string;
  tier: "free" | "pro";
  description: string;
  path: string;
};

// Domain list with representative skills (full catalog loaded at build time in production).
// This stub covers the 11 CCC domains + key standalone skills.
export const SKILLS_CATALOG: SkillMeta[] = [
  // CCC Domain routers
  { name: "ccc-design", domain: "ccc-design", tier: "free", description: "39 UI/UX, animation, responsive, and accessibility sub-skills.", path: "skills/ccc-design/SKILL.md" },
  { name: "ccc-marketing", domain: "ccc-marketing", tier: "free", description: "45 CRO, email, ads, social, and content sub-skills.", path: "skills/ccc-marketing/SKILL.md" },
  { name: "ccc-saas", domain: "ccc-saas", tier: "free", description: "21 auth, billing, multi-tenant, and schema sub-skills.", path: "skills/ccc-saas/SKILL.md" },
  { name: "ccc-devops", domain: "ccc-devops", tier: "free", description: "21 CI/CD, Docker, AWS, and monitoring sub-skills.", path: "skills/ccc-devops/SKILL.md" },
  { name: "ccc-seo", domain: "ccc-seo", tier: "free", description: "20 technical SEO, content, and Core Web Vitals sub-skills.", path: "skills/ccc-seo/SKILL.md" },
  { name: "ccc-testing", domain: "ccc-testing", tier: "free", description: "15 TDD, E2E, coverage, and regression sub-skills.", path: "skills/ccc-testing/SKILL.md" },
  { name: "ccc-security", domain: "ccc-security", tier: "free", description: "8 OWASP, pen-test, secrets, and hardening sub-skills.", path: "skills/ccc-security/SKILL.md" },
  { name: "ccc-data", domain: "ccc-data", tier: "free", description: "8 SQL, ETL, analytics, and visualization sub-skills.", path: "skills/ccc-data/SKILL.md" },
  { name: "ccc-research", domain: "ccc-research", tier: "free", description: "8 competitive and market analysis sub-skills.", path: "skills/ccc-research/SKILL.md" },
  { name: "ccc-mobile", domain: "ccc-mobile", tier: "free", description: "8 React Native, Expo, and mobile pattern sub-skills.", path: "skills/ccc-mobile/SKILL.md" },
  { name: "ccc-makeover", domain: "ccc-makeover", tier: "free", description: "3 /xray audit and /makeover swarm sub-skills.", path: "skills/ccc-makeover/SKILL.md" },

  // Plugin skills (free tier)
  { name: "commander", domain: "plugin", tier: "free", description: "Main Commander entry point — 15 plugin skills, 5 agents, 6 hooks.", path: "commander/cowork-plugin/SKILL.md" },
  { name: "build", domain: "plugin", tier: "free", description: "Build wizard — web, API, CLI, custom templates.", path: "commander/cowork-plugin/skills/build/SKILL.md" },
  { name: "research", domain: "plugin", tier: "free", description: "Structured research with citations and synthesis.", path: "commander/cowork-plugin/skills/research/SKILL.md" },
  { name: "code-review", domain: "plugin", tier: "free", description: "Severity-rated code review with fix suggestions.", path: "commander/cowork-plugin/skills/code-review/SKILL.md" },
  { name: "deploy-check", domain: "plugin", tier: "free", description: "Pre-deploy gate with rollback plan.", path: "commander/cowork-plugin/skills/deploy-check/SKILL.md" },

  // Standalone skills
  { name: "spec-interviewer", domain: "workflow", tier: "free", description: "5-7 question interview → writes spec-YYYYMMDD.md.", path: "skills/spec-interviewer/SKILL.md" },
  { name: "tdd-workflow", domain: "workflow", tier: "free", description: "Test-driven development: red → green → refactor.", path: "skills/tdd-workflow/SKILL.md" },
  { name: "systematic-debugging", domain: "workflow", tier: "free", description: "Root cause investigation: reproduce → hypothesize → verify → fix.", path: "skills/systematic-debugging/SKILL.md" },
  { name: "dialectic-review", domain: "workflow", tier: "free", description: "FOR/AGAINST/Referee pattern for architecture decisions.", path: "skills/dialectic-review/SKILL.md" },
  { name: "caveman", domain: "workflow", tier: "free", description: "75% token savings: strips markdown, emojis, and prose.", path: "skills/caveman/SKILL.md" },
];
