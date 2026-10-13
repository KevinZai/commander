---
name: ccc-projects
description: "List the projects continuous-learning-v2 knows about, with per-project instinct and observation counts plus global totals. Use when the user asks which projects have learned instincts or wants instinct statistics."
command: true
---

# /ccc-projects — learned-instinct projects

**CC Commander** · /ccc-projects · every registered project with its instinct and observation counts, plus global totals.

## Arguments

None. Any `$ARGUMENTS` text is ignored.

## What happens

1. Run the instinct CLI. Use the plugin-root form when `CLAUDE_PLUGIN_ROOT` is set:

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects
   ```

   Otherwise use the manual-install path:

   ```bash
   python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py projects
   ```

   If neither file exists, report that the continuous-learning-v2 skill is not installed and stop. If the CLI exits non-zero, show its stderr and stop.
2. The CLI reads the registry at `~/.claude/homunculus/projects.json` and prints, for each project (most recently seen first):
   - name, id, root and remote (when set)
   - personal and inherited instinct counts
   - observation event count
   - last-seen timestamp

   It ends with global personal and inherited instinct totals.
3. Present the CLI output as-is. When it prints "No projects registered yet.", say that projects register automatically when continuous-learning-v2 observes work in a git repository; that is not an error.
4. When several projects share the same instinct ids, point to `/ccc-promote --dry-run` to preview promotion to global scope.

## Done when

The CLI output, or its "No projects registered yet." message, has been shown unaltered.

## Guardrails

- Read-only: never edit `projects.json` or any instinct file from this command.
- Do not fabricate counts when the CLI fails; report the failure.

## See also

`/ccc-instinct-status` · `/ccc-promote` · `/ccc-evolve`
