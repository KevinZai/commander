---
name: migration-plan
category: planning
skills: [database-migrations, plan, careful]
mode: plan
estimated_tokens: 700
---

# Migration Plan

## When to Use
When migrating a database schema, API version, framework, or any system component where data integrity and zero-downtime are critical. This template enforces a rollback-safe approach.

## Template

```
Create a migration plan with zero data loss and minimal downtime. Every step must be reversible.

**What is being migrated:**
{{e.g., database schema change, API v1 to v2, framework upgrade, service extraction}}

**Current state:**
{{describe_the_current_system}}

**Target state:**
{{describe_the_desired_end_state}}

**Data at risk:**
{{how_much_data, how_critical — e.g., "5M user records, production financial data"}}

**Downtime tolerance:**
{{zero|seconds|minutes|hours — and maintenance window if any}}

**Phase 1: Assessment**
- Read the current schema/code with the Read tool
- Identify all consumers of the thing being migrated (use Grep to find all references)
- List every breaking change between current and target state
- Estimate data volume affected

**Phase 2: Strategy selection**
Choose and justify one:
- **Expand-contract** (add new, migrate, remove old) — safest for schema changes
- **Blue-green** — run old and new in parallel, switch traffic
- **Strangler fig** — incrementally replace old with new
- **Big bang** — scheduled downtime, migrate everything at once (last resort)

**Phase 3: Step-by-step plan**
For each step:
1. **Action:** exactly what happens (SQL statement, code change, config change)
2. **Verification:** how to confirm it worked
3. **Rollback:** exact command to undo this step
4. **Duration:** estimated time
5. **Risk:** what could go wrong

**Phase 4: Testing**
- Write the migration as a script that can run against a test database
- Test the migration on a copy of production data
- Test the rollback on the migrated test data
- Verify application works against both old and new schema (during transition)

**Phase 5: Execution checklist**
- [ ] Backup taken and verified
- [ ] Migration tested on staging with production-scale data
- [ ] Rollback tested and confirmed working
- [ ] Monitoring dashboards open
- [ ] Communication sent to affected parties
- [ ] Execute migration
- [ ] Run verification queries
- [ ] Monitor error rates for 30 minutes
- [ ] Mark migration complete (or roll back)

**Phase 6: Cleanup (after success)**
- Remove backward-compatibility code
- Drop old columns/tables (after grace period)
- Update documentation
- Archive migration scripts
```

## Tips
- Use the `careful` skill to slow down and double-check each step before executing
- The `database-migrations` skill handles common migration patterns automatically
- Never drop a column and add a column in the same migration — always expand first, contract later

## Example

```
Create a migration plan with zero data loss and minimal downtime.

**What is being migrated:**
Splitting the monolithic `users` table into `users` (auth) and `profiles` (application data). Foreign keys from 12 other tables reference users.id.

**Current state:**
Single `users` table with 47 columns, 2.3M rows, PostgreSQL 15

**Target state:**
`users` table (id, email, password_hash, created_at) + `profiles` table (user_id FK, display_name, avatar, preferences, etc.)

**Data at risk:** 2.3M user records, production
**Downtime tolerance:** Zero — this is a 24/7 SaaS product
```
