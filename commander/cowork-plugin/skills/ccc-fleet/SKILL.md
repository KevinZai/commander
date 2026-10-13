---
name: ccc-fleet
description: "Run parallel agents on one task: fan-out slices in isolated worktrees, a sequential pipeline, a review panel, a background run, or a director-lead-specialist team, then verify and synthesize. Use when the user types /ccc-fleet or wants work split across several agents."
allowed-tools:
  - Read
  - Write
  - Bash
  - Workflow
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[fanout | pipeline | review | judge | background | team]"
model: inherit
effort: high
---

# /ccc-fleet — parallel agents, one synthesis

**CC Commander** · /ccc-fleet · you pick the pattern, agents do the work in isolation, the coordinator verifies and merges.

This is the manual-dispatch side of `rules/workflow-first.md`: delegate the doing, keep the deciding. The engine is the platform's Workflow tool (the bundled workflow runs as `/commander:ccc-fleet`); the Agent tool is the engine for patterns the workflow does not cover and for clients without Workflow.

## When to use / when not to

- Use when the work splits into independent slices, staged hand-offs, or a decision worth several independent opinions.
- Use `/ccc-spawn` for one isolated task, `/ccc-relay` for recurring chains of separate sessions, `/ccc-debate` for a multi-lens stress test; for a pattern-driven codebase migration run the ccc-migrate workflow (see step 5, or `/commander:ccc-migrate`).
- Do not use for work that fits in a handful of tool calls; spawn overhead is real.

## What happens

### 1. Read the context

Run one Bash call:

```bash
git rev-parse --abbrev-ref HEAD; git worktree list | wc -l; sysctl -n hw.memsize 2>/dev/null || free -b 2>/dev/null | awk '/Mem:/{print $2}'
```

Set the parallel cap from RAM: under 32 GB → 3, 32–63 GB → 5, 64 GB or more → 6. If detection fails, use 3. Show one line:

> 🚀 Branch `<branch>` · <N> worktrees · <GB> GB RAM · max parallel <cap>

### 2. Pick the pattern

An argument skips this picker (see Arguments). Otherwise call AskUserQuestion (Codex: ask the same question in plain text). Put the best fit first with 🟢: divisible multi-file scope → Fan-out; staged work → Pipeline; a single decision → Review panel; "overnight", "scan" or a large feature → Long-running.

```
question: "Which fleet pattern?"
header: "Fleet"
multiSelect: false
options:
  - label: "🟢 🚀 Fan-out"
    description: "Up to <cap> agents take non-overlapping slices in their own worktrees; each slice is verified independently."
  - label: "🔄 Pipeline"
    description: "Stages run in order, each building on the previous stage's report. Not parallel."
  - label: "🔬 Review panel"
    description: "Independent opinions on one decision: FOR/AGAINST/Referee, or a judge panel of attempts."
  - label: "⏳ Long-running"
    description: "One background agent, or a director → leads → specialists team for a large feature."
```

Follow-up pickers:

- Review panel → `FOR/AGAINST/Referee` (🟢 for a yes/no decision) · `Judge panel` (2–5 independent attempts scored by a referee) · `Multi-lens debate` (hand off to `/ccc-debate`).
- Long-running → `Background agent` (🟢 for one long task) · `Team hierarchy` (architecture, implementation and polish tiers).

Then ask for the task in plain text (free text, not a picker). For Fan-out, also ask for or propose the slices with a non-overlapping file domain each; for Pipeline, the ordered stages.

### 3. Pre-flight (fail closed)

Run before any dispatch:

```bash
git status --porcelain
base=$(git rev-parse --verify -q origin/main || git rev-parse --verify -q main); [ -n "$base" ] && git rev-list --left-right --count "$base"...HEAD
env | cut -d= -f1 | grep -E 'TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL'
mkdir -p "$HOME/.claude/sessions" && test -w "$HOME/.claude/sessions" && echo sessions-writable
```

| Check | Pass | On failure |
|---|---|---|
| Working tree | `git status --porcelain` empty | Stop. Workers branch from HEAD and would miss uncommitted coordinator edits. Ask the user to commit or stash. |
| Branch relation | left count (behind) is 0 | Behind or diverged: ask before dispatching. Ahead is fine. |
| Secret hygiene | no secret-like variable names | Print names only, never values. Ask the user to clear them or approve a redacted environment for workers. |
| Session state | `sessions-writable` printed | Stop and report the path. |

Report the failing check and spawn nothing if any hard check fails.

### 4. Echo the plan

Before dispatch, show the arc in two to four lines: pattern, agent count, model and effort per role, and "when all report back I verify, merge through the coordinator, and report". Route roles with [references/model-tiers.md](references/model-tiers.md). Keep the coordinator on the user's selected model unless they choose otherwise.

### 5. Dispatch

Prefer the Workflow tool for Fan-out, Pipeline and Judge panel. It runs fan-out slices with `isolation: 'worktree'`, verifies each slice with a separate agent prompted to refute, and surfaces failed slices instead of dropping them.

| Pattern | Workflow call |
|---|---|
| Fan-out | `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-fleet.workflow.js", args: { mode: "fanout", tasks: ["slice 1 …", "slice 2 …"] } })` |
| Pipeline | `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-fleet.workflow.js", args: { mode: "pipeline", tasks: ["stage 1 …", "stage 2 …"] } })` (2 or more stages) |
| Judge panel | `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-fleet.workflow.js", args: { mode: "judge", task: "<decision>", attempts: 3 } })` |
| Pattern migration | `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-migrate.workflow.js", args: { pattern: "…", transform: "…", verify: "…" } })` |

