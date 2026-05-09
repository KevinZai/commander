import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Creator Onboarding",
  description: "Set up your CC Commander creator landing page.",
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect("/r/signup" as any);
  }

  const user = session.user as Record<string, unknown>;
  const login = String(user.login ?? "");
  const followers = typeof user.followers === "number" ? user.followers : 0;

  const tier =
    followers >= 10000
      ? "influencer_pending"
      : followers >= 1000
      ? "creator"
      : "affiliate";

  return (
    <>
      <Nav />
      <main className="pt-24 max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Step 2 of 2
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Set up your creator page
          </h1>
          <p className="text-zinc-400">
            This info appears on your landing page at{" "}
            <span className="text-white font-mono">
              cc-commander.com/r/{login || "you"}
            </span>
            .
          </p>
        </div>

        {/* Tier badge */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-sm text-zinc-400">Auto-detected tier:</span>
          <TierBadge tier={tier} followers={followers} />
        </div>

        <OnboardingForm login={login} tier={tier} />
      </main>
      <Footer />
    </>
  );
}

function TierBadge({
  tier,
  followers,
}: {
  tier: string;
  followers: number;
}) {
  const config =
    tier === "influencer_pending"
      ? { label: "Influencer (pending review)", color: "text-orange-400 border-orange-500/30 bg-orange-950/10" }
      : tier === "creator"
      ? { label: "Creator", color: "text-violet-400 border-violet-500/30 bg-violet-950/10" }
      : { label: "Affiliate", color: "text-zinc-300 border-zinc-700 bg-zinc-900/40" };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.label}
      {followers > 0 && ` · ${followers.toLocaleString()} followers`}
    </span>
  );
}
