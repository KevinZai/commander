"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Spot = {
  id: string;
  src: string;
  duration: string;
  title: string;
  blurb: string;
};

const SPOTS: Spot[] = [
  {
    id: "hero",
    src: "/videos/hero.html",
    duration: "0:12",
    title: "What is cc-commander",
    blurb:
      "ASCII reveal, install line, the pitch in twelve seconds.",
  },
  {
    id: "install",
    src: "/videos/install.html",
    duration: "0:14",
    title: "Install in 30 seconds",
    blurb:
      "Live terminal cascade — one command, nine green checks, slash menu unlocked.",
  },
  {
    id: "agents",
    src: "/videos/agents.html",
    duration: "0:12",
    title: "17 specialist agents",
    blurb:
      "The full council snaps into formation. Researcher, architect, security, more.",
  },
  {
    id: "compare",
    src: "/videos/compare.html",
    duration: "0:12",
    title: "Stock vs Commander",
    blurb:
      "Eight capability rows, side by side. The diff speaks for itself.",
  },
  {
    id: "hooks",
    src: "/videos/hooks.html",
    duration: "0:13",
    title: "Hooks lifecycle",
    blurb:
      "Nine events, nineteen handlers, firing in real time. Your safety net.",
  },
];

export function VideoShowcase() {
  const [featured, setFeatured] = useState<Spot>(SPOTS[0]);
  const others = SPOTS.filter((s) => s.id !== featured.id);

  return (
    <section className="py-24 px-4 border-t border-zinc-900 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-orange-400 mb-4">
            Watch it move
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Five spots. Sixty seconds.
            <br />
            <span className="text-zinc-500">The whole story.</span>
          </h2>
        </div>

        {/* Featured player */}
        <motion.div
          key={featured.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-2xl shadow-orange-500/5"
        >
          <div className="relative" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              key={featured.id}
              src={featured.src}
              title={featured.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-900">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                  Now playing
                </span>
                <span className="text-[10px] font-mono text-orange-400">
                  {featured.duration}
                </span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-white truncate">
                {featured.title}
              </p>
            </div>
            <p className="hidden sm:block text-sm text-zinc-400 max-w-md text-right">
              {featured.blurb}
            </p>
          </div>
        </motion.div>

        {/* Picker rail */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {others.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              onClick={() => setFeatured(s)}
              className="group text-left rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-orange-500/40 hover:bg-zinc-950/80 transition-colors p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 group-hover:text-orange-400 transition-colors">
                  {s.id}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {s.duration}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                {s.title}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                {s.blurb}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
