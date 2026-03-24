# Drizzle ORM + Neon Postgres Skill

Stack: Drizzle ORM + `@neondatabase/serverless` + `drizzle-kit`

## Setup

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`src/db/index.ts`:
```ts
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

For pooled connections (long-running servers):
```ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
```

---

## Schema Definition

```ts
import {
  pgTable, pgEnum, uuid, text, varchar, integer, bigint,
  boolean, timestamp, decimal, index, uniqueIndex,
  primaryKey, foreignKey, jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'member', 'viewer']);
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'enterprise']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  createdAtIdx: index('users_created_at_idx').on(t.createdAt),
}));

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: planEnum('plan').default('free').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Many-to-many junction
export const teamMembers = pgTable('team_members', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').default('member').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.teamId] }),
  userIdx: index('team_members_user_idx').on(t.userId),
  teamIdx: index('team_members_team_idx').on(t.teamId),
}));

// Composite foreign key example
export const auditLogs = pgTable('audit_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userTeamIdx: index('audit_logs_user_team_idx').on(t.userId, t.teamId),
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt.desc()),
}));
```

---

## Relations

```ts
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
}));
```

---

## Type Safety

```ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// From pgTable definition (recommended)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Equivalent via generic helpers
export type Team = InferSelectModel<typeof teams>;
export type NewTeam = InferInsertModel<typeof teams>;

// Partial insert type
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt'>>;
```

---

## Queries

### Select
```ts
// Basic
const allUsers = await db.select().from(users);

// With filters
const admins = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(eq(users.role, 'admin'))
  .orderBy(desc(users.createdAt))
  .limit(10)
  .offset(20);

// Join
const membersWithTeams = await db
  .select({
    user: users,
    teamName: teams.name,
    role: teamMembers.role,
  })
  .from(teamMembers)
  .innerJoin(users, eq(teamMembers.userId, users.id))
  .innerJoin(teams, eq(teamMembers.teamId, teams.id))
  .where(eq(teams.slug, 'acme'));

// Aggregate
import { count, avg, sum, max, min } from 'drizzle-orm';
const stats = await db
  .select({ total: count(), avgId: avg(users.id) })
  .from(users);

// Subquery
const activeTeamIds = db
  .select({ id: teams.id })
  .from(teams)
  .where(eq(teams.plan, 'pro'))
  .as('active_teams');

const proMembers = await db
  .select()
  .from(teamMembers)
  .where(inArray(teamMembers.teamId, db.select({ id: activeTeamIds.id }).from(activeTeamIds)));
```

### Insert / Update / Delete
```ts
import { eq, and, or, gte, lte, like, inArray, isNull, sql } from 'drizzle-orm';

// Insert one — returns inserted row
const [user] = await db.insert(users).values({
  email: 'kevin@example.com',
  name: 'Kevin',
  role: 'admin',
}).returning();

// Insert many
await db.insert(teamMembers).values([
  { userId: user.id, teamId: team.id, role: 'admin' },
  { userId: other.id, teamId: team.id, role: 'member' },
]);

// Upsert (on conflict)
await db.insert(users)
  .values({ email: 'kevin@example.com', name: 'Kevin' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Kevin Updated', updatedAt: new Date() },
  });

// Update
const [updated] = await db
  .update(users)
  .set({ name: 'New Name', updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();

// Delete
await db.delete(users).where(eq(users.id, userId));

// Raw SQL when needed
await db.execute(sql`UPDATE users SET updated_at = NOW() WHERE id = ${userId}`);
```

### Relational Queries (type-safe joins via relations)
```ts
// findFirst with nested includes
const userWithTeams = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    teamMembers: {
      with: { team: true },
      where: eq(teamMembers.role, 'admin'),
    },
  },
});

// findMany with filters and pagination
const page = await db.query.teams.findMany({
  where: eq(teams.plan, 'pro'),
  with: {
    teamMembers: {
      with: { user: { columns: { id: true, email: true, name: true } } },
      limit: 5,
    },
  },
  orderBy: desc(teams.createdAt),
  limit: 20,
  offset: 0,
});
```

### Window Functions
```ts
import { sql } from 'drizzle-orm';

