---
name: ccc-review
description: "Audit the current branch, security posture, performance hot paths or the whole project; routes to /commander:ccc-deep-review, built-in /code-review or a specialist agent and writes a severity-rated report to tasks/reviews/. Use when the user asks for a code review, PR review, audit or /ccc-review."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
  - Workflow
  - Agent
  - AskUserQuestion
  - TodoWrite
  - ReportFindings
  - mcp__ccd_session__spawn_task
  - mcp__ccd_session__mark_chapter
argument-hint: "[diff | quick | ultra | security | perf | xray | free-form question]"
model: opus
effort: medium
---

# /ccc-review — audit before you ship

**CC Commander** · /ccc-review · one audit lens, verified findings, one report in `tasks/reviews/`.

Broad reviews run workflow-first: fan out by dimension, then adversarially verify every finding before it is reported (`rules/workflow-first.md`). The user's selected model is preserved; agents use their own frontmatter tier.

## When to use / when not to

- Use before opening or merging a PR, after a risky change, or when the user asks "is this safe / fast / correct?".
- Use `/ccc-xray` for a whole-project health scorecard (this skill routes there for the x-ray lens).
- Use `/ccc-qa` to run test suites and coverage; this skill reads code, it does not run the suite.
- Use `/ccc-security` for a dedicated security programme (threat model, hardening); the security lens here is a scoped audit.

## What happens

### 1. Read the review context

Run these in parallel with Bash; treat a failure as "unknown", not an error:

```bash
git rev-parse --abbrev-ref HEAD
git rev-list --count main..HEAD 2>/dev/null
git diff --shortstat main..HEAD 2>/dev/null
git status --porcelain 2>/dev/null | wc -l
test -d .github/workflows && echo yes || echo no
```

If the default branch is not `main` (`git symbolic-ref --short refs/remotes/origin/HEAD` names another), use that as `<base>` everywhere below.

Render one line:

> 🧭 Branch `<branch>` · `<N>` commits ahead of `<base>` · `<X>` files / `<Y>` lines changed · CI `<yes|no>`

With no diff and no uncommitted changes: "🧭 No diff vs `<base>` — the whole-project x-ray fits best."

### 2. Pick the lens

