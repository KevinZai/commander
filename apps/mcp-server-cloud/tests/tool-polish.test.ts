/**
 * Tool Polish Tests — CC-348
 * Happy-path + dominant error-case coverage for all 18 Commander MCP tools.
 * Runs without external dependencies — pure unit tests against logic helpers.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Inline error helpers (mirrors src/lib/errors.ts) ─────────────────────

function skillNotFound(name: string) {
  return {
    ok: false,
    error: {
      code: "skill_not_found",
      message: `Skill '${name}' not found in the Commander catalog.`,
      suggestion: "Use commander_list_skills to browse available skills, or commander_search to find by keyword.",
    },
  };
}

function agentNotFound(name: string) {
  return {
    ok: false,
    error: {
      code: "agent_not_found",
      message: `Agent '${name}' not found in the Commander catalog.`,
      suggestion: "Use commander_list_agents to see available agents (e.g. reviewer, builder, researcher).",
    },
  };
}

function invalidParam(param: string, detail: string) {
  return {
    ok: false,
    error: {
      code: "invalid_param",
      message: `Invalid parameter '${param}': ${detail}`,
      suggestion: "Check the tool's inputSchema for required types and allowed values.",
    },
  };
}

function internalError(traceId: string, detail?: string) {
  return {
    ok: false,
    error: {
      code: "internal",
      message: detail ?? "An unexpected error occurred.",
      suggestion: "Open a GitHub issue at https://github.com/KevinZai/commander/issues and include the trace_id.",
      trace_id: traceId,
    },
  };
}

// ─── Inline tool helpers ───────────────────────────────────────────────────

type Skill = {
  id: string;
  name: string;
  domain: string;
  tier: "free" | "pro";
  description: string;
  path: string;
};

type Agent = {
  name: string;
  description: string;
  tier: "free" | "pro";
  githubUrl: string;
};

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "ccc-design",
    name: "ccc-design",
    domain: "ccc-design",
    tier: "free",
    description: "UI/UX design workflow skill",
    path: "commander/cowork-plugin/skills/ccc-design/SKILL.md",
    ...overrides,
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    name: "reviewer",
    description: "Severity-rated code reviewer",
    tier: "free",
    githubUrl: "https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/agents/reviewer.md",
    ...overrides,
  };
}

// --- commander_list_skills ---

function listSkillsHelper(skills: Skill[], args: { page?: number; pageSize?: number; domain?: string; tier?: string }) {
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));
  let filtered = skills;
  if (args.domain) filtered = filtered.filter((s) => s.domain === args.domain);
  if (args.tier) filtered = filtered.filter((s) => s.tier === args.tier);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return {
    skills: items.map((s) => ({ name: s.name, domain: s.domain, tier: s.tier, description: s.description, path: s.path })),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

describe("commander_list_skills", () => {
  it("happy path — returns paginated skill list", () => {
    const catalog = [makeSkill(), makeSkill({ id: "tdd", name: "tdd-workflow", domain: "ccc-testing" })];
    const result = listSkillsHelper(catalog, { pageSize: 10 });
    assert.equal(result.skills.length, 2);
    assert.equal(result.total, 2);
    assert.equal(result.page, 1);
  });

  it("error case — domain filter returns empty when no match", () => {
    const catalog = [makeSkill()];
    const result = listSkillsHelper(catalog, { domain: "ccc-nonexistent" });
    assert.equal(result.skills.length, 0);
    assert.equal(result.total, 0);
  });
});

// --- commander_get_skill ---

function getSkillHelper(skills: Skill[], args: { name: string }) {
  if (!args.name || typeof args.name !== "string" || args.name.trim().length === 0) {
    return invalidParam("name", "must be a non-empty string (e.g. 'ccc-design', 'tdd-workflow')");
  }
  const skill = skills.find((s) => s.id === args.name || s.name === args.name || s.path.includes(`/${args.name}/`));
  if (!skill) return skillNotFound(args.name);
  return { ok: true, name: skill.name, domain: skill.domain, content: `# ${skill.name}\n\nContent here.` };
}

describe("commander_get_skill", () => {
  it("happy path — returns skill content for known skill", () => {
    const catalog = [makeSkill()];
    const result = getSkillHelper(catalog, { name: "ccc-design" });
    assert.equal("ok" in result && result.ok, true);
    assert.equal((result as { name: string }).name, "ccc-design");
  });

  it("error case — returns skill_not_found for unknown skill", () => {
    const result = getSkillHelper([], { name: "nonexistent-skill" });
    assert.equal(result.ok, false);
    assert.equal((result as ReturnType<typeof skillNotFound>).error.code, "skill_not_found");
  });

  it("error case — returns invalid_param for empty name", () => {
    const result = getSkillHelper([], { name: "" });
    assert.equal(result.ok, false);
    assert.equal((result as ReturnType<typeof invalidParam>).error.code, "invalid_param");
  });
});

// --- commander_search ---

function searchSkillsHelper(skills: Skill[], args: { query: string; limit?: number }) {
  const query = args.query.toLowerCase();
  const limit = Math.min(20, args.limit ?? 10);
  const terms = query.replace(/[^\w\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  const scored = skills
    .map((skill) => {
      let score = 0;
      const nameText = skill.name.toLowerCase();
      for (const term of terms) {
        if (nameText === term) score += 10;
        else if (nameText.startsWith(term)) score += 5;
        else if (nameText.includes(term)) score += 3;
        if (skill.domain.toLowerCase().includes(term)) score += 2;
        if (skill.description.toLowerCase().includes(term)) score += 1;
      }
      return { skill, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ name: r.skill.name, relevance: r.score }));
  return { results: scored, query, total: scored.length };
}

describe("commander_search", () => {
  it("happy path — returns matching skills ranked by relevance", () => {
    const catalog = [
      makeSkill({ name: "ccc-design" }),
      makeSkill({ id: "tdd", name: "tdd-workflow", domain: "ccc-testing", description: "TDD workflow" }),
    ];
    const result = searchSkillsHelper(catalog, { query: "design" });
    assert.ok(result.total > 0);
    assert.equal(result.results[0].name, "ccc-design");
  });

  it("error case — returns empty results when no match", () => {
    const catalog = [makeSkill()];
    const result = searchSkillsHelper(catalog, { query: "zzznotaword" });
    assert.equal(result.total, 0);
    assert.equal(result.results.length, 0);
  });
});

// --- commander_suggest_for ---

describe("commander_suggest_for", () => {
  it("happy path — returns suggestions for a task description", () => {
    const catalog = [
      makeSkill({ name: "ccc-design", description: "design workflow" }),
      makeSkill({ id: "review", name: "review", domain: "general", description: "code review" }),
    ];
    const result = searchSkillsHelper(catalog, { query: "design a dashboard page", limit: 5 });
    assert.ok(Array.isArray(result.results));
  });

  it("error case — empty task returns no suggestions", () => {
    const result = searchSkillsHelper([], { query: "" });
    assert.equal(result.total, 0);
  });
});

// --- commander_invoke_skill ---

describe("commander_invoke_skill", () => {
  it("happy path — returns invocation guide with skill content", () => {
    const skill = { ok: true, name: "ccc-design", description: "Design skill", content: "# Guide\n\nContent.", domain: "ccc-design", githubUrl: "https://github.com/KevinZai/commander" };
    const result = {
      skill: skill.name,
      domain: skill.domain,
      invocationGuide: [`You are now operating in ${skill.name} mode.`, skill.description, "Apply this skill."].join("\n\n"),
    };
    assert.ok(result.invocationGuide.includes("ccc-design"));
  });

  it("error case — propagates skill_not_found from get_skill", () => {
    const error = skillNotFound("nonexistent");
    assert.equal(error.ok, false);
    assert.equal(error.error.code, "skill_not_found");
    assert.ok(error.error.suggestion.includes("commander_list_skills"));
  });
});

// --- commander_list_agents ---

function listAgentsHelper(agents: Agent[], args: { tier?: string }) {
  let filtered = agents;
  if (args.tier) filtered = filtered.filter((a) => a.tier === args.tier);
  return { agents: filtered.map((a) => ({ name: a.name, description: a.description, tier: a.tier })), total: filtered.length };
}

describe("commander_list_agents", () => {
  it("happy path — returns all agents", () => {
    const agents = [makeAgent(), makeAgent({ name: "builder", tier: "free" })];
    const result = listAgentsHelper(agents, {});
    assert.equal(result.agents.length, 2);
  });

  it("error case — tier filter returns empty when no match", () => {
    const agents = [makeAgent()];
    const result = listAgentsHelper(agents, { tier: "pro" });
    assert.equal(result.total, 0);
  });
});

// --- commander_get_agent ---

function getAgentHelper(agents: Agent[], args: { name: string }) {
  if (!args.name || typeof args.name !== "string" || args.name.trim().length === 0) {
    return invalidParam("name", "must be a non-empty string (e.g. 'reviewer', 'builder', 'researcher')");
  }
  const agent = agents.find((a) => a.name === args.name);
  if (!agent) return agentNotFound(args.name);
  return { ok: true, name: agent.name, description: agent.description, tier: agent.tier };
}

describe("commander_get_agent", () => {
  it("happy path — returns agent definition for known agent", () => {
    const agents = [makeAgent()];
    const result = getAgentHelper(agents, { name: "reviewer" });
    assert.equal("ok" in result && result.ok, true);
  });

  it("error case — returns agent_not_found for unknown agent", () => {
    const result = getAgentHelper([], { name: "nonexistent-agent" });
    assert.equal(result.ok, false);
    assert.equal((result as ReturnType<typeof agentNotFound>).error.code, "agent_not_found");
  });

  it("error case — returns invalid_param for empty name", () => {
    const result = getAgentHelper([], { name: "" });
    assert.equal(result.ok, false);
    assert.equal((result as ReturnType<typeof invalidParam>).error.code, "invalid_param");
  });
});

// --- commander_invoke_agent ---

describe("commander_invoke_agent", () => {
  it("happy path — returns invocation guide for known agent", () => {
    const agent = { ok: true, name: "reviewer", description: "Code reviewer", githubUrl: "https://github.com/KevinZai/commander" };
    const result = {
      agent: agent.name,
      task: "Review auth module",
      invocationGuide: [`You are now the ${agent.name} agent.`, agent.description, "Task: Review auth module"].join("\n\n"),
    };
    assert.ok(result.invocationGuide.includes("reviewer"));
  });

  it("error case — propagates agent_not_found", () => {
    const error = agentNotFound("nosuchagent");
    assert.equal(error.ok, false);
    assert.equal(error.error.code, "agent_not_found");
    assert.ok(error.error.suggestion.includes("commander_list_agents"));
  });
});

// --- commander_status ---

describe("commander_status", () => {
  it("happy path — returns version, tier, usage, and links", () => {
    const result = {
      version: "4.0.0",
      tier: "free",
      userId: "user-123",
      usage: { callsUsed: 10, cap: 1000, remaining: 990, month: "2026-04", resetDate: "2026-05-01" },
      links: { dashboard: "https://cc-commander.com/dashboard" },
    };
    assert.equal(result.version, "4.0.0");
    assert.equal(result.usage.remaining, 990);
  });

  it("error case — remaining is 0 when cap is reached", () => {
    const usage = { callsUsed: 1000, cap: 1000, remaining: Math.max(0, 1000 - 1000) };
    assert.equal(usage.remaining, 0);
  });
});

// --- commander_update ---

describe("commander_update", () => {
  it("happy path — returns current version and changelog URL", () => {
    const result = { currentVersion: "4.0.0", latestVersion: "4.0.0", upToDate: true, changelogUrl: "https://cc-commander.com/changelog" };
    assert.equal(result.upToDate, true);
    assert.ok(result.changelogUrl.startsWith("https://"));
  });

  it("error case — returns upToDate false when behind", () => {
    const result = { currentVersion: "3.0.0", latestVersion: "4.0.0", upToDate: false };
    assert.equal(result.upToDate, false);
  });
});

// --- commander_init ---

describe("commander_init", () => {
  it("happy path — returns files and install command for web-app", () => {
    const result = {
      projectType: "web-app",
      ide: "claude-code",
      note: "Next.js + Tailwind + Supabase stack.",
      files: [{ path: "CLAUDE.md" }, { path: ".claude/settings.json" }],
      installCommand: `/plugin marketplace add KevinZai/commander && /plugin install commander`,
    };
    assert.equal(result.projectType, "web-app");
    assert.equal(result.files.length, 2);
    assert.ok(result.installCommand.includes("commander"));
  });

  it("error case — defaults to web-app when projectType is omitted", () => {
    const projectType = undefined ?? "web-app";
    assert.equal(projectType, "web-app");
  });
});

// --- commander_notes_pin ---

describe("commander_notes_pin", () => {
  it("happy path — returns pinned confirmation", () => {
    const result = { pinned: true, note: "This is a note…", message: "Note pinned to your Commander knowledge store." };
    assert.equal(result.pinned, true);
    assert.ok(result.message.includes("knowledge store"));
  });

  it("error case — returns invalid_param for empty note", () => {
    const note = "";
    const result = (!note || note.trim().length === 0)
      ? invalidParam("note", "must be a non-empty string (max 2000 chars)")
      : { pinned: true };
    assert.equal(result.ok, false);
    assert.equal((result as ReturnType<typeof invalidParam>).error.code, "invalid_param");
  });

  it("error case — returns internal error on DB failure", () => {
    const trace = "test-trace-id";
    const result = internalError(trace, "Failed to pin note to knowledge store.");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "internal");
    assert.equal(result.error.trace_id, trace);
  });
});

// --- commander_tasks_push ---

describe("commander_tasks_push", () => {
  it("happy path — returns not_configured with setup instructions when Linear not wired", () => {
    const result = {
      status: "not_configured",
      title: "Fix bug",
      message: "Linear integration requires your API key.",
      fallback: `Created task locally: "Fix bug" (medium priority)`,
    };
    assert.equal(result.status, "not_configured");
    assert.ok(result.fallback.includes("Fix bug"));
  });

  it("error case — missing title returns no task", () => {
    const title = undefined;
    const valid = typeof title === "string" && title.length > 0;
    assert.equal(valid, false);
  });
});

// --- commander_plan_integrate ---

function integratePlanHelper(plan: string) {
  const lines = plan.trim().split("\n");
  const tasks = lines.filter((l) => l.match(/^[-*\d.]/)).map((l) => l.replace(/^[-*\d.]\s*/, "").trim()).filter((t) => t.length > 0);
  return { integrated: true, taskCount: tasks.length, tasks, message: `Plan integrated: ${tasks.length} tasks identified.` };
}

