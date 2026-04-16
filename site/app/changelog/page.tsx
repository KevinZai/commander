import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Release notes for CCC (Claude Code Commander).",
};

type Entry = {
  version: string;
  date: string;
  badge?: "major" | "minor" | "patch";
  highlights: string[];
  sections: { heading: string; items: string[] }[];
};

const ENTRIES: Entry[] = [
  {
    version: "v3.0.0",
    date: "2026-04-16",
    badge: "major",
    highlights: [
      "Rebranded CC Commander → CCC (Claude Code Commander)",
      "Desktop-first plugin with 15 skills, 5 agents, 6 hooks, 8 pre-wired MCPs",
      "Free tier + Pro tier ($19/mo) + Team tier ($99/mo)",
    ],
    sections: [
      {
        heading: "Added",
        items: [
          "8 pre-configured MCP servers: Linear, GitHub, Slack, Gmail, Google Calendar, Tavily (real-time web search), Context7 (library docs), Google Drive",
          "15 focused plugin skills: commander, build, linear-board, research, content, session, settings, domains, infra, knowledge, night-mode, standup, code-review, deploy-check, fleet",
          "5 specialized agents: reviewer (sonnet, read-only), builder (sonnet), researcher (sonnet), debugger (opus), fleet-worker (sonnet)",
          "6 lifecycle hooks with free/pro gating: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification",
          "CONNECTORS.md with 13 tool-agnostic ~~category placeholders",
          "Dual-mode pattern (Quick + Power) on every skill",
          "Marketplace listing: /plugin marketplace add KevinZai/commander",
        ],
      },
      {
        heading: "Changed",
        items: [
          "Plugin name: cc-commander → ccc (all skills now prefixed /ccc:*)",
          "Marketplace: cc-commander-marketplace → ccc-marketplace",
          "Refactored 7-skill monolith into 15 focused skills",
          "All user-facing docs (README, CLAUDE.md, CHEATSHEET.md, SKILLS-INDEX.md, docs/index.html) updated for CCC",
        ],
      },
      {
        heading: "Fixed",
        items: [
          "active-session.json now created on SessionStart (previously only deleted)",
          "Removed 3 dead menu targets in main-menu.json",
          "Removed hardcoded paths (/Users/ai/clawd/..., ~/.openclaw/.env) from distributed skills",
          "Cost-tracker label no longer implies a hard ceiling was enforced when it wasn't",
          "Intent-classifier reads stdin before tier gate (prevents broken pipe)",
          "Domain sub-skill counts reconciled (design 39, marketing 45, testing 15)",
          "Normalized all skill example commands to /ccc: prefix",
        ],
      },
    ],
  },
  {
    version: "v2.3.1",
    date: "2026-04-10",
    badge: "patch",
    highlights: [
      "Full audit remediation — 38 findings fixed, score 72→96",
      "Linear auth priority chain: CC_LINEAR_TOKEN > LINEAR_DEV_TOKEN_PERSONAL > LINEAR_API_KEY_PERSONAL > LINEAR_API_KEY",
    ],
    sections: [
      {
        heading: "Security",
        items: [
          "Shell injection fix: execSync → execFileSync in auto-checkpoint + session-end-verify hooks",
          "Plaintext API key removed from linear.js state.json fallback (env-only)",
          "YOLO mode → permissionMode: 'plan' (safer default)",
          "Post-clone integrity check added to install-remote.sh",
          "Linear OAuth credentials scrubbed from git history via git filter-repo",
        ],
      },
    ],
  },
];

function Badge({ type }: { type: Entry["badge"] }) {
  const style =
    type === "major"
      ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
      : type === "minor"
      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
      : "bg-zinc-700/40 text-zinc-300 border-zinc-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${style}`}
    >
      {type}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 max-w-3xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
            Changelog
          </h1>
          <p className="text-zinc-400">
            Release notes for CCC. Bigger picture: what shipped, what changed,
            what got fixed.
          </p>
        </div>

        <div className="space-y-12">
          {ENTRIES.map((entry) => (
            <article
              key={entry.version}
              className="border-l-2 border-zinc-900 pl-6"
            >
              <header className="flex items-baseline gap-3 mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {entry.version}
                </h2>
                {entry.badge ? <Badge type={entry.badge} /> : null}
                <time className="text-sm text-zinc-500 ml-auto">
                  {entry.date}
                </time>
              </header>

              {entry.highlights.length > 0 ? (
                <ul className="mb-6 space-y-1.5 text-zinc-300">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-violet-400 flex-shrink-0">★</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {entry.sections.map((s) => (
                <div key={s.heading} className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {s.heading}
                  </h3>
                  <ul className="space-y-1.5 text-sm text-zinc-400">
                    {s.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-zinc-600 flex-shrink-0">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