An argument skips this picker (see Arguments). Otherwise read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-review.json` for the option data and ask with AskUserQuestion (Codex: a plain-text question listing the same four):

- question: "What should I audit?" · header: "Review" · multiSelect: false
- 📊 Review current branch — diff vs `<base>`, PR-quality findings before you open a PR
- 🔐 Security audit — OWASP Top 10, secrets, dependency audit, severity-rated
- ⚡ Performance — hot paths, N+1 queries, unbounded work, bundle size
- 🩻 Full project x-ray — health scorecard across code, docs, tests, deps, CI

Put the recommended option first and mark it 🟢:

| Signal from step 1 | 🟢 option |
|---|---|
| Commits ahead of `<base>` or uncommitted changes | Review current branch |
| `package.json`, a lockfile, or SQL/ORM files in the diff | Security audit |
| `*/api/*`, `*/routes/*` or other request-path files in the diff | Performance |
| Empty diff | Full project x-ray |

### 3. Pick the engine (branch review only)

Ask with AskUserQuestion:

- question: "Which review should run on this branch?" · header: "Engine"
- 🟢 Commander deep review — `/commander:ccc-deep-review`: four weighted dimensions, every finding refuted or confirmed, report written to `tasks/reviews/`
- Built-in /code-review — Claude Code's native review of the diff; fastest, findings reported in the session
- /code-review ultra — multi-agent cloud review; you type it yourself, it runs outside this session

For `/code-review ultra`, reply with the exact command to type (`/code-review ultra`) and stop: this skill never triggers a cloud review on the user's behalf.

### 4. Mark the chapter

When the session exposes `mcp__ccd_session__mark_chapter`, call it with `title: "Code review: <branch>"` and `summary: "<lens> audit on <branch>"`. Skip silently when absent.

### 5. Run the audit

Create the report directory first: `mkdir -p tasks/reviews`.

**Branch review, deep engine.** Run the plugin workflow `/commander:ccc-deep-review` with the Workflow tool:

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-deep-review.workflow.js",
  args: { base: "<base>" }
})
```

It reviews security 35%, correctness 25%, performance 25%, maintainability 15%, and returns only verified findings with a verdict.

**Branch review, built-in engine.** Invoke the built-in review with the Skill tool: `skill: "code-review"`, `args: "--max-findings all"` (a number caps the list). Carry its verdicts into the report in step 7; a finding it returns without a verdict is PLAUSIBLE.

**Security audit.**

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-audit.workflow.js",
  args: { dimensions: ["security", "deps"] }
})
```

**Performance audit.**

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-audit.workflow.js",
  args: { dimensions: ["performance"] }
})
```

**Full project x-ray.** Say "Loading `/ccc-xray` — full health scorecard across code, docs, tests, deps, CI." and continue as if the user had invoked `/ccc-xray`. Stop here.

**Fallback when Workflow is unavailable** (older client or tool not allowed). Dispatch one specialist with the Agent tool, `run_in_background: true`, `effort: "high"`:

| Lens | Agent | Task |
|---|---|---|
| Branch | `reviewer` | Four-dimension review (security 35 / performance 25 / correctness 25 / maintainability 15) of `git diff <base>...HEAD`; severity-grouped findings with `file:line` and a one-line fix |
| Security | `security-auditor` | OWASP Top 10 sweep of the diff, or the whole codebase when there is no diff: secrets in source, injection, XSS, authn/authz, insecure deserialization, SSRF, path traversal; run `npm audit` or `pip-audit` when the manifest exists; CWE ids |
| Performance | `performance-engineer` | N+1 queries, quadratic work in hot paths, unbounded loops or queries, missing indexes, leaks; bundle size when `.next/`, `dist/` or `build/` exists; label each impact estimated or measured |

If the Agent tool does not list the plugin agent, use `general-purpose` and make its first instruction "Read `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md` and follow it." Each agent returns findings as JSON (`title`, `severity`, `file`, `line`, `evidence`, `fix`) and writes nothing.

Then emit one progress card and wait for the completion notification:

> 🔍 Audit running in the background — `<lens>` on `<branch>`. Findings land at `tasks/reviews/ccc-review-<YYYYMMDD>-<lens>.md`.

When it returns, dispatch one fresh refute agent (verifier ≠ worker): "Adversarially verify these findings. Try to refute each from the actual code. Mark CONFIRMED only when the code proves it; otherwise PLAUSIBLE; drop anything you refute." The workflows already verify, so skip this pass for them.

Codex: replace the workflow with `codex review --base <base>` (or `codex review --uncommitted` when nothing is committed yet) for the branch lens, and `codex exec --json` with the agent task above for the security and performance lenses.

### 6. Report findings

- When the harness offers `ReportFindings`, call it once with every surviving finding ranked most-severe first: `file`, `line`, `summary`, `short_summary`, `failure_scenario`, `category`, `verdict` (`CONFIRMED` or `PLAUSIBLE`). Do not also print the findings as text; the reply carries counts and the report path.
- Otherwise list them in the reply grouped by severity (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low, ℹ️ Nit), each as `path:line` — issue — verdict — fix.

### 7. Write the report

Write `tasks/reviews/ccc-review-<YYYYMMDD>-<lens>.md` using [references/output-format.md](references/output-format.md). Never overwrite an earlier report; append `-2`, `-3` for a second run the same day. `/ccc-ship` reads this directory.

### 8. Turn blockers into actions

- For each CONFIRMED 🔴 Critical or 🟠 High finding, when `mcp__ccd_session__spawn_task` is exposed, spawn one chip: `title` an imperative under 60 characters (`Fix SQL injection in src/auth.ts:42`); `prompt` self-contained with path, line, issue, CWE/OWASP id when relevant, and fix direction (the new session has no memory of this one); `tldr` one or two plain sentences.
- PLAUSIBLE blockers stay in the report marked "confirm before acting"; they never become chips.
- 🟡 Medium, 🟢 Low and ℹ️ Nit findings go to TodoWrite only.
- Without spawn_task (CLI, Codex), list the blocker fixes as numbered next actions in the report.

Close the chapter: `mark_chapter` with `title: "Review complete"`, `summary: "<N> findings — <B> blocking"`.

## Arguments

| Argument | Action |
|---|---|
| none | Steps 1–8 with both pickers |
| `diff` | Branch lens, deep engine; skip both pickers |
| `quick` | Branch lens, built-in `/code-review` |
| `ultra` | Reply with `/code-review ultra` for the user to type; stop |
| `security` / `perf` | That lens; skip the picker |
| `xray` | Route to `/ccc-xray` |
| `status` | Report the newest file in `tasks/reviews/`: lens, finding count, blocker count, path |
| anything else | Free-form audit question: confirm scope with one AskUserQuestion (🟢 branch diff · whole repo · a named path), then run the branch lens on that scope |

## Done when

- The report file exists: `ls -l tasks/reviews/ccc-review-<YYYYMMDD>-<lens>*.md` prints it (skipped only for `ultra` and `xray`).
- Every finding in it carries a verdict, and its counts match what step 6 reported.
- The reply states lens, branch, total findings, blocking count and the report path.

## Guardrails

- Never edit source code during a review; fixes happen in the spawned or follow-up session.
- Never trigger `/code-review ultra` or any cloud review for the user; it is user-initiated.
- Never report an unverified finding as CONFIRMED, and never turn a PLAUSIBLE one into a chip.
- Never offer more than four lenses in the picker, and never delete earlier reports.
- Run long audits in the background (workflow or `run_in_background: true`); never block the session on an inline sweep.

## See also

- `/ccc-xray` — whole-project health scorecard
- `/ccc-qa` — run the suites, coverage delta, flaky tests
- `/ccc-security` — deeper security work
- `/ccc-ship` — reads `tasks/reviews/` before release

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
