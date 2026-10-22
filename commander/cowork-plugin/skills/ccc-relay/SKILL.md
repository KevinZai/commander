---
name: ccc-relay
description: "Chain independent loop sessions (spec, build, review, then a human-gated merge) that hand off through a durable state file, tracker status or reaction, each link separately gated and verified. Use when the user types /ccc-relay, wants the Finn Loop, or wants auto-chained loops."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Skill
  - AskUserQuestion
argument-hint: "[new <chain-name> | status <chain-name> | stop <chain-name>]"
model: sonnet
effort: medium
---

# /ccc-relay — chained loop sessions

**CC Commander** · /ccc-relay · a relay team of loops: each link runs in fresh context, meets its own gate, and passes a baton to the next.

`/ccc-loop` iterates inside one session. `/ccc-relay` chains separate sessions (the "Finn Loop"): a spec loop hands to a build loop, which hands to a review loop, which stops at merge for an explicit human go. No human re-prompts between links.

It composes three primitives instead of re-implementing them:

- `/ccc-loop`: the loop taxonomy, the should-loop gate, the state-file convention, verifier separation. Each link is one loop from that taxonomy.
- `/ccc-fleet`: parallelism inside a link (fan the build out across worktrees). A relay is sequential across links.
- `/ccc-spawn` and the CLI `/spawn` command (`commands/ccc-spawn.md`): launching the next link as its own session.

## When to use / when not to

- Use when a spec → build → review chain recurs (at least weekly) and each link has an automated bar.
- One-shot work is a pipeline: use `/ccc-fleet pipeline` or run `/ccc-plan`, `/ccc-build`, `/ccc-review` by hand.
- Parallel rather than sequential work belongs to `/ccc-fleet`.
- If any link fails its gate (step 2), that link is a manual step, and the chain is not a relay.

## What happens

The canonical chain:

```
spec loop  ──▶  build loop  ──▶  review loop  ──▶  merge (human go)
 /ccc-plan       /ccc-build        /ccc-review       /ccc-ship
 + /goal         + /goal           + /goal           (gated, never automatic)
```

### 1. Name the chain and define the links

Ask for the chain name and the links (default `spec → build → review → merge`), and for each link its acceptance bar. Write the state file before anything starts:

```bash
mkdir -p .claude/loop-state
```

Then write `.claude/loop-state/<chain-name>.json` with the Write tool, following [references/relay-state.md](references/relay-state.md): `iteration: 0`, `stopCondition`, empty `history`, and a `relay` block with `phase: "running"`, `next`, `signal`, and a `handoff` whose `verifier` names the grading link and whose `humanGate` is `true` for merge. Validate it:

```bash
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("state ok")' .claude/loop-state/<chain-name>.json
```

### 2. Gate every link

A relay multiplies an ungated loop's blast radius by the number of links. Every link passes the gate on its own; the chain does not inherit one gate. For each link, confirm all four parts of the should-loop gate from `/ccc-loop`:

