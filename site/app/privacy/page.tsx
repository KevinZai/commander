import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What data CC Commander collects, why, and how to opt out. Plain language, no dark patterns.",
};

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What we DO NOT collect",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Your prompts to Claude Code</li>
        <li>Claude&apos;s responses to you</li>
        <li>Your code, files, or repository contents</li>
        <li>Your raw IP address (we hash it for rate-limit dedup only)</li>
        <li>Any data from local-only plugin skills (the plugin runs in your Claude Code session — that traffic never reaches us)</li>
      </ul>
    ),
  },
  {
    heading: "What we collect when you visit commanderplugin.com",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Page views via PostHog (US cloud).</strong> URL, referrer,
          user agent, browser/device basics. Used to understand traffic and
          improve the site. PostHog uses a first-party cookie and
          <code className="px-1 py-0.5 rounded bg-zinc-900 mx-1">localStorage</code>
          to deduplicate visitors. We do not enable session replay.
        </li>
        <li>
          <strong>Click events.</strong> When you click pricing CTAs, the
          sponsor link, or open the waitlist modal, we record the event name +
          which tier was clicked. Used to learn what people want.
        </li>
        <li>
          <strong>Waitlist signups.</strong> If you submit your email to a
          waitlist form, we store: email, tier (Pro or Lifetime), source
          surface, UTM tags from the referring URL, referrer URL, user agent,
          and a SHA-256 hash of your IP (for duplicate-signup detection — we
          never store the raw IP). Stored in our Supabase project. We use it
          to email you when (and only when) a paid tier ships.
        </li>
      </ul>
    ),
  },
  {
    heading: "What we collect when you use the hosted MCP server",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>GitHub user identifier</strong> after OAuth login. We use this
          to identify your account, enforce per-user rate limits, and link
          usage to your tier.
        </li>
        <li>
          <strong>Tool name + latency + success/failure</strong> on every
          call you make to the hosted MCP. We log <em>that</em> a tool ran,
          not <em>what</em> the tool produced. The tool inputs (your prompts)
          and outputs (Claude&apos;s responses) never leave Anthropic&apos;s
          infrastructure — they don&apos;t touch our server.
        </li>
        <li>
          <strong>Monthly call count + rate-limit window.</strong> Stored in
          Supabase + Upstash Redis. Used for the 100-calls/mo free tier cap
          and the burst protection (60 calls/min).
        </li>
        <li>
          <strong>Hashed IP</strong> (SHA-256) — used for anonymous rate-limit
          dedup on unauthenticated requests. We never store the raw IP.
        </li>
      </ul>
    ),
  },
  {
    heading: "Third parties we share data with",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>PostHog (US, posthog.com)</strong> — site analytics +
          server-side event capture. SOC 2 Type II.{" "}
          <a href="https://posthog.com/privacy" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            PostHog&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>Supabase (US)</strong> — Postgres database for users,
          waitlist, usage counters. SOC 2 Type II.{" "}
          <a href="https://supabase.com/privacy" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            Supabase&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>Upstash (Global)</strong> — Redis for rate limiting. SOC 2.{" "}
          <a href="https://upstash.com/static/trust/privacy.pdf" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            Upstash&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>Fly.io (US)</strong> — hosts <code>commander-mcp.fly.dev</code>.{" "}
          <a href="https://fly.io/legal/privacy-policy/" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            Fly.io&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>Vercel (US)</strong> — hosts <code>commanderplugin.com</code>.{" "}
          <a href="https://vercel.com/legal/privacy-policy" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            Vercel&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>Cloudflare (Global)</strong> — DNS for our domains. No
          payload data passes through.{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            Cloudflare&apos;s privacy policy
          </a>
        </li>
        <li>
          <strong>GitHub (US, Microsoft)</strong> — OAuth provider for
          hosted-MCP authentication.{" "}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            GitHub&apos;s privacy statement
          </a>
        </li>
      </ul>
    ),
  },
  {
    heading: "Cookies and tracking",
    body: (
      <p>
        We use exactly two categories of cookies / local storage:
        <span className="block mt-2">
          <strong>1. PostHog analytics cookie</strong> — a random ID stored in
          <code className="px-1 py-0.5 rounded bg-zinc-900 mx-1">localStorage</code>
          + a first-party cookie to deduplicate page views. We do not enable
          PostHog session replay.
        </span>
        <span className="block mt-2">
          <strong>2. Auth.js session cookie</strong> — set when you sign in
          via GitHub OAuth to use the hosted MCP. Standard secure
          <code className="px-1 py-0.5 rounded bg-zinc-900 mx-1">httpOnly</code>
          cookie. Lasts the duration of your session.
        </span>
        <span className="block mt-2">
          No advertising trackers. No retargeting pixels. No third-party
          identity graphs.
        </span>
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Access / export.</strong> Email <a href="mailto:hello@commanderplugin.com" className="underline hover:text-white">hello@commanderplugin.com</a> and we&apos;ll send you everything we have on you within 30 days.
        </li>
        <li>
          <strong>Deletion.</strong> Same address. We&apos;ll delete your
          waitlist row + user record on request, no questions asked. (We
          can&apos;t un-hash your IP because we never had it in the first place.)
        </li>
        <li>
          <strong>Correction.</strong> Tell us what&apos;s wrong; we&apos;ll fix it.
        </li>
        <li>
          <strong>Opt out of PostHog.</strong> Use a browser DNT signal, an
          ad blocker, or just decline cookies — we honor all three. The site
          still works without analytics.
        </li>
      </ul>
    ),
  },
  {
    heading: "Children",
    body: (
      <p>
        CC Commander is a developer tool. We don&apos;t knowingly collect data
        from anyone under 13. If you believe a minor signed up, email us
        and we&apos;ll delete the record.
      </p>
    ),
  },
  {
    heading: "Changes",
    body: (
      <p>
        We&apos;ll update this page when our data practices change and revise
        the date at the top. Material changes get a heads-up via the
        waitlist email or a banner on commanderplugin.com.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24 px-4">
        <article className="max-w-3xl mx-auto">
          <header className="mb-12 border-b border-zinc-900 pb-8">
            <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-4">
              Effective 2026-05-13
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Privacy
            </h1>
            <p className="text-lg text-zinc-400">
              What CC Commander collects, why, and how to opt out. Plain
              language. No dark patterns. No retargeting.
            </p>
          </header>

          <div className="prose prose-invert prose-zinc max-w-none">
            <p className="text-zinc-400 mb-12">
              CC Commander is built by{" "}
              <a href="https://kevinz.ai" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                Kevin Zicherman
              </a>{" "}
              (Axiom Marketing Inc., a Delaware corporation). This policy
              covers <code>commanderplugin.com</code>,{" "}
              <code>docs.commanderplugin.com</code>, and the hosted MCP server
              at <code>commander-mcp.fly.dev</code>. The plugin itself is
              MIT-licensed and runs locally on your machine — none of your
              prompts, responses, or code touches our servers unless you
              explicitly call the hosted MCP.
            </p>

            <div className="space-y-12">
              {SECTIONS.map((s) => (
                <section key={s.heading}>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                    {s.heading}
                  </h2>
                  <div className="text-zinc-400 text-base leading-relaxed">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-16 pt-8 border-t border-zinc-900">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                Contact
              </h2>
              <p className="text-zinc-400">
                Privacy questions or requests:{" "}
                <a href="mailto:hello@commanderplugin.com" className="text-white hover:underline">
                  hello@commanderplugin.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
