"use client";

import { useState } from "react";
import { WaitlistModal } from "./waitlist-modal";
import { track } from "./posthog-provider";

type Interval = "monthly" | "yearly";
type CtaAction = { kind: "link"; href: string } | { kind: "waitlist"; tier: "pro" | "lifetime" };

type Tier = {
  name: string;
  description: string;
  badge?: string;
  price: Record<Interval, string>;
  interval: Record<Interval, string>;
  yearlySave?: string;
  features: string[];
  cta: string;
  action: CtaAction;
  highlighted: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "Free forever for the plugin core. Install in 30 seconds, ship the same day.",
    badge: "Available now",
    price: { monthly: "$0", yearly: "$0" },
    interval: { monthly: "free forever", yearly: "free forever" },
    features: [
      "All 60+ plugin skills (every /ccc-* workflow)",
      "All 22 specialist sub-agent personas",
      "All 9 lifecycle hooks (25+ handlers)",
      "2 credential-free bundled MCP servers + 16 opt-in",
      "100 hosted MCP calls/month (free anti-abuse cap)",
      "Community support via GitHub Discussions",
    ],
    cta: "Install Starter",
    action: { kind: "link", href: "#install" },
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Coming if there's signal. Drop your email — we only build it if 500+ devs want it.",
    badge: "Waitlist — coming if 500+ ask",
    price: { monthly: "$19", yearly: "$190" },
    interval: { monthly: "/month · aspirational", yearly: "/year · aspirational" },
    yearlySave: "Save $38 — 2 months free",
    features: [
      "Everything in Starter, plus:",
      "Unlimited hosted MCP calls (no monthly cap)",
      "Premium skill packs — 8-10 advanced workflow templates",
      "Priority email support (24h response)",
      "Early access — 1-week head start on new skills",
      "Cross-machine state sync (when Cloud ships)",
      "Pro Discord access (when launched at 200 stars)",
    ],
    cta: "Join Pro waitlist",
    action: { kind: "waitlist", tier: "pro" },
    highlighted: true,
  },
  {
    name: "Lifetime",
    description: "Pay once, own it. First 100 founder spots — waitlist members get first dibs if we ever sell it.",
    badge: "Waitlist — 100 founder spots",
    price: { monthly: "$299", yearly: "$299" },
    interval: { monthly: "one-time · aspirational", yearly: "one-time · aspirational" },
    yearlySave: "Founder pricing locked in if we ship",
    features: [
      "Everything in Pro — forever",
      "Single one-time payment, no recurring billing",
      "All future Pro features included",
      "Lifetime access to premium skill packs as they launch",
      "Lifetime priority support",
      "Founding-member badge in Pro Discord",
      "Locked-in pricing — never goes up for you",
    ],
    cta: "Join Lifetime waitlist",
    action: { kind: "waitlist", tier: "lifetime" },
    highlighted: false,
  },
];

export function PricingTable() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [waitlistTier, setWaitlistTier] = useState<"pro" | "lifetime" | null>(null);

  return (
    <section id="pricing" className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Free forever for the plugin.
            <br />
            <span className="text-zinc-500">Pro is on a waitlist — only if 500+ ask.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            The plugin core (60+ skills, 22 agents, 9 hooks, hosted MCP with 100 free calls/mo) is free forever. Pro and Lifetime show what we'd build <em>if</em> there's demand — drop your email if you'd pay. No charge, no card, no commitment.
          </p>
        </div>

        {/* Interval toggle (kept for the aspirational price display) */}
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
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                {tier.badge ? (
                  <p
                    className={`text-[10px] uppercase tracking-wider font-semibold mb-3 ${
                      tier.highlighted ? "text-violet-300" : "text-zinc-500"
                    }`}
                  >
                    {tier.badge}
                  </p>
                ) : null}
                <p className="text-sm text-zinc-400 min-h-[3rem]">{tier.description}</p>
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
                  <p className="text-xs text-violet-400 mt-2">{tier.yearlySave}</p>
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
                      <span className="text-violet-400 mt-0.5 flex-shrink-0">✓</span>
                    ) : null}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {tier.action.kind === "link" ? (
                <a
                  href={tier.action.href}
                  onClick={() => track("pricing_cta_clicked", { tier: tier.name, action: "install" })}
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                    tier.highlighted
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "border border-zinc-800 text-white hover:bg-zinc-900"
                  }`}
                >
                  {tier.cta}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const t = tier.action.kind === "waitlist" ? tier.action.tier : null;
                    track("waitlist_modal_opened", { tier: t });
                    setWaitlistTier(t);
                  }}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    tier.highlighted
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "border border-zinc-800 text-white hover:bg-zinc-900"
                  }`}
                >
                  {tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-zinc-400">
            Want to support the project today?{" "}
            <a
              href="https://github.com/sponsors/KevinZai"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("sponsor_clicked", { surface: "pricing-table" })}
              className="text-violet-400 hover:text-violet-300 underline underline-offset-4"
            >
              Sponsor on GitHub →
            </a>
          </p>
          <p className="text-xs text-zinc-500">
            Open source · MIT licensed · No card, no telemetry · Affiliate links disclosed in <a href="/docs/affiliates" className="underline underline-offset-4 hover:text-zinc-300">/ccc-connect</a>
          </p>
        </div>
      </div>

      <WaitlistModal
        open={waitlistTier !== null}
        tier={waitlistTier ?? "pro"}
        onClose={() => setWaitlistTier(null)}
      />
    </section>
  );
}
