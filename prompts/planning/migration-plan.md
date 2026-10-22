---
name: migration-plan
category: planning
skills: [database-migrations, ccc-plan, ccc-careful]
mode: plan
estimated_tokens: 700
---

# Migration Plan

## When to Use
Use when migrating a database schema, API version, framework or other component where data integrity and minimal downtime matter. The template produces a plan in which every step is reversible. It plans the migration; it does not run it.

## Template

```
Create a migration plan with no data loss and minimal downtime. Every step must have a tested rollback. Do not run any migration, write to a shared database, or send any message while planning.

**What is being migrated:**
{{e.g., database schema change, API v1 to v2, framework upgrade, service extraction}}

**Current state:**
{{describe_the_current_system}}

**Target state:**
{{describe_the_desired_end_state}}

**Data at risk:**
{{how_much_data_and_how_critical — e.g., "5M user records, production financial data"}}

**Downtime tolerance:**
{{zero|seconds|minutes|hours — and the maintenance window, if any}}

Phase 1: Assessment
- Read the current schema or code with Read.
- Find every consumer of the thing being migrated with Grep and list them with file paths.
- List every breaking change between the current and target state.
- Estimate the data volume affected.

Phase 2: Strategy
Choose one and justify it against the downtime tolerance:
- Expand-contract (add new, migrate, remove old): safest for schema changes.
- Blue-green: run old and new in parallel, then switch traffic.
- Strangler fig: replace the old system incrementally.
- Big bang: scheduled downtime and a single cutover; use only when the others do not fit.

Phase 3: Step-by-step plan
For each step give:
1. Action: exactly what happens (SQL statement, code change, config change).
2. Verification: the query or command that confirms it worked.
3. Rollback: the exact command that undoes it.
4. Duration: estimated time.
5. Risk: what could go wrong.

Phase 4: Testing
- Write the migration as a script that runs against a test database.
- Run it on a copy of production-scale data.
- Run the rollback on the migrated copy and confirm the original state returns.
- Confirm the application works against both the old and new schema during the transition.

Phase 5: Execution checklist (for the person running the migration)
- [ ] Backup taken and a restore verified
- [ ] Migration tested on staging with production-scale data
- [ ] Rollback tested and confirmed
- [ ] Monitoring dashboards open
- [ ] Affected parties notified (by the owner, with their approval)
- [ ] Explicit go-ahead to run against production
- [ ] Execute the migration
- [ ] Run the verification queries and record their output
- [ ] Watch error rates for 30 minutes
- [ ] Mark the migration complete, or roll back

Phase 6: Cleanup (after success)
- Remove backward-compatibility code.
- Drop old columns or tables after the grace period.
- Update documentation.
- Archive the migration scripts.
```

## Tips
- Turn on `/ccc-careful` before any step that touches production data; it confirms mutations and refuses destructive commands.
- The `database-migrations` skill covers common migration patterns and tooling.
- For a migration with a high blast radius, delegate a review of the plan to the `architect` subagent with the Agent tool; it routes to the `fable` tier. Otherwise the session's selected model is kept.
- Never drop a column and add its replacement in the same migration; expand first, contract later.

## Example

```
Create a migration plan with no data loss and minimal downtime.

**What is being migrated:**
Splitting the `users` table into `users` (auth) and `profiles` (application data). Foreign keys from 12 other tables reference users.id.

**Current state:**
A single `users` table with 47 columns and 2.3M rows on PostgreSQL

**Target state:**
`users` (id, email, password_hash, created_at) plus `profiles` (user_id FK, display_name, avatar, preferences, ...)

**Data at risk:** 2.3M production user records
**Downtime tolerance:** Zero; the product runs around the clock
```
