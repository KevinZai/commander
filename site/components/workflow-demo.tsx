"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    cmd: "/ccc:research competitor.com",
    tool: "Tavily (real-time web)",
    action:
      "Pulls latest news, pricing changes, product launches from across the web",
  },
  {
    n: "02",
    cmd: "auto",
    tool: "Google Drive",
    action:
      "Fetches last week's competitor tracking doc, loads into context",
  },
  {
    n: "03",
    cmd: "researcher agent",
    tool: "Opus reasoning",
    action:
      "Compares, identifies what changed, writes updated tracking doc back to Drive",
  },
  {
    n: "04",
    cmd: "/ccc:standup --post",
    tool: "Slack #comp-intel",
    action:
      "Posts a clean summary to your channel before the Monday meeting",
  },
];

export function WorkflowDemo() {
  return (
    <section className="py-24 px-4 border-t border-zinc-900 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
            See it in action
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Weekly competitive intel.
            <br />
            <span className="text-zinc-500">Used to take 3 hours.</span>
          </h2>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-colors"
            >
              <div className="flex-shrink-0">
                <span className="text-4xl font-bold text-zinc-700 font-mono">
                  {step.n}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                  <code className="text-sm font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                    {step.cmd}
                  </code>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    via
                  </span>
                  <span className="text-sm font-medium text-cyan-400">
                    {step.tool}
                  </span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{step.action}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-12 text-center p-8 rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-transparent"
        >
          <p className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Total time: 4 minutes. Running unsupervised.
          </p>
          <p className="text-zinc-400">
            <span className="text-zinc-600 line-through">
              Without CCC: 5 tabs, 12 copy-pastes, 3 hours of context-switching.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
