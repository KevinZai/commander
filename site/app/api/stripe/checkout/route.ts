import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";

// Force dynamic so this route is never prerendered at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Tier = "pro-monthly" | "pro-yearly" | "team-monthly" | "team-yearly";

const TIER_TO_PRICE: Record<Tier, keyof typeof PRICE_IDS> = {
  "pro-monthly": "proMonthly",
  "pro-yearly": "proYearly",
  "team-monthly": "teamMonthly",
  "team-yearly": "teamYearly",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tier?: Tier; priceId?: string };

    // Resolve price: either explicit priceId or a tier shortcut
    let priceId = body.priceId;
    if (!priceId && body.tier && body.tier in TIER_TO_PRICE) {
      priceId = PRICE_IDS[TIER_TO_PRICE[body.tier]];
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "priceId or valid tier is required" },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://cc-commander.com";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