The same workflow runs from the prompt as `/commander:ccc-fleet`; inspect running and finished runs with `/workflows`. Pass at most `<cap>` fan-out slices.

**Pinned fleet.** When the user wants every workflow agent on one model, `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` must already be set in the session environment. Check with `printenv CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`; if it is empty, tell the user how to set it (launch environment or settings `env`) and proceed role-based unless they relaunch. Details: [references/model-tiers.md](references/model-tiers.md).

**Agent-tool dispatch** covers FOR/AGAINST/Referee, Background, Team hierarchy, and every pattern when Workflow is unavailable (Codex: `codex exec --json` workers, one per slice). Rules for every Agent call:

- `subagent_type: "fleet-worker"` for implementation slices (`general-purpose` when the plugin agent is not registered); `reviewer` or `architect` for review roles.
- Set `model` and `effort` per role: workers `medium`, specialists `low`, directors and verifiers `high`.
- Set `isolation: "worktree"` only for agents that write files while other agents or the coordinator also write (fan-out slices, team leads, a background agent that edits code). Sequential pipeline stages and read-only reviewers run without it.
- Set `run_in_background: true`, and send parallel calls in one message so they start together.
- Start every writing agent's prompt with: "FIRST: run `git rev-parse --show-toplevel`. It must be your assigned worktree, not the main checkout; abort and report if it is not. Edit relative paths only."
- Each prompt names the non-overlapping file domain, the check command to run, "do not push, do not force, do not merge", and the report shape: files changed, check run and result, worktree path, branch.

Per pattern:

- **Fan-out (fallback).** One `fleet-worker` per slice, parallel, isolated.
- **Pipeline (fallback).** Stage 1 runs; when it reports, start stage 2 with stage 1's report as context; and so on. No isolation.
- **FOR/AGAINST/Referee.** FOR and AGAINST in parallel, read-only, 300 words each, adversarial. When both finish, a Referee with both outputs: "Synthesize, recommend one path in 200 words, no ties." Never run FOR and AGAINST one after the other.
- **Background.** One agent, isolated if it writes. Tell the user they can keep working and how to check (`git worktree list`). If the task is "keep going until a gate holds" (tests green, CI fixed), run it as a `/goal` loop instead (see `/ccc-loop`); recurring checks belong to `/loop` or `/schedule`.
- **Team hierarchy.** Phase 1: one Director (`opus` or `fable`, effort `high`, read-only) returns an architecture brief of at most 200 words, file domains for two or three Leads, and a specialist checklist. Phase 2: Leads in parallel (`sonnet`, effort `medium`, isolated), each with the brief and its domain. Phase 3: specialists in parallel (`haiku`, effort `low`) on the Lead worktrees for lint, format, docs and simple tests. Directors plan; they never implement. Never skip Phase 1.

### 6. Track progress

Emit worker progress events and write a completion marker for every worker that exits, successful or failed, with `lib/fleet-status.js`. Commands, schema and cleanup: [references/runtime-contracts.md](references/runtime-contracts.md). On a long run, post a one-line status every ten or so steps.

### 7. Verify and synthesize

1. Collect each worker's report and completion marker. A failed worker is reported on its own line; it does not stop synthesis of the others.
2. For Agent-tool fan-out or team runs, start one fresh-context `reviewer` (effort `high`, read-only) over the combined diff, prompted to refute each worker's claim. Workflow fan-out already did this per slice.
3. Merge worker branches back through the coordinator only. On a conflict, stop and report; never auto-resolve.
4. Run the project's check command on the merged result and report its real output.
5. Run the main-tree integrity check: `git status --porcelain | grep -v '^??'` on the main checkout must print nothing. Any tracked change outside the worker branches is a leak; stop and reconcile before reporting.
6. If every worker succeeded, prune old fleet artifacts (references/runtime-contracts.md). Then invoke `/ccc-fleet-viz` once to render the final tree.

## Decision points

- Pattern and sub-pattern (step 2).
- Branch behind or diverged, or secret-like variables present (step 3): ask with AskUserQuestion, 🟢 "Stop and fix first".
- Pinned versus role-based models (step 5), only when the user asks for one model or the run is large.
- Merge conflict (step 7): 🟢 "Stop, show the conflicting files" · "Keep branches unmerged for manual review".

## Arguments

- `/ccc-fleet` → pattern picker.
- `/ccc-fleet fanout` · `pipeline` · `review` (FOR/AGAINST/Referee) · `judge` · `background` · `team` → skip the picker and ask for the task.

## Done when

- Every dispatched worker has a report and a completion marker, or is listed as failed with its exit code.
- Fan-out and team results passed an independent verifier, or are labelled unverified.
- The project's check command ran on the merged result and its output is quoted.
- `git status --porcelain | grep -v '^??'` on the main checkout printed nothing.
- `/ccc-fleet-viz` rendered the run.

## Guardrails

- Never exceed the RAM cap, and never give two parallel writers overlapping files.
- Workers never push, force-push or merge; the coordinator owns merges, always back through the coordinator, never agent to agent.
- No `dangerouslyDisableSandbox`, no unscoped permissions, no secret values in prompts or output.
- Do not dispatch without `run_in_background: true`; it blocks the main thread.
- Pushing, opening a pull request, or any write to a tracker needs the user's authorization in this conversation, asked with a picker at that moment.
- Preserve every worktree and artifact after a failure.

## See also

- `/ccc-spawn` — one isolated session or expert pass.
- `/ccc-relay` — chains of separate loop sessions.
- `/ccc-debate` — multi-lens adversarial review.
- `/ccc-fleet-viz` — the run as a live tree.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
