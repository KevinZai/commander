import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Compare — CC Commander vs ECC vs mattpocock/skills",
  description:
    "Honest comparison of CC Commander against the closest alternatives in the Claude Code ecosystem. We use them ourselves; we picked our lanes.",
  openGraph: {
    title: "CC Commander vs the alternatives",
    description: "How CC Commander compares to ECC, mattpocock/skills, and Anthropic's official skills marketplace. No FUD, just lanes.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

type Row = {
  feature: string;
  ccc: string;
  ecc: string;
  pocock: string;
  anthropic: string;
};

const ROWS: Row[] = [
  { feature: "Curated skill collection", ccc: "60+ /ccc-* + 11 CCC domains (450+ ecosystem)", ecc: "150+ ECC skills, 65 rules", pocock: "17 skills (TDD, PRD, architecture)", anthropic: "5-10 official skills (Theme Factory, Frontend Design, etc.)" },
  { feature: "Specialist sub-agents", ccc: "22 personas (architect, reviewer, debugger, designer, language-specific, etc.)", ecc: "38 agents (TDD, security, language-specific reviewers)", pocock: "—", anthropic: "Sub-agent primitive only, no curated personas" },
  { feature: "Lifecycle hooks", ccc: "9 events × 25 handlers", ecc: "Full hook lifecycle (SessionStart, PreToolUse, PostToolUse, Stop, PreCompact)", pocock: "—", anthropic: "Hook primitive only" },
  { feature: "Hosted MCP server", ccc: "commander-mcp.fly.dev — 100 free calls/mo per authed user, auth + rate-limit + usage tracking", ecc: "—", pocock: "—", anthropic: "Connectors directory (browse, not host)" },
  { feature: "MCP client compatibility", ccc: "Claude Code Desktop + CLI · Cursor · Windsurf · Codex (via hosted MCP)", ecc: "Claude Code-focused", pocock: "Claude Code Desktop / CLI", anthropic: "Claude Code Desktop / CLI" },
  { feature: "License", ccc: "MIT", ecc: "MIT (OSS); commercial Pro tier separately", pocock: "MIT", anthropic: "Anthropic standard terms" },
  { feature: "Pricing", ccc: "Free forever for plugin core. Pro/Team tiers on waitlist (validate WTP first).", ecc: "Free OSS + $19/mo Pro (GitHub App + private repo scanning + audit)", pocock: "Free", anthropic: "Free (Claude subscription separate)" },
  { feature: "Marketplace install", ccc: "`/plugin install commander`", ecc: "`/plugin marketplace add svenwiebe/everything-claudecode`", pocock: "npm + repo clone or `npx skills@latest add mattpocock/skills/<name>`", anthropic: "Built into Claude Code skill picker" },
  { feature: "GitHub stars (at time of writing)", ccc: "Pre-launch", ecc: "82K+ (one of the most-starred Claude Code OSS projects)", pocock: "15K+ stars · 107K total installs", anthropic: "Closed-source baseline" },
  { feature: "Best for", ccc: "Solo dev or small team that wants a curated, opinionated package with hosted-MCP convenience and a single install", ecc: "Power user who wants depth in automation (GitHub App, private-repo scanning) and is willing to pay for Pro", pocock: "Developers who want focused, principled skills (TDD, PRD, architecture) without orchestration overhead", anthropic: "Claude Code users who want Anthropic-blessed defaults" },
];

const PHILOSOPHY = [
  {
    title: "We use them all. Daily.",
    body: "We curated 19 vendor packages into CC Commander — including ECC, gstack, Superpowers, Claude HUD, and Compound Engineering. ECC's automation is excellent. Pocock's principle-first skills are excellent. Anthropic's marketplace is the substrate we all build on. We're not competing — we're a different lane.",
  },
  {
    title: "Lanes, not enemies.",
    body: "ECC charges $19/mo for automation depth (GitHub App, private repo scanning). That's a real moat. CC Commander charges nothing for skills because skills are fungible (anyone can fork the repo). If we ever charge, it'll be for hosted-MCP infrastructure or team management — not for content. Different lanes.",
  },
  {
    title: "Pocock built the path.",
    body: "Matt Pocock's `mattpocock/skills` repo proved that curated, principle-first skill collections build massive distribution (107K installs, no paywall). We adopted his ergonomic conventions (small focused skills, MD frontmatter, MIT license) and added orchestration on top (lifecycle hooks, sub-agent personas, hosted MCP).",
  },
  {
    title: "Anthropic owns the substrate.",
    body: "Skills, sub-agents, hooks, MCP — these are Anthropic primitives. Everything in CC Commander sits on top of them. If Anthropic builds something we ship, we ship the affected feature differently or deprecate it. We're additive to the platform, not adjacent.",
  },
  {
    title: "How to pick.",
    body: "If you want a one-click install that activates 60 skills + 22 agents + a hosted MCP with zero credit card friction, install CC Commander. If you need GitHub App automation across private repos, install ECC alongside it. If you want a focused, principle-first TDD/PRD workflow, install Pocock's skills directly. They compose — pick whatever helps.",
  },
];

export default function ComparePage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24 px-4">
        <article className="max-w-5xl mx-auto">
          <header className="mb-12 border-b border-zinc-900 pb-8 text-center">
            <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-4">
              Honest comparison · 2026-05-13
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
              CC Commander vs the alternatives
            </h1>
            <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
              How CC Commander compares to <strong>ECC</strong>, <strong>mattpocock/skills</strong>, and <strong>Anthropic&apos;s official skills</strong>. We use them all ourselves. We picked our lane. Here&apos;s where each fits.
            </p>
          </header>

          {/* Comparison table */}
          <section className="mb-16">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-zinc-900 rounded-2xl overflow-hidden">
                <thead className="bg-zinc-950 text-zinc-300">
                  <tr className="border-b border-zinc-900">
                    <th className="text-left font-semibold p-4 w-1/5">Feature</th>
                    <th className="text-left font-semibold p-4 w-1/5 bg-violet-950/30 text-violet-200">CC Commander</th>
                    <th className="text-left font-semibold p-4 w-1/5">ECC</th>
                    <th className="text-left font-semibold p-4 w-1/5">mattpocock/skills</th>
                    <th className="text-left font-semibold p-4 w-1/5">Anthropic Skills</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  {ROWS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-zinc-950/30" : ""}>
                      <th scope="row" className="text-left align-top font-medium text-white p-4 border-t border-zinc-900">
                        {row.feature}
                      </th>
                      <td className="align-top p-4 border-t border-zinc-900 bg-violet-950/10 text-zinc-300">{row.ccc}</td>
                      <td className="align-top p-4 border-t border-zinc-900">{row.ecc}</td>
                      <td className="align-top p-4 border-t border-zinc-900">{row.pocock}</td>
                      <td className="align-top p-4 border-t border-zinc-900">{row.anthropic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              Stats verified 2026-05-13. ECC and Pocock numbers from public GitHub data. Anthropic skill count is approximate based on the current Anthropic Skills repo.
            </p>
          </section>

          {/* Philosophy */}
          <section className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Our take</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {PHILOSOPHY.map((p) => (
                <div key={p.title} className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">{p.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-zinc-900 pt-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Try CC Commander</h2>
            <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
              30-second install. No card. All 60 skills, 22 agents, and the hosted MCP free tier are yours immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/#install"
                className="inline-block px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
              >
                Install CC Commander Free →
              </a>
              <a
                href="https://github.com/KevinZai/commander"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-lg border border-zinc-800 text-white hover:bg-zinc-900 transition-colors"
              >
                View source on GitHub
              </a>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
