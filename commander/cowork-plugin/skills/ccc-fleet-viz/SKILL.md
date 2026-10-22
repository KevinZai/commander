---
name: ccc-fleet-viz
description: "Show a /ccc-fleet run as a live tree of workers (done, running, failed, waiting) with branches and a Mermaid diagram, refreshing until every worker finishes. Use when the user asks for fleet progress, types /ccc-fleet-viz, or a /ccc-fleet run completes."
allowed-tools:
  - Read
  - Bash
  - Glob
model: sonnet
effort: low
argument-hint: "[--watch | --state-dir=PATH]"
---

# /ccc-fleet-viz — the fleet as a tree

**CC Commander** · /ccc-fleet-viz · one tree per fleet run: each worker, its branch, and where it is stuck.

This skill renders in the chat only. It publishes nothing and reads only local state.

## When to use / when not to

- Use during or right after a `/ccc-fleet` run. `/ccc-fleet` calls it once when synthesis completes.
- Use `/ccc-mission-control` for every agent on the machine, not just one fleet run.

## What happens

1. Run the renderer from the repository root:
   ```bash
   if [ -f "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet-viz/lib/render-fleet-tree.js" ]; then
     node "${CLAUDE_PLUGIN_ROOT}/skills/ccc-fleet-viz/lib/render-fleet-tree.js" --watch
   else
     node commander/cowork-plugin/skills/ccc-fleet-viz/lib/render-fleet-tree.js --watch
   fi
   ```
   Without `--watch` it prints one snapshot and exits. `--state-dir=PATH` reads markers from another directory.
2. It reads `/tmp/ccc-fleet/*-status.json`, `/tmp/ccc-fleet/*-complete.json`, `/tmp/ccc-fleet/worker-progress.jsonl` when present, and `git worktree list --porcelain`. Malformed markers are skipped, not fatal.
3. stdout is an ASCII tree followed by a fenced `mermaid` `graph TD` block. While any worker is `running`, `waiting` or `unknown`, it refreshes every 2 seconds; when all are `done` or `failed`, it prints the final snapshot and exits.
4. Show the final tree and the Mermaid block in your reply (the Mermaid block renders as a diagram in the chat), then one line per failed worker with its reason.

Expected shape:

```text
/ccc-fleet (orchestrator) — 4 workers, 2 done, 1 running, 1 failed
├── ✅ W1 build        → fleet/w1-build @ 0019f10
├── ✅ W2 docs         → fleet/w2-docs @ a0a3cb8
├── 🔄 W3 tests        → 18 of 40 passing
└── ❌ W4 migrate      → blocked: merge conflict
```

No markers at all: say "No fleet run found in /tmp/ccc-fleet. Start one with `/ccc-fleet`." and stop.

## Done when

- The renderer exited 0 and the reply contains its final tree and Mermaid block, or the no-run message.

## Guardrails

- Never reimplement the renderer in `/ccc-fleet` or in the reply; this script is the one rendering path.
- Never edit, delete or "fix" marker files; report them.
- The output stays in this chat. If the user wants a shareable page, point to `/ccc-mission-control`, which publishes after consent.

## See also

- `/ccc-fleet` — start a parallel run
- `/ccc-mission-control` — every agent on the machine
- `/ccc-console` — the all-tabs inline view

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
