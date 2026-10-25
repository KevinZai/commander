---
name: ccc-xray
description: "Project health scorecard: quality, docs, tests, deps, security, performance, CI and context cost, scored 0-100. Use for a repo audit or health check."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Workflow
  - AskUserQuestion
  - mcp__ccd_session__spawn_task
argument-hint: "[quick | full | security | deps | perf | cost | context]"
---

# /ccc-xray — scan, score, fix first

**CC Commander** · /ccc-xray · a scored health table for this repo and one recommendation for what to fix first.

## When to use / when not to

- Use for a repo health check, onboarding to an unfamiliar repo, release prep, or a "what is eating my context" inventory of installed plugins.
- Do not use for a single-file review (`/ccc-code-review`), a security threat model (`/ccc-security`), or a multi-reviewer branch pass (`/ccc-review`).
- This skill only reads. It never edits files; fixes are offered as opt-in tasks.

## What happens

1. **Context strip.** Run one Bash call:

   ```bash
   git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-git"
   basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
   git ls-files 2>/dev/null | wc -l
   ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null
   ```

   Render one line: `🔬 Target: <branch> · <N> files · stack: <detected> · ready to scan.` If it is not a git repo, say so and continue with shallow checks. Take the repo name from the `--show-toplevel` basename; never hardcode it.

2. **Pick the scope.** Map an argument straight to its scope and skip the picker: `quick`, `full`, `security`, `deps`, `perf`, `cost`, `context`. With no argument, ask the depth picker (see Decision points). Run no scan before the scope is chosen.

3. **Full scan through the audit workflow (preferred).** When the `Workflow` tool is available and the scope is Full, or a focused scope where verified findings matter, run the bundled audit workflow:

   ```js
   Workflow({
     scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-audit.workflow.js",
     args: { target: ".", dimensions: ["quality", "security", "performance", "deps", "tests", "docs", "ci"] }
   })
   ```

   The same workflow runs as `/commander:ccc-audit`. Dimension keys are exactly `quality`, `security`, `performance`, `deps`, `tests`, `docs`, `ci`; an unknown key is dropped silently, so pass `performance`, never `perf`. Subset `dimensions` to the chosen scope (security focus: `["security", "deps"]`). The workflow runs one finder per dimension, has a fresh skeptic try to refute each finding, and returns a scored scorecard. If `Workflow` is unavailable (older client, Codex, or not allowed), use step 4 for every area.

4. **Shallow scan (Quick scan and fallback).** Run every check for the chosen scope in one Bash call, each guarded with `2>/dev/null || true` so one failure never aborts the scan:

   | Area | Check |
   |------|-------|
   | 🧹 Quality | `git ls-files '*.ts' '*.js' '*.py' \| xargs wc -l \| grep -v ' total$' \| sort -rn \| head -5` (files over 800 lines) |
   | 📚 Docs | `ls README.md CLAUDE.md CHANGELOG.md` and `git log -1 --format=%cr -- CHANGELOG.md` |
   | 🧪 Tests | `git ls-files \| grep -cE '(^\|/)(tests?\|__tests__)/\|\.test\.\|\.spec\.'` |
   | 📦 Deps | `npm outdated --json` (or `pip list --outdated --format json`) |
   | 🔐 Security | `npm audit --json` (or `pip-audit -f json`) plus `git ls-files \| grep -E '\.env$\|\.pem$\|id_rsa'` |
   | ⚡ Performance | `du -sh dist build` (bundle-size heuristic) |
   | 🚢 CI | `ls -d .github/workflows .gitlab-ci.yml .circleci` |

   Quick runs Quality, Docs, Tests, Deps, Security. Full adds Performance and CI (when step 3 did not already cover them). A check that cannot run (no network, no npm) renders as `⚪ n/a`, never as a failure.

5. **Session cost row (`cost`, or Full when the user pastes `/cost` output).** Parse the pasted text with the bundled side-effect-free parser. Malformed lines land in `skipped[]`; empty input returns a zero-state object.

   ```bash
   cat <<'COST' | node --no-warnings --input-type=module -e 'const { parseCostOutput } = await import(process.argv[1]); let s = ""; process.stdin.on("data", d => s += d).on("end", () => console.log(JSON.stringify(parseCostOutput(s))));' "${CLAUDE_SKILL_DIR}/lib/cost-parser.js"
   <pasted /cost output>
   COST
   ```

   Result fields: `totalUsd`, `models`, `cacheHitRate`, `turns`, `avgUsdPerTurn`, `skipped`, `raw`. Score the 💰 Cost row: 🟢 when `cacheHitRate >= 0.5` and `avgUsdPerTurn < 0.10`; 🟡 when `cacheHitRate` is 0.2–0.5 or `avgUsdPerTurn` is 0.10–0.50; 🟠 when `cacheHitRate < 0.2` or `avgUsdPerTurn >= 0.50`.

