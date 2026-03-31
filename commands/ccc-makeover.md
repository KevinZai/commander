---
name: ccc-makeover
description: Auto-apply top X-Ray recommendations to improve project health score
---

# /ccc-makeover

Automatically apply the highest-impact recommendations from an X-Ray scan.

## What It Does

1. Runs `/ccc-xray` to get current health score and recommendations
2. Presents the top 5 recommendations sorted by impact
3. For each recommendation, offers to:
   - Run the recommended skill automatically
   - Skip to the next recommendation
   - Stop the makeover
4. Tracks improvements: shows before/after health score

## Usage

```
/ccc-makeover
```

## Options

- `--dry-run` -- show recommendations without applying
- `--auto` -- apply all recommendations without prompting
- `--max N` -- limit to N recommendations (default: 5)
- `--category CAT` -- focus on one dimension (security, testing, devops, quality, docs, architecture)

## Example Flow

```
Current Health: 42/100 (Maturity: 2 - Managed)

[1/5] No CLAUDE.md (impact: 80)
  -> Running /project-kickoff...
  -> Done. CLAUDE.md created.

[2/5] No test files (impact: 90)
  -> Running /tdd-workflow...
  -> Done. 12 test files created.

[3/5] No CI pipeline (impact: 85)
  -> Running /senior-devops...
  -> Done. .github/workflows/ci.yml created.

Updated Health: 71/100 (Maturity: 3 - Defined)
Improvement: +29 points
```
