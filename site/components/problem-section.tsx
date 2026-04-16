const PROBLEMS = [
  {
    icon: "🔍",
    title: "Hunting",
    body:
      "Scrolling GitHub awesome lists. Reading Hacker News. Testing plugins that don't work together.",
  },
  {
    icon: "🔧",
    title: "Duct-taping",
    body:
      "Copying config between settings.json, .mcp.json, agent files. Hoping nothing breaks.",
  },
  {
    icon: "⏳",
    title: "Missing out",
    body:
      "Less than 5% of Claude users have even one MCP server set up. You're leaving 10× productivity on the table.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Claude Code has 100+ plugins.
            <br />
            <span className="text-zinc-500">Nobody has time to find the good ones.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="p-8 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-colors"
            >
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{p.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-xl text-zinc-300 font-medium">
            We got tired of it. So we built{" "}
            <span className="text-white font-bold">CCC</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
