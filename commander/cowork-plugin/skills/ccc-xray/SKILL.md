---
name: ccc-xray
description: "Project health scorecard — scans current repo across 7 dimensions (quality, docs, tests, deps, security, perf, CI) and returns a markdown table with 0-100 scores + click-to-fix chips. Use when the user types /ccc-xray, /ccc xray, says 'scan this project', 'audit my repo', 'project health', 'what should I fix first', or wants a one-glance scorecard."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - mcp__ccd_session__spawn_task
argument-hint: "[quick | full | security | deps | perf]"
---

# /ccc-xray — Project Health Scorecard

Scan this repo and return a scorecard. Click-first UX — the user never types a number.

Promoted from `commands/ccc-xray.md` (legacy slash command).

## Response shape (EVERY time)

Output these three sections in order.

### 1. Brand header

```
**CC Commander** · X-Ray Scanner · [Docs](https://cc-commander.com)
```

### 2. Context strip (one line)

Run in parallel via a single Bash call:
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` → branch
- `git ls-files | wc -l` → file count
- Detect stack: presence of `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod`

Render:
> 🔬 Target: `<branch>` · <N> files · stack: <detected> · ready to scan.

If not a git repo: "🔬 Not a git repo — pick a scan scope below, I'll run shallow checks."

### 3. Scope picker — `AskUserQuestion`

Call `AskUserQuestion` with 4 options (never list numbered options as text):

```
question: "What depth?"
header: "X-Ray Scan"
multiSelect: false
options:
  - label: "⚡ Quick scan (5 areas)"
    description: "Quality, docs, tests, deps, security. ~20s."
    preview: "Recommended for most repos — trims perf + CI."
  - label: "🔬 Full scan (7 areas)"
    description: "Adds performance + CI. ~45s."
    preview: "Use when prepping for a release or new-to-repo onboarding."
  - label: "🔐 Focus: security"
    description: "npm audit + secrets scan + dep age only."
    preview: "Fastest path to 'am I leaking secrets?'"
  - label: "📦 Focus: deps"
    description: "Outdated deps, lockfile hygiene, duplicate packages."
    preview: "Use before a dep bump PR."
```

Prepend ⭐ to Quick scan by default — it's the recommended starting point.

## Running the scan

After user picks, run checks in parallel via a single Bash call. Each check is cheap + silent-on-failure:

| Area | Check (Bash) |
|------|--------------|
| Quality | `find . -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' \) -not -path './node_modules/*' \| wc -l` (size spread) |
| Docs | Test for `README.md`, `CLAUDE.md`, `CHANGELOG.md` presence |
| Tests | `find . -path '*/tests/*' -o -path '*/__tests__/*' -o -name '*.test.*' \| head -50 \| wc -l` |
| Deps | `npm outdated --json 2>/dev/null \|\| true` (or `pip list --outdated`) |
| Security | `npm audit --json 2>/dev/null \|\| true` (or `pip-audit -f json`) |
| Performance | bundle-size heuristic: `du -sh dist 2>/dev/null` + check for missing memoization patterns |
| CI | Presence of `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/` |

Translate each result to a 0-100 score with the rubric:
- 90-100: 🟢 healthy
- 70-89: 🟡 acceptable
- 50-69: 🟠 needs attention
- 0-49: 🔴 critical

## Scorecard output (markdown table)

Render this shape:

```
### 🔬 X-Ray Report — <repo-name>

| Area | Score | Top finding | Fix |
|------|-------|-------------|-----|
| 🧹 Code quality | 🟢 88 | 2 files >800 lines | Spawn `/ccc-makeover` |
| 📚 Docs | 🟡 72 | CHANGELOG stale (14d) | Spawn docs-update task |
| 🧪 Tests | 🟠 54 | Coverage 41% | Run `/tdd` on missing modules |
| 📦 Deps | 🟡 70 | 4 minor updates pending | Run `npm outdated` |
| 🔐 Security | 🟢 91 | Clean | — |
| ⚡ Performance | 🟢 85 | Bundle 420 KB | — |
| 🚢 CI | 🔴 20 | No `.github/workflows/` | Spawn CI setup task |

**Overall: 66 · 🟠 needs attention · fix CI first.**
```

## Post-scorecard: spawn fix offers

For every LOW-scoring row (🟠 or 🔴), append a "Fix it?" chip via `mcp__ccd_session__spawn_task`:

Example (pseudocode):
> Spawn a background task to: "Set up GitHub Actions CI for this <stack> repo — test + lint + deploy. See `.github/workflows/` conventions."

Each chip is ONE spawn_task call. Do NOT auto-execute — only offer. User clicks to spawn.

For 🟢/🟡 rows: no chip, just the score row.

## Priority rule (single recommendation line)

At bottom, state **which area to fix first** based on impact × effort:
- If 🔴 Security → always first (blocks release)
- Else if 🔴 CI and repo has no deploy → CI first (unlocks everything)
- Else lowest score wins

Output: `**🎯 My call: fix <area> first — <one-line rationale>.**`

## Argument handling

- `/ccc-xray quick` → skip picker, run Quick scan directly
- `/ccc-xray full` → skip picker, run Full scan directly
- `/ccc-xray security` / `deps` / `perf` → skip picker, run focused scan
- `/ccc-xray` bare → show the picker

## Anti-patterns — DO NOT

- ❌ Run scans BEFORE user picks scope (wastes tokens on rejected depth)
- ❌ Render 7 rows when Quick scan was selected (show 5)
- ❌ Auto-spawn fix tasks without offering — chip pattern is click-first
- ❌ Output ASCII banners or box-drawing — plain markdown tables render everywhere
- ❌ Hardcode repo name — read from `git rev-parse --show-toplevel` basename
- ❌ Block waiting for slow network audits — use `|| true` fallbacks, never fail the whole scan

## Brand rules

- Emoji-forward, scan-friendly (PM Consultant voice)
- Lead with the scorecard table, not narrative
- One recommendation line at the end, always
- ⭐ marks the recommended option in every picker

## Cost analysis (NEW in beta.11+)

When the user asks for `/ccc-xray cost` or `/ccc-xray full` and a `/cost` transcript is available, parse it via the bundled utility at `lib/cost-parser.js` (ESM, side-effect-free):

```js
import { parseCostOutput } from './lib/cost-parser.js';
const report = parseCostOutput(rawCostText);
// → { totalUsd, models, cacheHitRate, turns, avgUsdPerTurn, skipped, raw }
```

Use the result to render a "💰 Cost" row in the scorecard:
- `🟢` if `cacheHitRate ≥ 0.5` and `avgUsdPerTurn < $0.10`
- `🟡` if `cacheHitRate ∈ [0.2, 0.5)` or `avgUsdPerTurn ∈ [$0.10, $0.50)`
- `🟠` if `cacheHitRate < 0.2` or `avgUsdPerTurn ≥ $0.50`

The parser is liberal: malformed lines land in `skipped[]` (not thrown), empty input returns a zero-state object. Safe to call on any text the user pastes.

## Tips for the agent executing this skill

1. Whole flow is ≤3 turns: context+picker → user clicks → parallel scan → scorecard + chips.
2. Run ALL checks in a single Bash call (chained with `;`) to save turns.
3. If a check fails (network down, no npm), show the row as `⚪ n/a` — don't crash.
4. Keep the scorecard table under ~15 rows total — summarize sub-findings in "Top finding" column.

---

**Bottom line:** pick scope → scan in parallel → one markdown table → one recommendation → chips for 🟠/🔴 rows. User clicks to fix.
