import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getStripe, PRICE_IDS } from "@/lib/stripe";

// Force dynamic so this route is never prerendered at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paid checkout is OFF unless CCC_CHECKOUT_ENABLED is exactly "1".
 *
 * When enabled, a request must:
 *   - come from a signed-in session (auth()),
 *   - name one of the server-side allowlisted plans below (a client-supplied
 *     price id is never accepted),
 *   - map to a CC Commander users.user_id, which is sent to Stripe as
 *     client_reference_id and subscription metadata so the hosted MCP webhook
 *     can reconcile the payment without matching by email.
 *
 * The site signs users in with GitHub, and there is no mapping yet from a
 * GitHub session to users.user_id (the hosted MCP's license-key records).
 * Until that mapping exists, billingUserIdFromSession returns null and the
 * route fails closed with 503 even when enabled.
 */

const PLAN_TO_PRICE = {
  "pro-monthly": "proMonthly",
  "pro-yearly": "proYearly",
} as const satisfies Record<string, keyof typeof PRICE_IDS>;

type Plan = keyof typeof PLAN_TO_PRICE;

function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PLAN_TO_PRICE, value);
}

function checkoutEnabled(): boolean {
  return process.env.CCC_CHECKOUT_ENABLED === "1";
}

const UNAVAILABLE = { error: "Checkout is not available" } as const;

/**
 * Resolve the CC Commander users.user_id for a signed-in session.
 * No GitHub-account → users.user_id link exists yet, so this fails closed.
 */
function billingUserIdFromSession(_session: Session): string | null {
  return null;
}

export async function POST(req: NextRequest) {
  if (!checkoutEnabled()) {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { plan?: unknown; tier?: unknown } | null;
  const plan = body?.plan ?? body?.tier;
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const priceId = PRICE_IDS[PLAN_TO_PRICE[plan]];
  const userId = billingUserIdFromSession(session);
  if (!priceId || !userId) {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://commanderplugin.com";

  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { ccc_user_id: userId, ccc_plan: plan },
      subscription_data: { metadata: { ccc_user_id: userId } },
      success_url: `${siteUrl}/thank-you`,
      cancel_url: `${siteUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });
    if (!checkout.url) {
      return NextResponse.json({ error: "Checkout failed" }, { status: 502 });
    }
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    // Stripe error text can include account details; log the type only.
    const kind = error instanceof Error ? error.name : "unknown";
    console.error(`stripe checkout create failed (${kind})`);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
