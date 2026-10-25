---
name: ccc-spawn
description: "Spin self-contained work off on demand: a background subagent, a separate session (Cowork spawn_task chip or CLI /spawn peer), or an independent expert pass; routes fan-outs to /ccc-fleet and chains to /ccc-relay. Use when the user types /ccc-spawn or wants a task done outside this thread."
allowed-tools:
  - Read
  - Bash
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[isolated | fleet | relay | expert | status]"
disable-model-invocation: true
---

# /ccc-spawn — spawn hub

**CC Commander** · /ccc-spawn · one entry point that sends a self-contained task to the right spawn mechanism for this surface.

The on-demand counterpart of the automatic isolation nudge (`suggest-ticker`). This hub offers; nothing spawns without the user's confirmation.

## When to use / when not to

- Use for "do this separately so it does not derail here", "fan this out", "chain spec → build → review", or "get an independent expert pass".
- Do not use for trivial work that belongs in this thread, or when two spawns would edit the same files (merge them into one task or sequence them).
- The automatic nudge already runs every turn; this skill is the manual version.

## What happens

### 1. Pick what to spawn

A sub-command skips this picker. Otherwise call AskUserQuestion (Codex: the same question in plain text), best fit first with 🟢:

```
question: "What do you want to spawn?"
header: "Spawn"
multiSelect: false
options:
  - label: "🟢 Isolated task"
    description: "One self-contained task with fresh context; this thread keeps going."
  - label: "🚀 Parallel fleet"
    description: "Fan out across independent files or units at once (hands off to /ccc-fleet)."
  - label: "🔄 Cross-session relay"
    description: "Chain spec → build → review as hand-off sessions (hands off to /ccc-relay)."
  - label: "🔬 Expert pass"
    description: "One independent reviewer (security, performance, design, …) prompted to refute."
```

### 2. Choose the mechanism for the surface

| Choice | Mechanism |
|---|---|
| Isolated task, result needed in this conversation | Agent tool: `subagent_type: "fleet-worker"` (or `general-purpose`), `run_in_background: true`, `effort` sized to the brief (`low` mechanical, `medium` typical, `high` hard). Add `isolation: "worktree"` only when the task writes files while this session keeps editing; a read-only task runs without it. |
| Isolated task as its own session | Claude Desktop (Cowork): emit a `spawn_task` chip, `[🟢 Spawn as separate session]`. CLI with the opt-in claude-peers broker: `/spawn quick <task>`. Codex: `codex exec --json` or `codex cloud exec`. |
| Parallel fleet | Invoke `/ccc-fleet` with the Skill tool, passing the task. |
| Cross-session relay | Tell the user to type `/ccc-relay` with the chain (user-invoked only). |
| Expert pass | Agent tool, read-only, no isolation: `subagent_type` `security-auditor`, `performance-engineer`, `designer`, `reviewer` or another matching plugin agent; `effort: "high"`; prompt it to refute, not confirm. As a separate session: Cowork `spawn_task` chip scoped to that reviewer, or CLI `/spawn expert <domain>`. |

Use the mechanism the current surface actually exposes. If none of the session mechanisms is available, fall back to the background Agent tool and say so.

### 3. Write the brief

A spawned agent or session shares none of this context, so every brief is self-contained (Fable Method pillar 8):

- **Objective and acceptance criteria**: what done looks like, as a check.
- **Scope**: the exact paths it owns, non-overlapping with anything else in flight.
- **Hard constraints**: for a code-writing spawn, its own git worktree, first act `git rev-parse --show-toplevel` must equal that worktree (abort if not), relative paths only, no merge, push or deploy.
- **Check command**: the exact command it runs before reporting.
- **Report format**: files changed, check result, worktree path and branch, so the result parses when it returns.

Show the brief and confirm with AskUserQuestion: 🟢 "Spawn it" · "Edit the brief" · "Cancel".

### 4. Spawn and report

Spawn, then report in one line: mechanism, id or chip, worktree and branch if any, and how to check on it.

### `/ccc-spawn status`

List what is in flight: background agents started in this session, CLI peers (`list_peers` from the claude-peers broker, when installed), Cowork task chips you started, and any pending relay hand-offs in `.claude/loop-state/`:

```bash
ls .claude/loop-state/*.json 2>/dev/null; git worktree list
```

## Arguments

`/ccc-spawn isolated <task>` · `/ccc-spawn fleet` · `/ccc-spawn relay` · `/ccc-spawn expert <domain>` · `/ccc-spawn status`.

## Done when

- The user confirmed the brief, and the spawn returned an id, chip or agent handle that is reported back.
- For a code-writing spawn, its report shows `git rev-parse --show-toplevel` equal to its worktree, and `git status --porcelain | grep -v '^??'` on the main checkout prints nothing.
- For an expert pass, findings come back as `path:line`, severity and fix.

## Guardrails

- Nothing spawns without explicit confirmation.
- Merge, deploy, push and delete are never automatic; each needs the user's go in this conversation, every time.
- One independent unit per spawn; run a small pilot before a large fan-out.
- Spawned work inherits no uncommitted state; the brief carries everything it needs.
- claude-peers and Cowork chips are optional surfaces; never assume either is present.

## See also

- `/ccc-fleet` — parallel agents with synthesis.
- `/ccc-relay` — chained loop sessions.
- `/ccc-review` — an inline review pass.
- `/ccc-handoff` — preserve state before moving work to a new session.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
