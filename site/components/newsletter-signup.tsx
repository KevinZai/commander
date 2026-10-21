import config from "@/lib/newsletter.config.json";

// Privacy-respecting newsletter capture. No third-party scripts, no tracking.
// Driven by ONE value (site/lib/newsletter.config.json -> formAction).
// While it is unset or not an https URL the component renders nothing.
const action = typeof config.formAction === "string" ? config.formAction.trim() : "";
const enabled = /^https:\/\/[^\s"'<>]+$/.test(action);

export function NewsletterSignup({ heading = "Release notes by email" }: { heading?: string }) {
  if (!enabled) return null;
  return (
    <section className="py-16 px-6" aria-labelledby="newsletter-heading">
      <div className="max-w-xl mx-auto text-center">
        <h2 id="newsletter-heading" className="text-2xl font-semibold text-white">
          {heading}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Occasional release notes and field-manual updates. Optional.
        </p>
        <form action={action} method="post" target="_blank" rel="noopener" className="mt-6 flex flex-col sm:flex-row gap-3">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white"
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Subscribe
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          By subscribing you agree to receive occasional emails from CC Commander. Unsubscribe any time. See the{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-zinc-300">
            privacy policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}
