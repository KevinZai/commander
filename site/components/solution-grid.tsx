const FEATURES = [
  {
    count: "15",
    label: "AI-Guided Skills",
    body:
      "Every skill runs a guided workflow. /ccc:build asks 3 questions, hands off to the builder agent. /ccc:standup pulls from git + Linear + Slack, drafts a standup, posts it. No blank terminal.",
    tint: "from-violet-500/10 to-transparent border-violet-500/20",
  },
  {
    count: "5",
    label: "Specialized Agents",
    body:
      "Not one generic assistant. A reviewer for PRs (read-only). A builder with TDD (write access). A debugger on Opus for root-cause reasoning. A researcher (web + codebase). A fleet worker (parallel tasks).",
    tint: "from-cyan-500/10 to-transparent border-cyan-500/20",
  },
  {
    count: "8",
    label: "Pre-Wired MCPs",
    body:
      "Linear, GitHub, Slack, Gmail, Calendar, Tavily (real-time web), Context7 (library docs), Google Drive. Works standalone. Supercharged when connected.",
    tint: "from-fuchsia-500/10 to-transparent border-fuchsia-500/20",
  },
  {
    count: "6",
    label: "Lifecycle Hooks",
    body:
      "Auto-load context at session start. Capture knowledge from every edit. Classify intent on every prompt. Track cost. Save sessions. All optional, all configurable.",
    tint: "from-emerald-500/10 to-transparent border-emerald-500/20",
  },
];

export function SolutionGrid() {
  return (
    <section id="features" className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
            The solution
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            The curated, AI-guided
            <br />
            <span className="text-zinc-500">Claude Code operator.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className={`relative rounded-2xl border bg-gradient-to-br p-8 ${f.tint}`}
            >
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-5xl font-bold text-white">{f.count}</span>
                <span className="text-lg font-semibold text-zinc-300">
                  {f.label}
                </span>
              </div>
              <p className="text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
