# Hook Chain Orchestrator (CC-414)

**Status:** SCAFFOLD — inactive until orchestrator manually flips `hooks.json`.

## Why this exists

`hooks.json` registers multiple `.js` files for the same lifecycle event. SessionStart currently spawns **3** separate `node` processes (session-start.js + stale-claude-md-nudge.js + post-compact-recovery.js).

Each Node.js cold start costs ~50–200ms. On SessionStart, that's ~300–600ms of redundant spin-up before any handler logic runs. Multiplied across multiple sessions per workday, that's noticeable latency every time Claude Code wakes.

The orchestrator replaces those 3 spawns with **one** process that imports each handler as a function and aggregates their outputs.

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
│   ├── session-start-orchestrator.js   ← single-process entry
│   └── README.md                        ← this file
├── session-start.js              ← exports run(); also has main() for backward compat
├── stale-claude-md-nudge.js      ← exports run(); also has main() for backward compat
└── post-compact-recovery.js      ← exports run(); also has main() for backward compat
```

Each individual hook file still works standalone (`node hooks/session-start.js` is unchanged). The `run()` export is opt-in for orchestrator use.

## Activation steps

When ready to flip the merge live:

1. Edit `commander/cowork-plugin/hooks/hooks.json` SessionStart array. Replace the 3 entries with **one**:

   ```json
   "SessionStart": [
     {
       "hooks": [
         {
           "type": "command",
           "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/orchestrator/session-start-orchestrator.js",
           "timeout": 15000
         }
       ]
     }
   ]
   ```

   **Increase the timeout** (e.g. 15000ms) — the orchestrator runs all 3 handlers serially in one process, so its ceiling is the sum of the originals.

2. Smoke test:
   ```bash
   echo '{}' | node commander/cowork-plugin/hooks/orchestrator/session-start-orchestrator.js
   # → expect: { "continue": true, ... } JSON one-liner
   ```

3. Optionally set `CCC_ORCH_TIMING=1` or `CCC_ORCH_VERBOSE=1` in the environment to log elapsed time and per-handler tracebacks to stderr.

4. Bump plugin version, ship, monitor.

## Risk

- **Single point of failure.** A bug in the orchestrator breaks all 3 handlers at once. The fail-open path catches uncaught errors and emits `{ continue: true, suppressOutput: true }`, but per-handler errors are silently swallowed unless `CCC_ORCH_VERBOSE=1`.
- **Order coupling.** Handlers run serially in the order listed in the orchestrator. session-start.js must run first (creates state dirs the others read).
- **stdin parsing happens once.** Each individual handler used to parse stdin itself. The orchestrator now parses once and forwards the parsed object via `run({ input })`. Handlers that depended on idiosyncratic raw-stdin behavior could regress.

## Rollback

Revert `hooks.json` SessionStart back to the multi-handler form (the pre-merge version is in git history). The handler `.js` files still have their original `main()` runners, so they will work standalone again immediately. No code changes needed beyond `hooks.json`.

## Future scope

Other events with multiple handlers can adopt the same pattern:

| Event | Handler count | Estimated savings |
|---|---|---|
| `UserPromptSubmit` | 4 | ~450ms |
| `PreToolUse` | 3 | ~300ms |
| `Stop` | 2 | ~200ms |

Each gets its own orchestrator file under `hooks/orchestrator/<event>-orchestrator.js`.

## Related

- Linear: CC-414
- Tests: `commander/tests/session-start-orchestrator.test.js`
