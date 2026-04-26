---
name: ccc-memory
description: "Two-tier persistent memory for Claude Code sessions. Layer 1 is CLAUDE.md (always-loaded context). Layer 2 is a memory/ directory with dated notes, decisions, and corrections that load on demand. Use when you need knowledge that survives across sessions — preferences, architectural decisions, gotchas, learnings. Pairs with /save-session (session snapshots) and /resume-session (session resume)."
model: sonnet
effort: medium
---

# /ccc-memory — Two-Tier Persistent Memory

Claude Code sessions forget everything at the end. Memory makes the important bits stick.

## When to use

- After resolving a tricky bug — save the root cause so next time the same class of issue is faster
- After making an architectural decision — record the reasoning so future-you doesn't re-argue with past-you
- When a project grows beyond one CLAUDE.md section — split into a memory/ tree
- Before a big /clear when you want to carry forward a specific insight

## Not for

- Session-scoped state that ends with this session — use /save-session for that
- Searchable cross-project knowledge — use /ccc-recall for that
- Per-skill notes — put those inline in the skill's body

## How it works

Two layers, different load patterns:

### Layer 1 — CLAUDE.md (always-loaded)

Every file Claude reads in a session is relative to CLAUDE.md. Put here:
- Project type + tech stack (once)
- Key paths + conventions
- Commands Kevin runs daily
- Cross-cutting style rules

Keep it tight — everything here costs context on every turn.

### Layer 2 — memory/ directory (on-demand)

Dated markdown files for things that don't belong in the always-loaded layer:
- `memory/YYYY-MM-DD-{slug}.md` — daily learnings, decisions, corrections
- `memory/decisions/` — one file per big call (why we picked Postgres over Mongo)
- `memory/gotchas/` — known footguns (tailwind v4 syntax, framer-motion v11 rename)
- `memory/preferences.md` — curated long-term prefs that didn't fit CLAUDE.md

Load on demand by reading the specific file — Claude sees only what's needed.

## Process

1. **Start of session:** `ls memory/` (if exists) → skim filenames → read the few that matter for today's task
2. **When you learn something:** add a dated entry to `memory/YYYY-MM-DD-{slug}.md`
3. **Corrections from Kevin:** append to `memory/preferences.md` with date — corrective framing ("You should X — are you doing it?")
4. **Weekly (or before big work):** consolidate — move frequently-referenced items from memory/ into CLAUDE.md; prune stale dated notes

## Example

After Kevin says "no more /ccc-style: prefix, use /ccc-*" — you write:

```
memory/2026-04-23-ccc-prefix-dash.md

## Correction: /ccc- not /ccc:

Date: 2026-04-23
Source: Kevin (chat)

All skill names use dash prefix /ccc-* not colon /ccc:*. Colon form is stale
from v3. Check: grep -rn "/ccc:" should return zero results outside CHANGELOG.

Test that guards this: commander/tests/dispatch-security.test.js — runKc('ccc:') rejected.
```

## Depends on

- `tasks/memory/` or `memory/` directory in project root (create if missing)
- Project CLAUDE.md as Layer 1

---

Adapted from `knowledge-work-plugins/productivity/memory-management` under Apache-2.0 license. Fitted to CC Commander's save-session / resume-session pattern.
