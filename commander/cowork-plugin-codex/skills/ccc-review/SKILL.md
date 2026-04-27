---
name: ccc-review
description: "CC Commander — audit current branch, security posture, performance hotpaths, or run full project x-ray. Spawns the matching specialist agent in the background; findings land at tasks/reviews/ as a severity-rated scorecard. Use when the user types /ccc-review, picks 'Review' from the /ccc hub, or says 'audit this', 'security review', 'perf review', 'x-ray the project'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
  - mcp__ccd_session__spawn_task
  - mcp__ccd_session__mark_chapter
argument-hint: "[audit type: diff | security | perf | xray]"
---

# /ccc-review — Audit your work

Click-first review flow. Four audit types, one specialist agent per pick, one scorecard artifact. User picks the lens, the agent works in the background, the markdown report lands in `tasks/reviews/`.

## Session markers

- At the START of review (after user picks an audit type): call `mcp__ccd_session__mark_chapter` with `title: "Code review: <branch>"` and `summary: "<audit-type> audit on <branch>"`.
- At COMPLETION (when the agent reports back or findings are surfaced): call `mcp__ccd_session__mark_chapter` with `title: "Review complete"` and `summary: "<N> findings — <blocker-count> blocking"`.

## Sidebar chips (spawn_task)

After the review agent completes and findings are known, spawn ONE `mcp__ccd_session__spawn_task` chip per **🔴 Critical** or **🟠 High** blocker — each chip is a self-contained action for a fresh session:

- `title`: imperative phrase under 60 chars (e.g., `"Fix SQL injection in src/auth.ts:42"`)
- `prompt`: self-contained — include file path, line number, issue summary, CWE/OWASP reference if applicable, and suggested fix direction. The spawned session has no memory of this conversation.
- `tldr`: 1-2 sentences plain English, no code blocks.

**For 🟡 Medium and ℹ️ Nit findings:** surface via markdown bullets + `TodoWrite` only — NOT spawn_task chips. Chips are for blockers that warrant a dedicated fix session.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · /ccc-review · Audit before you ship
```

### 2. Context strip (one paragraph)

Detect review context with **four quick reads** (parallel Bash, silent on failure):
- `git rev-parse --abbrev-ref HEAD` → current branch
- `git rev-list --count main..HEAD 2>/dev/null` → commits ahead of main
- `git diff --shortstat main..HEAD 2>/dev/null` → diff size
- `test -d .github/workflows && echo yes` → CI presence

Render one line:
> 🧭 Branch: `<branch>` · <N> commits ahead of main · <X> files / <Y> lines changed · CI: `<yes/no>`

If no diff detected: "🧭 No diff vs main — I'll audit the whole project instead (xray recommended)."

### 3. The picker — `AskUserQuestion` with 4 audit types

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-review.json` for canonical option data. Surface the 4 non-back choices.

```
question: "What should I audit?"
header: "CC Commander Review"
multiSelect: false
options:
  - label: "📊 Review current branch"
    description: "Diff vs main — PR-quality summary before you open a PR."
    preview: "<N> commits · <X> lines · reviewer agent does a full 4-dimension pass."
  - label: "🔐 Security audit"
    description: "OWASP Top 10 + secrets + dependency audit. Severity-rated report."
    preview: "security-auditor agent. Catches injection, auth flaws, exposed secrets, vulnerable deps."
  - label: "⚡ Performance"
    description: "Hot-path scan, bundle size, N+1 queries, flame-graph pointers."
    preview: "performance-engineer agent. Flags hot paths, unbounded queries, resource leaks."
  - label: "🩻 Full project x-ray"
    description: "Health scorecard across code, docs, tests, deps, CI."
    preview: "Routes to ccc-xray — full health pass, not just the diff."
```

**Recommendation logic** (prepend ⭐ to ONE label):
- Branch ahead of main + uncommitted changes → ⭐ "Review current branch"
- `package.json` touched in diff → ⭐ "Security audit" (new deps = supply-chain risk)
- SQL / ORM files in diff → ⭐ "Security audit"
- Empty diff → ⭐ "Full project x-ray"
- Hot-path files (`*/api/*`, `*/routes/*`, `*/hot/*`) in diff → ⭐ "Performance"

## Step 2 — Dispatch matching specialist agent

On user pick, immediately dispatch the right agent in background. **Never block the UI.**

