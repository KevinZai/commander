---
name: ccc-promote
description: "Promote project-scoped instincts to global scope, either one instinct by id or every cross-project candidate, after a dry-run preview. Use when an instinct proves useful across projects or /ccc-evolve reports promotion candidates."
command: true
---

# /ccc-promote — move instincts to global scope

**CC Commander** · /ccc-promote · previews promotion candidates, asks once, then writes the promoted instincts as global.

## Arguments

`$ARGUMENTS`:

- empty — auto-detect candidates and promote the ones the user approves
- `--dry-run` — preview auto-detected candidates only; write nothing
- `--force` — promote every qualified candidate without the picker (the user has already approved by passing it)
- `<instinct-id>` — promote one instinct from the current project, for example `/ccc-promote grep-before-edit`

## What happens

1. Resolve the CLI path. Use `"${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py"` when `CLAUDE_PLUGIN_ROOT` is set, otherwise `~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py`. If neither exists, report that continuous-learning-v2 is not installed and stop. The examples below use `$CLI` for the resolved path.
2. Preview. The CLI's own confirmation reads from stdin, which a tool call cannot answer, so always preview first and confirm with a picker.
   - Auto mode (no id):

     ```bash
     python3 "$CLI" promote --dry-run
     ```

     The CLI detects the current project and lists instincts that appear in at least the CLI's minimum number of projects with average confidence at or above its threshold (both are constants in `instinct-cli.py`; quote the criteria line it prints rather than restating numbers). If it reports no candidates, say so and stop. With `--dry-run` in `$ARGUMENTS`, stop after showing this output.
   - Specific id: confirm the instinct exists in the current project:

     ```bash
     python3 "$CLI" status
     ```

     If the id is absent from the project section, or already present in global scope, report that and stop.
3. Decide. Unless `--force` was passed, ask with AskUserQuestion (Codex: ask the same question in plain text):
   - 🟢 **Promote** — write the listed instincts to global scope.
   - **Cancel** — change nothing.
4. Promote:

   ```bash
   python3 "$CLI" promote --force                 # auto mode
   python3 "$CLI" promote <instinct-id> --force   # one instinct
   ```

   The CLI writes each promoted instinct to `~/.claude/homunculus/instincts/personal/<id>.yaml` with `scope: global`. In auto mode it keeps the highest-confidence copy and records `seen_in_projects`. If it exits non-zero, show stderr and stop.
5. Verify:

   ```bash
   ls -l ~/.claude/homunculus/instincts/personal/<id>.yaml
   python3 "$CLI" status
   ```

   Report each promoted id and confirm it now appears under global instincts.

## Done when

Every promoted id has a file under `~/.claude/homunculus/instincts/personal/` and shows as global in `status` output, or the user cancelled and nothing was written.

## Guardrails

- Write only after the picker answer or an explicit `--force`.
- Writes stay under `~/.claude/homunculus/`; never edit project instinct files from this command.
- Invalid instinct ids are rejected by the CLI; do not work around the rejection by writing files by hand.

## See also

`/ccc-projects` · `/ccc-evolve` · `/ccc-instinct-status` · `/ccc-instinct-export`
