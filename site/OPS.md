# cc-commander.com — Ops Checklist

Everything that needs to be set up outside the codebase before / after launch.
Entity: **Axiom Marketing Inc.**

---

## 1. Stripe (dedicated account under Axiom Marketing Inc.)

### 1a. Account setup

- [ ] Create new Stripe account under Axiom Marketing Inc. (not Kevin personal, not shared with Axiom consulting)
- [ ] Add legal name, EIN, banking details
- [ ] Enable Stripe Tax (auto-calc sales tax)
- [ ] Enable Stripe Billing (for subscriptions)
- [ ] Enable Stripe Radar (fraud prevention)
- [ ] Brand the customer portal: logo, brand color (violet `#8B5CF6`), support email `hello@cc-commander.com`

### 1b. Products and prices

Create one **product** (`CCC`) with four **prices**:

| Price nickname          | Env var                            | Amount | Interval | Trial |
| ----------------------- | ---------------------------------- | ------ | -------- | ----- |
| Pro Monthly             | `STRIPE_PRICE_PRO_MONTHLY`         | $19    | month    | none  |
| Pro Yearly              | `STRIPE_PRICE_PRO_YEARLY`          | $190   | year     | none  |
| Team Monthly (5 seats)  | `STRIPE_PRICE_TEAM_MONTHLY`        | $99    | month    | none  |
| Team Yearly (5 seats)   | `STRIPE_PRICE_TEAM_YEARLY`         | $990   | year     | none  |

Record each `price_id` in the Vercel project env vars.

### 1c. Webhook

- [ ] Endpoint: `https://cc-commander.com/api/stripe/webhook`
- [ ] Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Copy signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel env

### 1d. Test mode

- [ ] Verify full checkout flow with test card `4242 4242 4242 4242`
- [ ] Verify webhook delivery and license key issuance
- [ ] Verify receipt email delivery via Stripe

---

## 2. Cloudflare DNS

Global API key: stored in 1Password vault `Alfred` → `Cloudflare Global API Key`.

### 2a. Create zone

- [ ] Add `cc-commander.com` to Cloudflare
- [ ] Update nameservers at registrar
- [ ] Wait for "Active" status

### 2b. DNS records

| Type  | Name                          | Value                   | Proxy |
| ----- | ----------------------------- | ----------------------- | ----- |
| A     | `@` (cc-commander.com)        | Vercel's IP             | ✓     |
| CNAME | `www`                         | `cname.vercel-dns.com`  | ✓     |
| MX    | `@`                           | `route.mx.cloudflare.net` (priority 10) | — |
| TXT   | `@`                           | `v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all` | — |
| TXT   | `_dmarc`                      | `v=DMARC1; p=quarantine; rua=mailto:hello@cc-commander.com` | — |

### 2c. Email Routing

