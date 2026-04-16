"use client";

import { useState } from "react";

type Tier = "all" | "free" | "pro";

type Skill = {
  name: string;
  desc: string;
  example: string;
  tier: "free" | "pro";
};

const SKILLS: Skill[] = [
  // Free
  {
    name: "/ccc:commander",
    desc: "Interactive project manager hub",
    example: "open commander",
    tier: "free",
  },
  {
    name: "/ccc:session",
    desc: "Resume or review prior work",
    example: "continue where I left off",
    tier: "free",
  },
  {
    name: "/ccc:settings",
    desc: "Configure name, theme, Linear, etc.",
    example: "change theme",
    tier: "free",
  },
  {
    name: "/ccc:knowledge",
    desc: "Search/browse captured lessons",
    example: "knowledge Next.js",
    tier: "free",
  },
  {
    name: "/ccc:domains",
    desc: "Router to 11 CCC domain packs",
    example: "domains design",
    tier: "free",
  },
  // Pro
  {
    name: "/ccc:build",
    desc: "Spec-driven build with Spec Flow",
    example: "build a REST API with tests",
    tier: "pro",
  },
  {
    name: "/ccc:linear-board",
    desc: "Pick tasks, create issues, sync status",
    example: "show my Linear backlog",
    tier: "pro",
  },
  {
    name: "/ccc:research",
    desc: "Deep research with Tavily + parallel agents",
    example: "competitive analysis on competitor.com",
    tier: "pro",
  },
  {
    name: "/ccc:content",
    desc: "Blog, social, email, docs with Drive context",
    example: "write a blog post about MCP",
    tier: "pro",
  },
  {
    name: "/ccc:standup",
    desc: "Auto-generated from git + Linear + sessions",
    example: "daily standup",
    tier: "pro",
  },
  {
    name: "/ccc:code-review",
    desc: "4-dimension review with reviewer agent",
    example: "review my diff before I merge",
    tier: "pro",
  },
  {
    name: "/ccc:deploy-check",
    desc: "GO / CAUTION / NO-GO deploy gate",
    example: "ready to ship?",
    tier: "pro",
  },
  {
    name: "/ccc:fleet",
    desc: "Parallel agent orchestration",
    example: "migrate all api routes to new signature",
    tier: "pro",
  },
  {
    name: "/ccc:night-mode",
    desc: "Autonomous overnight builds",
    example: "night mode — build the admin dashboard",
    tier: "pro",
  },
  {
    name: "/ccc:infra",
    desc: "Service health probe",
    example: "is everything up?",
    tier: "pro",
  },
];

const TABS: { id: Tier; label: string; count: number }[] = [
  { id: "all", label: "All", count: SKILLS.length },
  { id: "free", label: "Free", count: SKILLS.filter((s) => s.tier === "free").length },
  { id: "pro", label: "Pro", count: SKILLS.filter((s) => s.tier === "pro").length },
];

export function SkillsShowcase() {
  const [tab, setTab] = useState<Tier>("all");

  const filtered = tab === "all" ? SKILLS : SKILLS.filter((s) => s.tier === tab);

  return (
    <section className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            15 skills. Tab through them.
          </h2>
          <p className="text-zinc-400">
            Every skill is AI-guided. Ask once, watch it orchestrate.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-950">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t.id
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}{" "}
                <span className="text-xs opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <div
              key={skill.name}
              className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <code className="text-sm font-mono font-semibold text-violet-400">
                  {skill.name}
                </code>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    skill.tier === "free"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                      : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  }`}
                >
                  {skill.tier}
                </span>
              </div>
              <p className="text-sm text-zinc-300 mb-3">{skill.desc}</p>
              <p className="text-xs text-zinc-500 font-mono">
                <span className="text-zinc-700">&gt;</span> {skill.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
