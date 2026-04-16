"use client";

import { useState } from "react";

type Interval = "monthly" | "yearly";

const TIERS = [
  {
    name: "Free",
    description: "The core AI project manager. Forever free.",
    price: { monthly: "$0", yearly: "$0" },
    interval: { monthly: "", yearly: "" },
    features: [
      "5 core skills (commander, session, settings, knowledge, domains)",
      "2 lifecycle hooks (SessionStart, Stop)",
      "8 pre-configured MCP integrations",
      "Access to 450+ CCC ecosystem skills",
      "CLI + Desktop plugin",
      "Community support",
    ],
    cta: "Install CCC Free",
    href: "#install",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Unlock specialized agents, advanced workflows, and auto-capture.",
    price: { monthly: "$19", yearly: "$190" },
    interval: { monthly: "/month", yearly: "/year" },
    yearlySave: "2 months free",
    features: [
      "Everything in Free, plus:",
      "10 advanced skills (build, research, code-review, deploy-check, fleet, night-mode, standup, content, linear-board, infra)",
      "5 specialized agents (reviewer, builder, researcher, debugger, fleet-worker)",
      "4 advanced hooks (auto-capture, cost tracking, intent classification, notifications)",
      "Knowledge compounding across sessions",
      "Night mode — autonomous overnight builds",
      "Email support",
    ],
    cta: "Start Pro",
    href: "/api/stripe/checkout?tier=pro",
    highlighted: true,
  },
  {
    name: "Team",
    description: "For teams shipping together with shared knowledge and governance.",
    price: { monthly: "$99", yearly: "$990" },
    interval: { monthly: "/month · 5 seats", yearly: "/year · 5 seats" },
    yearlySave: "2 months free",
    features: [
      "Everything in Pro, plus:",
      "Shared team knowledge base",
      "Team standup aggregation",
      "Org-wide deploy gates",
      "Fleet Commander orchestration at scale",
      "Private MCP server support",
      "Slack Connect support",
      "Enterprise SSO available",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@cc-commander.com?subject=CCC%20Team%20inquiry",
    highlighted: false,
  },
];

export function PricingTable() {
  const [interval, setInterval] = useState<Interval>("monthly");

  return (
    <section id="pricing" className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Free forever core.
            <br />
            <span className="text-zinc-500">Pro when you're ready.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Start free. No credit card. Upgrade when you need agents, night mode, or knowledge compounding.
          </p>
        </div>

        {/* Interval toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-950">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                interval === "monthly"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                interval === "yearly"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Yearly <span className="text-xs text-violet-400 ml-1">−2mo</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                tier.highlighted
                  ? "border-violet-500/50 bg-gradient-to-b from-violet-950/20 to-zinc-950 shadow-xl shadow-violet-500/10"
                  : "border-zinc-900 bg-zinc-950/40"
              }`}
            >
              {tier.highlighted ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-violet-500 text-white">
                  Most popular
                </div>
              ) : null}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-sm text-zinc-400 min-h-[3rem]">
                  {tier.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    {tier.price[interval]}
                  </span>
                  <span className="text-zinc-500 text-sm">
                    {tier.interval[interval]}
                  </span>
                </div>
                {interval === "yearly" && tier.yearlySave ? (
                  <p className="text-xs text-violet-400 mt-2">
                    {tier.yearlySave}
                  </p>
                ) : null}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li
                    key={i}
                    className={`text-sm flex items-start gap-2 ${
                      f.startsWith("Everything in")
                        ? "text-zinc-300 font-medium"
                        : "text-zinc-400"
                    }`}
                  >
                    {!f.startsWith("Everything in") ? (
                      <span className="text-violet-400 mt-0.5 flex-shrink-0">
                        ✓
                      </span>
                    ) : null}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.href}
                className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-zinc-800 text-white hover:bg-zinc-900"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-500 mt-12">
          14-day money-back guarantee · Cancel anytime · 100% local, no
          telemetry
        </p>
      </div>
    </section>
  );
}