- [ ] Enable Cloudflare Email Routing on the zone
- [ ] Add destination address (Kevin's personal inbox)
- [ ] Create route: `hello@cc-commander.com` → destination
- [ ] Optional: catch-all → destination
- [ ] Verify destination email

### 2d. Security

- [ ] Enable "Always Use HTTPS"
- [ ] Enable HSTS (6-month)
- [ ] Set SSL/TLS mode to **Full (strict)**
- [ ] Enable Bot Fight Mode (free)

---

## 3. Resend (transactional email)

### 3a. Account + domain

- [ ] Sign up for Resend with `hello@cc-commander.com`
- [ ] Add domain `cc-commander.com`
- [ ] Copy DKIM records → add to Cloudflare DNS
- [ ] Verify domain (must show green checkmark)
- [ ] Create API key with `send-only` scope → `RESEND_API_KEY` in Vercel

### 3b. Templates

Create these React Email templates in `site/emails/`:

- [ ] `license-welcome.tsx` — sent on `checkout.session.completed`
- [ ] `subscription-renewed.tsx` — sent on `invoice.payment_succeeded`
- [ ] `subscription-canceled.tsx` — sent on `customer.subscription.deleted`
- [ ] `payment-failed.tsx` — sent on `invoice.payment_failed`

### 3c. Broadcast list (optional, for TheAgentReport)

- [ ] Create an Audience
- [ ] Wire a signup form on `/` (footer) that calls Resend's API
- [ ] Set up DMARC reporting

---

## 4. Vercel

### 4a. Project setup

- [ ] `vercel link` from `/site` directory
- [ ] Project name: `cc-commander`
- [ ] Root directory: `site`
- [ ] Framework: Next.js (auto-detected)
- [ ] Production branch: `main`

### 4b. Environment variables

Add to Vercel dashboard → Project Settings → Environment Variables (production + preview):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...
NEXT_PUBLIC_SITE_URL=https://cc-commander.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
POSTGRES_URL=postgres://...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@cc-commander.com
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=cc-commander.com
LICENSE_SIGNING_SECRET=<generate 32-byte hex with: openssl rand -hex 32>
```

### 4c. Custom domain

- [ ] Add `cc-commander.com` in Vercel project → Domains
- [ ] Add `www.cc-commander.com` (redirect to apex)
- [ ] Verify DNS propagation
- [ ] Force HTTPS

---

## 5. Vercel Postgres (Neon)

### 5a. Provision

- [ ] From Vercel dashboard → Storage → Create Postgres database
- [ ] Name: `ccc-licenses`
- [ ] Region: `us-east-1` (same as functions)
- [ ] Copy `POSTGRES_URL` → Vercel env (auto-linked)

### 5b. Schema

Run once via `psql $POSTGRES_URL` or Vercel SQL editor:

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'team')),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_email ON licenses(email);
CREATE INDEX idx_licenses_customer ON licenses(stripe_customer_id);
CREATE INDEX idx_licenses_status ON licenses(status);
```

### 5c. License key format

- Prefix: `ccc_live_` (production) or `ccc_test_` (test mode)
- Body: 32 hex chars from `crypto.randomBytes(16)`
- Signature: HMAC-SHA256 of `key|email|tier|expires_at` using `LICENSE_SIGNING_SECRET`
- Final token: `ccc_live_<body>.<signature>` (plugin verifies offline)

---

## 6. Plausible Analytics

- [ ] Sign up at plausible.io
- [ ] Add site `cc-commander.com`
- [ ] Add `<Script>` tag in `app/layout.tsx` (or via `@plausible/nextjs`)
- [ ] Set goals: `install_command_copied`, `checkout_started`, `checkout_completed`

---

## 7. GitHub + Marketplace

- [x] Repo `KevinZai/commander` exists and is public
- [x] v3.0.0 tag pushed (commit `8e5fd4e`)
- [x] Marketplace: `/plugin marketplace add KevinZai/commander` works
- [ ] Create GitHub Release for v3.0.0 with changelog
- [ ] Submit to awesome lists:
  - [ ] `ComposioHQ/awesome-claude-plugins`
  - [ ] `ccplugins/awesome-claude-code-plugins`
  - [ ] `quemsah/awesome-claude-plugins`
  - [ ] `claudemarketplaces.com`

---

## 8. Launch day

- [ ] Smoke test full checkout flow in production with real card
- [ ] Verify email delivery (license key arrives)
- [ ] Verify plugin install from marketplace still works
- [ ] Announce on Twitter / X (@kzic)
- [ ] Post to Hacker News (`Show HN: CCC — Claude Code Commander`)
- [ ] Post to Reddit `r/ClaudeAI`, `r/LocalLLaMA`
- [ ] Email TheAgentReport subscribers

---

## 9. Post-launch monitoring

- [ ] Check Stripe dashboard daily for week 1
- [ ] Monitor Vercel function logs for errors
- [ ] Monitor Plausible for conversion rates
- [ ] Monitor GitHub issues for install problems
- [ ] Respond to `hello@cc-commander.com` within 24h during week 1
