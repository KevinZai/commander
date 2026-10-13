---
name: ccc-xray
description: "Score the current project 0-100 across security, testing, DevOps, quality, docs and architecture, assign a maturity level, and rank skill recommendations by impact. Use when you want a quick project health scan or a list of what to fix first."
---

# /ccc-xray — project health scan

**CC Commander** · /ccc-xray · a read-only scan of the current project that returns dimension scores, a maturity level and impact-ranked skill recommendations.

## Arguments

None. The scan always runs against the current working directory (`$PWD`).

## What happens

1. **Resolve the install.** The scanner ships with the CC Commander CLI as `commander/xray-report.js`:

   ```bash
   CCC_ROOT="$(cd "$(dirname "$(realpath "$(command -v ccc)")")/.." && pwd)"
   ```

   If `ccc` is not on `PATH`, set `CCC_ROOT` to the root of a CC Commander checkout (the directory that contains `commander/xray-report.js`). If neither exists, say the CLI is not installed, point to `/ccc-audit` for a manual audit, and stop. Shell state does not carry between Bash calls, so repeat the `CCC_ROOT=` line at the top of the step 2 command.

2. **Run the scan.** One call returns the structured result:

   ```bash
   CCC_ROOT="$(cd "$(dirname "$(realpath "$(command -v ccc)")")/.." && pwd)"
   node -e 'const r=require(process.argv[1]+"/commander/xray-report").generateReport(process.argv[2]);console.log(JSON.stringify({overall:r.health.overall,maturity:r.maturity,dimensions:r.health.dimensions,issues:r.health.issueCounts,recommendations:r.recommendations}))' "$CCC_ROOT" "$PWD"
   ```

   The scanner reads project signals in six dimensions:

   | Dimension | Signals |
   |---|---|
   | security | committed env secrets, lockfile presence, outdated dependencies |
   | testing | test files, coverage, E2E config |
   | devops | CI/CD workflows, Dockerfile, deploy config |
   | quality | lint, formatter and TypeScript config, oversized files |
   | docs | README, CLAUDE.md, CHANGELOG, API docs |
   | architecture | error handling, input validation, circular dependencies, monolith size |

   Each dimension starts at 100 and loses points per matching recommendation; the overall score is the average of the six. When the signal scanner cannot load, the script falls back to file-presence checks only; say so in the report. A non-zero exit or a stack trace means the scan failed: report the error text and stop rather than estimating scores.

3. **Read the maturity level** from the returned `maturity` object: 1 Initial (0–29), 2 Managed (30–54), 3 Defined (55–74), 4 Measured (75–89), 5 Optimizing (90–100).

4. **Render the report** from the actual JSON, never from memory:

   ```
   ### 🔬 X-Ray Report — <project directory name>

   **Health: <overall>/100 · Maturity <level> — <name>**

   | Dimension | Score | Issues |
   |---|---|---|
   | security | 🟡 73 | 1 |
   | docs | 🔴 48 | 2 |

   #### Recommendations (highest impact first)
   1. 🔴 HIGH · <explanation> — `/<skill>` · impact <score>
      Quick fix: <one concrete command or file to add>
   ```

   Score colors: 90–100 🟢, 70–89 🟡, 50–69 🟠, 0–49 🔴. Priority badges: priority 1–2 HIGH, 3 MED, 4 and above LOW. Sort recommendations by `score`, highest first. Give each one a quick-fix line derived from the finding (for example `/ccc-init` for a missing CLAUDE.md, or the CI workflow file to add for a missing pipeline). When `recommendations` is empty, say the project looks healthy across all six dimensions.

5. **Offer the next step.** When at least one HIGH recommendation exists, ask with AskUserQuestion (header "X-Ray next step", single select); in a surface without it, ask the same choices as one plain-text question:

   - 🟢 **Fix the top recommendation** — runs its skill now on the highest-impact finding.
   - **Show all quick fixes** — prints every quick-fix line as copyable commands; nothing runs.
   - **Done** — ends with the report only.

## Done when

- The scores, maturity level and recommendations in the report match the JSON from step 2.
- Every recommendation names its skill and a quick-fix line.
- No fix ran without the user choosing it in step 5.

## Guardrails

- Read-only: no file edits, no installs, no `npm audit fix` during the scan.
- Never print secret values the scan detects; report the path and kind only.
- Never invent a score for a dimension the script did not return.

## See also

- `/ccc-audit` — command-by-command audit with build, type and dependency checks.
- `/ccc-init` — add a CLAUDE.md when the docs score flags it missing.
