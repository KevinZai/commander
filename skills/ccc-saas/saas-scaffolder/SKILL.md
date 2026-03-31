---
name: KZ Mega-SaaS
description: "End-to-end SaaS scaffold generator -- takes a starter template and customizes it with database, auth, billing, and environment configuration"
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# SaaS Scaffolder

Generate a production-ready SaaS project from a starter template with all integrations wired up.

## Starter Templates

### nextjs-shadcn-starter
Single-app SaaS with Next.js 15 + shadcn/ui + Tailwind v4.

```
my-saas/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Public pages (landing, pricing, blog)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── pricing/page.tsx
│   │   ├── (auth)/             # Auth pages (login, signup, forgot-password)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/              # Authenticated app shell
│   │   │   ├── layout.tsx      # Sidebar + topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── billing/page.tsx
│   │   │   └── [feature]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts   # Better Auth catch-all
│   │   │   └── webhooks/stripe/route.ts # Stripe webhook handler
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── app/                # App-specific components
│   ├── db/
│   │   ├── index.ts            # Drizzle client
│   │   ├── schema.ts           # All tables
│   │   └── migrations/         # Drizzle migrations
│   ├── lib/
│   │   ├── auth.ts             # Better Auth server config
│   │   ├── auth-client.ts      # Better Auth client
│   │   ├── stripe.ts           # Stripe client + helpers
│   │   └── env.ts              # Validated env vars (t3-env)
│   └── styles/
│       └── globals.css         # Tailwind v4 + shadcn theme
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts          # (if needed -- v4 prefers CSS-first)
├── .env.local                  # Local env vars (gitignored)
├── .env.example                # Template for env vars
└── package.json
```

### turborepo-fullstack-starter
Monorepo SaaS with separate web app + API server + shared packages.

```
my-saas/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── src/app/            # Same route group structure as above
│   │   └── package.json
│   └── api/                    # Fastify API server
│       ├── src/
│       │   ├── routes/         # Fastify route modules
│       │   ├── plugins/        # Fastify plugins (auth, stripe, db)
│       │   └── index.ts        # Server entry
│       └── package.json
├── packages/
│   ├── db/                     # Shared Drizzle schema + client
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── index.ts
│   │   │   └── migrations/
│   │   └── package.json
│   ├── auth/                   # Shared Better Auth config
│   │   └── package.json
│   ├── ui/                     # Shared shadcn/ui components
│   │   └── package.json
│   └── shared/                 # Shared types, utils, constants
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Scaffold Configuration

When scaffolding, gather these from the user:

### 1. Project Identity
```
Project name:       _______________
Template:           [ ] nextjs-shadcn-starter
                    [ ] turborepo-fullstack-starter
Package manager:    [ ] pnpm (recommended) [ ] npm
```

### 2. Database Provider
```
Provider:           [ ] Neon (recommended -- serverless Postgres)
                    [ ] Supabase (Postgres + extras)
                    [ ] PlanetScale (MySQL -- use only if required)
Connection:         DATABASE_URL from provider dashboard
Pooling:            [ ] Neon serverless driver (recommended)
                    [ ] pgBouncer connection string
```

### 3. Auth Configuration
```
Auth methods:       [x] Email + password (default)
                    [ ] Google OAuth
                    [ ] GitHub OAuth
                    [ ] Magic link
                    [ ] Two-factor (TOTP)
Plugins:            [ ] Organization (multi-tenant)
                    [ ] Admin
                    [ ] RBAC (roles + permissions)
```

### 4. Billing Setup
```
Billing model:      [ ] Flat-rate subscription (e.g., $29/mo)
                    [ ] Tiered plans (Free, Pro, Enterprise)
                    [ ] Usage-based (metered)
                    [ ] Per-seat pricing
Trial:              [ ] 14-day free trial (recommended)
                    [ ] No trial
Stripe keys:        STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
Webhook secret:     STRIPE_WEBHOOK_SECRET
```

### 5. Environment Variables
Generate `.env.example` with all required vars:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth (if selected)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Scaffold Command Sequence

After gathering configuration, execute in this order:

### Step 1: Create project
```bash
# nextjs-shadcn-starter
pnpm create next-app@latest my-saas --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-saas

# turborepo-fullstack-starter
pnpm create turbo@latest my-saas
cd my-saas
```

### Step 2: Install core dependencies
```bash
# Database
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Auth
pnpm add better-auth

# Billing
pnpm add stripe

# UI
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu avatar badge separator sidebar

# Validation
pnpm add zod @t3-oss/env-nextjs

# Utilities
pnpm add date-fns clsx tailwind-merge
```

### Step 3: Generate schema
```bash
# Create initial Drizzle schema with auth + billing tables
# Then push to database
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

### Step 4: Configure auth
```typescript
// src/lib/auth.ts -- generated based on user selections
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db"
import * as schema from "@/db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  // ... plugins based on user selections
})
```

### Step 5: Configure Stripe
```typescript
// src/lib/stripe.ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

// Create products + prices in Stripe Dashboard or via API
// Store price IDs in a plans config file
```

### Step 6: Wire up webhook handler
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const body = await req.text() // RAW body -- critical for signature verification
  const sig = (await headers()).get("stripe-signature")!

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case "checkout.session.completed":
      // Activate subscription
      break
    case "customer.subscription.updated":
      // Sync plan changes
      break
    case "customer.subscription.deleted":
      // Handle cancellation
      break
    case "invoice.payment_failed":
      // Trigger dunning
      break
  }

  return Response.json({ received: true })
}
```

### Step 7: Set up env validation
```typescript
// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
})
```

### Step 8: Verify
```bash
pnpm dev          # App starts without errors
pnpm drizzle-kit studio  # Database schema visible
# Visit http://localhost:3000 -- marketing page loads
# Visit http://localhost:3000/login -- auth page loads
```

---

## Post-Scaffold Checklist

After scaffolding, the user should:

- [ ] Add real Stripe keys to `.env.local`
- [ ] Create products and prices in Stripe Dashboard
- [ ] Update pricing page with real plan data
- [ ] Add OAuth credentials if using social login
- [ ] Run `pnpm drizzle-kit push` against production database
- [ ] Set up Stripe webhook endpoint in Dashboard pointing to `/api/webhooks/stripe`
- [ ] Deploy to Vercel (or preferred host)
- [ ] Set environment variables in deployment platform

## What This Skill Does NOT Do

- Does not write business logic -- that's the user's domain
- Does not design the database beyond auth + billing tables -- use `database-designer`
- Does not optimize conversion -- use the CRO skills after shipping
- Does not set up CI/CD -- use deployment-specific tooling
