import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Creator signup is NOT available yet (Codex audit #34).
//
// The previous handler returned a slug and a `/r/<slug>` referral redirect
// while both the affiliate registration (CC-664, Lemon Squeezy) and the
// `creators` insert (CC-665 D) were commented out, so users received a
// referral URL that nothing had recorded. Until a persisted creator record can
// be written and verified, this route answers 503 `not_available` and never
// hands out a slug or redirect.
//
// To re-enable: implement the registration and the insert, confirm the
// inserted row (e.g. `.select().single()`), and only then return
// `{ slug, tier, redirect }`. Keep `route.test.mjs` in step.

export async function POST() {
  return NextResponse.json(
    {
      // `error` is shown verbatim by app/r/onboarding/onboarding-form.tsx.
      error: "Creator signup is not open yet. No account or referral link was created.",
      code: "not_available",
    },
    { status: 503, headers: { "Retry-After": "86400", "Cache-Control": "no-store" } }
  );
}
