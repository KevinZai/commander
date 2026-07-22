---
name: ccc-adopt
description: "Bring the CC Commander Orchestrator/Executor doctrine into an EXISTING project. Detects stack, merges a delimited CLAUDE.md section (never clobbers), and tailors a skill/agent pointer list."
model: sonnet
effort: high
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - AskUserQuestion
argument-hint: "[--check]"
---

# /ccc-adopt — Bring CCC Doctrine Into an Existing Project

**CC Commander** · /ccc-adopt · Adopt Orchestrator/Executor in your own repo

## Not to be confused with

- **`$ccc-onboard`** — onboards a new *contributor* INTO the cc-commander repo itself (this repo).
- **`$ccc-tuneup`** — tunes up the user's local `~/.claude` CC Commander *install* (plugin freshness, junk, settings).
- **`$ccc-adopt` (this skill)** — runs INSIDE ANY OTHER PROJECT (yours, not cc-commander) and adds CCC's Orchestrator/Executor doctrine plus a tailored skill/agent pointer list to that project's own `CLAUDE.md`.

If the current working directory's git root is `cc-commander` itself, stop and point the user at `$ccc-onboard` or `$ccc-tuneup` instead — this skill is for adopting CCC doctrine into a *different* codebase.

## Safety rules (NON-NEGOTIABLE)

- ❌ NEVER `rm` or `trash` anything.
- ✅ Before ANY write to `CLAUDE.md`: `cp CLAUDE.md CLAUDE.md.backup-$(date +%Y%m%d-%H%M%S)`.
- ❌ NEVER overwrite an existing `CLAUDE.md` wholesale — only append/replace the clearly delimited CCC block.
- ❌ NEVER run outside a confirmed git repo without asking first (`git rev-parse --show-toplevel` must succeed, or the user must explicitly confirm working in a non-git directory).
- ✅ Always show a diff preview via `AskUserQuestion` before writing anything.
- ❌ NEVER silently create a `CLAUDE.md` that doesn't exist — offer via `AskUserQuestion` first.
- ✅ Re-run safe: detect an existing `<!-- CCC:orchestrator-executor:start -->` marker and replace in place — never duplicate the block.

## Arguments

- `--check` — read-only: detect stack + existing CLAUDE.md + marker state, print the plan, do NOT write anything.
- bare `$ccc-adopt` — detect, preview the diff via chips, write on confirm.

## Step 1 — Detect

```bash
IS_GIT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
echo "GIT_ROOT=${IS_GIT:-n/a}"

HAS_CLAUDE_MD=$([ -f "CLAUDE.md" ] && echo yes || echo no)
HAS_MARKER=$(grep -l "CCC:orchestrator-executor:start" CLAUDE.md 2>/dev/null && echo yes || echo no)
echo "HAS_CLAUDE_MD=$HAS_CLAUDE_MD"
echo "HAS_MARKER=$HAS_MARKER"

# Stack detection — same style as ccc-onboard's clone-time validator
test -f package.json && echo "STACK=node" && grep -o '"\(react\|next\|vue\|nuxt\|express\|fastify\|hono\)"' package.json 2>/dev/null
test -f pyproject.toml -o -f requirements.txt && echo "STACK=python"
test -f Cargo.toml && echo "STACK=rust"
test -f go.mod && echo "STACK=go"
test -f Gemfile && echo "STACK=ruby"
test -f composer.json && echo "STACK=php"
test -f pom.xml -o -f build.gradle && echo "STACK=jvm"

# Package manager clues (mirrors ccc-onboard)
test -f bun.lockb -o -f bun.lock && echo "PM=bun"
test -f pnpm-lock.yaml && echo "PM=pnpm"
test -f yarn.lock && echo "PM=yarn"
test -f package-lock.json && echo "PM=npm"
```

If `GIT_ROOT` resolves and `basename "$GIT_ROOT"` is `cc-commander` (or `test -f "$GIT_ROOT/scripts/audit-counts.js"` exists) — STOP. This is the cc-commander repo itself; redirect to `$ccc-onboard` or `$ccc-tuneup` instead of proceeding.

If `IS_GIT` is empty (not a git repo), ask via `AskUserQuestion` whether to continue anyway before touching any file.

Read `CLAUDE.md` in full if `HAS_CLAUDE_MD=yes` — never assume it's empty or absent without checking.

