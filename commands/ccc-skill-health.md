---
name: ccc-skill-health
description: "Show a skill health dashboard: 30-day success-rate sparklines, clustered failure reasons, pending amendments and version history per skill. Use when checking which skills are declining or what amendments await review."
command: true
---

# /ccc-skill-health — which skills are slipping

**CC Commander** · /ccc-skill-health · a dashboard of skill success, failures and pending amendments.

The dashboard script ships with the Everything Claude Code toolkit (`scripts/skills-health.js`), an opt-in install that is absent by default.

## Arguments

`$ARGUMENTS`:

- empty — full dashboard
- `--panel failures` — one panel only (any panel name below)
- `--json` — machine-readable output

## Panels

- **Success rate (30d)** — daily success-rate sparkline per skill
- **Failure patterns** — clustered failure reasons as a bar chart
- **Pending amendments** — amendment proposals awaiting review
- **Version history** — timeline of version snapshots per skill

## What happens

1. Locate the script:

   ```bash
   for d in "${CLAUDE_PLUGIN_ROOT:-}" "$HOME/.claude" "$HOME"/.claude/plugins/cache/everything-claude-code/*/*; do
     [ -n "$d" ] && [ -f "$d/scripts/skills-health.js" ] && { echo "$d"; break; }
   done
   ```

   If nothing prints, say the dashboard script is not installed and stop.

2. Run it with the printed directory, adding the flags from `$ARGUMENTS`:

   ```bash
   node "<printed dir>/scripts/skills-health.js" --dashboard [--panel <name>] [--json]
   ```

   On a non-zero exit, show stderr and stop.

3. Show the output as printed. Do not restate numbers the script did not report.

4. Interpret it in two or three lines:
   - Name any skill whose success rate is declining, and suggest `/ccc-evolve` to rework it.
   - If amendments are pending, list them and suggest reviewing each one before it is applied.
   - If there is no run data yet, say that the dashboard fills in as skills are used.

## Done when

The dashboard (or the requested panel) printed from the script, and every highlighted skill appears in that output.

## Guardrails

- Read-only: never apply an amendment or edit a skill from this command.

## See also

`/ccc-evolve` · `/ccc-rules-distill` · `/ccc-skill-create`