1. **Recurs at least weekly.** Otherwise it is a one-shot pipeline.
2. **Verification is automated for this link.** Build: `npm test` exits 0 (or the project's test command). Review: zero blocking findings (critical or high severity). A link without a checkable bar cannot set `phase: "done"`, so it cannot hand off.
3. **Budget absorbs the waste.** A four-link relay costs roughly four loops of tokens per pass. Pilot on a small slice first.
4. **The link has real tools.** Build needs a run and test environment; review needs the diff and the repo. A link that iterates blind hands garbage on with a confident `done`.

And the three answers per link (Fable Method pillar 3): **verifier** (an independent grader), **state file** (the shared `.claude/loop-state/<chain-name>.json`), **stop condition** with a hard cap ("zero blocking findings, or stop after 5 passes"). Record them in the state file. A link missing any answer is removed from the chain and becomes a manual step; tell the user which and why.

### 3. Pick the signal for each hop

Call AskUserQuestion (Codex: the same question in plain text) once per hop:

```
question: "How should <link> hand off to <next>?"
header: "Signal"
multiSelect: false
options:
  - label: "🟢 State file"
    description: "The next loop polls .claude/loop-state and starts on phase done. Fully local."
  - label: "📝 Tracker status"
    description: "Gate on an issue status in the opt-in Linear connector; comments are the audit trail."
  - label: "🚀 Human reaction"
    description: "A reaction on the summary in Slack or Discord releases the link. Use for merge."
```

Offer the tracker or reaction options only when that connector is present in this session. Signal semantics: [references/relay-state.md](references/relay-state.md).

### 4. Pick how the next link launches

```
question: "How should each next link start?"
header: "Launch"
multiSelect: false
options:
  - label: "🟢 Routine via /schedule"
    description: "Runs unattended in the cloud and survives a closed laptop. The default for a real relay."
  - label: "🤖 Desktop spawn_task chip"
    description: "One click in Claude Desktop (Cowork) spins the next link into its own session."
  - label: "⌨️ CLI /spawn peer"
    description: "Launches the next session as a peer; needs the opt-in claude-peers broker."
```

Offer only mechanisms the current surface exposes. Creating a Routine is an external write: confirm with the user at that moment, then invoke `/schedule` with the Skill tool.

### 5. Start the first link

Run the first link as a gated loop: `/goal` for a deterministic stop inside a session, or the Routine from step 4 for unattended runs. Confirm the start with AskUserQuestion: 🟢 "Start the spec link" · "Edit the chain first" · "Cancel".

Verify the start: for a Routine, list Routines in `/schedule` and confirm the id it returned is listed and enabled; for `/goal`, confirm the active goal it reports matches the spec link's stop condition. Report that id. If no id came back, the link did not start; say so instead of reporting a start.

### 6. What every link does

Put these in each link's brief (the Routine prompt, chip brief or peer prompt):

1. Read `.claude/loop-state/<chain-name>.json`; take `relay.handoff` as the brief and `handoff.acceptance` as the bar.
2. If the link writes files, work in its own git worktree and branch; first run `git rev-parse --show-toplevel` and abort if it is not that worktree.
3. Run the link's loop to its stop condition and run the acceptance command; quote its result.
4. On success: set `phase: "done"`, fill `handoff` (worktree, branch, artifact, acceptance for the next link, verifier), append a `history` entry, and fire the chosen signal.
5. On failure to converge within the cap: set `phase: "blocked"`, append the reason to `history`, and escalate (a tracker comment or notification, if authorized). Never retry past the cap.
6. Before exiting, check that the main checkout is tracked-clean: `git status --porcelain | grep -v '^??'` prints nothing.

### 7. Watch and stop

`/ccc-relay status <chain-name>` reads the state file and prints the current link, phase and the last `history` entries:

```bash
node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log(s.relay.phase, "next:", s.relay.next); console.log(JSON.stringify(s.history.slice(-3),null,2))' .claude/loop-state/<chain-name>.json
```

`/ccc-relay stop <chain-name>` sets `phase: "blocked"` with a "stopped by user" history entry and tells the user how to cancel the launcher: `/goal clear`, cancel the Routine in `/schedule`, or withhold the release reaction. Verify the stop: re-run the status one-liner above and confirm it prints `blocked` and that the last `history` entry reads "stopped by user".

## Verifier separation

The point of chaining separate sessions is that the agent that does the work never grades it.

- The build link produces the diff; it does not decide whether the diff is good.
- The review link has fresh context, no anchoring on the build link's reasoning, and is prompted to refute. Its verdict against `handoff.acceptance` is what flips `phase` to `done` and releases merge.
- `handoff.verifier` names the grading link: build's verifier is `review`, never `build`.
- A link with no downstream grader gets a `/ccc-review` or Agent-tool verifier pass before it may hand off.

## Done when

- `.claude/loop-state/<chain-name>.json` exists and the `node -e` validation prints `state ok`.
- Every link in the chain has a verifier, the state file, and a stop condition with a cap recorded; links that failed the gate are listed as manual steps.
- The merge link has `humanGate: true`.
- The first link was started and its loop or Routine id was reported and checked as in step 5, or the user chose to stop before starting.
- After a `stop`, the status one-liner prints `blocked`.

## Guardrails

- Never auto-merge or auto-deploy. Merge waits for an explicit human go each pass; approval on one pass never carries to the next.
- `/ccc-deploy`, `/ccc-rollback` and deletions are never relay links; route them through `/ccc-ship`'s human gate.
- `blocked` halts the chain; no link retries past its cap.
- Each writing link is worktree-isolated, and the main checkout stays tracked-clean.
- Routines, tracker writes and chat posts each need the user's authorization in this conversation, asked at the moment they happen.

## See also

- `/ccc-loop` — the loop taxonomy and gate each link uses.
- `/ccc-fleet` — parallel work inside one link.
- `/ccc-spawn` — launch one isolated session.
- `/ccc-ship` — the human-gated merge and release.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
