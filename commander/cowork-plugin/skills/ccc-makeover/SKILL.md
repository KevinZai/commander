---
name: ccc-makeover
context: fork
description: CCC domain — design refresh and project health overhaul — 3 skills in one. X-Ray audit, automated makeover swarm, and report card scoring. Wraps /ultrareview (v2.1.111 native) for deep analysis.
allowed-tools:
  - Read
---

# ccc-makeover

> Load ONE skill. Get the full project makeover pipeline. Audit → score → fix in one pass.

**Built on `/ultrareview`** (v2.1.111 native) — the `xray` sub-skill wraps `/ultrareview` for deep multi-dimensional analysis, extending it with the CCC scoring framework.

## Sub-Skills

| Sub-Skill | Focus |
|-----------|-------|
| `xray` | Full project health scan — 6 dimensions, 0-100 score, maturity level (1-5), prioritized recommendations |
| `makeover` | Auto-apply top xray recommendations — runs xray first, applies fixes, tracks score delta |
| `report-card` | Health reporting — formatted score card with per-dimension bars and improvement history |

## Health Dimensions (xray)

1. **Security** — vulnerability exposure, secrets, dependency health
2. **Testing** — coverage, test quality, CI integration
3. **DevOps** — deployment, monitoring, incident readiness
4. **Code Quality** — complexity, duplication, tech debt
5. **Documentation** — coverage, accuracy, onboarding clarity
6. **Performance** — bundle size, query efficiency, load times

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Audit my project" / "Health check" | `xray` |
| "Fix the top issues automatically" | `makeover` (runs xray first) |
| "Show my score" / "Report card" | `report-card` |

## Standard Makeover Flow

1. `xray` → scan and score across 6 dimensions
2. Review prioritized recommendations (P0–P3)
3. `makeover` → auto-applies P0 and P1 recommendations in order
4. `report-card` → before/after score comparison
5. Repeat each sprint — score should trend up

## When to Use

- Starting work on an unfamiliar codebase
- Before a production release — catch gaps before they ship
- After a sprint — measure improvement over time
- When the team asks "how healthy is our codebase?"

## When to invoke this skill

**Example 1**
- user: audit this project and tell me what's wrong
- assistant: Loads ccc-makeover and runs xray — 6-dimension health scan with 0-100 score, maturity level 1-5, and prioritized skill recommendations.

**Example 2**
- user: automatically fix the top issues in this codebase
- assistant: Loads ccc-makeover and runs makeover — xray first, then auto-applies highest-impact recommendations in order with before/after score delta.

**Example 3**
- user: show me a health score report card for this project
- assistant: Loads ccc-makeover and runs report-card — formatted score card with per-dimension bars, maturity level, and improvement history.
