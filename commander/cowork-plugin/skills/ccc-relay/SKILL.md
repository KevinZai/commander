---
name: ccc-relay
description: "Cross-session loop chaining — chain independent spec/build/review loop SESSIONS that auto-hand-off. Use when the user types /ccc-relay, wants the Finn Loop, or auto-chained loops."
---

# /ccc-relay — Cross-Session Loop Chaining

`/ccc-loop` iterates *inside* one session. `/ccc-relay` chains *separate* sessions: an always-on **spec** loop hands its result to a **build** loop, which hands to a **review** loop, which hands to **merge** — each a distinct, independently-gated loop that launches the next automatically when its own stop condition is met. This is the "Finn Loop" pattern: not one agent looping, but a relay team of loops passing a baton.

> `/ccc-relay` **composes** three primitives instead of re-implementing them — read those skills for the mechanics this one orchestrates:
> - `ccc-loop` — the loop taxonomy, the should-loop gate, the state-file convention, verifier-separation. **Each link in a relay is one loop from that taxonomy.**
> - `ccc-fleet` — parallelism *within* a link (fan out the build across worktrees). A relay is sequential across links; a fleet is parallel within one.
> - `commands/ccc-spawn.md` (`/spawn`) — the CLI mechanism for launching the next session as a peer when you're at a terminal.

## What it is

A **relay** is a directed chain of loop sessions. Each link is a real loop (turn/goal/time/proactive — see `ccc-loop`), runs to its own stop condition, then triggers the next link and exits. No human re-prompts between links.

The canonical chain:

```
spec loop  ──▶  build loop  ──▶  review loop  ──▶  merge (human GO)
 /ccc-plan       /ccc-build        /ccc-review       /ccc-ship
 + /goal         + /goal           + /goal           (gated — never auto)
```

Baton pass, per link:
1. **Link A runs** as a normal gated loop (e.g. a `/goal` spec loop: "produce a plan file with acceptance criteria, stop after 5 tries").
2. **On convergence**, Link A writes its result **and** a completion marker into `.claude/loop-state/<relay-name>.json` — it sets `relay.phase` to `done` and fills the `handoff` block.
3. **The next link is launched** by whichever mechanism fits the surface:
   - **Cloud / unattended** → `/schedule` fires the next loop (survives a closed laptop — the right default for a real relay).
   - **Cowork Desktop** → a `spawn_task` chip offers to spin the next link into its own session (one click).
   - **CLI** → `/spawn` launches the next session as a peer (see `ccc-spawn.md`).
4. **Link B consumes the `handoff` block** as its brief, runs its own gated loop, and repeats the pass — through `review`, then stops at `merge` for an explicit human GO.

The key distinction from `/ccc-loop`: `/ccc-loop` is one context iterating; `/ccc-relay` is **fresh context per link**. That freshness is not incidental — it is what makes the review link a real verifier (Pillar 2 below).

## The relay-state convention

A relay extends the existing `.claude/loop-state/<name>.json` shape (from `ccc-loop`) — it keeps `iteration`, `lastRun`, `attempted`, `stopCondition`, and `history`, and adds one `relay` block: `{ phase, next, signal, handoff }`.

```json
{
  "iteration": 3,
  "lastRun": "2026-07-13T14:32:00Z",
  "attempted": ["spec", "build"],
  "stopCondition": "review link reports zero 🔴/🟠 findings",
  "history": [
    { "link": "spec",  "result": "plan file written, acceptance criteria set", "ts": "2026-07-13T13:10:00Z" },
    { "link": "build", "result": "feat converged, npm test exits 0",           "ts": "2026-07-13T14:32:00Z" }
  ],
  "relay": {
    "phase": "done",
    "next": "review",
    "signal": {
      "type": "linear",
      "ref": "CC-1370",
      "on": "status:In Review"
    },
    "handoff": {
      "from": "build",
      "worktree": ".claude/worktrees/relay-build-x",
      "branch": "feat/relay-build-x",
      "artifact": "plan + diff on feat/relay-build-x",
      "acceptance": "npm test exits 0; tsc --noEmit clean",
      "verifier": "review",
      "humanGate": false,
      "note": "Build loop converged at iteration 3; review grades with fresh context."
    }
  }
}
```

