# PAYWALL.md — Dark Paywall Setup (Kevin's runbook)

Factual reference for the tier/paywall plumbing added per
`marketing/STRATEGY/revenue-opp-2026-07-10.md` §3 + §6. Everything here ships
**dark**: with no configuration, server behavior is identical to the
pre-paywall baseline. Arming it is a config change, not a deploy.

## What exists in code

| Piece | Where | State when unconfigured |
|---|---|---|
| Tier domain `free \| pro \| founders` | `src/db/migrations/002_paywall_tiers.sql` (existing DBs) / `src/db/schema.sql` (fresh) | `founders` simply unused |
| 100-call/mo free-tier cap | `src/lib/paywall.ts`, applied in `src/middleware/ratelimit.ts` + `src/tools/status.ts` | pass-through (dark) |
| Stripe webhook (tier flips) | `src/routes/stripe-webhook.ts` → `POST /webhooks/stripe` | returns 503 |
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

### 1. Database migration (once, before anything else)

Run `src/db/migrations/002_paywall_tiers.sql` in the Supabase SQL Editor
(idempotent). Adds `founders` to the tier check, `stripe_customer_id` /
`stripe_subscription_id` columns, and founders cap parity in
`get_effective_cap`.

### 2. Stripe (Dashboard — this code never creates Stripe objects)

1. Create product **CCC Pro** with two prices: $10/month recurring and
   $96/year recurring. Note both price ids.
2. Create product **CCC Founders Lifetime**: $199 one-time. Note the price id.
   Cap at 200 units operationally (payment links support quantity limits;
   there is no code-side counter).
3. Developers → Webhooks → Add endpoint:
   `https://mcp.commanderplugin.com/webhooks/stripe`
   Events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.deleted`. Note the signing secret (`whsec_…`).
4. Checkout links MUST carry user identity so the webhook can map the
   payment to a key record:
   - set `client_reference_id` to the CC Commander `user_id` (payment links
     accept `?client_reference_id=…`), or rely on checkout email matching
     `users.email`;
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

Tier flip behavior: `subscription.created` with a pro price → `pro`;
`subscription.deleted` → `free` (founders never downgraded — lifetime);
payment-mode `checkout.session.completed` with founders metadata → `founders`.

### 3. OAuth issuer (required for the ChatGPT Work connector flow)

This server is a **resource server only** — it validates tokens, it does not
mint them. Kevin must stand up or designate an OAuth 2.1 authorization server
(e.g. Auth0, WorkOS, Supabase Auth, or a small self-hosted AS) that:

- supports authorization-code + PKCE (ChatGPT's connector flow; dynamic
  client registration strongly recommended),
- publishes JWKS (asymmetric signing — RS256/ES256/EdDSA),
- mints access tokens with `iss` = `OAUTH_ISSUER_URL`, `aud` =
  `OAUTH_RESOURCE_URL`, and a `sub` equal to the CC Commander `user_id`
  (UUID) **or** an `email` claim matching `users.email` — that is how tokens
  map to the same key records as `/v1` Bearer license keys.

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