## Step 2 — Merge plan (no CLAUDE.md yet)

If `HAS_CLAUDE_MD=no`, ask first — never silently create the file:

```yaml
question: "No CLAUDE.md found in this project. Create one?"
header: "CCC Adopt"
multiSelect: false
options:
  - label: "Create minimal CLAUDE.md"
    value: "create"
    description: "New file with just a title + the CCC Orchestrator/Executor section."
    preview: "Smallest possible file — you add project-specific rules later."
  - label: "Cancel"
    value: "cancel"
    description: "Don't create anything."
    preview: "Re-run /ccc-adopt anytime once you have a CLAUDE.md."
```

If `HAS_MARKER=yes`, this is a re-run — plan an in-place replace of the existing block (between the start/end markers), not an append.

## Step 3 — The doctrine block (verbatim — do not paraphrase)

This exact content must be inserted, wrapped in the delimiter comments below. It must match the copy in `CLAUDE.md.template` at the cc-commander repo root — do not alter wording, headers, or command names.

```markdown
<!-- CCC:orchestrator-executor:start -->
## Orchestrator / Executor Model (save ~70% tokens)

CC Commander splits work into two roles instead of doing everything on one expensive model:

- **Orchestrator** — a high-reasoning model (Claude Fable 5 `effort: high`, or Opus 4.8 as the everyday default) that does NOT write final code. It plans: breaks the task into steps, defines acceptance criteria, and produces a **Skill.md-style goal file** — a structured spec an executor can follow without re-deriving intent.
- **Executor** — a fast, capable-at-execution model (GPT-5.5 `effort: xhigh` via the `codex` adapter, or a Sonnet subagent) that implements the plan file exactly. It does not re-plan; it runs its own tests as a first gate, then reports back.

The executor's own test run is a first gate, not the finish line — the worker never grades its own homework. The **orchestrator** (or a fresh verifier agent) independently confirms the result against the plan's acceptance criteria before anything is called done. See the Fable Method, Pillar 2.

Why this saves tokens: the expensive model's context stays small (just the plan, not every file it touches); the fast executor absorbs the token-heavy file reads/writes/diffs. You pay premium-model tokens only for the reasoning, not the typing.

**How to run it:**
- `$ccc-orchestrate` — Fable/Opus plans → writes a goal file → dispatches GPT-5.5 (via `codex`) or a Sonnet subagent to execute it, then verifies the result against the plan's acceptance criteria.
- `$ccc-plan-exec` — the Claude-only variant (cheap Sonnet/Haiku plans, Opus/Fable executes) when you want to stay in one runtime.
- `$ccc-handoff` — when context grows large mid-task, write a dense handoff file and start a fresh chat instead of letting the session bloat. Do this *frequently*, not just at the end — small, frequent resets beat one giant compaction.

**Adopting this in an existing (non-CC-Commander) project:** run `$ccc-adopt` once. It reads your current CLAUDE.md (if any), detects your stack, and merges in this Orchestrator/Executor section plus a stack-appropriate list of which CCC skills/agents to reach for going forward — without clobbering your existing project-specific rules.
<!-- CCC:orchestrator-executor:end -->
```

## Step 4 — Stack-appropriate skill/agent pointer list

After the doctrine block, always append this fixed core list, then a tailored list based on detected stack. Do not dump the full 67-skill catalog — pick what's actually relevant.

**Always include (every stack):**
- `$ccc-orchestrate` — plan/execute split for any multi-step task
- `$ccc-plan-exec` — Claude-only orchestrator/executor variant
- `$ccc-handoff` — context-growth session handoff
- `$ccc-xray` — project health scorecard
- `$ccc-review` — branch/diff audit

**Stack-tailored additions (pick relevant rows only):**

