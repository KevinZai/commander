# PAYWALL.md — Dark Paywall Setup (Kevin's runbook)

Factual reference for the tier/paywall plumbing added per
`marketing/STRATEGY/revenue-opp-2026-07-10.md` §3 + §6. Everything here ships
**dark**: with no configuration, server behavior is identical to the
pre-paywall baseline. Arming it is a config change, not a deploy.

## What exists in code

| Piece | Where | State when unconfigured |
|---|---|---|
| Tier domain `free \| pro \| founders` | `src/db/migrations/002_paywall_tiers.sql` (existing DBs) / `src/db/schema.sql` (fresh) | `founders` simply unused |
| Stripe event ledger + billing state | `src/db/migrations/003_stripe_events.sql` (down: `migrations/down/003_stripe_events.down.sql`) | table exists, unused |
| 100-call/mo free-tier cap | `src/lib/paywall.ts`, applied in `src/middleware/ratelimit.ts` + `src/tools/status.ts` | pass-through (dark) |
| Stripe webhook (tier reconciliation) | `src/routes/stripe-webhook.ts` → `POST /webhooks/stripe` | returns 503 |
| `/mcp` streamable-HTTP + OAuth resource server | `src/mcp/*`, metadata in `src/index.ts` | `/mcp` accepts license JWTs only; metadata omits `authorization_servers` |

Cap interaction: the existing survey-based cap system (1000 baseline, +1000
for 2+ surveys, −500 for 3+ skips, `get_effective_cap` RPC) stays authoritative.
When armed, free-tier keys get `min(100, survey cap)` — the paywall never
raises a cap, only lowers it. `pro` and `founders` map to 100000/mo in the RPC
(effectively unlimited fair use) and are exempt from the 100-call cap.

## Env vars (names only — set values via `fly secrets set`)

| Var | Purpose | Default behavior when unset |
|---|---|---|
| `CCC_PAYWALL_ARMED` | `"1"` arms the free-tier 100/mo cap | dark — no enforcement change |
| `CCC_STRIPE_WEBHOOK_SECRET` | webhook signature verification | `/webhooks/stripe` returns 503 |
| `CCC_STRIPE_PRICE_PRO_MONTHLY` | Stripe price id → tier `pro` ($10/mo) | subscription events ignored |
| `CCC_STRIPE_PRICE_PRO_YEARLY` | Stripe price id → tier `pro` ($96/yr) | subscription events ignored |
| `CCC_STRIPE_PRICE_FOUNDERS` | one-time price id → tier `founders` ($199, cap 200 units) | founders checkouts ignored |
| `CCC_STRIPE_API_KEY` | NOT required for signature verification; reserve for future API calls | placeholder used internally |
| `OAUTH_ISSUER_URL` | external OAuth 2.1 authorization server for `/mcp` | `/mcp` license-JWT-only |
| `OAUTH_JWKS_URL` | JWKS override | `${OAUTH_ISSUER_URL}/.well-known/jwks.json` |
| `OAUTH_RESOURCE_URL` | canonical resource id (`https://mcp.commanderplugin.com/mcp`) | request origin + `/mcp` |
| `OAUTH_AUDIENCE` | expected `aud` claim | `OAUTH_RESOURCE_URL` |

## Setup steps

### 1. Database migrations (once, before anything else)

Run, in order, in the Supabase SQL Editor (each file is idempotent; each has a
down script under `src/db/migrations/down/` where one applies):

1. `src/db/migrations/002_paywall_tiers.sql` — `founders` in the tier check,
   `stripe_customer_id` / `stripe_subscription_id`, founders cap parity in
   `get_effective_cap`.
2. `src/db/migrations/003_stripe_events.sql` — `stripe_events` ledger,
   `users.lifetime_tier`, `founders_payment_intent` (unique),
   `subscription_status`, `subscription_event_created`, and the
   `users_enforce_lifetime_tier` trigger. The webhook answers 500 to every
   event until 003 is applied.
3. `src/db/migrations/004_creators_lockdown.sql` — creator data and
   SECURITY DEFINER RPC lockdown.
4. `src/db/migrations/005_oauth_identities.sql` — OAuth identity links (§3).
5. `src/db/migrations/006_license_key_version.sql` — license key versioning.
   Required BEFORE deploying this release: the license lookup selects
   `license_key_version` and answers 503 without it.

Manual verification steps for each: `src/db/migrations/VERIFY.md`.

### 2. Stripe (Dashboard — this code never creates Stripe objects)

1. Create product **CCC Pro** with two prices: $10/month recurring and
   $96/year recurring. Note both price ids.
2. Create product **CCC Founders Lifetime**: $199 one-time. Note the price id.
   Cap at 200 units operationally (payment links support quantity limits;
   there is no code-side counter).
3. Developers → Webhooks → Add endpoint:
   `https://mcp.commanderplugin.com/webhooks/stripe`
   Events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Note the signing secret (`whsec_…`).
4. Checkout links MUST carry the CC Commander `user_id`; the webhook never
   matches by email:
   - set `client_reference_id` to `users.user_id` (payment links accept
     `?client_reference_id=…`), and for subscriptions also set
     `subscription_data.metadata.ccc_user_id` so subscription events resolve
     even if they arrive before `checkout.session.completed`;
   - the **founders** payment link/Checkout Session MUST set metadata
     `ccc_price_id=<founders price id>` (or `ccc_tier=founders`) — one-time
     payment webhooks don't embed line items, so metadata is the marker.
