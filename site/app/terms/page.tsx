import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of service for CC Commander, the plugin, and the hosted MCP server. Plain language. MIT-licensed plugin; AS-IS hosted services.",
};

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. Two things, two licenses",
    body: (
      <>
        <p className="mb-3">
          <strong>The plugin itself</strong> — every skill, agent, hook, and the
          source code at{" "}
          <a href="https://github.com/KevinZai/commander" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            github.com/KevinZai/commander
          </a>{" "}
          — is licensed under{" "}
          <a href="https://github.com/KevinZai/commander/blob/main/LICENSE" className="underline hover:text-white" target="_blank" rel="noopener noreferrer">
            MIT
          </a>
          . Fork it, modify it, ship it, sell your own derivative. The MIT
          license terms govern that work, not these site Terms.
        </p>
        <p>
          <strong>The hosted MCP server</strong> at{" "}
          <code>commander-mcp.fly.dev</code>, the marketing site, the docs site,
          and the waitlist API — those are operated services. These Terms
          govern your use of those services.
        </p>
      </>
    ),
  },
  {
    heading: "2. The deal in plain language",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>The plugin is free. It will stay free for the plugin core.</li>
        <li>The hosted MCP server has a free tier of 100 calls per month per authenticated user, with sliding-window burst protection of 60 calls per minute.</li>
        <li>If we ever ship a paid tier (Pro Individual or Pro Team), we&apos;ll email anyone on the waitlist first.</li>
        <li>You can use everything for any purpose, commercial or personal, as long as you don&apos;t abuse the hosted infrastructure or impersonate someone.</li>
      </ul>
    ),
  },
  {
    heading: "3. Acceptable use",
    body: (
      <p>
        Don&apos;t do any of these against the hosted services:
        <ul className="list-disc pl-6 space-y-1 mt-3">
          <li>Circumvent the rate limits (rotating IPs, creating multiple accounts to multiply your free quota, scraping the catalog programmatically).</li>
          <li>Resell access to the hosted MCP server as if it were yours.</li>
          <li>Use the service to generate content that violates law, harasses someone, or attempts to compromise other infrastructure.</li>
          <li>Pretend to be CC Commander, Kevin Zicherman, or Axiom Marketing Inc.</li>
          <li>Reverse-engineer the auth/rate-limit logic to bypass it.</li>
        </ul>
        <span className="block mt-3">
          If we observe abuse, we may revoke your access without notice. We&apos;ll try to email you first if it&apos;s ambiguous.
        </span>
      </p>
    ),
  },
  {
    heading: "4. Availability — AS-IS, no SLA",
    body: (
      <p>
        The hosted MCP server is provided <strong>as-is</strong>, without any
        warranty of uptime, accuracy, fitness for a particular purpose, or
        non-infringement. We make a best effort to keep it running and to
        notice when it&apos;s broken — but there is no service-level agreement
        and no compensation owed if it&apos;s down. If you have a workload that
        cannot tolerate downtime, run the plugin&apos;s local mode (it doesn&apos;t
        need our server).
      </p>
    ),
  },
  {
    heading: "5. Your responsibility for your work",
    body: (
      <p>
        The plugin generates suggestions for code, plans, and documentation
        via Claude (or any MCP client you connect). The output is <strong>not
        reviewed by us</strong> before it reaches you. You are responsible for
        reviewing, testing, and validating any code or content before using
        it. CC Commander, Kevin Zicherman, and Axiom Marketing Inc. accept
        no liability for damages caused by output you chose to use without
        review.
      </p>
    ),
  },
  {
    heading: "6. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, the total liability of CC
        Commander, Kevin Zicherman, and Axiom Marketing Inc. for any claim
        arising out of the hosted services is capped at the greater of (a)
        the amount you paid us in the 12 months preceding the claim, or
        (b) USD $50. The plugin itself, being MIT-licensed, carries no
        warranty per the MIT license — your remedy under MIT is to fork.
      </p>
    ),
  },
  {
    heading: "7. Changes to these Terms",
    body: (
      <p>
        We may update these Terms when the services change. Material changes
        get a banner on commanderplugin.com or an email to the waitlist.
        The effective date at the top of this page reflects the latest
        revision. Continued use after a change means you accept the new
        Terms; if you don&apos;t, stop using the hosted services.
      </p>
    ),
  },
  {
    heading: "8. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Delaware (the
        state of incorporation of Axiom Marketing Inc.), without regard to
        conflict-of-laws rules. Disputes are subject to the exclusive
        jurisdiction of state and federal courts located in Delaware.
      </p>
    ),
  },
  {
    heading: "9. Termination",
    body: (
      <p>
        You can stop using the hosted services any time — close your
        account, delete the plugin, walk away. We can revoke your hosted
        access for abuse (Section 3). The MIT-licensed plugin remains
        yours to use under MIT regardless.
      </p>
    ),
  },
];

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-lg text-zinc-400">
              The plugin is MIT-licensed and free. The hosted MCP server is
              free with a usage cap and a few don&apos;t-be-evil rules. Plain
              language. Read it.
            </p>
          </header>

          <div className="prose prose-invert prose-zinc max-w-none">
            <p className="text-zinc-400 mb-12">
              These Terms govern your use of <code>commanderplugin.com</code>,{" "}
              <code>docs.commanderplugin.com</code>, the hosted MCP server at{" "}
              <code>commander-mcp.fly.dev</code>, and any related services
              operated by{" "}
              <a href="https://kevinz.ai" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                Kevin Zicherman
              </a>{" "}
              via Axiom Marketing Inc. (a Delaware corporation). By using any
              of these services, you agree to these Terms.
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
                Questions about these Terms:{" "}
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
