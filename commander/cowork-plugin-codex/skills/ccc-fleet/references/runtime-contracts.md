# Fleet runtime contracts

Reference for `/ccc-fleet`. The helpers live in `../lib/fleet-status.js` (plugin form: `${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js`). Artifacts go to an owner-only directory per run under the lane state dir: `<config dir>/commander/fleet/runs/<run-id>/` (mode 0700, files 0600), with `fleet/current` naming the active run. `/ccc-fleet-viz` and the fleet-watch monitor read the same run; a run directory that is not owned by you or is group/world accessible is ignored.

## Start a run

Before dispatching workers, start a run so this fleet's markers do not mix with an earlier one:

```bash
node -e 'console.log(JSON.stringify(require(process.argv[1]).startFleetRun()))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js"
```

It prints `{"runId":…,"runDir":…}`. Give every worker of this run that id as `CCC_FLEET_RUN_ID=<runId>` in the environment of the helper commands below, so its progress and marker land in this run even when another fleet in the same lane starts later; an id that does not name a private run directory is an error, never a fallback. Without `CCC_FLEET_RUN_ID` the helpers write to the current run (and start one if there is none).

## Worker progress events

Emit one JSON line whenever a worker is dispatched, starts, changes status, finishes tests, fails, or completes. The helper appends it to `worker-progress.jsonl` in the run directory and echoes it to stdout:

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

When a worker exits, successful or not, write its completion marker (`<hash>-complete.json`) in the run directory through the helper (it writes a temp file and renames it, so readers never see a partial marker):

```bash
node -e 'console.log(JSON.stringify(require(process.argv[1]).writeCompletionMarker(process.argv[2], JSON.parse(process.argv[3]))))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js" fleet-1 \
  '{"exit_code":0,"files_written":["src/foo.js"],"commit_hash":"abc1234","branch_pushed":false}'
```

The filename is the first 32 hex characters of the SHA-256 of the worker id, for every id, so two ids never share a marker (including ids that differ only in case or surrounding spaces) and a long id cannot exceed the filename limit. The payload's `worker_id` keeps the id exactly as given, and readers key workers by it, so progress and completion merge into one worker.

Fields: `worker_id`, `exit_code` (integer, required; a failed worker uses its real non-zero code), `files_written`, `commit_hash` (string or null), `branch_pushed` (boolean or null), `completed_at` (set by the helper). The marker is the hand-off contract for synthesis.

## Failure isolation

One worker failure never cancels or rolls back another. Preserve every worktree, branch, diff, progress event and marker. Report the failed worker separately and keep synthesizing the successful ones.

## Cleanup on success

Only after every worker succeeded and the synthesis report is written, prune run directories older than 24 hours (the current run is kept, and so is any run with a worker whose latest status is not terminal and that has no completion marker; a symlinked or non-private run store is refused, a symlinked entry is removed as a link without touching its target, and a run that cannot be read is skipped and listed in `skipped` while the others are still pruned):

```bash
node -e 'console.log(JSON.stringify(require(process.argv[1]).pruneFleetTmp()))' \
  "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet/lib/fleet-status.js"
```

Do not prune after a partial failure; the artifacts are the diagnosis.
