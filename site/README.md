# cc-commander.com

Marketing site for **CCC** (Claude Code Commander). Deployed to `cc-commander.com`.

## Stack

- **Framework:** Next.js 16 (Turbopack, App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Animation:** Framer Motion
- **Payments:** Stripe Checkout (hosted)
- **Database:** Vercel Postgres (Neon) — license keys
- **Email:** Resend (transactional) + Cloudflare Email Routing (inbound)
- **Analytics:** Plausible
- **Hosting:** Vercel Hobby tier
- **DNS:** Cloudflare (`cc-commander.com`)

## Local dev

```bash
pnpm install
pnpm dev           # http://localhost:3000
pnpm build         # production build
pnpm typecheck     # tsc --noEmit
pnpm lint          # next lint
```

## Environment variables

Copy `.env.example` → `.env.local` and fill in:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...

# Public
NEXT_PUBLIC_SITE_URL=https://cc-commander.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Database
POSTGRES_URL=postgres://...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@cc-commander.com

# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=cc-commander.com
```

## Directory structure

```
site/
├── app/
│   ├── page.tsx              # Home
│   ├── pricing/page.tsx      # Pricing (also rendered on home)
│   ├── changelog/page.tsx    # Release notes
│   ├── api/stripe/
│   │   └── checkout/route.ts # Stripe Checkout session creator
│   ├── layout.tsx            # Root layout + metadata
│   └── globals.css           # Tailwind v4 theme tokens
├── components/
│   ├── hero.tsx              # Animated terminal hero
│   ├── problem-section.tsx   # "The plugin mess"
│   ├── solution-grid.tsx     # 4 feature cards
│   ├── social-proof.tsx      # Connected tools logo strip
│   ├── workflow-demo.tsx     # 4-step competitive intel workflow
│   ├── skills-showcase.tsx   # Tabbed 15-skill grid
│   ├── pricing-table.tsx     # 3-tier pricing w/ monthly/yearly toggle
│   ├── install-section.tsx   # Desktop + CLI tabs w/ copy buttons
│   ├── nav.tsx
│   └── footer.tsx
├── lib/
│   ├── stripe.ts             # Lazy Stripe client + PRICE_IDS
│   └── utils.ts              # cn() helper
└── public/                   # Static assets, OG images
```

## Copy & messaging (locked)

- **Overline:** "95% of Claude users are operating with their hands tied"
- **H1:** "We found every great Claude plugin. Kept the best. Made them talk to each other."
- **Sub:** "CCC is the curated, AI-guided package that turns Claude from a brain-in-a-jar into an operator. 15 skills. 5 agents. 8 pre-wired MCPs. One install."
- **Differentiator phrase:** "AI-guided workflows"
- **Source:** [`/tasks/spec-cc-commander-com.md`](../tasks/spec-cc-commander-com.md)

## Pricing

| Tier  | Monthly | Yearly           |
| ----- | ------- | ---------------- |
| Free  | $0      | $0               |
| Pro   | $19     | $190 (−2 months) |
| Team  | $99     | $990 (5 seats)   |

## Deploy

```bash
# Push to main → Vercel auto-deploys from /site
git push origin main
```

Vercel project settings:
- **Root Directory:** `site`
- **Framework Preset:** Next.js
- **Build Command:** `pnpm build`
- **Install Command:** `pnpm install`
- **Node Version:** 22.x

## Ops

See [`/site/OPS.md`](./OPS.md) for the full ops checklist (Stripe setup,
Cloudflare DNS, Resend domain verification, Vercel Postgres provisioning,
license key signing, etc.).
