---
name: KZ Mega-SaaS
description: "Multi-tenancy patterns for B2B SaaS -- schema-per-tenant, row-level security, subdomain routing, tenant-aware queries, data isolation"
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# Multi-Tenant Patterns

Patterns for building multi-tenant B2B SaaS applications. Choose a tenancy model, implement isolation, and route tenants correctly.

## Tenancy Models -- Decision Matrix

| Model | Isolation | Complexity | Cost per Tenant | Best For |
|-------|-----------|------------|-----------------|----------|
| Shared tables + tenant_id column | Low | Low | Lowest | Early-stage, <100 tenants |
| Row-Level Security (RLS) | Medium | Medium | Low | Mid-stage, compliance needs |
| Schema-per-tenant | High | High | Medium | Enterprise, strict isolation |
| Database-per-tenant | Highest | Highest | Highest | Regulated industries, very large tenants |

**Default recommendation:** Start with shared tables + RLS. Migrate to schema-per-tenant only when a customer requires it.

---

## Pattern 1: Shared Tables with Tenant Column

The simplest approach. Every table has a `tenant_id` column. Every query filters by it.

### Schema (Drizzle)
```typescript
import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core"

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // for subdomain routing
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("projects_tenant_idx").on(table.tenantId),
])
```

### Tenant-Aware Query Helper
```typescript
import { eq, and, SQL } from "drizzle-orm"
import { db } from "@/db"

export function tenantScope<T extends { tenantId: unknown }>(
  table: T,
  tenantId: string,
  ...conditions: SQL[]
) {
  return and(eq(table.tenantId, tenantId), ...conditions)
}

// Usage
const projects = await db
  .select()
  .from(schema.projects)
  .where(tenantScope(schema.projects, currentTenantId))
```

### Middleware for Tenant Resolution
```typescript
// src/middleware.ts (Next.js)
import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const subdomain = hostname.split(".")[0]

  // Skip for main domain and special subdomains
  if (subdomain === "www" || subdomain === "app" || !subdomain.includes(".")) {
    return NextResponse.next()
  }

  // Set tenant slug in headers for downstream use
  const response = NextResponse.next()
  response.headers.set("x-tenant-slug", subdomain)
  return response
}
```

---

## Pattern 2: Row-Level Security (RLS)

Postgres-native enforcement. Even if application code has a bug, the database prevents cross-tenant data access.

### Enable RLS
```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON tasks
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- CRITICAL: Force RLS for table owner too (otherwise owner bypasses policies)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
```

### Set Tenant Context per Request
```typescript
import { sql } from "drizzle-orm"
import { db } from "@/db"

export async function withTenant<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  // Set the tenant context for this transaction
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SET LOCAL app.current_tenant_id = ${tenantId}`
    )
    return callback()
  })
}

// Usage -- no need for WHERE clauses, RLS handles it
await withTenant(tenantId, async () => {
  const projects = await db.select().from(schema.projects) // automatically filtered
  return projects
})
```

### RLS Gotchas
- **Migrations need superuser:** RLS policies require table owner or superuser
- **SET LOCAL is transaction-scoped:** Always use within a transaction
- **Indexes still matter:** RLS doesn't eliminate the need for tenant_id indexes
- **Test RLS in CI:** Write tests that attempt cross-tenant access and verify they fail

---

## Pattern 3: Schema-Per-Tenant

Each tenant gets their own Postgres schema. Strongest isolation without separate databases.

### Tenant Provisioning
```typescript
import { sql } from "drizzle-orm"
import { db } from "@/db"

