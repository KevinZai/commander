---
name: schema-design
category: coding
skills: [database-designer, database-migrations, backend-patterns]
mode: plan
estimated_tokens: 600
---

# Database Schema Design

## When to Use
When designing a new database schema or extending an existing one. Use this before writing any migration code to get the structure right.

## Template

```
Design the database schema for the following feature. Optimize for the actual query patterns, not theoretical normalization.

**Feature:**
{{what_the_feature_stores_and_retrieves}}

**Database:**
{{PostgreSQL|MySQL|SQLite|MongoDB — or say "recommend one"}}

**ORM/Query builder:**
{{Drizzle|Prisma|Knex|TypeORM|raw SQL — or say "recommend one"}}

**Expected scale:**
{{rough_numbers — rows, reads_per_second, writes_per_second}}

**Step 1: Entity identification**
- List all entities (tables/collections) needed
- Define the primary key strategy (UUID, auto-increment, CUID)
- Map relationships: 1:1, 1:N, N:N (with junction tables)
- Identify which fields need timestamps (created_at, updated_at, deleted_at)

**Step 2: Column design**
For each table:
- Column name, type, nullable, default, constraints
- Which columns are indexed (and why — what query does this index serve?)
- Foreign key constraints with ON DELETE behavior (CASCADE, SET NULL, RESTRICT)
- Check constraints for data integrity

**Step 3: Query pattern analysis**
- List the top 5 most frequent queries this schema will serve
- For each: which tables are joined? Which columns are in WHERE/ORDER BY?
- Design indexes to support these queries
- Identify potential N+1 query risks

**Step 4: Migration plan**
- If extending existing schema: what's the migration sequence?
- Can migrations run with zero downtime? (no table locks on large tables)
- Rollback strategy for each migration step
- Data backfill needed?

**Step 5: Output**
- SQL CREATE TABLE statements (or ORM schema definition)
- Migration file(s) in the project's migration format
- Seed data for development/testing
- TypeScript types that mirror the schema
```

## Tips
- Use the `database-designer` skill for automated schema analysis
- Always add soft delete (deleted_at) unless you have a strong reason not to
- Design for your read patterns, not your write patterns — reads dominate

## Example

```
Design the database schema for the following feature. Optimize for the actual query patterns, not theoretical normalization.

**Feature:**
Multi-tenant SaaS billing — organizations have subscription plans, usage metering, and invoice history. Users belong to organizations. Plans have feature limits.

**Database:** PostgreSQL
**ORM/Query builder:** Drizzle
**Expected scale:** 10K orgs, 100K users, 1M invoice records, ~500 reads/sec, ~50 writes/sec
```
