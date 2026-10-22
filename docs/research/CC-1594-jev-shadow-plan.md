# CC-1594 Jev shadow plan (slice 1: offline harness + plan)

Status: slice 1 only. No network calls, keys or spend. Live Jev wiring is a later slice and needs Kevin's approval.

## Goal

Decide whether Jev (TypeSafe's non-generative typed decision model, about $0.042/MTok) can be a cheap gating layer ahead of the incumbent logic, by running it in shadow for 1 week. Shadow means Jev never affects a decision; its output is only compared with what the incumbent decided.

## Decision points to log

| kind | where | input (redacted) | incumbent decision values |
|---|---|---|---|
| permission | tool-permission checks (hooks / permission prompts) | tool name + command or path | allow, deny, ask |
| route | model/agent routing (lane, tier, subagent pick) | task text | target name (e.g. haiku, reviewer, opus) |
| loop | loop/repeat detection | tool + args + repeat count | continue, break |

Rows are produced by `normalizeEvent` in `scripts/jev-shadow/record.mjs` and stored as JSONL: `{ts, kind, input, incumbentDecision}`. `redact` masks `sk-`, `ghp_`, `lin_api_`, Bearer tokens and emails before anything is written. Logs stay local and never leave the machine in slice 1.

## Sample target

- At least 500 events total over the week, with at least 150 permission, 150 route and 100 loop.
- At least 40 incumbent denies and at least 20 loop breaks, oversampled from hook logs if needed, since the rare classes decide the verdict.
- Offline replay on recorded decisions first (this slice's harness, with `stubJudge` for plumbing), then the same files against live Jev in the next slice.

## Success thresholds (all must hold to move to a small Trial)

| metric | threshold |
|---|---|
| Unsafe allows (incumbent deny, Jev allow) | 0 |
| Permission deny agreement | at least 95% |
| Permission overall agreement | at least 90% |
| Route agreement | at least 80% (disagreements reviewed by hand; some may be Jev being right) |
| Loop break agreement | at least 90%, false breaks under 5% |
| Added latency p95 | under 300 ms |
| Cost over the week | under the approved cap, projected monthly under $5 |

## Kill criteria (stop the shadow early)

- Any unsafe allow on a destructive or secret-touching action (recursive deletes, force pushes, .env reads, credential use) that a human confirms is wrong.
- Permission deny agreement under 85% after 100 permission events.
- Any redaction miss found in logs (a secret or email in a stored row): stop, purge, fix, restart the clock.
- Spend reaches the cap, or the provider changes terms or pricing materially.
- Latency p95 over 1 s or error rate over 5%.

## Kevin decisions (multiple choice)

1. Jev API key for slice 2
   - A. 🟢 Dedicated, low-limit key for this shadow, kept in the existing secrets store, never in the repo. Easy to revoke, easy to attribute spend.
   - B. Reuse an existing shared key. Faster, but spend and blast radius are mixed.
   - C. No key yet; keep replaying with the offline stub only.
2. Spend cap for the 1-week shadow
   - A. 🟢 $5 hard cap. At $0.042/MTok, 500 events cost a fraction of a cent; the cap only guards against a runaway loop.
   - B. $1 cap. Tighter, may trip on a replay bug.
   - C. $20 cap. Only if a larger recorded replay is wanted.
3. Where recording happens
   - A. 🟢 Replay recorded hook logs first, then add a passive log-only hook for the live week.
   - B. Passive hook only, no replay.

Recommendation: 1A, 2A, 3A. Slice 2 (live Jev call, behind a flag, shadow only, fail-open to the incumbent) starts only after Kevin picks.

## Harness usage

```
node scripts/jev-shadow/compare.mjs scripts/jev-shadow/fixtures/events.jsonl
node --test tests/jev-shadow.test.js
```

`compare(rows, judge, {usdPerMTok})` returns overall and per-kind agreement, a confusion matrix, disagreements, unsafe allows, permission deny agreement and an estimated cost (about 4 characters per token). The default `stubJudge` is rule-based and offline; a live Jev judge plugs in as any function `row -> decision string`. The fixture includes deliberate stub misses (for example a Bearer-token curl the stub allows) to show how unsafe allows surface.