Field contract for the `relay` block:

| Field | Type | Meaning |
|---|---|---|
| `phase` | `"running" \| "done" \| "blocked"` | Lifecycle status of the **current** link. The next link is launched only when this flips to `done`. `blocked` halts the relay and escalates (never silently retries forever). |
| `next` | string \| `null` | Name of the link to launch on `done` (`"build"`, `"review"`, `"merge"`). `null` at the terminal link. |
| `signal` | object | The external mailbox that actually triggers the next session — see below. `{ type, ref, on }`. |
| `handoff` | object | The contract the next link consumes as its brief: `from` (link that produced it), `worktree` + `branch` (isolated location of the work, Pillar 5), `artifact`, `acceptance` (the checkable bar the next link inherits), `verifier` (which link grades this one), `humanGate` (bool — `true` forces an explicit human GO before this link runs, always `true` for merge/deploy), `note`. |

One state file per relay chain, keyed by the chain name (e.g. `feature-x-relay.json`). Each link reads it, does its work, rewrites the `relay` block, and appends to `history` — so a relay that dies mid-chain resumes from durable state, not from zero (Pillar 7).

## The external signal mailbox

A relayed session doesn't share memory with the one before it, so the baton is passed through an **external, durable mailbox** the next session polls or is woken by. The `signal` block records which mailbox and what to watch for:

| `signal.type` | How the next link is triggered | Use when |
|---|---|---|
| `state-file` | Next loop (via `/schedule` or `/loop`) polls `.claude/loop-state/<name>.json` and starts when `phase === "done"` | Fully local, unattended chains |
| `linear` | Next session is gated on a Linear issue status change (e.g. `CC-1370` → **In Review**); CCC already uses **Linear comments as its canonical cross-session coordination channel** | Tracked work that spans sessions/agents |
| `slack` / `discord` | A human reaction is the baton — the **Finn Loop 🚀-to-merge**: a 🚀 emoji on the build summary releases the merge link; anything else holds it | A human-in-the-loop release gate |

Because the mailbox is durable, the relay is restart-resilient: if the machine sleeps between `build` and `review`, the signal (Linear status, the reaction, the state file) is still there when the next session wakes. Prefer Linear for anything already tracked there — it doubles as the audit trail.

## The GATE — a relay without gates is a runaway (Pillar 3)

A relay multiplies the blast radius of an ungated loop by the number of links. **Every single link must independently pass the gate — the relay does not inherit one gate for the whole chain.** Before wiring any link, prove all four parts of the should-loop gate *for that link* (from `ccc-loop`):

1. **Recurs at least weekly** — if the chain runs once, it's a one-shot pipeline, not a relay; just run `/ccc-plan` → `/ccc-build` → `/ccc-review` by hand.
2. **Verification is automated for this link** — the build link's bar is `npm test exits 0`; the review link's bar is `zero 🔴/🟠 findings`. A link with no checkable bar can't decide `phase: done`, so it can't hand off.
3. **Budget absorbs the waste** — every link re-reads context and retries. A four-link relay burns roughly four loops' worth of tokens per full pass. Pilot on a small slice first (Pillar 11).
4. **The link has real tools** — the build link needs a run/test environment; the review link needs the diff and the repo. A link that iterates blind is worse than useless in a chain — it hands garbage to the next link with a confident `done`.

And every link independently satisfies Pillar 3's three-answer loop gate:

> **Verifier, state file, stop condition — three answers per link or that link is not a loop.**

- **Verifier** — an independent grader (see Pillar 2 below).
- **State file** — the shared `.claude/loop-state/<name>.json`, so a resumed link learns instead of repeating.
- **Stop condition** — a deterministic bound *and* a hard cap: "review reports zero blocking findings, **or stop after 5 passes**." A link with no cap can wedge the whole relay.

