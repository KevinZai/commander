---
name: ccc-adopt
description: "Merge Commander's orchestrator/executor section and a stack-tailored skill and agent list into an existing project's CLAUDE.md as a delimited, re-runnable block, with backup and diff approval first. Use when adopting Commander conventions in a repo you already have."
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - AskUserQuestion
argument-hint: "[--check]"
model: sonnet
effort: high
---

# /ccc-adopt — Commander conventions, your repo

**CC Commander** · /ccc-adopt · one delimited CLAUDE.md block plus skill pointers for your stack, never a clobber.

Runs inside any project other than Commander's own. It adds Commander's orchestrator/executor section and a stack-tailored pointer list to that project's `CLAUDE.md`, between markers so a re-run replaces the block instead of duplicating it.

On Codex, AskUserQuestion becomes a plain-text question with the same options; every other step is identical.

## When to use / when not to

- Use once per existing project, and again after the stack changes (the re-run replaces the block in place).
- Use `/ccc-onboard` to onboard a contributor to a repository (including Commander's own), `/ccc-tuneup` to tune the local Commander install under `~/.claude`, and `/ccc-claudemd` to rewrite a whole CLAUDE.md.

## Arguments

- `--check` — read-only: detect stack, CLAUDE.md and marker state, print the plan from step 4, write nothing.
- No argument — detect, preview the diff, write on approval.

## What happens

Shell state does not persist between Bash calls: start each later command with `ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)` and use the literal backup path printed in step 6.

### 1. Detect

```bash
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
ROOT="${GIT_ROOT:-$PWD}"
echo "GIT_ROOT=${GIT_ROOT:-n/a}"
echo "HAS_CLAUDE_MD=$([ -f "$ROOT/CLAUDE.md" ] && echo yes || echo no)"
echo "HAS_MARKER=$(grep -q 'CCC:orchestrator-executor:start' "$ROOT/CLAUDE.md" 2>/dev/null && echo yes || echo no)"

# Stack signals
test -f "$ROOT/package.json" && echo "STACK=node" && grep -o '"\(react\|next\|vue\|nuxt\|express\|fastify\|hono\)"' "$ROOT/package.json" 2>/dev/null
test -f "$ROOT/pyproject.toml" -o -f "$ROOT/requirements.txt" && echo "STACK=python"
test -f "$ROOT/Cargo.toml" && echo "STACK=rust"
test -f "$ROOT/go.mod" && echo "STACK=go"
test -f "$ROOT/Gemfile" && echo "STACK=ruby"
test -f "$ROOT/composer.json" && echo "STACK=php"
test -f "$ROOT/pom.xml" -o -f "$ROOT/build.gradle" && echo "STACK=jvm"
test -d "$ROOT/.github/workflows" && echo "SIGNAL=ci"
ls "$ROOT"/app.json "$ROOT"/Podfile "$ROOT"/*.xcodeproj 2>/dev/null | head -1 | sed 's/^/SIGNAL=mobile /'

# Package manager
test -f "$ROOT/bun.lockb" -o -f "$ROOT/bun.lock" && echo "PM=bun"
test -f "$ROOT/pnpm-lock.yaml" && echo "PM=pnpm"
test -f "$ROOT/yarn.lock" && echo "PM=yarn"
test -f "$ROOT/package-lock.json" && echo "PM=npm"

# Commander's own repo?
{ [ "$(basename "$ROOT")" = "cc-commander" ] || [ -f "$ROOT/scripts/audit-counts.js" ] || [ -f "$ROOT/commander/cowork-plugin/.claude-plugin/plugin.json" ]; } && echo "SELF=yes"
```

- `SELF=yes` → stop. This is Commander's own repository; point to `/ccc-onboard` or `/ccc-tuneup`.
- `GIT_ROOT=n/a` → ask before touching any file:

  ```yaml
  question: "This directory is not a git repo. Continue anyway?"
  header: "CCC Adopt"
  multiSelect: false
  options:
    - label: "🟢 Cancel"
      description: "Make no changes; run /ccc-adopt from inside the project's repo."
    - label: "Continue here"
      description: "Use the current directory as the project root. The backup is the only undo."
  ```

- `HAS_CLAUDE_MD=yes` → Read `CLAUDE.md` in full before planning. Never assume its content.

### 2. Plan the merge

- `HAS_CLAUDE_MD=no` → ask; never create the file silently:

  ```yaml
  question: "No CLAUDE.md found in this project. Create one?"
  header: "CCC Adopt"
  multiSelect: false
  options:
    - label: "🟢 Create minimal CLAUDE.md"
      description: "New file with a title, the orchestrator/executor section and the skill pointers."
      preview: "Smallest possible file — add project-specific rules later."
    - label: "Cancel"
      description: "Create nothing. Re-run /ccc-adopt once you have a CLAUDE.md."
  ```

- `HAS_MARKER=yes` → re-run: replace the content between the markers in place.
- Otherwise → append the block at the end of the file, preserving everything above it.

### 3. The block (verbatim)

Insert exactly this, markers included. Its body is the `## Orchestrator and executor` section of `CLAUDE.md.template` at the Commander repository root; keep the two identical and do not paraphrase.

```markdown
<!-- CCC:orchestrator-executor:start -->
## Orchestrator and executor
Split thinking from typing when the task benefits:

- **Orchestrator** (`fable` or `opus`): plans, writes a goal file (objective, constraints, acceptance criteria, files not to touch, report format), and verifies the result. It does not write the final code.
- **Executor**: implements the goal file exactly and runs its own tests as a first gate. Codex executors run through `codex exec --json` (`gpt-6.1-sol` by default, `gpt-6-sol` for bounded work, `gpt-6-luna` for mechanical steps, `gpt-6-astra` when the step itself is hard); Claude executors are `sonnet` or `opus` subagents.
- For substantive or expensive-to-reverse changes, the orchestrator or a fresh verifier confirms the result against the acceptance criteria. Small, reversible steps can rely on self-verification.

Commands: `/ccc-orchestrate` (Claude plans, Codex or a Claude subagent executes, Claude verifies) · `/ccc-plan-exec` (Claude only) · `/ccc-codex` (Codex CLI health, models, plugins, agents, review) · `/ccc-handoff` (write a dense handoff and continue in a fresh session).

Existing project without Commander conventions: run `/ccc-adopt` once to merge these sections without overwriting project rules.
<!-- CCC:orchestrator-executor:end -->
```

### 4. Skill and agent pointers

After the block, add the core five plus the rows that match step 1's signals. Never paste the whole catalog.

Core (every stack): `/ccc-orchestrate` (plan/execute split) · `/ccc-plan-exec` (Claude-only variant) · `/ccc-handoff` (context-growth handoff) · `/ccc-xray` (health scorecard) · `/ccc-review` (branch and diff audit).

| Signal | Add |
|---|---|
| `next`, `react`, `vue`, `nuxt` in package.json | `/ccc-design`, `designer` agent, `/ccc-e2e` |
| `express`, `fastify`, `hono`, or another Node API | `/ccc-saas`, `security-auditor` agent, `/ccc-devops` |
| `pyproject.toml` or `requirements.txt` | `python-reviewer` agent, `/ccc-testing`, `/ccc-data` when data or ETL signals are present |
| `Cargo.toml` | `rust-reviewer` agent, `performance-engineer` agent |
| `go.mod` | `go-reviewer` agent, `/ccc-devops` |
| `pom.xml` or `build.gradle` | `java-reviewer` or `kotlin-reviewer` agent, by source directories |
| `composer.json` | `/ccc-security`, `builder` agent (Laravel patterns when `artisan` exists) |
| No package manifest (plain CLI or scripts) | `builder` agent, `qa-engineer` agent, `/ccc-devops` |
| `SIGNAL=ci` | `/ccc-ci` |
| `SIGNAL=mobile` | `/ccc-mobile` |

Render it as:

```markdown
## Recommended CCC skills for this project

Always:
- /ccc-orchestrate · /ccc-plan-exec · /ccc-handoff · /ccc-xray · /ccc-review

For this stack (<detected stack>):
- <pointer 1> — <one-line why>
- <pointer 2> — <one-line why>
- <pointer 3> — <one-line why>
```

With `--check`, print the detection summary, the merge plan from step 2 and this list, then stop. Never reach step 5.

### 5. Diff preview and approval

Show the exact change (new file, appended block, or in-place replacement), then ask:

```yaml
question: "Apply the CCC orchestrator/executor section to CLAUDE.md?"
header: "CCC Adopt"
multiSelect: false
options:
  - label: "🟢 Apply"
    description: "Back up CLAUDE.md, then write the delimited block and the skill pointers shown above."
    preview: "Reversible — CLAUDE.md.backup-<timestamp> stays beside the edited file."
  - label: "Show full diff first"
    description: "Print the complete before and after, then ask again. No changes yet."
  - label: "Cancel"
    description: "Make no changes. Re-run /ccc-adopt anytime."
```

### 6. Back up, then write

```bash
[ -f "$ROOT/CLAUDE.md" ] && BACKUP="$ROOT/CLAUDE.md.backup-$(date +%Y%m%d-%H%M%S)" && cp "$ROOT/CLAUDE.md" "$BACKUP" && echo "BACKUP=$BACKUP"
```

- New file → Write a minimal `CLAUDE.md`: a one-line `# <project name>` title, the block, the pointer list.
- Existing file, no marker → Edit to append the block and the pointer list at the end.
- Existing file, marker present → Edit only the text between `<!-- CCC:orchestrator-executor:start -->` and `<!-- CCC:orchestrator-executor:end -->`. Leave the pointer list and every other section alone; replace the pointer list only when the detected stack changed.

### 7. Verify

```bash
grep -c "CCC:orchestrator-executor:start" "$ROOT/CLAUDE.md"
grep -c "CCC:orchestrator-executor:end" "$ROOT/CLAUDE.md"
tail -5 "$ROOT/CLAUDE.md"
```

Both counts must be `1` and the tail must show the end of the content you wrote (no truncation). On any failure, restore with `cp "$BACKUP" "$ROOT/CLAUDE.md"`, rerun the two counts to confirm the original is back, and report the failure.

### 8. Report

```markdown
## CCC Adopt complete

✅ CLAUDE.md updated: <new file | appended | replaced in place>
💾 Backup: <BACKUP path, or "none — new file">
🎯 Stack detected: <stack> (<package manager>)
📌 Skill pointers: the core five + <n> for this stack
⏭️ Next: try /ccc-orchestrate on your next multi-step task
```

## Done when

- Step 7 printed `1` and `1`, and the reported backup path exists (`test -f "$BACKUP"`), or the user cancelled and nothing was written.
- With `--check`: no Write or Edit call and no backup were made this run.

## Guardrails

- Never `rm` or `trash` anything; the only new file is the backup.
- Never write before the step 5 approval, and never create a `CLAUDE.md` without the step 2 approval.
- Never overwrite an existing `CLAUDE.md` wholesale or touch sections outside the markers and the pointer list.
- Never duplicate the marker block; a re-run replaces it in place.
- Never paraphrase the block; it mirrors `CLAUDE.md.template`.
- Never run against Commander's own repository or, without asking, outside a git repo.
- Never commit, push or open a PR; the user reviews and commits the change.

## See also

- `/ccc-orchestrate` — the plan, execute, verify loop this block describes
- `/ccc-claudemd` — audit or rewrite a whole CLAUDE.md
- `/ccc-onboard` — first-hour plan for a new contributor
- `/ccc-start` — first-run onboarding, which routes imports here

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
