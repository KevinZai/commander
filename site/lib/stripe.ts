import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazy Stripe client. Only instantiated when actually used so builds don't
 * fail when STRIPE_SECRET_KEY isn't set in the build environment.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in your environment before calling Stripe APIs."
    );
  }

  _stripe = new Stripe(key);
  return _stripe;
}

export const PRICE_IDS = {
  proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  proYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  teamMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? "",
  teamYearly: process.env.STRIPE_PRICE_TEAM_YEARLY ?? "",
} as const;
