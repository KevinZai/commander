# CC-353 slice 1: customer dashboard auth/usage gap audit (read-only)

Target: `site/app/dashboard/page.tsx` (does not exist yet; only `site/app/dashboard/creator/` does).
Method: source read, no code changed, nothing run.

## AC vs. repo state

| AC | State | Gap |
|---|---|---|
| Magic-link session required | Missing | `site/auth.config.ts` registers only the GitHub provider (`pages.signIn: /r/signup`). No email/magic-link provider, no adapter, no `AUTH_RESEND_*`/SMTP config, no `middleware.ts`/`proxy.ts`. The creator dashboard guards itself with `auth()` + `redirect("/r/signup")`. |
| "X / 100 calls this month" | Contradicted | Every source says a different cap: hosted MCP `schema.sql` `get_effective_cap` = 1000 free (2000 after 2 surveys, 500 after skip streak 3, 100000 pro); `commander/mcp-server/index.js` `usageCap` = 1000; the card says 100. Needs a product decision, then a single shared constant. |
| Usage source | Exists, wrong place | `usage_counters(user_id, month 'YYYY-MM', calls_used)` is in the hosted MCP schema (`apps/mcp-server-cloud/src/db/schema.sql`, `user_id uuid`). `supabase/migrations/20260417000000_beta_v4.sql` defines a same-named table with `user_id TEXT` (device hash). Two divergent schemas; the site has no read path. |
| Resets on calendar month | Feasible | `currentMonth()` in `apps/mcp-server-cloud/src/db/usage.ts` is UTC `YYYY-MM`. Dashboard must show reset as 1st of next month 00:00 UTC, not local time. |
| Consulting CTA | Link only | Only `https://kevinz.ai/consulting` in `site/components/footer.tsx`. No on-site consulting page; confirm that URL is the target. |
| Feedback form to Supabase | Partial | `feedback(user_id, category, content, sentiment)` exists with insert limited to service role. The card wants name/feedback/feature request: no `name` column, `category` ('bug'/'feature'/'general') can carry the feature request. Needs an API route (pattern: `site/app/api/waitlist/route.ts`) using `supabaseAdmin()` (`site/lib/supabase.ts`). |
| Mobile responsive | n/a | Tailwind present; creator dashboard is the style reference. |

## Identity gap (main blocker)

Auth.js session carries GitHub `login`, not a Supabase `users.user_id`. `users.email` is "set on magic-link signup" per the schema comment, so the intended join is email -> `users` -> `usage_counters`. Nothing implements that link, and GitHub emails can be `<login>@github.invalid` (`auth.config.ts:25`). Hosted-MCP `user_id` is uuid; beta_v4 is text.

## Decisions needed before slice 2

1. Cap: 100 (card) or 1000 (code/schema)?
2. Which Supabase project/schema is canonical for the site: beta_v4 migration or `mcp-server-cloud/schema.sql`?
3. Magic-link delivery: Auth.js Resend/Nodemailer provider (needs a sender credential and a DB adapter, or a JWT-only email flow), or Supabase Auth OTP? Credential work, so not done here.
4. Consulting target URL.

## Proposed split

- 2a: decide cap + canonical schema; add `site/lib/usage.ts` (`getUsage(email)`, shared cap constant) with tests.
- 2b: magic-link provider + `/signin` page + route guard (blocked on 3).
- 2c: `/dashboard` page: meter, reset date, CTA, mobile layout.
- 2d: `/api/feedback` route + migration for `name` (if wanted) + RLS check.