5. Set secrets:

```bash
fly secrets set \
  CCC_STRIPE_WEBHOOK_SECRET="$(op read op://Alfred/cc-commander-stripe/webhook-secret)" \
  CCC_STRIPE_PRICE_PRO_MONTHLY="price_..." \
  CCC_STRIPE_PRICE_PRO_YEARLY="price_..." \
  CCC_STRIPE_PRICE_FOUNDERS="price_..." \
  --app commander-mcp
```

Reconciliation behavior (`src/routes/stripe-webhook.ts`):

- Each verified event is inserted into `stripe_events` before any user write.
  A redelivery of an event with `processed_at` set returns 200 and does
  nothing; 200 is sent only after `processed_at` is written. Any database
  failure answers 500 so Stripe retries.
- Users resolve by `client_reference_id` / `metadata.ccc_user_id`, then
  `stripe_subscription_id`, then `stripe_customer_id`. Never by email.
- Subscription events carry the subscription status into
  `users.subscription_status`; an event older than
  `users.subscription_event_created` is ignored (outcome `stale`). Stripe's
  `created` has 1-second resolution, so on a tie for the same subscription a
  weaker status is also `stale` (ended beats active beats any other status).
  A pro subscription event for a customer that is not linked yet answers 500
  (deferred) so Stripe redelivers it after checkout links the customer; once
  the event is more than 3 days old it is acknowledged as `unmatched`.
- `tier` = `founders` when `lifetime_tier` is set, else `pro` while the
  subscription status is `active`, `trialing` or `past_due`, else `free`.
- Founders is granted only for a payment-mode checkout with
  `payment_status = 'paid'` (delayed methods land via
  `checkout.session.async_payment_succeeded`); subscription events never
  remove it.
- A checkout that matches no user, or an expired unlinked subscription event,
  is acknowledged with outcome `unmatched`.
  Reconcile with:
  `select event_id, type, event_created from stripe_events where outcome = 'unmatched';`

### 3. OAuth issuer (required for the ChatGPT Work connector flow)

This server is a **resource server only** — it validates tokens, it does not
mint them. Kevin must stand up or designate an OAuth 2.1 authorization server
(e.g. Auth0, WorkOS, Supabase Auth, or a small self-hosted AS) that:

- supports authorization-code + PKCE (ChatGPT's connector flow; dynamic
  client registration strongly recommended),
- publishes JWKS (asymmetric signing — RS256/ES256/EdDSA),
- mints access tokens with `iss` = `OAUTH_ISSUER_URL`, `aud` =
  `OAUTH_RESOURCE_URL`, and a stable `sub`.

Tokens map to the same key records as `/v1` Bearer license keys ONLY through
`oauth_identities` (migration `src/db/migrations/005_oauth_identities.sql`):
one row per `(issuer, subject)` pointing at `users.user_id`. There is no
fallback to `sub` = `user_id` or to the `email` claim; an unlinked identity,
a missing table or a lookup error denies the token. Before setting
`OAUTH_ISSUER_URL`, apply 005 and insert a row for each existing user who will
connect (service role, SQL Editor):

```sql
insert into public.oauth_identities (issuer, subject, user_id)
values ('https://auth.commanderplugin.com', '<token sub>', '<users.user_id>')
on conflict (issuer, subject) do nothing;
```

```bash
fly secrets set \
  OAUTH_ISSUER_URL="https://auth.commanderplugin.com" \
  OAUTH_RESOURCE_URL="https://mcp.commanderplugin.com/mcp" \
  --app commander-mcp
```

License JWTs (the `/v1` Bearer keys) also work on `/mcp` with no OAuth config —
useful for smoke tests and existing beta users.

### 4. Arm the paywall (LAST — after gates in revenue doc §5 fire)

```bash
fly secrets set CCC_PAYWALL_ARMED=1 --app commander-mcp
```

Disarm: `fly secrets unset CCC_PAYWALL_ARMED --app commander-mcp`.

## Verification

```bash
# Dark check (before arming): free key still shows survey cap (e.g. 1000)
curl -s -H "Authorization: Bearer $FREE_KEY" -X POST \
  https://mcp.commanderplugin.com/v1/call \
  -d '{"tool":"commander_status"}' | jq .result.usage.cap    # → 1000

# Armed check: same call → cap 100; the 101st call this month → HTTP 429
# with "Free tier includes 100 calls/month."

# Pro flip check: complete a test-mode checkout, then re-run — cap 100000.

# Webhook reachability (expects 400 invalid-signature once secret is set):
curl -s -o /dev/null -w '%{http_code}' -X POST \
  https://mcp.commanderplugin.com/webhooks/stripe \
  -H 'stripe-signature: t=1,v1=bad' -d '{}'                   # → 400 (503 = secret unset)

# OAuth surface:
curl -s https://mcp.commanderplugin.com/.well-known/oauth-protected-resource | jq
```

Unit tests: `npm test` (see `tests/paywall.test.ts`,
`tests/stripe-webhook.test.ts`, `tests/mcp-transport.test.ts`).

## Explicitly out of scope (per the approved plan)

- No Stripe products/prices are created by code — env-driven only.
- No per-call metering/billing (rejected in revenue doc §3 mechanics).
- No public pricing copy changes — this is dark plumbing; launch copy is a
  separate decision gated on §5 launch gates.
