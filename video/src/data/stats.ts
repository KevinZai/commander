export const STATS = {
  version: "v2.3.0",
  skills: 453,
  skillsMarketing: "450+",
  vendors: 19,
  domains: 11,
  commands: 83,
  hooks: 25,
  themes: 10,
  tests: 187,
  auditScore: 91,
  author: "Kevin Z",
  site: "kevinz.ai",
  github: "github.com/KevinZai/commander",
  installCmd: "npm install -g cc-commander",
};

export const DOMAINS = [
  { name: "ccc-design", count: 39, icon: "🎨" },
  { name: "ccc-marketing", count: 45, icon: "📣" },
  { name: "ccc-saas", count: 20, icon: "☁️" },
  { name: "ccc-devops", count: 20, icon: "🚀" },
  { name: "ccc-seo", count: 19, icon: "🔍" },
  { name: "ccc-testing", count: 15, icon: "🧪" },
  { name: "ccc-data", count: 8, icon: "📊" },
  { name: "ccc-security", count: 8, icon: "🔐" },
  { name: "ccc-research", count: 8, icon: "🔬" },
  { name: "ccc-mobile", count: 8, icon: "📱" },
  { name: "ccc-makeover", count: 3, icon: "✨" },
];

export const MENU_ITEMS = [
  "│  ● Build something new",
  "│  ○ Create content",
  "│  ○ Research & analyze",
  "│  ○ Review what I built",
  "│  ○ Learn a new skill",
  "│  ○ Check my stats",
  "│  ○ Linear board",
  "│  ○ Night Mode",
  "│  ○ Settings",
  "│  ○ Infrastructure & Fleet",
  "│  ○ Quit",
];

export const SKILL_NAMES = [
  "tdd-workflow", "code-review", "systematic-debugging", "deploy-check",
  "evals-before-specs", "spec-interviewer", "dialectic-review", "ccc-design",
  "ccc-saas", "ccc-devops", "ccc-testing", "ccc-security", "ccc-marketing",
  "ccc-seo", "ccc-data", "ccc-mobile", "ccc-research", "auth-patterns",
  "billing-setup", "docker-compose", "ci-cd-pipeline", "react-patterns",
  "nextjs-setup", "api-design", "database-migrations", "redis-patterns",
  "postgres-patterns", "stripe-integration", "clerk-auth", "tailwind-v4",
  "shadcn-ui", "framer-motion", "turbo-repo", "pnpm-workspaces",
  "playwright-e2e", "vitest-setup", "coverage-gates", "sentry-automation",
  "posthog-setup", "analytics-dashboard", "seo-audit", "schema-markup",
  "core-web-vitals", "content-strategy", "email-sequences", "cold-email",
  "ab-testing", "conversion-opt", "landing-page", "waitlist-setup",
];

export const SCORE_WEIGHTS = [
  { label: "Capability", pct: 50, color: "#50FF78" },
  { label: "Popularity", pct: 15, color: "#00C8FF" },
  { label: "Recency", pct: 15, color: "#FF6600" },
  { label: "Preference", pct: 20, color: "#FFD700" },
];