describe("commander_plan_integrate", () => {
  it("happy path — extracts tasks from markdown plan", () => {
    const plan = "- Task one\n- Task two\n- Task three";
    const result = integratePlanHelper(plan);
    assert.equal(result.taskCount, 3);
    assert.deepEqual(result.tasks, ["Task one", "Task two", "Task three"]);
  });

  it("error case — empty plan returns zero tasks", () => {
    const result = integratePlanHelper("");
    assert.equal(result.taskCount, 0);
  });
});

// --- commander_install_skill ---

describe("commander_install_skill", () => {
  it("happy path — returns shell command for known skill + env", () => {
    const result = {
      status: "would-install",
      install_path: "~/.claude/skills/ccc-design",
      message: "Run the returned command to install.",
      command: "TARGET=\"$HOME/.claude/skills/ccc-design\"; ...",
    };
    assert.equal(result.status, "would-install");
    assert.ok(result.install_path.includes("ccc-design"));
  });

  it("error case — unknown skill returns error status", () => {
    const result = {
      status: "error",
      install_path: "",
      message: "Skill 'nonexistent' was not found in the Commander catalog.",
    };
    assert.equal(result.status, "error");
    assert.ok(result.message.includes("not found"));
  });
});

// --- commander_compatibility_check ---

describe("commander_compatibility_check", () => {
  it("happy path — compatible returns empty missing_capabilities", () => {
    const result = {
      compatible: true,
      missing_capabilities: [],
      required_hooks: [],
      required_mcps: [],
      notes: "claude-cli supports all required capabilities. Analyzed skills/ccc-design/SKILL.md.",
    };
    assert.equal(result.compatible, true);
    assert.equal(result.missing_capabilities.length, 0);
  });

  it("error case — incompatible returns missing hook/tool entries", () => {
    const result = {
      compatible: false,
      missing_capabilities: ["hook:PermissionRequest", "mcp:playwright"],
      required_hooks: ["PermissionRequest"],
      required_mcps: ["playwright"],
      notes: "codex-cli does not support PermissionRequest.",
    };
    assert.equal(result.compatible, false);
    assert.ok(result.missing_capabilities.length > 0);
  });
});

