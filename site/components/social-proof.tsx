const LOGOS = [
  "Linear",
  "GitHub",
  "Slack",
  "Gmail",
  "Google Drive",
  "Calendar",
  "Tavily",
  "Context7",
];

export function SocialProof() {
  return (
    <section className="py-20 px-4 border-t border-zinc-900 bg-zinc-950/40">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs font-mono uppercase tracking-widest text-zinc-500 mb-8">
          Pre-wired to talk to
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
          {LOGOS.map((logo) => (
            <span
              key={logo}
              className="text-lg font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
