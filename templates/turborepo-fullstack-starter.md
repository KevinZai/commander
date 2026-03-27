# Turborepo Fullstack Starter

Stack: Turborepo + pnpm + Next.js (web) + Fastify (api) + Drizzle + Better Auth

## Quick Start

```bash
npx create-turbo@latest my-app --package-manager pnpm
cd my-app
# Then replace the contents with this scaffold
```

---

## Root Files

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:push": { "cache": false }
  },
  "globalEnv": [
    "DATABASE_URL", "NODE_ENV",
    "BETTER_AUTH_SECRET", "BETTER_AUTH_URL",
    "NEXT_PUBLIC_APP_URL", "API_URL"
  ]
}
```

### Root `package.json`

```json
{
  "name": "my-app",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules",
    "db:generate": "turbo db:generate --filter=@repo/db",
    "db:migrate": "turbo db:migrate --filter=@repo/db",
    "db:push": "turbo db:push --filter=@repo/db"
  },
  "devDependencies": {
    "turbo": "2.3.3",
    "typescript": "5.8.2",
    "prettier": "3.4.2"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### `.env.example`

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
JWT_SECRET=
```

---

## `packages/db`

### `packages/db/package.json`

```json
{
  "name": "@repo/db",
  "version": "0.0.1",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "0.40.1",
    "@neondatabase/serverless": "0.10.4"
  },
  "devDependencies": {
    "drizzle-kit": "0.30.4",
    "typescript": "5.8.2",
    "tsx": "4.19.3"
  }
}
```

### `packages/db/drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### `packages/db/src/schema.ts`

```ts
import { pgTable, text, boolean, timestamp, index, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({ emailIdx: uniqueIndex('users_email_idx').on(t.email) }));

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### `packages/db/src/client.ts`

```ts
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

### `packages/db/src/index.ts`

```ts
export * from './schema';
export { db } from './client';
export type { DB } from './client';
```

---

## `packages/shared`

### `packages/shared/package.json`

```json
{
  "name": "@repo/shared",
  "version": "0.0.1",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "3.24.2" },
  "devDependencies": { "typescript": "5.8.2" }
}
```

### `packages/shared/src/index.ts`

```ts
export * from './types';
export * from './validators';
export * from './constants';
```

### `packages/shared/src/types.ts`

```ts
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: { code: string; message: string };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
```

### `packages/shared/src/validators.ts`

```ts
import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const UUIDSchema = z.string().uuid();

export const EmailSchema = z.string().email().toLowerCase();
```

### `packages/shared/src/constants.ts`

```ts
export const PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

export const PLAN_LIMITS: Record<Plan, { users: number; storage: number }> = {
  free: { users: 1, storage: 1_000 },
  starter: { users: 5, storage: 10_000 },
  pro: { users: 25, storage: 100_000 },
  enterprise: { users: Infinity, storage: Infinity },
};
```

---

## `apps/web` (Next.js)

### `apps/web/package.json`

```json
{
  "name": "@repo/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "15.2.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "better-auth": "1.2.7",
    "@repo/db": "*",
    "@repo/shared": "*",
    "tailwindcss": "4.0.15",
    "@tailwindcss/postcss": "4.0.15",
    "lucide-react": "0.477.0",
    "next-themes": "0.4.4",
    "sonner": "2.0.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "class-variance-authority": "0.7.1"
  },
  "devDependencies": {
    "@repo/config": "*",
    "typescript": "5.8.2",
    "@types/react": "19.0.10",
    "@types/react-dom": "19.0.4",
    "@types/node": "22.13.10",
    "eslint": "9.22.0",
    "eslint-config-next": "15.2.4",
    "vitest": "3.0.8",
    "@vitejs/plugin-react": "4.3.4",
    "@testing-library/react": "16.2.0",
    "@testing-library/jest-dom": "6.6.3",
    "@playwright/test": "1.50.1",
    "jsdom": "26.0.0"
  }
}
```

### `apps/web/next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/db', '@repo/shared'],
};

export default nextConfig;
```

### `apps/web/src/lib/auth.ts`

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@repo/db';
import * as schema from '@repo/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: {
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verifications,
  }}),
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

---

## `apps/api` (Fastify)

### `apps/api/package.json`

```json
{
  "name": "@repo/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "5.2.1",
    "@fastify/cors": "10.0.2",
    "@fastify/jwt": "9.0.3",
    "@fastify/auth": "5.0.1",
    "@fastify/rate-limit": "10.2.2",
    "@fastify/swagger": "9.4.2",
    "@fastify/swagger-ui": "5.2.1",
    "fastify-plugin": "5.0.1",
    "@repo/db": "*",
    "@repo/shared": "*",
    "zod": "3.24.2"
  },
  "devDependencies": {
    "@repo/config": "*",
    "typescript": "5.8.2",
    "@types/node": "22.13.10",
    "tsx": "4.19.3",
    "vitest": "3.0.9"
  }
}
```

### `apps/api/src/server.ts`

```ts
import { buildApp } from './app';

const port = Number(process.env.PORT) || 3001;
const app = await buildApp();

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on http://0.0.0.0:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
```

### `apps/api/src/app.ts`

```ts
import Fastify from 'fastify';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  await app.register(import('./plugins/cors'));
  await app.register(import('./plugins/db'));
  await app.register(import('./plugins/auth'));
  await app.register(import('./plugins/swagger'));

  await app.register(import('./routes/health'));
  await app.register(import('./routes/users'), { prefix: '/api/v1' });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = (error as any).statusCode || 500;
    reply.code(status).send({ error: { message: error.message, code: 'ERROR' } });
  });

  return app;
}
```

### `apps/api/src/routes/health.ts`

```ts
import { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

const health: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', { schema: { hide: true } }, async (request, reply) => {
    try {
      await fastify.db.execute(sql`SELECT 1`);
      return reply.send({ status: 'ok', db: 'ok', ts: new Date().toISOString() });
    } catch {
      return reply.code(503).send({ status: 'degraded', db: 'error' });
    }
  });
};

export default health;
```

---

## Setup Instructions

1. **Clone / scaffold:**
   ```bash
   npx create-turbo@latest my-app --package-manager pnpm
   ```

2. **Replace structure** with files above (or run `turbo gen workspace` to scaffold individual packages)

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Configure environment:** Copy `.env.example` → `.env`, fill in `DATABASE_URL`, `BETTER_AUTH_SECRET`, etc.

5. **Add internal packages to apps:**
   ```bash
   pnpm --filter @repo/web add @repo/db@* @repo/shared@*
   pnpm --filter @repo/api add @repo/db@* @repo/shared@*
   ```

6. **Run DB migrations:**
   ```bash
   pnpm db:push  # dev
   ```

7. **Initialize shadcn in web app:**
   ```bash
   cd apps/web && npx shadcn@latest init
   ```

8. **Start dev servers (all):**
   ```bash
   pnpm dev
   # web → http://localhost:3000
   # api → http://localhost:3001
   ```

9. **Verify health:**
   ```bash
   curl http://localhost:3001/health
   ```

10. **Build for production:**
    ```bash
    pnpm build
    ```

---

## `.gitignore`

```
node_modules/
.next/
dist/
.turbo/
.env.local
.env*.local
*.tsbuildinfo
test-results/
playwright-report/
```
