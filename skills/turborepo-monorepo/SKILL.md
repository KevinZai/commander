# Turborepo Monorepo Skill

Stack: Turborepo + pnpm workspaces + TypeScript
Used for: GuestNetworks fullstack monorepo

## Create New Monorepo

```bash
npx create-turbo@latest my-app --package-manager pnpm
cd my-app
```

Or scaffold manually — see `templates/turborepo-fullstack-starter.md`.

---

## Root `turbo.json`

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
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  },
  "globalEnv": [
    "DATABASE_URL",
    "NODE_ENV",
    "BETTER_AUTH_SECRET",
    "NEXT_PUBLIC_APP_URL"
  ]
}
```

---

## Root `package.json`

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.3.0",
    "typescript": "^5.7.0"
  }
}
```

---

## pnpm Workspace Config (`pnpm-workspace.yaml`)

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## Workspace Structure

```
my-monorepo/
├── apps/
│   ├── web/              # Next.js frontend
│   │   └── package.json  # name: "@repo/web"
│   └── api/              # Fastify backend
│       └── package.json  # name: "@repo/api"
├── packages/
│   ├── db/               # Shared Drizzle schema + client
│   │   └── package.json  # name: "@repo/db"
│   ├── shared/           # Types, validators, constants
│   │   └── package.json  # name: "@repo/shared"
│   ├── ui/               # Shared React components
│   │   └── package.json  # name: "@repo/ui"
│   └── config/           # ESLint, TS, Prettier configs
│       └── package.json  # name: "@repo/config"
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── .env                  # Root env (gitignored)
```

---

## Shared Packages

### `packages/db` — Drizzle schema + client

```json
// packages/db/package.json
{
  "name": "@repo/db",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "@neondatabase/serverless": "^0.10.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0"
  }
}
```

```ts
// packages/db/src/index.ts
export * from './schema';
export * from './client';
export type { DB } from './client';
```

### `packages/shared` — Types + validators

```json
// packages/shared/package.json
{
  "name": "@repo/shared",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "^3.24.0" }
}
```

```ts
// packages/shared/src/index.ts
export * from './types';
export * from './validators';
export * from './constants';
```

### `packages/ui` — Shared components

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx",
    "./styles": "./src/styles/globals.css"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "next": "^15.0.0"
  }
}
```

---

## TypeScript Setup

Root `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

App `tsconfig.json` (Next.js):
```json
{
  "extends": "@repo/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`packages/config/tsconfig/nextjs.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "dom", "dom.iterable"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}
```

---

## Installing Cross-Workspace Dependencies

```bash
# Add @repo/db to the web app
pnpm --filter @repo/web add @repo/db@*

# Add @repo/shared to both apps
pnpm --filter @repo/web --filter @repo/api add @repo/shared@*

# Install a new npm package in a specific workspace
pnpm --filter @repo/api add fastify

# Install in all workspaces
pnpm --filter "*" add typescript
```

---

## Running Tasks

```bash
# Run dev in all workspaces (parallel, persistent)
pnpm dev

# Run build for specific app
pnpm --filter @repo/web build
turbo build --filter=@repo/web

# Run with dependencies (build @repo/db first)
turbo build --filter=@repo/web...

# Run tests only in changed workspaces
turbo test --filter="...[HEAD^1]"

# Run specific task with env
turbo build --env-mode=strict
```

---

## Caching

```bash
# Clear local cache
turbo clean
rm -rf .turbo

# Remote cache (Vercel — free for Vercel deployments)
npx turbo login
npx turbo link  # link to Vercel project for remote cache
```

Custom cache inputs (in turbo.json task):
```json
{
  "build": {
    "inputs": [
      "$TURBO_DEFAULT$",  // all tracked files
      ".env.production",
      "!**/*.test.ts",    // exclude test files
      "!**/*.md"
    ],
    "outputs": [".next/**", "!.next/cache/**"]
  }
}
```

---

## Generators (Scaffolding)

```bash
# Run a generator
turbo gen workspace
turbo gen workspace --name @repo/new-package --type package
```

`turbo/generators/config.ts`:
```ts
import { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('package', {
    description: 'Create a new package',
    prompts: [
      { type: 'input', name: 'name', message: 'Package name (without @repo/)' },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{name}}/package.json',
        templateFile: 'templates/package.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{name}}/src/index.ts',
        template: '// {{name}} package\nexport {};\n',
      },
    ],
  });
}
```

---

## Environment Variables

`.env` at root (shared across apps):
```env
DATABASE_URL=postgresql://...
NODE_ENV=development
```

`.env.local` per app (app-specific, not shared):
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

In `turbo.json`, declare global envs:
```json
{
  "globalEnv": ["DATABASE_URL", "NODE_ENV"],
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_APP_URL", "PORT"]
    }
  }
}
```

Load in packages (e.g., `packages/db`):
```ts
// packages/db/src/env.ts
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export const DATABASE_URL = process.env.DATABASE_URL;
```

---

## Deployment

### Vercel (Next.js app)
```json
// vercel.json at repo root
{
  "buildCommand": "cd ../.. && pnpm build --filter=@repo/web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

Or use Vercel's monorepo detection with `rootDirectory: apps/web`.

### Fly.io (Fastify API)
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @repo/api build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
```

---

## Testing Across Workspaces

```bash
# Run all tests
turbo test

# Run tests in one package
turbo test --filter=@repo/api

# Run tests for changed packages + their dependents
turbo test --filter="...[origin/main]"

# Watch mode (not cached)
pnpm --filter @repo/api test -- --watch
```

Vitest config (`vitest.config.ts` per package):
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { reporter: ['text', 'lcov'] },
  },
});
```