export async function provisionTenant(tenantSlug: string) {
  const schemaName = `tenant_${tenantSlug.replace(/[^a-z0-9]/g, "_")}`

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`)

  // Run migrations against the new schema
  await db.execute(sql`SET search_path TO ${sql.identifier(schemaName)}`)
  // ... run Drizzle migrations here
  await db.execute(sql`SET search_path TO public`)

  // Store schema mapping
  await db.insert(schema.tenants).values({
    slug: tenantSlug,
    schemaName,
  })
}
```

### Schema-Scoped Queries
```typescript
import { drizzle } from "drizzle-orm/neon-serverless"
import { sql } from "drizzle-orm"

export function getTenantDb(schemaName: string) {
  const tenantDb = drizzle(pool, {
    schema,
    logger: true,
  })

  // Set search_path for this connection
  // In practice, use a connection pool per schema or SET search_path per query
  return {
    async query<T>(fn: (db: typeof tenantDb) => Promise<T>): Promise<T> {
      await tenantDb.execute(
        sql`SET search_path TO ${sql.identifier(schemaName)}, public`
      )
      return fn(tenantDb)
    },
  }
}
```

---

## Subdomain Routing

Map tenant slugs to subdomains for white-label experiences.

### DNS Setup
```
*.myapp.com -> your server IP (wildcard A record)
```

### Next.js Middleware
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { getTenantBySlug } from "@/lib/tenants"

const PUBLIC_DOMAIN = "myapp.com"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""

  // Extract subdomain
  const subdomain = hostname
    .replace(`.${PUBLIC_DOMAIN}`, "")
    .replace(`:${process.env.PORT || 3000}`, "") // dev port

  // Main domain -- no tenant context
  if (hostname === PUBLIC_DOMAIN || hostname === `www.${PUBLIC_DOMAIN}`) {
    return NextResponse.next()
  }

  // Resolve tenant from subdomain
  const tenant = await getTenantBySlug(subdomain)

  if (!tenant) {
    return NextResponse.redirect(new URL(`https://${PUBLIC_DOMAIN}/404`))
  }

  // Pass tenant info downstream via headers
  const response = NextResponse.next()
  response.headers.set("x-tenant-id", tenant.id)
  response.headers.set("x-tenant-slug", tenant.slug)
  response.headers.set("x-tenant-plan", tenant.plan)
  return response
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"],
}
```

### Server Component Tenant Access
```typescript
// src/lib/tenant.ts
import { headers } from "next/headers"

export async function getCurrentTenant() {
  const headersList = await headers()
  const tenantId = headersList.get("x-tenant-id")
  const tenantSlug = headersList.get("x-tenant-slug")
  const tenantPlan = headersList.get("x-tenant-plan")

  if (!tenantId) {
    throw new Error("No tenant context -- are you on a tenant subdomain?")
  }

  return { id: tenantId, slug: tenantSlug!, plan: tenantPlan! }
}
```

---

## Tenant Provisioning Flow

Complete flow for creating a new tenant:

```typescript
export async function createTenant(input: {
  name: string
  slug: string
  ownerUserId: string
  plan: "free" | "pro" | "enterprise"
}) {
  // 1. Validate slug uniqueness
  const existing = await db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, input.slug),
  })
  if (existing) throw new Error("Tenant slug already taken")

  // 2. Create Stripe customer
  const customer = await stripe.customers.create({
    name: input.name,
    metadata: { tenantSlug: input.slug },
  })

  // 3. Create tenant record
  const [tenant] = await db.insert(schema.tenants).values({
    name: input.name,
    slug: input.slug,
    plan: input.plan,
    stripeCustomerId: customer.id,
  }).returning()

  // 4. Create membership for owner
  await db.insert(schema.memberships).values({
    tenantId: tenant.id,
    userId: input.ownerUserId,
    role: "owner",
  })

  // 5. If using schema-per-tenant, provision schema
  // await provisionTenant(input.slug)

  // 6. Send welcome email, create default resources, etc.

  return tenant
}
```

---

## Data Isolation Checklist

Before going to production with multi-tenancy:

- [ ] Every query filters by tenant (or RLS enforces it)
- [ ] Cross-tenant data access is tested and blocked
- [ ] File uploads are tenant-scoped (S3 prefix or separate buckets)
- [ ] Caching is tenant-scoped (cache keys include tenant ID)
- [ ] Background jobs include tenant context
- [ ] Logs include tenant ID for debugging
- [ ] Rate limiting is per-tenant
- [ ] Webhook payloads are routed to the correct tenant
- [ ] Admin/superadmin can access all tenants (explicitly bypassing isolation)
- [ ] Tenant deletion/offboarding procedure exists
