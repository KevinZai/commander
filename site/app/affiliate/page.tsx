import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Affiliate Program",
  description:
    "Earn 30% recurring commission promoting CC Commander. Self-serve signup — no approval needed.",
  openGraph: {
    title: "CC Commander Affiliate Program — Earn 30% recurring",
    description:
      "Earn 30% recurring commission promoting CC Commander. Self-serve signup.",
    images: [{ url: "/api/og/default", width: 1200, height: 630 }],
  },
};

const LS_AFFILIATE_URL = process.env.LEMONSQUEEZY_AFFILIATE_SIGNUP_URL ?? null;

// TODO: CC-664 — replace with live count from Supabase/LS when account is active
const AFFILIATE_COUNT: number = 0;

const COMMISSION_TABLE = [
  {
    product: "Pro Monthly ($19/mo) × 12 months",
    affiliate: "$68",
    creator: "$80",
    influencer: "$114",
  },
  {
    product: "Pro Yearly ($190) × renewal",
    affiliate: "$54",
    creator: "$63",
    influencer: "$95/yr lifetime",
  },
  {
    product: "Lifetime ($299 one-time)",
    affiliate: "$89",
    creator: "$104",
    influencer: "$149",
  },
];

const FAQ = [
  {
    q: "How long does the attribution cookie last?",
    a: "90 days. If someone clicks your link and buys within 90 days, the conversion is credited to you.",
  },
  {
    q: "When do I get paid?",
    a: "Automatic payouts at $50 threshold via Lemon Squeezy (PayPal or bank transfer). Minimum 30-day hold to prevent fraud.",
  },
  {
    q: "What tactics are not allowed?",
    a: "No coupon stuffing, no self-referrals, no misleading ads, no spam. Bidding on brand keywords in paid search requires written approval. Violation = account terminated.",
  },
  {
    q: "Can I promote with paid ads?",
    a: "Yes, with one exception: no bidding on 'CC Commander' or 'Claude Code Commander' as exact-match keywords in Google/Meta/X ads without our written okay.",
  },
  {
    q: "Is there a limit on how many people I can refer?",
    a: "None. Refer 1 or 1,000 — every qualifying conversion pays.",
  },
  {
    q: "How do I move from Affiliate to Creator tier?",
    a: "Build an audience of 1K+ followers and DM @commanderplugin on X with a link to your content. We review weekly.",
  },
];

