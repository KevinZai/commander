---
name: ccc-instinct-export
description: "Export learned instincts from project, global or both scopes to a shareable YAML file, filtered by domain or confidence. Use when sharing instincts with teammates, moving them to another machine, or seeding project conventions."
command: /ccc-instinct-export
---

# /ccc-instinct-export — share learned instincts

**CC Commander** · /ccc-instinct-export · writes instincts from the continuous-learning store to YAML you can share or re-import.

## Usage

```
/ccc-instinct-export                                  # all scopes, printed to stdout
/ccc-instinct-export --domain testing                 # one domain only
/ccc-instinct-export --min-confidence 0.7             # high-confidence only
/ccc-instinct-export --output team-instincts.yaml
/ccc-instinct-export --scope project --output project-instincts.yaml
```

The flags are `$ARGUMENTS`.

| Flag | Meaning |
|---|---|
| `--scope project\|global\|all` | `project`: current project only · `global`: global only · `all` (default): project and global merged |
| `--domain <name>` | Export only that domain |
| `--min-confidence <n>` | Minimum confidence, 0 to 1 |
| `--output <file>` (`-o`) | Output path; prints to stdout when omitted |

## What happens

1. **Locate the CLI.** Run in one Bash call:

   ```bash
   CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py}"
   [ -f "$CLI" ] || CLI="$HOME/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py"
   [ -f "$CLI" ] && echo "cli: $CLI" || echo "cli: missing"
   ```

   On `cli: missing`, stop and report that the `continuous-learning-v2` skill is not installed.

2. **Check the target.** If `--output` names a file that already exists (`test -e <output-file> && echo exists`), ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Pick a new name — keep the existing file untouched
   - Overwrite it — the old export is replaced

3. **Export.** Pass the user's flags through unchanged. The CLI detects the current project (git remote or path hash), loads the selected scope, applies the filters and writes the file.

   ```bash
   python3 "$CLI" export $ARGUMENTS
   ```

   A non-zero exit or a Python traceback is a failure: report the error text and stop.

4. **Verify.** With `--output`, confirm the file exists and parses as instinct YAML:

   ```bash
   ls -la <output-file> && grep -c '^id:' <output-file>
   ```

   Report the path and the instinct count from `grep -c`, not from memory. Without `--output`, report the count of `id:` lines in the printed output.

## Output format

Each instinct is a YAML frontmatter block followed by its Markdown body:

```yaml
# Instincts Export
# Generated: <date>
# Source: personal

---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.8
domain: code-style
source: session-observation
scope: project
project_id: a1b2c3d4e5f6
project_name: my-app
---

# Prefer Functional Style

## Action
Use functional patterns over classes.
```

## Guardrails

- Never write over an existing `--output` file without the step 2 answer.
- Exported files can carry project names and ids; tell the user to review the file before sharing it outside the team.

## See also

- `/ccc-instinct-import` — load an exported file
- `/ccc-instinct-status` — see what would be exported
- `/ccc-evolve` — turn instincts into skills, commands or agents
