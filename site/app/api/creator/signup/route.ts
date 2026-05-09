import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tierFromFollowers(followers: number): "affiliate" | "creator" | "influencer_pending" {
  if (followers >= 10000) return "influencer_pending";
  if (followers >= 1000) return "creator";
  return "affiliate";
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const githubLogin = String(user.login ?? "");
  const followers = typeof user.followers === "number" ? user.followers : 0;

  if (!githubLogin) {
    return NextResponse.json({ error: "GitHub login missing from session" }, { status: 400 });
  }

  const slug = githubLogin.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const tier = tierFromFollowers(followers);

  const lsApiKey = process.env.LEMONSQUEEZY_API_KEY;

  if (lsApiKey) {
    // TODO: CC-664 — POST to LS affiliate API when account is active
    // const lsResp = await fetch("https://api.lemonsqueezy.com/v1/affiliates", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${lsApiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     data: {
    //       type: "affiliates",
    //       attributes: {
    //         email: session.user.email,
    //         name: session.user.name,
    //       },
    //     },
    //   }),
    // });
    console.info("TODO: CC-664 — LS_API_KEY present but affiliate creation not yet wired.");
  } else {
    console.info("TODO: CC-664 — LEMONSQUEEZY_API_KEY missing — would create affiliate for", slug);
  }

  // TODO: CC-665 D — replace with Supabase INSERT when creators table exists
  // await supabase.from("creators").insert({
  //   github_id: user.id,
  //   slug,
  //   github_username: githubLogin,
  //   display_name: user.name,
  //   avatar_url: user.image,
  //   follower_count: followers,
  //   tier,
  //   ls_referral_code: slug,
  // });
  console.info(`TODO: CC-665 D — would insert creator: slug=${slug}, tier=${tier}`);

  return NextResponse.json({ slug, tier, redirect: `/r/${slug}` });
}
