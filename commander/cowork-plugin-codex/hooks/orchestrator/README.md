# Hook Chain Orchestrator (CC-414)

**Status:** LIVE — the orchestrator is the first SessionStart entry in `hooks.json`, merging 5 handlers into one process (current handler list: `hooks/README.md`).

## Why this exists

`hooks.json` registers multiple `.js` files for the same lifecycle event. Before the merge, SessionStart spawned **3** separate `node` processes (session-start.js + stale-claude-md-nudge.js + post-compact-recovery.js); the orchestrator has since grown to run **5** merged handlers (see `hooks/README.md` for the current list).

Each Node.js cold start costs ~50–200ms. On SessionStart, that's ~300–600ms of redundant spin-up before any handler logic runs. Multiplied across multiple sessions per workday, that's noticeable latency every time Claude Code wakes.

The orchestrator replaced those spawns with **one** process that imports each handler as a function and aggregates their outputs.

## How it works

1. The orchestrator reads stdin once (the SessionStart input from Claude Code).
2. It imports each handler's exported `run({ input, env, cwd })` function dynamically.
3. Each handler returns a JSON output object (instead of writing to stdout).
4. The orchestrator merges outputs:
   - `continue: false` from any handler short-circuits (rest are skipped).
   - `status` strings are joined with `" · "`.
   - `suppressOutput: true` only when **all** handlers requested it.
5. The merged JSON is written to stdout (single line) — same shape Claude Code expects.

## File layout

```
hooks/
├── orchestrator/
│   ├── session-start-orchestrator.js   ← single-process entry (LIVE)
│   └── README.md                        ← this file
├── _archive/session-start.js     ← exports run(); orchestrator-only (archived from hooks root)
├── stale-claude-md-nudge.js      ← exports run(); also has main() for backward compat
├── post-compact-recovery.js      ← exports run(); also has main() for backward compat
├── fable-armed-nudge.js          ← exports run(); merged in a later wave
└── voice-injector.js             ← exports run(); merged in a later wave
```

Each individual hook file still works standalone (`node hooks/session-start.js` is unchanged). The `run()` export is opt-in for orchestrator use.

## Current wiring (live)

The orchestrator is the **first** entry in `hooks.json`'s SessionStart array, followed by `license-check.js`, `git-truth.js`, `update-nudge.js`, and `console-autopen.js` as separate handlers:

   ```json
   {
     "type": "command",
     "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/orchestrator/session-start-orchestrator.js\"",
     "timeout": 15
   }
   ```

   ⚠️ `timeout` is **SECONDS**, not milliseconds — a past bug shipped ms values in this field so the ceilings never applied (fixed in v7.4.1). The live entry uses `15`. Note the quotes around `${CLAUDE_PLUGIN_ROOT}` — unquoted, the spaced Desktop install path word-splits and the hook dies.

Smoke test:
   ```bash
   echo '{}' | node commander/cowork-plugin/hooks/orchestrator/session-start-orchestrator.js
   # → expect: { "continue": true, ... } JSON one-liner
   ```

Optionally set `CCC_ORCH_TIMING=1` or `CCC_ORCH_VERBOSE=1` in the environment to log elapsed time and per-handler tracebacks to stderr.

## Risk

- **Single point of failure.** A bug in the orchestrator breaks all 3 handlers at once. The fail-open path catches uncaught errors and emits `{ continue: true, suppressOutput: true }`, but per-handler errors are silently swallowed unless `CCC_ORCH_VERBOSE=1`.
- **Order coupling.** Handlers run serially in the order listed in the orchestrator. session-start.js must run first (creates state dirs the others read).
- **stdin parsing happens once.** Each individual handler used to parse stdin itself. The orchestrator now parses once and forwards the parsed object via `run({ input })`. Handlers that depended on idiosyncratic raw-stdin behavior could regress.

## Rollback

Revert `hooks.json` SessionStart back to the multi-handler form (the pre-merge version is in git history). The handler `.js` files still have their original `main()` runners, so they will work standalone again immediately. No code changes needed beyond `hooks.json`.

## Future scope

Other events with multiple handlers can adopt the same pattern:

| Event | Handler count (today) | Estimated savings |
|---|---|---|
| `UserPromptSubmit` | 6 | ~500ms+ |
| `PreToolUse` | 6 | ~500ms+ |
| `Stop` | 2 | ~200ms |

Each gets its own orchestrator file under `hooks/orchestrator/<event>-orchestrator.js`.

## Related

- Linear: CC-414
- Tests: `commander/tests/session-start-orchestrator.test.js`
