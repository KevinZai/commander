---
name: ccc-makeover
description: "CCC domain — design refresh and project health overhaul — 3 skills in one. X-Ray audit, automated makeover swarm, and report card scoring."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
tags: [CCC domain, audit, design, makeover, xray, health-score]
---

# ccc-makeover

> Load ONE skill. Get the full project makeover pipeline. Audit → score → fix — in one pass.

CCC mega-skill domain router for project health and design refresh. Runs a structured xray audit, scores the project across 6 dimensions, then dispatches a makeover swarm to apply the highest-impact fixes.

## Sub-Skills

| Sub-Skill | Focus |
|-----------|-------|
| `xray` | Full project health scan — 6 dimensions, 0-100 score, maturity level (1-5), prioritized skill recommendations |
| `makeover` | Auto-apply top xray recommendations — runs recommended skills in order, tracks before/after score delta |
| `report-card` | Health reporting — formatted score card with per-dimension bars, maturity level, and improvement history |

## When to Use

- "Audit this project" / "How healthy is this codebase?"
- "Fix the top issues in this project automatically"
- "Give me a health score" / "Project report card"
- Starting work on an unfamiliar codebase
- Before a release — catch gaps in security, testing, DevOps, docs
- After a sprint — measure improvement over time

## How It Works

1. Describe your goal — audit, fix, or score
2. This router identifies the right sub-skill:
   - Want a scan? → `xray`
   - Want to auto-fix? → `makeover` (runs `xray` first, then applies fixes)
   - Want a formatted report? → `report-card`
3. The sub-skill executes with domain-specific expertise

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Audit my project" / "Health check" / "What's wrong?" | `xray` | `makeover` (fixes, not just scans) |
| "Fix the top issues" / "Auto-improve" / "Apply recommendations" | `makeover` | `xray` (scan only) |
| "Show me my score" / "Report card" / "How did we improve?" | `report-card` | `xray` (detailed recommendations, not summary) |

## Standard Makeover Flow

```
xray → review top 5 recommendations → makeover → report-card
```

1. `xray` — scan current project state, get health score and ranked recommendations
2. `makeover` — apply top N fixes (default: 5, use `--auto` for unattended mode)
3. `report-card` — show before/after score delta and remaining gaps

## Scan Dimensions (xray)

| Dimension | What It Checks |
|-----------|---------------|
| Security | Secrets exposure, lockfiles, dependency age |
| Testing | Coverage, E2E presence, test file count |
| DevOps | CI/CD pipeline, Docker config, deploy setup |
| Quality | Linting, formatting, file size limits |
| Documentation | README, CLAUDE.md, API docs |
| Architecture | Error handling, input validation, modularity |

## Quick Start

Just invoke `/ccc-makeover` and describe what you need. For a full automated overhaul:

```
/ccc-makeover --auto
```

For a dry run (recommendations only, no changes):

```
/ccc-makeover --dry-run
```
