---
name: schema-design
category: coding
skills: [database-designer, database-migrations, backend-patterns]
mode: plan
estimated_tokens: 600
---

# Database Schema Design

## When to Use
Use before writing migration code, when designing a new database schema or extending an existing one.

## Template

```
Design the database schema for the feature below. Optimize for the actual query patterns rather than theoretical normalization.

**Feature:**
{{what_the_feature_stores_and_retrieves}}

**Database:**
{{PostgreSQL|MySQL|SQLite|MongoDB — or say "recommend one"}}

**ORM/Query builder:**
{{Drizzle|Prisma|Knex|TypeORM|raw SQL — or say "recommend one"}}

**Expected scale:**
{{rough_numbers — rows, reads_per_second, writes_per_second}}

Step 1: Identify entities.
- List every entity (table or collection).
- Choose the primary key strategy (UUID, auto-increment, CUID) and say why.
- Map relationships: 1:1, 1:N, N:N (with junction tables).
- Decide which tables need timestamps (created_at, updated_at, deleted_at).

Step 2: Design columns.
For each table:
- Column name, type, nullable, default, constraints.
- Indexed columns, each with the query it serves.
- Foreign keys with ON DELETE behavior (CASCADE, SET NULL, RESTRICT).
- Check constraints for data integrity.

Step 3: Analyze query patterns.
- List the five most frequent queries the schema will serve.
- For each, name the joined tables and the columns in WHERE and ORDER BY.
- Design indexes for these queries.
- Flag N+1 query risks.

Step 4: Plan migrations.
- If extending an existing schema, give the migration sequence.
- State whether each migration can run without downtime (no long locks on large tables).
- Give the rollback for each migration step.
- Note any data backfill.

Step 5: Output.
- SQL CREATE TABLE statements, or the ORM schema definition.
- Migration files in the project's existing migration format.
- Seed data for development and testing.
- TypeScript types that mirror the schema.

Do not run migrations against a shared or production database; produce the files for review.
```

## Tips
- The `database-designer` skill analyzes an existing schema; `database-migrations` covers zero-downtime migration patterns.
- Add soft delete (deleted_at) unless there is a specific reason not to, such as data-retention rules.
- Design for the read patterns; in most applications reads far outnumber writes.

## Example

```
Design the database schema for the feature below. Optimize for the actual query patterns rather than theoretical normalization.

**Feature:**
Multi-tenant SaaS billing — organizations have subscription plans, usage metering, and invoice history. Users belong to organizations. Plans have feature limits.

**Database:** PostgreSQL
**ORM/Query builder:** Drizzle
**Expected scale:** 10K orgs, 100K users, 1M invoice records, ~500 reads/sec, ~50 writes/sec
```
