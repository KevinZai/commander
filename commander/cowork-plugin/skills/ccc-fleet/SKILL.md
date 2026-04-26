---
name: ccc-fleet
description: "Multi-agent orchestration — launch parallel Sonnet agents in git worktrees to fan out, pipeline, or compete on a task. Use when the user types /ccc-fleet, /ccc fleet, says 'run parallel agents', 'fan out', 'dispatch a swarm', 'FOR/AGAINST review', 'background task', or needs to split a big job across multiple agents."
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
argument-hint: "[fanout | pipeline | review | background]"
---

# /ccc-fleet — Parallel Agents

Launch multiple Sonnet agents in parallel worktrees. Click-first picker selects the pattern.

Promoted from `commands/ccc-parallel.md` (legacy slash command).

## Response shape (EVERY time)

### 1. Brand header

```
**CC Commander** · Fleet Orchestrator · [Docs](https://cc-commander.com)
```

### 2. Context strip

Detect in parallel via a single Bash call:
- `git worktree list | wc -l` → active worktrees
- `git rev-parse --abbrev-ref HEAD` → current branch
- `sysctl -n hw.memsize 2>/dev/null \|\| free -b 2>/dev/null` → RAM (cap parallelism)

Render:
> 🚀 Branch: `<branch>` · <N> active worktrees · RAM: <GB> · max parallel: <3-5>

Rule: 16GB → max 3 parallel · 32GB → max 5 · 64GB+ → max 6

### 3. Pattern picker — `AskUserQuestion`

```
question: "Which pattern?"
header: "Fleet"
multiSelect: false
options:
  - label: "🌿 Fan-out (same task × 3)"
    description: "3 agents tackle different slices of one big task."
    preview: "Best for: 'migrate files A-M, N-Z, update tests'."
  - label: "🔗 Pipeline (sequential)"
    description: "Agent 1 → Agent 2 → Agent 3, each waits on the prior."
    preview: "Best for: 'design → implement → test'."
  - label: "⚖️ Opposing review (FOR/AGAINST/Referee)"
    description: "Dialectic — one argues FOR, one AGAINST, Referee synthesizes."
    preview: "Best for: architecture decisions you'd regret reversing."
  - label: "🌙 Background long-running task"
    description: "One agent, backgrounded, reports back when done."
    preview: "Best for: overnight scans, heavy refactors, large doc generation."
```

Prepend ⭐ to the best-fit option based on context:
- Many files changed + divisible scope → ⭐ Fan-out
- Single architecture question → ⭐ Opposing review
- "scan" / "overnight" keywords in recent history → ⭐ Background

## Dispatch — Fan-out

After user picks Fan-out, ask for ONE task description (via a follow-up plain question, NOT AUQ — free text needed).

Then spawn 3 `Agent` calls in a SINGLE tool-call batch with `run_in_background: true`:

Example pseudocode:
```
Agent 1: subagent_type=general-purpose, model=sonnet, prompt="Slice 1 of: <task>. Work in worktree feat/slice-1. Non-overlapping files: <domain 1>. Report: files changed, tests passing."
Agent 2: same pattern for Slice 2 / worktree feat/slice-2 / domain 2
Agent 3: same pattern for Slice 3 / worktree feat/slice-3 / domain 3
```

Return:
> 🚀 3 agents dispatched. Each has its own worktree + branch. I'll synthesize results when all 3 report back. Use Cmd+click on the progress cards below to steer any individual agent.

## Dispatch — Pipeline

Ask for 3 sequential tasks (free-text follow-ups, one at a time).

Spawn Agent 1 with `run_in_background: true`. When it reports done, spawn Agent 2 with the first agent's output as context. When Agent 2 done, spawn Agent 3.

This is NOT parallel — it's sequential. Echo the pipeline plan up front so user sees the chain.

## Dispatch — Opposing review (dialectic)

Ask for the ONE decision being reviewed (free-text).

Spawn 3 Agents in parallel (single tool-call batch, `run_in_background: true`):

```
FOR agent: "Argue FOR <decision>. Best-case rationale, evidence, precedents. 300 words max. Adversarial stance."
AGAINST agent: "Argue AGAINST <decision>. Counter-evidence, risks, alternatives. 300 words max. Adversarial stance."
Referee agent: WAIT — don't spawn yet. Spawn AFTER both complete with both outputs as input: "Synthesize FOR and AGAINST. Recommend a path. 200 words. No ties."
```

Return: "⚖️ FOR and AGAINST running. Referee spawns when both complete. I'll post the synthesis."

This mirrors the `dialectic-review` skill pattern — cite it as inspiration.

## Dispatch — Background

Ask for the one task (free-text). Spawn ONE `Agent` with `run_in_background: true` and a long turn budget.

Return:
> 🌙 Background agent running. You can keep working — I'll surface the result when it completes. Check status: `git worktree list`.

## Worktree management (automatic)

For every spawn, each Agent gets:
- Branch: `feat/fleet-<slug>-<n>` or `feat/<task-slug>`
- Worktree: `.claude/worktrees/<branch-slug>`
- Non-overlapping file domain (spelled out in the Agent prompt)

Agents CANNOT push — return files + diffs only. User merges to main via the coordinator.

## Safety guards

| Guard | Value |
|-------|-------|
| Max parallel agents | 5 (auto-scaled by RAM) |
| Branch policy | Each agent gets own branch, named deterministically |
| Merge policy | Always back to main via coordinator — never agent-to-agent |
| Conflict resolution | Stop + report, never auto-resolve |
| Background timeout | 60 minutes default, configurable |
| Cost | Each agent tracks cost independently via Sonnet |

## Argument handling

- `/ccc-fleet fanout` → skip picker, straight to fan-out task prompt
- `/ccc-fleet pipeline` → pipeline flow
- `/ccc-fleet review` → opposing-review flow
- `/ccc-fleet background` → background flow
- `/ccc-fleet` bare → show picker

## Anti-patterns — DO NOT

- ❌ Spawn >RAM-safe number of agents (16GB = cap at 3, period)
- ❌ Give overlapping file domains to parallel agents (merge hell)
- ❌ Let agents push directly to main (coordinator owns merges)
- ❌ Skip the "non-overlapping domains" line in each Agent prompt
- ❌ Run opposing-review synchronously — FOR and AGAINST must be parallel, Referee after
- ❌ Use `dangerouslyDisableSandbox` or give agents unscoped permissions
- ❌ Dispatch without `run_in_background: true` — blocks the main thread

## Brand rules

- Emoji-forward fleet cues: 🚀 dispatch, 🌿 fan-out, 🔗 pipeline, ⚖️ dialectic, 🌙 background
- PM Consultant voice: status check-ins every ~10 steps during long runs
- Always declare synthesis step up front: "when all 3 complete, I'll merge + report"
- Hard constraints listed explicitly in every Agent prompt (worktree, no push, no force)

## Tips for the agent executing this skill

1. Whole flow is ≤4 turns: picker → free-text task → dispatch (parallel batch) → progress cards.
2. Use `run_in_background: true` on EVERY Agent spawn — keeps main thread responsive.
3. Parallel calls go in a SINGLE tool-call batch (one message, multiple function_calls) — not sequential.
4. If RAM detection fails, default to 3 parallel (safest for Mac Mini M4 baseline).
5. Always echo the synthesis plan BEFORE dispatching — user needs to see the full arc.
6. After all workers report, automatically invoke `/ccc-fleet-viz` to render the final fleet tree.

---

**Bottom line:** pick pattern → free-text task → parallel batch dispatch → Cmd+click to steer. Synthesis auto-kicks when all report back.
