# Fleet runtime contracts

Reference for `/ccc-fleet`. The helpers live in `../lib/fleet-status.js` (plugin form: `${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js`). Artifacts go to `ccc-fleet/` under the OS temp directory (`os.tmpdir()`, usually `$TMPDIR`, not always `/tmp`). `/ccc-fleet-viz` reads the same files.

## Worker progress events

Emit one JSON line whenever a worker is dispatched, starts, changes status, finishes tests, fails, or completes. The helper appends it to `ccc-fleet/worker-progress.jsonl` and echoes it to stdout:

```bash
node -e 'require(process.argv[1]).emitFleetWorkerProgress(JSON.parse(process.argv[2]))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js" \
  '{"worker_id":"fleet-1","status":"running","files_changed":["src/foo.js"],"tests_passing":null,"eta_remaining_ms":120000}'
```

Schema (the helper validates and throws on a bad field):

| Field | Type | Meaning |
|---|---|---|
| `event_kind` | `"fleet_worker_progress"` | Set by the helper |
| `worker_id` | non-empty string | Stable id, for example `fleet-1` |
| `status` | non-empty string | `queued`, `running`, `testing`, `passed`, `failed`, `complete` |
| `files_changed` | string[] | Repo-relative paths |
| `tests_passing` | boolean or null | null when unknown |
| `eta_remaining_ms` | non-negative number or null | null when unknown |

## Atomic completion marker

When a worker exits, successful or not, write `ccc-fleet/<id>-complete.json` through the helper (it writes a temp file and renames it, so readers never see a partial marker):

```bash
node -e 'console.log(JSON.stringify(require(process.argv[1]).writeCompletionMarker(process.argv[2], JSON.parse(process.argv[3]))))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js" fleet-1 \
  '{"exit_code":0,"files_written":["src/foo.js"],"commit_hash":"abc1234","branch_pushed":false}'
```

Fields: `worker_id`, `exit_code` (integer, required; a failed worker uses its real non-zero code), `files_written`, `commit_hash` (string or null), `branch_pushed` (boolean or null), `completed_at` (set by the helper). The marker is the hand-off contract for synthesis.

## Failure isolation

One worker failure never cancels or rolls back another. Preserve every worktree, branch, diff, progress event and marker. Report the failed worker separately and keep synthesizing the successful ones.

## Cleanup on success

Only after every worker succeeded and the synthesis report is written, prune entries older than 24 hours:

```bash
node -e 'console.log(JSON.stringify(require(process.argv[1]).pruneFleetTmp()))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js"
```

Do not prune after a partial failure; the artifacts are the diagnosis.
