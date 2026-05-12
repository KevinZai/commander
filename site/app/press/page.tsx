import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Press Kit",
  description:
    "CC Commander brand assets, talking points, logos, and press contact.",
};

const TALKING_POINTS = [
  "CC Commander is a free, open-source Claude Code plugin that aggregates 62 curated skills, 22 specialist sub-agents, and 9 lifecycle hooks into a single install.",
  "It reduces Claude Code setup time from hours to under 10 seconds — one command installs a production-ready AI development workflow.",
  "The plugin ships 22 specialist agents (architect, security-auditor, debugger, designer, QA engineer, etc.) that activate contextually based on what the developer is doing.",
  "CC Commander is built on Anthropic's Claude Agent SDK sub-agent architecture, making it compatible with Claude Cowork Desktop and Claude Code CLI out of the box.",
  "Version 4.1.0 ships with 9 lifecycle hooks and 24 handlers — including auto-quality-gates, session persistence, pre-compact state saving, and permission orchestration.",
  "The project is MIT-licensed. Pro tier ($19/mo) funds development; the Starter tier stays free and MIT-licensed.",
];

const TWEETS = [
  `Just installed @cc_commander — 62 Claude skills + 22 agents in 10 seconds. This is insane. /plugin install commander`,
  `The missing layer for @ClaudeAI Code is here. CC Commander turns Claude into a full dev workflow with one install. Free for now. github.com/KevinZai/commander`,
  `I stopped juggling 12 different Claude plugins. @cc_commander aggregated the best ones and made them talk to each other. One install, done.`,
  `60 skills · 22 agents · 9 hooks · 2 bundled MCPs. @commanderplugin is the OS layer I always wanted on top of Claude Code.`,
];

export default function PressPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
            Press Kit
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            CC Commander Media Resources
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Everything you need to write about, demo, or talk about CC
            Commander. Questions not answered here?{" "}
            <a
              href="mailto:hello@cc-commander.com"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Email us
            </a>
            .
          </p>
        </div>

        {/* Brand colors */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Brand Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Orange", hex: "#FF6B47", label: "Primary accent" },
              { name: "Zinc 950", hex: "#0F0F0F", label: "Background" },
              { name: "Violet", hex: "#8B5CF6", label: "Gradient start" },
              { name: "Fuchsia", hex: "#D946EF", label: "Gradient end" },
            ].map((c) => (
              <div key={c.hex} className="rounded-xl overflow-hidden border border-zinc-800">
                <div
                  className="h-20"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="p-3 bg-zinc-950">
                  <p className="text-white text-sm font-semibold">{c.name}</p>
                  <p className="text-zinc-400 text-xs font-mono">{c.hex}</p>
                  <p className="text-zinc-600 text-xs">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logo downloads */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Logos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Logo — Light background (SVG)", file: "ccc-logo-light.svg" },
              { label: "Logo — Dark background (SVG)", file: "ccc-logo-dark.svg" },
              { label: "Icon only — Square (PNG 512×512)", file: "ccc-icon-512.png" },
              { label: "Horizontal lockup (PNG 1200×300)", file: "ccc-lockup-horizontal.png" },
            ].map((l) => (
              <a
                key={l.file}
                // TODO: CC-667 — add actual logo files to /public/press/logos/
                href={`/press/logos/${l.file}`}
                className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-950/40 transition-colors group"
              >
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  {l.label}
                </span>
                <span className="text-xs text-zinc-600 font-mono">{l.file}</span>
              </a>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            {/* TODO: CC-667 — upload assets to /public/press/logos/ */}
            Logo files coming when CC-667 ships. Contact{" "}
            <a href="mailto:hello@cc-commander.com" className="text-zinc-500 hover:text-white transition-colors">
              hello@cc-commander.com
            </a>{" "}
            for assets in the meantime.
          </p>
        </section>

        {/* Talking points */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Talking Points</h2>
          <ul className="space-y-4">
            {TALKING_POINTS.map((point, i) => (
              <li key={i} className="flex gap-3 p-4 rounded-lg bg-zinc-950/40 border border-zinc-900">
                <span className="text-orange-400 font-bold flex-shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pre-written tweets */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-2">Pre-written Tweets</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Copy-paste ready. Modify as you like — the spirit matters, not the
            exact wording.
          </p>
          <div className="space-y-4">
            {TWEETS.map((tweet, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/40"
              >
                <p className="text-zinc-300 text-sm leading-relaxed mb-3 font-mono">
                  {tweet}
                </p>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Post on X →
                </a>
              </div>
            ))}
          </div>
          {/* TODO: CC-667 — add /press/tweet-templates page with full set */}
        </section>

        {/* Screenshots placeholder */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6">Screenshots</h2>
          {/* TODO: CC-667 — add actual screenshots to /public/press/screenshots/ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Terminal install",
              "Plan pane",
              "Skill browser",
              "Agent dispatch",
              "Hook lifecycle",
              "Dashboard",
            ].map((label) => (
              <div
                key={label}
                className="aspect-video rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center"
              >
                <span className="text-zinc-600 text-xs text-center px-2">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Screenshots available upon request:{" "}
            <a href="mailto:hello@cc-commander.com" className="text-zinc-500 hover:text-white transition-colors">
              hello@cc-commander.com
            </a>
          </p>
        </section>

        {/* Author bio */}
        <section className="mb-16 p-6 rounded-xl border border-zinc-800 bg-zinc-950/40">
          <h2 className="text-xl font-bold mb-4">About the Author</h2>
          <div className="flex gap-6 flex-col sm:flex-row">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                Kevin Zicherman
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                Kevin is a developer and AI consultant building open-source
                tooling for the Claude Code ecosystem. He created CC Commander
                to solve his own frustration with fragmented AI development
                workflows — scanning 200+ community resources to distill the
                best practices into one install. He advises companies on AI
                engineering workflows at{" "}
                <a
                  href="https://kevinz.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  kevinz.ai
                </a>
                .
              </p>
              <div className="flex gap-4 text-sm">
                <a
                  href="https://kevinz.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  kevinz.ai
                </a>
                <a
                  href="https://twitter.com/kzic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  @commanderplugin
                </a>
                <a
                  href="https://github.com/KevinZai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Press contact */}
        <section className="p-6 rounded-xl border border-orange-500/20 bg-orange-950/5">
          <h2 className="text-xl font-bold mb-2">Press Contact</h2>
          <p className="text-zinc-400 text-sm mb-4">
            For interview requests, review access, or additional assets:
          </p>
          <a
            href="mailto:hello@cc-commander.com?subject=Press%20inquiry"
            className="text-orange-400 hover:text-orange-300 transition-colors font-semibold"
          >
            hello@cc-commander.com
          </a>
          <p className="text-zinc-600 text-xs mt-2">
            Typical response time: 24 hours on business days.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