| Detected stack signal | Add these pointers |
|---|---|
| `next`/`react`/`vue`/`nuxt` in package.json | `ccc-design` (UI/UX), `designer` agent, `$ccc-e2e` |
| `express`/`fastify`/`hono`/generic Node API | `ccc-saas` (auth/billing/multi-tenant), `security-auditor` agent, `ccc-devops` |
| `pyproject.toml`/`requirements.txt` | `python-reviewer` agent, `ccc-testing`, `ccc-data` if data/ETL signals present |
| `Cargo.toml` | `rust-reviewer` agent, `performance-engineer` persona |
| `go.mod` | `go-reviewer` agent, `ccc-devops` |
| `pom.xml`/`build.gradle` | `java-reviewer` or `kotlin-reviewer` agent depending on source dirs |
| `composer.json` | `ccc-security`, `builder` agent (Laravel patterns if `artisan` present) |
| No package manifest / plain CLI or script repo | `builder` agent, `qa-engineer` agent, `ccc-devops` |
| `.github/workflows/` present | `ccc-ci` |
| Mobile signals (`app.json`, `Podfile`, `*.xcodeproj`) | `ccc-mobile` |

Print the tailored result as:

```markdown
## Recommended CCC skills for this project

Always:
- /ccc-orchestrate · /ccc-plan-exec · /ccc-handoff · /ccc-xray · /ccc-review

For this stack (<detected stack>):
- <pointer 1> — <one-line why>
- <pointer 2> — <one-line why>
- <pointer 3> — <one-line why>
```

## Step 5 — Diff preview + confirm (AskUserQuestion)

Before writing anything, show the exact diff (new file, appended block, or in-place replace) and ask:

```yaml
question: "Apply the CCC Orchestrator/Executor section to CLAUDE.md?"
header: "CCC Adopt"
multiSelect: false
options:
  - label: "Apply"
    value: "apply"
    description: "Backup CLAUDE.md, then write the delimited block + skill pointers shown above."
    preview: "Reversible — CLAUDE.md.backup-<timestamp> is kept alongside the edited file."
  - label: "Show full diff first"
    value: "diff"
    description: "Print the complete before/after before deciding."
    preview: "No changes made yet."
  - label: "Cancel"
    value: "cancel"
    description: "Make no changes."
    preview: "Re-run /ccc-adopt anytime."
```

On `--check`: stop after Step 4's printed plan — never reach this prompt, never write.

## Step 6 — Backup then write

```bash
[ -f CLAUDE.md ] && cp CLAUDE.md CLAUDE.md.backup-$(date +%Y%m%d-%H%M%S)
```

- **New file:** `Write` a minimal `CLAUDE.md` with a one-line title + the doctrine block + skill pointer list.
- **Existing file, no marker:** `Edit`/append the doctrine block + skill pointer list at the end of the file, preserving everything already there.
- **Existing file, marker present (re-run):** `Edit` to replace only the content between `<!-- CCC:orchestrator-executor:start -->` and `<!-- CCC:orchestrator-executor:end -->` — leave the skill-pointer list and every other section untouched, then re-append a fresh skill-pointer list only if the detected stack changed.

After writing, verify the file is still valid markdown (no truncation) and that the marker pair appears exactly once:

```bash
grep -c "CCC:orchestrator-executor:start" CLAUDE.md
grep -c "CCC:orchestrator-executor:end" CLAUDE.md
```

Both must equal `1`. If not, restore from the backup and report the failure.

## Step 7 — Report

```
## CCC Adopt complete

✅ CLAUDE.md updated: <new file | appended | in-place replaced>
💾 Backup: CLAUDE.md.backup-<timestamp>
🎯 Stack detected: <stack> (<package manager>)
📌 Skill pointers added: <count> stack-specific + 5 universal
⏭️ Next: try /ccc-orchestrate on your next multi-step task
```

## Anti-patterns — DO NOT

- ❌ Duplicate the marker block on a second run — detect `CCC:orchestrator-executor:start` and replace in place instead.
- ❌ Assume every project wants every CCC skill — tailor the pointer list to detected stack signals only.
- ❌ Silently create a `CLAUDE.md` without confirmation.
- ❌ Overwrite unrelated sections of an existing `CLAUDE.md`.
- ❌ Paraphrase the Orchestrator/Executor doctrine text — it must match `CLAUDE.md.template` verbatim.
- ❌ Run destructive operations (`rm`/`trash`) — this skill only ever adds a backup file and an edit.
- ❌ Proceed in a non-git directory without asking first.
- ❌ Run this skill against the cc-commander repo itself — redirect to `$ccc-onboard` or `$ccc-tuneup`.

**Bottom line:** detect stack + existing CLAUDE.md → merge doctrine into a delimited, replaceable block → tailor skill pointers to the stack → backup → confirm via chips → write → verify markers are singular.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