6. **Plugin context cost row (`context`, or Full).** Inventory each enabled plugin's projected context cost with `claude plugin details <name>`. Take the plugin names from the namespaces of the plugin skills loaded in this session (`<plugin>:<skill>`) or from the `/plugin` manager; if neither gives a list, ask the user which plugins to inspect. Then run one guarded Bash call:

   ```bash
   for p in <plugin> <plugin>; do echo "== $p"; claude plugin details "$p" 2>/dev/null || echo "n/a"; done
   ```

   Read the token breakdown from that output as printed; do not assume a particular line label, column layout or machine-readable format. For each plugin, note the cost it reports as loaded into every session and, separately, any cost it reports as loaded only when a component is invoked. When a plugin's output gives no token figure, or the command is unavailable, that plugin is `n/a`; when no plugin yields a figure, the 🧠 Context row renders as `⚪ n/a`. For the largest contributor, quote its biggest per-component rows exactly as the output shows them. Score the 🧠 Context row on the summed every-session cost: 🟢 under 10k tokens, 🟡 10k–25k, 🟠 25k–50k, 🔴 over 50k. These thresholds are a Commander heuristic, not a platform limit; say so in the finding.

7. **Score and render.** Translate each result to 0–100: 90–100 🟢 healthy, 70–89 🟡 acceptable, 50–69 🟠 needs attention, 0–49 🔴 critical. Render exactly the rows for the chosen scope (Quick shows five), keep the table under 15 rows, and summarize sub-findings in the Top finding column:

   ```
   ### 🔬 X-Ray Report — <repo-name>

   | Area | Score | Top finding | Fix |
   |------|-------|-------------|-----|
   | 🧹 Code quality | 🟢 88 | 2 files over 800 lines | /ccc-makeover |
   | 🚢 CI | 🔴 20 | No .github/workflows/ | CI setup task |
   | 🧠 Context | 🟡 72 | 18k every-session; <plugin> ~9k | disable an unused plugin |

   **Overall: 66 · 🟠 needs attention**
   ```

8. **Fix-first call.** End with one line, `**🎯 My call: fix <area> first — <one-line rationale>.**`, chosen in this order: a 🔴 Security row always wins (it blocks release); else a 🔴 CI row when the repo has no deploy path (it unlocks everything else); else the lowest score.

9. **Offer fixes, never run them.** For each 🟠 or 🔴 row, offer one fix task with one `mcp__ccd_session__spawn_task` call (Desktop), for example "Set up GitHub Actions CI for this <stack> repo: test and lint on every PR." The user clicks to start it. Where `spawn_task` is unavailable (CLI, Codex), list the same prompts as text and ask the follow-up picker. 🟢 and 🟡 rows get no offer.

## Decision points

Depth picker (`AskUserQuestion`, header "X-Ray Scan", single select):

- 🟢 **⚡ Quick scan (5 areas)** — quality, docs, tests, deps, security; about 20 s; right for most repos.
- **🔬 Full scan (all areas)** — adds performance, CI, session cost and plugin context cost through the audit workflow; for release prep or onboarding.
- **🔐 Focus: security** — audit, secrets scan and dependency age only; fastest answer to "am I leaking secrets?".
- **📦 Focus: deps** — outdated packages, lockfile hygiene, duplicates; run before a dependency bump.

Follow-up picker when spawn chips are unavailable: 🟢 **Start the fix-first task** (runs it in this session) · **Show all fix prompts** (copyable text) · **Done**.

In Codex or any surface without `AskUserQuestion`, ask the same choices as one plain-text question.

## Done when

- The scope the user chose is the scope that ran (five rows for Quick).
- Every row has a score or `⚪ n/a` and a top finding; the overall line and the single 🎯 fix-first line are present.
- Every 🟠/🔴 row has exactly one fix offer, and no task started without a click.

## Guardrails

- Read-only: no file edits, no dependency installs, no `npm audit fix`.
- Never block on slow network audits; guard each check and mark it n/a.
- Never print secret values found by the secrets scan; report the path and type only.
- No ASCII banners or box drawing; plain markdown tables render everywhere.
- Keep the flow to three turns: context and picker, scan, scorecard and offers.

## See also

- `/ccc-review` — multi-reviewer pass on a branch or PR.
- `/ccc-security` — focused security audit and threat model.
- `/ccc-makeover` — act on a low quality score.
- `/ccc-usage` — spend and usage trends beyond one session.

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