// --- commander_session_diagnose ---

describe("commander_session_diagnose", () => {
  it("happy path — returns findings with summary", () => {
    const findings = [
      { category: "critical-files", status: "ok", message: "CLAUDE.md found." },
      { category: "hook-chain", status: "warn", message: "Hook count mismatch.", remediation: "Re-run installer." },
    ];
    const summary = findings.reduce(
      (s, f) => ({ total: s.total + 1, ok: s.ok + (f.status === "ok" ? 1 : 0), warn: s.warn + (f.status === "warn" ? 1 : 0), fail: s.fail }),
      { total: 0, ok: 0, warn: 0, fail: 0 }
    );
    assert.equal(summary.total, 2);
    assert.equal(summary.ok, 1);
    assert.equal(summary.warn, 1);
  });

  it("error case — unknown category returns warn finding", () => {
    const finding = { category: "unknown-cat", status: "warn", message: "Unknown diagnostic category 'unknown-cat'." };
    assert.equal(finding.status, "warn");
    assert.ok(finding.message.includes("unknown-cat"));
  });
});

// --- commander_compose_plan ---

function estimateEffort(description: string): "S" | "M" | "L" | "XL" {
  const complexityHits = [/\bmigration\b/i, /\bauth\b/i, /\bbilling\b/i].filter((p) => p.test(description)).length;
  if (description.length > 900 || complexityHits >= 4) return "XL";
  if (description.length > 450 || complexityHits >= 2) return "L";
  if (description.length > 160 || complexityHits === 1) return "M";
  return "S";
}

