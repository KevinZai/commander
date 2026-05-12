import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Three paid plans. Free during launch. $0 Starter · $19/mo Pro · $299 Lifetime (first 100 only — then $499).",
  openGraph: {
    title: "CC Commander Pricing",
    description: "Three paid plans. Starter free during launch. Pro $19/mo · $190/yr. Lifetime $299 (first 100, then $499).",
    images: [{ url: "/api/og/pricing", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/pricing"],
  },
};

const FAQ = [
  {
    q: "Is Starter really free?",
    a: "Yes — free during early access. Starter pricing or caps may change after launch as we scale hosted infrastructure. The plugin code itself stays MIT-licensed (fork-able). Lifetime ($299, first 100 only) locks in unlimited Pro access permanently if you want certainty.",
  },
  {
    q: "What does 'free during launch' mean?",
    a: "While we're rolling out paid plans, Starter is free for early adopters. After we hit a stable user base (target: 1,000 active installs), Starter may move to capped free (e.g., reduced hosted MCP calls) while Pro remains unlimited. Anyone who installs Starter today keeps current access while we figure out the steady-state tier — but no guarantees beyond early access.",
  },
  {
    q: "What is the 14-day money-back guarantee?",
    a: "If Pro doesn't work out for any reason within the first 14 days, email hello@commanderplugin.com and we'll refund you in full — no questions asked.",
  },
  {
    q: "How does Lifetime pricing work?",
    a: "Pay $299 once and you get Pro forever, including all future Pro features. The first 100 sales are locked at $299; after that it goes to $499. This is our thank-you to early believers.",
  },
  {
    q: "Can I switch from monthly to yearly?",
    a: "Yes — upgrade to yearly anytime via your customer portal. You'll be credited the unused portion of your monthly subscription.",
  },
  {
    q: "Do you offer team or enterprise plans?",
    a: "Not yet. If you need multi-seat licensing or custom invoicing, email hello@commanderplugin.com and we'll figure something out.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "CC Commander runs 100% locally on your machine — no data leaves your environment. Cancel anytime with no data loss.",
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
              Three paid plans.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                Free during launch.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Free for early adopters while we ship. Pro unlocks unlimited
              hosted MCP, premium skill packs, and priority support. Starter
              pricing may change after launch.
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