Miss one part on one link and you don't have a slower chain — you have an automated way to propagate a mistake through four sessions.

## Verifier-separation — the whole point of relaying (Pillar 2)

The reason to chain *separate* sessions instead of looping one is that **the agent that does the work must never be the agent that grades it.** In a relay this is structural, not optional:

- The **build** link produces the diff. It does **not** decide whether the diff is good.
- The **review** link — a fresh context, no anchoring on the build link's reasoning, prompted to *refute* — grades it against the `handoff.acceptance` bar. Its verdict (zero blocking findings) is what flips `phase` to `done` and releases the merge link.
- Set `handoff.verifier` to the grading link so the contract is explicit: build's verifier is `review`, never `build` itself.

Self-graded relays are the failure this skill exists to prevent: a build loop that reviews its own output is just an agent agreeing with itself across four sessions instead of one. If a link's output has no *downstream* link to grade it, that link needs a `/ccc-review` or Agent-tool verifier pass wired in before it's allowed to hand off.

## Safety

- **Never auto-merge or auto-deploy.** The `merge` link is always `handoff.humanGate: true` — it waits for an explicit human GO (the 🚀 reaction, a Linear status move by a person, a typed approval). Approval on one relay pass never carries to the next (Pillar 5).
- **Each link is worktree-isolated (Pillar 5).** A link that writes files does so in its own git worktree on its own branch; the `handoff.worktree`/`handoff.branch` fields carry that location to the next link. First act inside any link: verify `git rev-parse --show-toplevel` equals the worktree path — abort if not. After a link finishes, the main tree must be tracked-clean (`git status --porcelain | grep -v '^??'` empty).
- **`blocked` halts, it does not retry forever.** A link that can't converge sets `phase: "blocked"` and escalates (Linear comment / notification) instead of silently burning the token budget.
- **Destructive links stay off the relay.** `/ccc-deploy`, `/ccc-rollback`, and deletions are never relay links — route them through `/ccc-ship`'s human gate.

## Wiring a relay (the flow)

1. **Name the chain and define the links** — usually `spec → build → review → merge`. Write the chain and each link's acceptance bar into `.claude/loop-state/<name>.json` before starting.
2. **Gate every link** — run the 4-part should-loop gate and Pillar 3's three-answer gate on each. If any link fails, it's a manual step, not a relay link.
3. **Pick the signal per hop** — `state-file` for fully local, `linear` for tracked work, `slack`/`discord` reaction for the human release gate.
4. **Start the first link** as a gated loop (`/goal` for a deterministic stop, `/schedule` if it should survive a closed laptop).
5. **Let it relay** — each link converges, writes its handoff, triggers the next. Watch the `history` array and the Linear trail; stop the chain anytime (`/goal clear`, cancel the schedule, or don't 🚀 the release).

## When NOT to relay

- **One-shot work** — a single `spec → build → review` pass is a pipeline; use `/ccc-fleet pipeline` or run the three skills by hand. Relays earn their setup only when the chain recurs (gate #1).
- **Any link fails its gate** — no automated verifier, no state, no stop cap → that link is a prompt, and the chain is a runaway waiting to happen.
- **Parallel, not sequential** — if the work fans out rather than chains, that's `ccc-fleet`, not a relay.

---

**Bottom line:** a relay is loops all the way down — a chain of *independent* gated loop sessions (`spec → build → review → merge`), each passing a `handoff` baton through a durable mailbox (state file / Linear / a 🚀 reaction). Fresh context per link makes the verifier real (Pillar 2); a full gate per link keeps the chain from becoming a runaway (Pillar 3); worktree isolation and a human merge gate cap the blast radius (Pillar 5). Compose `ccc-loop` (each link), `ccc-fleet` (parallelism within a link), and `/spawn` (launch the next) — don't re-implement them.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
