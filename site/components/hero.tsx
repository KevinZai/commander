"use client";

import { motion } from "framer-motion";

const TERMINAL_LINES = [
  { prompt: "$", text: "claude" },
  { prompt: ">", text: "/plugin marketplace add KevinZai/commander" },
  { prompt: "✓", text: "Marketplace added", color: "text-green-400" },
  { prompt: ">", text: "/plugin install commander" },
  { prompt: "✓", text: "Installed: commander v3.0.0", color: "text-green-400" },
  { prompt: " ", text: "15 skills · 5 agents · 6 hooks · 8 MCPs", color: "text-zinc-500" },
  { prompt: "✓", text: "Ready. Try /ccc:build to ship something.", color: "text-green-400" },
];

const STATS = [
  { value: "450+", label: "Skills across 11 domains" },
  { value: "8", label: "MCP integrations pre-wired" },
  { value: "5", label: "Specialized agents" },
  { value: "Free", label: "Tier available" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:pt-32 sm:pb-24">
      {/* gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_60%)]" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-6"
          >
            95% of Claude users are operating with their hands tied
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
          >
            We found every great <br className="hidden sm:inline" />
            Claude plugin.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Kept the best.
            </span>{" "}
            <br className="hidden sm:inline" />
            Made them talk to each other.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10"
          >
            CCC is the curated,{" "}
            <span className="text-white font-semibold">AI-guided</span> package
            that turns Claude from a brain-in-a-jar into an operator.{" "}
            <span className="text-white">15 skills. 5 agents. 8 pre-wired MCPs.</span>{" "}
            One install.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a
              href="#install"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              Install CCC Free →
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 border border-zinc-700 text-white rounded-lg font-semibold hover:bg-zinc-900 transition-colors"
            >
              See what's inside
            </a>
          </motion.div>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur shadow-2xl shadow-violet-500/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-zinc-500 font-mono">
                claude — ccc install
              </span>
            </div>
            <div className="p-5 font-mono text-sm space-y-1.5">
              {TERMINAL_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.8 + i * 0.25 }}
                  className="flex gap-3"
                >
                  <span className="text-zinc-600 select-none w-3 flex-shrink-0">
                    {line.prompt}
                  </span>
                  <span className={line.color ?? "text-zinc-200"}>
                    {line.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 border border-zinc-900 rounded-lg bg-zinc-950/40"
            >
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Ecosystem footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.6 }}
          className="mt-8 text-center text-xs text-zinc-600"
        >
          Works alongside the 66K+ community skill ecosystem.{" "}
          <span className="text-zinc-500">We curated the best.</span>
        </motion.p>
      </div>
    </section>
  );
}
