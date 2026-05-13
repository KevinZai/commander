import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free forever for the plugin core. Pro and Lifetime are aspirational — drop your email on the waitlist if you'd pay, no card required.",
  openGraph: {
    title: "CC Commander Pricing",
    description: "Free forever for the plugin. Pro on a waitlist — only built if 500+ devs sign up.",
    images: [{ url: "/api/og/pricing", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/pricing"],
  },
};

const FAQ = [
  {
    q: "Is the plugin really free?",
    a: "Yes — free forever. All 60+ skills, 22 sub-agents, 9 lifecycle hooks, and the hosted MCP server (100 free calls/mo anti-abuse cap). MIT-licensed, fork-able. No card, no telemetry of you, no upsell wall.",
  },
  {
    q: "Why is Pro on a waitlist instead of buyable?",
    a: "We don't know yet whether enough developers would actually pay for an enhanced tier. Rather than spin up checkout, dunning, refunds, and tax compliance for a tier nobody might want, we're letting you tell us. Drop your email if you'd pay. If 500+ devs sign up, we'll build it. If not, the plugin stays free and we move on.",
  },
  {
    q: "What do you get for joining the waitlist?",
    a: "One email when (and only when) we ship a paid tier — you'll see the price, the feature list, and a checkout link. That's it. No newsletter, no drip campaign, no spam. You can ignore the email; you're not committing to anything by signing up.",
  },
  {
    q: "Will the free plugin stay free if Pro launches?",
    a: "Yes. The plugin core (skills + agents + hooks + bundled MCP servers) stays MIT-licensed and free regardless. The hosted MCP free tier (100 calls/mo) stays free. Pro would be additive — premium skill packs, unlimited hosted MCP, priority support — not gating away anything you have today.",
  },
  {
    q: "How does the hosted MCP work today?",
    a: "We run a free MCP server at commander-mcp.fly.dev that any MCP client (Cursor, Windsurf, Codex, Cowork Desktop) can connect to. 100 calls/month per authenticated user, no card. Authentication via GitHub OAuth. The free tier covers ~95% of solo-dev usage.",
  },
  {
    q: "How does CC Commander make money if it's free?",
    a: "Three ways, all transparent. (1) Affiliate links in the /ccc-connect skill — when we recommend Supabase, Vercel, Neon, etc., we use partner links. (2) GitHub Sponsors — github.com/sponsors/KevinZai. (3) Kevin's consulting practice — the plugin demonstrates the work; serious teams hire him to help build it for them. No tracking pixels, no behavioral retargeting, no selling your data.",
  },
  {
    q: "What happens to my data?",
    a: "The plugin runs locally on your machine — skills, agents, hooks all execute in your Claude Code session. The only data we receive is what hits the hosted MCP server (anonymous IP, call counts for rate limiting, your GitHub username if you authenticate). No code, no prompts, no responses. See our /privacy page for the full breakdown.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 px-4 text-center border-b border-zinc-900">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-4">
              Simple, transparent pricing
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Free forever.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                Pro is on a waitlist.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              The plugin core is free forever — all 60+ skills, all 22 agents, all 9 hooks, plus the hosted MCP server with 100 free calls/mo. Pro and Lifetime show what we'd build <em>if</em> enough developers want it. No card, no commitment — just drop your email if you'd pay.
            </p>
          </div>
        </section>

        {/* Pricing table */}
        <PricingTable />

        {/* FAQ */}
        <section className="py-24 px-4 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-center">
              Frequently asked questions
            </h2>
            <dl className="space-y-8">
              {FAQ.map((item) => (
                <div key={item.q} className="border-b border-zinc-900 pb-8">
                  <dt className="text-white font-semibold mb-2">{item.q}</dt>
                  <dd className="text-zinc-400 text-sm leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
