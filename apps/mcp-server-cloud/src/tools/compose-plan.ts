export type ComposePlanArgs = {
  feature_description: string;
  project_context?: {
    stack?: string;
    repo_root?: string;
    recent_commits?: string[];
  };
};

export type ComposePlanResult = {
  plan_md: string;
  recommended_skills: string[];
  estimated_effort: "S" | "M" | "L" | "XL";
  risks: string[];
};

type SkillRule = {
  skill: string;
  pattern: RegExp;
};

const SKILL_RULES: SkillRule[] = [
  { skill: "ccc-saas", pattern: /\b(auth|billing|stripe|tenant|subscription|account|saas)\b/i },
  { skill: "ccc-design", pattern: /\b(ui|ux|design|component|dashboard|page|screen|frontend)\b/i },
  { skill: "ccc-testing", pattern: /\b(test|coverage|qa|regression|e2e|unit)\b/i },
  { skill: "ccc-devops", pattern: /\b(deploy|ci|cd|docker|infra|observability|monitoring)\b/i },
  { skill: "ccc-security", pattern: /\b(security|permission|secret|oauth|compliance|audit)\b/i },
  { skill: "ccc-data", pattern: /\b(data|sql|analytics|pipeline|warehouse|report)\b/i },
  { skill: "systematic-debugging", pattern: /\b(bug|fix|error|crash|failure|regression)\b/i },
  { skill: "spec-interviewer", pattern: /\b(unclear|unsure|maybe|idea|prototype)\b/i },
];

function titleFromDescription(description: string): string {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Unspecified feature";
  const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned;
  return sentence.length > 80 ? `${sentence.slice(0, 77).trim()}...` : sentence;
}

function recommendedSkills(description: string): string[] {
  const matches = SKILL_RULES.filter((rule) => rule.pattern.test(description)).map((rule) => rule.skill);
  return [...new Set(["ccc-plan", ...matches, "build"])].slice(0, 6);
}

function estimateEffort(description: string, stack?: string): ComposePlanResult["estimated_effort"] {
  const text = `${description} ${stack ?? ""}`;
  const complexityHits = [
    /\bmigration\b/i,
    /\bmulti[- ]tenant\b/i,
    /\brealtime\b/i,
    /\bbilling\b/i,
    /\bauth\b/i,
    /\bmobile\b/i,
    /\benterprise\b/i,
    /\bdata pipeline\b/i,
  ].filter((pattern) => pattern.test(text)).length;

  if (text.length > 900 || complexityHits >= 4) return "XL";
  if (text.length > 450 || complexityHits >= 2) return "L";
  if (text.length > 160 || complexityHits === 1) return "M";
  return "S";
}

function risksFor(description: string): string[] {
  const risks = new Set<string>();
  const trimmed = description.trim();
  if (trimmed.length < 40) risks.add("Feature description is too vague; acceptance criteria need confirmation.");
  if (/\b(auth|permission|oauth|security)\b/i.test(description)) risks.add("Auth and permission boundaries can create hidden edge cases.");
  if (/\b(billing|stripe|payment|subscription)\b/i.test(description)) risks.add("Billing flows need webhook, retry, and rollback coverage.");
  if (/\b(data|migration|schema|sql)\b/i.test(description)) risks.add("Data shape changes need migration and backfill planning.");
  if (/\b(realtime|socket|stream)\b/i.test(description)) risks.add("Realtime features need latency, reconnect, and failure-mode tests.");
  risks.add("Implementation scope can expand unless the first deliverable is tightly bounded.");
  return [...risks].slice(0, 5);
}

function contextLines(context: ComposePlanArgs["project_context"]): string {
  if (!context) return "- Stack: unknown\n- Repo root: unknown\n- Recent commits: none provided";
  const commits = context.recent_commits?.slice(0, 3).map((commit) => `  - ${commit}`).join("\n") ?? "  - none provided";
  return [
    `- Stack: ${context.stack ?? "unknown"}`,
    `- Repo root: ${context.repo_root ?? "unknown"}`,
    "- Recent commits:",
    commits,
  ].join("\n");
}

function buildPlanMarkdown(args: ComposePlanArgs, skills: string[], effort: ComposePlanResult["estimated_effort"], risks: string[]): string {
  const description = args.feature_description.trim() || "No feature description was provided.";
  const title = titleFromDescription(description);

  return [
    `# ${title}`,
    "",
    "## Problem Statement",
    description,
    "",
    "## Project Context",
    contextLines(args.project_context),
    "",
    "## Evals",
    "- [ ] Primary user can complete the core workflow end-to-end.",
    "- [ ] Failure states are visible, recoverable, and covered by tests.",
    "- [ ] Existing behavior remains unchanged outside the feature scope.",
    "",
    "## Plan",
    "### Phase 1 - Clarify",
    "- Confirm target user, non-goals, and first shippable slice.",
    "- Write acceptance criteria before implementation.",
    "",
    "### Phase 2 - Build",
    "- Implement the smallest end-to-end path behind a safe boundary.",
    "- Add focused tests for happy path, error path, and edge case.",
    "",
    "### Phase 3 - Verify",
    "- Run typecheck, tests, and any app-specific smoke checks.",
    "- Document rollout, rollback, and follow-up work.",
    "",
    "## Recommended Skills",
    ...skills.map((skill) => `- ${skill}`),
    "",
    "## Risks",
    ...risks.map((risk) => `- ${risk}`),
    "",
    "## Estimated Effort",
    effort,
  ].join("\n");
}

export function composePlan(args: ComposePlanArgs): ComposePlanResult {
  const skills = recommendedSkills(args.feature_description);
  const estimatedEffort = estimateEffort(args.feature_description, args.project_context?.stack);
  const risks = risksFor(args.feature_description);

  return {
    plan_md: buildPlanMarkdown(args, skills, estimatedEffort, risks),
    recommended_skills: skills,
    estimated_effort: estimatedEffort,
    risks,
  };
}