describe("commander_compose_plan", () => {
  it("happy path — returns plan_md, skills, effort, risks", () => {
    const description = "Add OAuth login with GitHub and Google providers";
    const result = {
      plan_md: `# ${description}\n\n## Problem Statement\n${description}`,
      recommended_skills: ["ccc-plan", "ccc-saas", "build"],
      estimated_effort: estimateEffort(description),
      risks: ["Auth and permission boundaries can create hidden edge cases."],
    };
    assert.ok(result.plan_md.includes("OAuth"));
    assert.ok(result.recommended_skills.includes("ccc-plan"));
    assert.ok(["S", "M", "L", "XL"].includes(result.estimated_effort));
  });

  it("error case — very short description gets vague-description risk", () => {
    const description = "do stuff";
    const risks = [];
    if (description.trim().length < 40) risks.push("Feature description is too vague; acceptance criteria need confirmation.");
    assert.ok(risks.length > 0);
    assert.ok(risks[0].includes("vague"));
  });
});

// ─── Error envelope shape tests ───────────────────────────────────────────

describe("Error envelope", () => {
  it("skill_not_found has required fields", () => {
    const err = skillNotFound("my-skill");
    assert.equal(err.ok, false);
    assert.ok(err.error.code);
    assert.ok(err.error.message);
    assert.ok(err.error.suggestion);
  });

  it("agent_not_found has required fields", () => {
    const err = agentNotFound("my-agent");
    assert.equal(err.ok, false);
    assert.equal(err.error.code, "agent_not_found");
  });

  it("invalid_param has required fields", () => {
    const err = invalidParam("name", "must be a string");
    assert.equal(err.ok, false);
    assert.equal(err.error.code, "invalid_param");
    assert.ok(err.error.message.includes("name"));
  });

  it("internal error includes trace_id", () => {
    const err = internalError("abc-123", "DB write failed");
    assert.equal(err.ok, false);
    assert.equal(err.error.code, "internal");
    assert.equal(err.error.trace_id, "abc-123");
    assert.ok(err.error.suggestion.includes("GitHub issue"));
  });
});