const ranked = await db.select({
  id: users.id,
  email: users.email,
  rowNum: sql<number>`ROW_NUMBER() OVER (ORDER BY ${users.createdAt} DESC)`,
  rank: sql<number>`RANK() OVER (PARTITION BY ${users.role} ORDER BY ${users.createdAt})`,
}).from(users);
```

---

## Transactions

```ts
// Basic transaction
const result = await db.transaction(async (tx) => {
  const [team] = await tx.insert(teams).values({ name: 'Acme', slug: 'acme' }).returning();
  const [member] = await tx.insert(teamMembers).values({
    teamId: team.id, userId: currentUser.id, role: 'admin',
  }).returning();
  return { team, member };
});

// With manual rollback
const result = await db.transaction(async (tx) => {
  try {
    await tx.insert(users).values({ email: 'test@example.com' });
    await tx.insert(teamMembers).values({ userId: 'bad-id', teamId: 'x' }); // throws
    return 'ok';
  } catch (err) {
    tx.rollback(); // explicit rollback
    throw err;
  }
});

// Savepoints (nested)
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: 'outer@example.com' });
  await tx.transaction(async (inner) => { // savepoint
    await inner.insert(users).values({ email: 'inner@example.com' });
  });
});
```

---

## Migrations

```bash
# Generate SQL migration files
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate

# Push schema directly (dev only — no migration files)
npx drizzle-kit push

# Introspect existing DB → generate schema.ts
npx drizzle-kit introspect

# Open Drizzle Studio (DB browser)
npx drizzle-kit studio
```

`package.json` scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "npx tsx src/db/seed.ts"
  }
}
```

---

## Seeding

`src/db/seed.ts`:
```ts
import { db } from './index';
import { users, teams, teamMembers } from './schema';

async function seed() {
  console.log('Seeding...');

  // Clear in dependency order
  await db.delete(teamMembers);
  await db.delete(teams);
  await db.delete(users);

  const [admin] = await db.insert(users).values({
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }).returning();

  const memberList = await db.insert(users).values([
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
  ]).returning();

  const [team] = await db.insert(teams).values({
    name: 'Acme Corp',
    slug: 'acme-corp',
    plan: 'pro',
  }).returning();

  await db.insert(teamMembers).values([
    { userId: admin.id, teamId: team.id, role: 'admin' },
    ...memberList.map(m => ({ userId: m.id, teamId: team.id, role: 'member' as const })),
  ]);

  console.log(`Seeded: 3 users, 1 team`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

---

## Neon Serverless Notes

- Use `neon-http` driver (default) for Edge/serverless — stateless HTTP
- Use `neon-serverless` with `Pool` for Node.js servers — persistent connections
- `neonConfig.fetchConnectionCache = true` — reuses HTTP connections per request
- Neon branching: create DB branches per PR via Neon API or GitHub Actions
- Connection string format: `postgresql://user:pass@host/dbname?sslmode=require`

```ts
// Edge runtime (e.g., Next.js middleware, Vercel Edge)
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql); // no schema needed for raw queries
const rows = await db.select().from(users).limit(1);
```

---

## Performance

```ts
// Prepared statements — compiled once, reused
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

const user = await getUserById.execute({ id: '...' });

// EXPLAIN ANALYZE
const plan = await db.execute(sql`EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'x@y.com'`);
```

Indexes to always have:
- `email` columns — uniqueIndex
- Foreign keys — index (Postgres doesn't auto-index FK)
- `created_at` on high-write tables — for range queries
- Composite indexes for multi-column WHERE/ORDER

---

## Neon Branching (CI/CD)

```bash
# Install Neon CLI
npm i -g neonctl

# Create branch for PR
neonctl branches create --project-id $NEON_PROJECT_ID --name "pr-123"

# Get connection string
neonctl connection-string --branch pr-123

# Delete after merge
neonctl branches delete pr-123
```