export default function AffiliatePage() {
  const lsReady = LS_AFFILIATE_URL !== null;

  return (
    <>
      <Nav />
      <main className="pt-24">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 px-4 border-b border-zinc-900">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,107,71,0.12),transparent_55%)]" />
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
              Creator Partner Program
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Earn{" "}
              <span className="text-orange-400">30% recurring</span>
              <br />
              promoting CC Commander
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
              Share your affiliate URL. When your audience buys Pro, you earn
              30% of every payment for 12 months — automatically, no invoicing,
              no chasing.
            </p>

            {/* Live ticker */}
            <p className="text-sm text-zinc-600 mb-8">
              {AFFILIATE_COUNT === 0
                ? "Be the first — program just launched"
                : `Join ${AFFILIATE_COUNT.toLocaleString()} creators already earning`}
            </p>

            {lsReady ? (
              <a
                href={LS_AFFILIATE_URL}
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold text-lg transition-colors"
              >
                Apply now →
              </a>
            ) : (
              <ComingSoonCapture label="Notify me when the affiliate program opens" />
            )}
          </div>
        </section>

        {/* Commission table */}
        <section className="py-24 px-4 border-b border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">
              Commission rates
            </h2>
            <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
              Three tiers based on your audience size. All tiers pay
              automatically via Lemon Squeezy.
            </p>

            {/* Tier badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {[
                {
                  tier: "Affiliate",
                  rate: "30%",
                  window: "12-month attribution",
                  req: "Anyone — instant approval",
                  color: "zinc",
                },
                {
                  tier: "Creator",
                  rate: "35%",
                  window: "24-month attribution",
                  req: "1K+ followers or proven content",
                  color: "violet",
                },
                {
                  tier: "Influencer",
                  rate: "50%",
                  window: "Lifetime attribution",
                  req: "10K+ followers — invite only",
                  color: "orange",
                },
              ].map((t) => (
                <div
                  key={t.tier}
                  className={`rounded-xl border p-6 ${
                    t.color === "orange"
                      ? "border-orange-500/30 bg-orange-950/10"
                      : t.color === "violet"
                      ? "border-violet-500/30 bg-violet-950/10"
                      : "border-zinc-800 bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className={`text-3xl font-bold ${
                        t.color === "orange"
                          ? "text-orange-400"
                          : t.color === "violet"
                          ? "text-violet-400"
                          : "text-white"
                      }`}
                    >
                      {t.rate}
                    </span>
                    <span className="text-zinc-500 text-sm">commission</span>
                  </div>
                  <p className="text-white font-semibold mb-1">{t.tier}</p>
                  <p className="text-zinc-500 text-xs mb-2">{t.window}</p>
                  <p className="text-zinc-400 text-xs">{t.req}</p>
                </div>
              ))}
            </div>

            {/* Payout table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="pb-3 text-zinc-400 font-medium pr-8">
                      Customer pays
                    </th>
                    <th className="pb-3 text-zinc-400 font-medium px-4 text-center">
                      Affiliate (30%)
                    </th>
                    <th className="pb-3 text-violet-400 font-medium px-4 text-center">
                      Creator (35%)
                    </th>
                    <th className="pb-3 text-orange-400 font-medium px-4 text-center">
                      Influencer (50%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_TABLE.map((row) => (
                    <tr
                      key={row.product}
                      className="border-b border-zinc-900 hover:bg-zinc-950/60"
                    >
                      <td className="py-4 text-zinc-300 pr-8">{row.product}</td>
                      <td className="py-4 text-white font-semibold text-center px-4">
                        {row.affiliate}
                      </td>
                      <td className="py-4 text-violet-300 font-semibold text-center px-4">
                        {row.creator}
                      </td>
                      <td className="py-4 text-orange-300 font-semibold text-center px-4">
                        {row.influencer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-4 border-b border-zinc-900">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Sign up",
                  body: 'Click “Apply now” and connect with GitHub OAuth. Instant approval — no waiting, no interview.',
                },
                {
                  step: "2",
                  title: "Share your URL",
                  body: "Get your unique tracking URL. Post it, embed it in content, add it to your bio. 90-day cookie window.",
                },
                {
                  step: "3",
                  title: "Get paid",
                  body: "Every qualifying purchase credits your account. Auto-payout at $50 via Lemon Squeezy — PayPal or bank.",
                },
              ].map((s) => (
                <div key={s.step} className="text-left">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 font-bold text-lg flex items-center justify-center mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12">
              {lsReady ? (
                <a
                  href={LS_AFFILIATE_URL}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold transition-colors"
                >
                  Apply now →
                </a>
              ) : (
                <ComingSoonCapture label="Notify me when this opens" />
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-center">
              Affiliate FAQ
            </h2>
            <dl className="space-y-8">
              {FAQ.map((item) => (
                <div key={item.q} className="border-b border-zinc-900 pb-8">
                  <dt className="text-white font-semibold mb-2">{item.q}</dt>
                  <dd className="text-zinc-400 text-sm leading-relaxed">
                    {item.a}
                  </dd>
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

function ComingSoonCapture({ label }: { label: string }) {
  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-center mb-3">
        <p className="text-sm text-zinc-400">
          Affiliate program activates when our Lemon Squeezy account is live.
        </p>
      </div>
      {/* TODO: CC-664 — wire this form to an email list (ConvertKit / LS) */}
      <form
        action="mailto:hello@commanderplugin.com"
        method="get"
        className="flex gap-2"
      >
        <input
          type="email"
          name="subject"
          placeholder="your@email.com"
          required
          className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-md transition-colors"
        >
          Notify me
        </button>
      </form>
      <p className="text-xs text-zinc-600 mt-2 text-center">{label}</p>
    </div>
  );
}
