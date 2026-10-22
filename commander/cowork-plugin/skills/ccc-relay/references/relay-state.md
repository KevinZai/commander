# Relay state and signal mailbox

Reference for `/ccc-relay`. A relay extends the `.claude/loop-state/<name>.json` shape from `/ccc-loop`: it keeps `iteration`, `lastRun`, `attempted`, `stopCondition` and `history`, and adds one `relay` block `{ phase, next, signal, handoff }`. One state file per chain, keyed by the chain name (for example `feature-x-relay.json`).

## Example

```json
{
  "iteration": 3,
  "lastRun": "2026-07-13T14:32:00Z",
  "attempted": ["spec", "build"],
  "stopCondition": "review link reports zero critical or high findings, or stop after 5 passes",
  "history": [
    { "link": "spec",  "result": "plan file written, acceptance criteria set", "ts": "2026-07-13T13:10:00Z" },
    { "link": "build", "result": "feature converged, npm test exits 0",        "ts": "2026-07-13T14:32:00Z" }
  ],
  "relay": {
    "phase": "done",
    "next": "review",
    "signal": { "type": "state-file", "ref": ".claude/loop-state/feature-x-relay.json", "on": "phase:done" },
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

## `relay` block contract

| Field | Type | Meaning |
|---|---|---|
| `phase` | `"running"` \| `"done"` \| `"blocked"` | Status of the current link. The next link launches only on `done`. `blocked` halts the chain and escalates; it never retries forever. |
| `next` | string or null | Link to launch on `done` (`"build"`, `"review"`, `"merge"`); null at the terminal link. |
| `signal` | `{ type, ref, on }` | The durable mailbox that triggers the next session (table below). |
| `handoff` | object | The brief the next link consumes: `from` (producing link), `worktree` and `branch` (isolated location of the work), `artifact`, `acceptance` (the checkable bar the next link inherits), `verifier` (the link that grades this one, never itself), `humanGate` (true forces an explicit human go before the link runs; always true for merge), `note`. |

Each link reads the file, does its work, rewrites the `relay` block and appends to `history`, so a chain that dies mid-way resumes from durable state, not from zero.

## Signal mailbox

A relayed session shares no memory with the one before it, so the baton passes through a durable mailbox the next session polls or is woken by.

| `signal.type` | How the next link is triggered | Use when |
|---|---|---|
| `state-file` | The next loop (`/schedule` Routine or `/loop`) polls `.claude/loop-state/<name>.json` and starts when `phase` is `done` | Fully local, unattended chains |
| `linear` | The next session is gated on an issue status change in the opt-in Linear connector (`ref` is the issue key such as `TEAM-123`, `on` is `status:In Review`); comments on the issue are the cross-session record | Tracked work spanning sessions or agents |
| `slack` / `discord` | A human reaction on the build summary releases the merge link (🚀 releases, anything else holds) | A human-in-the-loop release gate |

Because the mailbox is durable, a chain survives a sleeping machine: the state file, the issue status or the reaction is still there when the next session wakes. Prefer the tracker for work already tracked there; it doubles as the audit trail. Tracker and chat signals need those opt-in connectors and the user's authorization for each write.