**"Review current branch" (diff):**
- `Agent` tool, `subagent_type: general-purpose`, `model: sonnet`, `run_in_background: true`
- Agent: invoke `reviewer` persona (see `commander/cowork-plugin/agents/reviewer.md`)
- Prompt: "Run the 4-dimension review (Security 35% / Performance 25% / Correctness 25% / Maintainability 15%) on `git diff main..HEAD`. Write findings to `tasks/reviews/ccc-review-<YYYYMMDD>-diff.md`. Group by severity (Critical / High / Medium / Low / Nit). Include file:line citations + suggested fixes. Return the artifact path + blocker count."

**"Security audit":**
- Same background pattern, invoke `security-auditor` persona (`agents/security-auditor.md`)
- Prompt: "Run OWASP Top 10 sweep on the diff (or whole codebase if no diff). Check: secrets in source, SQL injection, XSS, auth/authz flaws, insecure deserialization, SSRF, path traversal. Also run `npm audit` / `pip audit` if applicable. Severity-rate (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low / ℹ️ Info) with CWE IDs. Write findings to `tasks/reviews/ccc-review-<YYYYMMDD>-security.md`."

**"Performance":**
- Same pattern, invoke `performance-engineer` persona (`agents/performance-engineer.md`)
- Prompt: "Hot-path audit. Scan for: N+1 queries, O(n²) in hot paths, unbounded loops/queries, missing indexes, resource leaks, bundle bloat. If `.next/`, `dist/`, or `build/` exists, check bundle size. Write findings to `tasks/reviews/ccc-review-<YYYYMMDD>-perf.md`. Flag estimated vs measured impact explicitly."

**"Full project x-ray":**
- Route to the `ccc-xray` skill — do NOT spawn the agent here. Emit: "Loading x-ray workflow — `ccc-xray` runs a full health scorecard across code, docs, tests, deps, CI."
- Then behave as if the user had invoked `/ccc-xray` directly.

## Step 3 — Return progress card to user

After dispatching the agent, emit ONE short card:

> 🔍 **Audit running in background** — `<audit-type>` on `<branch>`, agent ID `<id>`, ETA ~1–3 min.
> 📂 Findings will land at `tasks/reviews/ccc-review-<YYYYMMDD>-<type>.md`.
> 💡 Come back with `/ccc-review status` — I'll report blocker count + artifact path when done.

## Anti-patterns — DO NOT do these

- ❌ Run the review inline — ALWAYS `run_in_background: true`
- ❌ Write findings to stdout only — every review produces a markdown artifact
- ❌ Use a single agent for all audit types — each has a specialist persona
- ❌ Skip severity grouping — reviewers MUST rate Critical / High / Medium / Low / Nit
- ❌ Offer more than 4 audit types in the picker
- ❌ Forget `tasks/reviews/` directory — create it if missing (Bash `mkdir -p`)

## Argument handling

- `/ccc-review` → root picker
- `/ccc-review diff` → skip picker, dispatch reviewer agent immediately
- `/ccc-review security` → skip picker, dispatch security-auditor
- `/ccc-review perf` → skip picker, dispatch performance-engineer
- `/ccc-review xray` → route to `ccc-xray` skill
- `/ccc-review <anything else>` → treat as free-form audit question; confirm scope with one AUQ, then dispatch reviewer

## Artifact format (every review writes this)

```markdown
# CCC Review — <type> — <YYYY-MM-DD>

**Branch:** <branch> · **Base:** main · **Diff:** <X> files / <Y> lines
**Agent:** <persona> · **Duration:** <Nm Ns>

## Summary
- <total findings> findings — <blocker count> blocking
- Overall verdict: Approve / Request Changes / Needs Discussion
- Overall risk: Low / Medium / High

## Findings
### 🔴 Critical (N)
- `file:line` — `<issue>` — **Fix:** `<suggested fix>` — **Why:** `<rationale>`

### 🟠 High (N)
...

### 🟡 Medium (N)
...

### ℹ️ Nits (N)
...

## Next actions
1. ...
```

## Brand rules

- Emoji-forward — 🔍 for audit, 🔴🟠🟡🟢 for severity, ✅ for approve, ❌ for block
- One artifact per audit — never delete previous reviews (keep history)
- Never mention the CLI — Desktop-plugin flow
- Always write to `tasks/reviews/` — Ship flow reads from there

---

**Bottom line:** four audit tiles → matching specialist agent → one markdown artifact. User never waits, findings always traceable.
