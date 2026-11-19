import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdminOrNull } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResponseTier = "affiliate" | "creator" | "influencer_pending";

function tierFromFollowers(followers: number): ResponseTier {
  if (followers >= 10000) return "influencer_pending";
  if (followers >= 1000) return "creator";
  return "affiliate";
}

/**
 * Create (once) the signed-in GitHub user's creator row through the
 * service-role client (anon has no table access after migration 004).
 *
 * - 'influencer' is hand-picked, so a 10K+ account is stored as 'creator'
 *   and reported as influencer_pending.
 * - approved_at stays null; the public creators_public view lists approved
 *   creators only.
 * - ls_affiliate_id stays '' until the Lemon Squeezy affiliate API is wired
 *   (CC-664).
 * Answers 503 when Supabase env is not configured.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const githubLogin = typeof user.login === "string" ? user.login : "";
  const githubId = typeof user.githubId === "string" ? user.githubId : "";
  const followers = typeof user.followers === "number" ? user.followers : 0;

  if (!githubLogin || !githubId) {
    return NextResponse.json({ error: "GitHub identity missing from session" }, { status: 400 });
  }

  const supabase = supabaseAdminOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Creator signup is not available" }, { status: 503 });
  }

  const slug = githubLogin.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
  const tier = tierFromFollowers(followers);

  const { error } = await supabase.from("creators").upsert(
    {
      github_id: githubId,
      github_username: githubLogin,
      github_avatar_url: typeof user.image === "string" ? user.image : null,
      github_followers: followers,
      email: typeof user.email === "string" ? user.email : `${githubLogin}@github.invalid`,
      display_name: typeof user.name === "string" && user.name ? user.name : githubLogin,
      ls_affiliate_id: "",
      ls_referral_code: slug,
      slug,
      tier: tier === "affiliate" ? "affiliate" : "creator",
    },
    // An existing row (possibly hand-edited: tier, approval) is left alone.
    { onConflict: "github_id", ignoreDuplicates: true }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That creator link is already taken" }, { status: 409 });
    }
    console.error(`creator signup failed (${error.code ?? "unknown"})`);
    return NextResponse.json({ error: "Creator signup failed" }, { status: 500 });
  }

  return NextResponse.json({ slug, tier, redirect: `/r/${slug}` });
}
