# Turborepo Workspace Structure Reference

## Standard GuestNetworks Monorepo Layout

```
my-monorepo/
├── apps/
│   ├── web/                          # Next.js portal (customer-facing)
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/           # Login, signup, forgot-password
│   │   │   │   ├── (app)/            # Protected app shell
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── layout.tsx    # App layout w/ sidebar
│   │   │   │   ├── api/
│   │   │   │   │   └── auth/[...all]/route.ts
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   └── page.tsx          # Marketing homepage
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components (auto-generated)
│   │   │   │   └── app/              # App-specific components
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts           # Better Auth server
│   │   │   │   ├── auth-client.ts    # Better Auth client
│   │   │   │   └── utils.ts
│   │   │   └── middleware.ts
│   │   ├── package.json              # name: "@repo/web"
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                          # Fastify API / MCP server
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── plugins/
│       │   ├── routes/
│       │   ├── hooks/
│       │   └── errors/
│       ├── package.json              # name: "@repo/api"
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   ├── db/                           # Drizzle schema + client (shared)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── teams.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── index.ts          # re-exports all
│   │   │   ├── client.ts             # db instance
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json              # name: "@repo/db"
│   │   └── tsconfig.json
│   │
│   ├── shared/                       # Types, validators, constants
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts            # API request/response types
│   │   │   │   ├── domain.ts         # Domain model types
│   │   │   │   └── index.ts
│   │   │   ├── validators/
│   │   │   │   ├── user.ts           # Zod schemas for user
│   │   │   │   ├── team.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── plans.ts          # Plan definitions, limits
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json              # name: "@repo/shared"
│   │   └── tsconfig.json
│   │
│   ├── ui/                           # Shared React components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── package.json              # name: "@repo/ui"
│   │   └── tsconfig.json
│   │
│   └── config/                       # Shared configs
│       ├── eslint/
│       │   ├── base.js
│       │   ├── nextjs.js
│       │   └── node.js
│       ├── tsconfig/
│       │   ├── base.json
│       │   ├── nextjs.json
│       │   └── node.json
│       └── package.json              # name: "@repo/config"
│
├── .env                              # Shared env (gitignored)
├── .env.example
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
└── README.md
```

## Package Dependency Graph

```
@repo/web  ──→  @repo/db
           ──→  @repo/shared
           ──→  @repo/ui

@repo/api  ──→  @repo/db
           ──→  @repo/shared

@repo/db   ──→  (no internal deps)
@repo/shared ─→  (no internal deps)
@repo/ui   ──→  @repo/shared (optional)
@repo/config ─→  (no internal deps)
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Package name | `@repo/{name}` | `@repo/db`, `@repo/web` |
| Apps | lowercase-kebab | `apps/web`, `apps/api` |
| Packages | lowercase-kebab | `packages/db`, `packages/shared` |
| Exports | named + default | `export { db }; export default db;` |
| Env vars | SCREAMING_SNAKE | `DATABASE_URL`, `JWT_SECRET` |
| Public env | `NEXT_PUBLIC_` prefix | `NEXT_PUBLIC_APP_URL` |

## Quick Commands Reference

```bash
# Dev all
pnpm dev

# Dev specific app
pnpm --filter @repo/web dev
pnpm --filter @repo/api dev

# Add package dependency
pnpm --filter @repo/web add @repo/db@*
pnpm --filter @repo/api add fastify@^5.0.0

# Build all
pnpm build

# Build with deps (build @repo/db first)
turbo build --filter=@repo/web...

# Run DB migrations (from packages/db)
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate

# Type check all
pnpm typecheck

# Lint all
pnpm lint

# Test changed packages only
turbo test --filter="...[HEAD^1]"
```

## `.env.example` (root level)

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```
