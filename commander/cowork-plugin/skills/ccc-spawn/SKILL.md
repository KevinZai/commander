---
name: ccc-spawn
description: "Click-first spawn hub — spin isolated work into its own session on demand: a spawn_task chip in Cowork, a /spawn peer in the CLI. Also routes to /ccc-fleet or /ccc-relay."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[isolated | fleet | relay | expert | status]"
---

# /ccc-spawn — Spawn Hub

Spin work off into its **own session** on demand — the manual counterpart to the automatic isolation-spawn nudge (`suggest-ticker`). One click-first entry point that routes to the right spawn mechanism for what you're doing, and for the surface you're on.

> **Surface-aware.** In **Claude Cowork Desktop**, spawning a one-off session is a `spawn_task` sidebar chip. In the **Claude Code CLI**, it's a `/spawn` peer via the claude-peers broker. This skill picks the right one automatically — you don't have to know which surface you're on.

## When you'd reach for it

- "This is a separate, self-contained thing — do it in its own session so it doesn't derail here."
- "Fan this out across N files in parallel."
- "Run spec → build → review as a chain of hand-off sessions."
- "Get a fresh, independent expert pass on this."

## How it routes

On `/ccc-spawn` with no argument, open a click-first picker:

```
AskUserQuestion:
  question: "What do you want to spawn?"
  options:
    - Isolated session — one self-contained task, its own fresh context
    - Parallel fleet — fan out across independent files/units at once
    - Cross-session relay — chain spec → build → review as hand-off sessions
    - Expert pass — one independent reviewer (security / perf / design / …)
```

| Choice | Surface behaviour | Under the hood |
|--------|-------------------|----------------|
| **Isolated session** | Cowork → emit a `spawn_task` chip `[⭐ Spawn as separate session]`; CLI → `/spawn quick <task>` | A fresh peer/session with a self-contained brief; never derails the current thread |
| **Parallel fleet** | Route to **`/ccc-fleet`** (worktree-isolated parallel agents) | fan-out / pipeline / judge / debate modes |
| **Cross-session relay** | Route to **`/ccc-relay`** | loop-state hand-off, spec→build→review→merge |
| **Expert pass** | Cowork → `spawn_task` chip scoped to one reviewer persona; CLI → `/spawn expert <domain>` | a single fresh-context reviewer, prompted to refute (Pillar 2) |

Explicit sub-commands skip the picker: `/ccc-spawn isolated <task>`, `/ccc-spawn fleet`, `/ccc-spawn relay`, `/ccc-spawn expert <domain>`, `/ccc-spawn status`.

## The brief a spawned session gets

Every spawn carries a **self-contained contract** (Pillar 8), because a peer/session does NOT share your context:

- **Objective + acceptance criteria** — what DONE looks like, checkably.
- **Scope + file domains** — exact paths it owns; non-overlapping with anything else in flight.
- **Hard constraints** — worktree-isolated, relative paths only, don't touch X, don't merge without a human GO (Pillar 5).
- **Report format** — so the result is parseable when it comes back.

`/ccc-spawn status` lists active peers/sessions (CLI: `list_peers`; Cowork: the task chips you've started) and any pending hand-offs.

## Safety (Pillar 5)

- Each spawned code-writing session gets its **own git worktree**; first act is verifying `git rev-parse --show-toplevel` matches — abort if not.
- **Merge / deploy / delete are never auto** — they require an explicit human GO, every time.
- Nothing spawns without your confirmation — this hub **offers**; it doesn't fire on its own.
- Cap the fan-out: don't over-parallelize (1 independent unit = 1 spawn; a small pilot before a big fan-out).

## When NOT to use

- The work is trivial or belongs in the current thread — spawning has real overhead.
- You just want the *automatic* nudge — that already runs every turn via `suggest-ticker` (this skill is the on-demand version).
- Two spawns would edit the same files — merge them into one, or sequence them.

## Limitations

- CLI `/spawn` needs the claude-peers broker; Cowork `spawn_task` needs the Desktop sidebar — the skill uses whichever the current surface provides.
- Spawned sessions are independent: they inherit no in-flight uncommitted state, so the brief must carry everything they need.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
