---
name: ccc-pro-migration
description: "[C:pro] — Zero-downtime schema versioning, backfills, and safe deploy patterns · Pro tier only"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
tier: pro
status: scaffolded
target_release: v4.2
---

## What this pack will do

- Generate expand-contract migration plan for any schema change (add → backfill → switch → drop)
- Scaffold zero-downtime column rename: dual-write phase → backfill → cutover → cleanup
- Generate zero-downtime index creation scripts (CREATE INDEX CONCURRENTLY patterns)
- Scaffold large-table backfill runner: chunked updates with rate limiting and progress tracking
- Generate migration safety checklist: lock acquisition risk, rollback path, estimated duration
- Scaffold blue-green schema deploy with feature-flag gate
- Add migration CI gate: blocks deploy if migration is unsafe (table locks, missing rollback)
- Generate rollback scripts alongside every forward migration (auto-paired)
- Scaffold data type coercion migrations: int→bigint, varchar→text, nullable→not null
- Add foreign key deferral strategy for large cross-table migrations
- Generate Drizzle ORM migration wiring (schema push + migration file management)
- Generate Prisma migration wiring with shadow database support
- Scaffold multi-database migration sequencing: primary + replicas + read-replica lag checks
- Add post-migration verification queries: row counts, null checks, index health

## Why Pro-only

Zero-downtime migrations are one of the highest-risk operations in production databases. The wrong index creation or column rename can lock a production table for minutes. The patterns here represent hard-won production experience with PostgreSQL, MySQL, and SQLite at scale — not documentation copy-paste.

## Coming in v4.2

This skill is scaffolded. Full implementation ships in v4.2. Sign up at [cc-commander.com/pro](https://cc-commander.com/pro) to get notified and receive early access.

## Tier check

This skill checks `isPro()` from `commander/cowork-plugin/lib/license.js` before running. If your license tier is `starter`, it surfaces an upgrade prompt and exits cleanly — no partial scaffolding, no silent failure.

## Reference

- [Pricing and tiers](https://cc-commander.com/pricing)
- [Free vs Pro comparison](https://cc-commander.com/free-vs-pro)
- [License activation](/plugin/license-activation)
