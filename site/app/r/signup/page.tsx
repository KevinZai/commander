import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Become a Creator",
  description:
    "Join the CC Commander creator program. Earn 30–50% recurring commission with your own branded landing page.",
};

// Fail-open: if GitHub OAuth env vars are absent, show coming-soon copy.
const githubOauthReady =
  Boolean(process.env.AUTH_GITHUB_ID) &&
  Boolean(process.env.AUTH_GITHUB_SECRET) &&
  Boolean(process.env.AUTH_SECRET);

export default function CreatorSignupPage() {
  return (
    <>
      <Nav />
      <main className="pt-24">
        <section className="relative overflow-hidden py-24 px-4 border-b border-zinc-900">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_55%)]" />
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
              Creator Partner Program
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
              Become a{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                CC Commander
              </span>{" "}
              creator
            </h1>
            <p className="text-lg text-zinc-400 mb-8">
              Get your own branded landing page at{" "}
              <span className="text-white font-mono">
                cc-commander.com/r/you
              </span>
              . Earn 30–50% recurring commission. Sign up with GitHub — takes
              30 seconds.
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 mb-8">
              <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                {[
                  { stat: "30–50%", label: "commission" },
                  { stat: "90 days", label: "cookie window" },
                  { stat: "$50", label: "auto-payout" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-white mb-1">{s.stat}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {githubOauthReady ? (
                <GitHubSignInButton />
              ) : (
                <ComingSoonBlock />
              )}
            </div>

            <p className="text-xs text-zinc-600">
              By signing up you agree to our{" "}
              <a href="/terms" className="hover:text-zinc-400 transition-colors">
                Terms of Service
              </a>{" "}
              and affiliate program rules.
            </p>
          </div>
        </section>

        {/* What you get */}
        <section className="py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-12 text-center">
              What you get as a creator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Your own landing page",
                  body: "cc-commander.com/r/yourname with your avatar, pitch, and embedded content. We handle hosting.",
                },
                {
                  title: "Custom OG image",
                  body: "Auto-generated social card with your avatar + \"Your Name recommends CC Commander\" — shareable on every platform.",
                },
                {
                  title: "Recurring commission",
                  body: "30% for Affiliates, 35% for Creators (1K+ followers), 50% lifetime for invited Influencers.",
                },
                {
                  title: "Creator dashboard",
                  body: "Real-time clicks, conversions, and commission stats. Edit your pitch and embedded content anytime.",
                },
                {
                  title: "Press kit access",
                  body: "Logos, screenshots, talking points, pre-written tweets. Everything you need to create content.",
                },
                {
                  title: "Launch announcement",
                  body: "Creator-tier and above: we announce your page on our channels when you hit 1K followers.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/40"
                >
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function GitHubSignInButton() {
  return (
    // TODO: CC-665 — wire to Auth.js signIn("github") action
    // This must be a client component with next-auth signIn() or a form POST to /api/auth/signin/github
    <form action="/api/auth/signin/github" method="POST">
      <input type="hidden" name="callbackUrl" value="/r/onboarding" />
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors border border-zinc-700"
      >
        <GitHubIcon />
        Sign in with GitHub
      </button>
    </form>
  );
}

function ComingSoonBlock() {
  return (
    <div className="text-center">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 mb-4">
        <p className="text-sm text-zinc-400">
          GitHub OAuth is being configured. Creator signup will open soon.
        </p>
      </div>
      {/* TODO: CC-665 — wire to email capture list */}
      <form action="mailto:hello@cc-commander.com" method="get" className="flex gap-2">
        <input
          type="email"
          name="subject"
          placeholder="your@email.com"
          required
          className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-md transition-colors"
        >
          Notify me
        </button>
      </form>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.52 11.52 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.295-1.23 3.295-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
