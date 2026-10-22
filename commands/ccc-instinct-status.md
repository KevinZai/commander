---
name: ccc-instinct-status
description: "Show learned instincts for the current project and global scope, grouped by domain with confidence bars and observation stats. Use when checking what the continuous-learning system has picked up or before exporting or promoting instincts."
command: true
---

# /ccc-instinct-status — what has been learned

**CC Commander** · /ccc-instinct-status · a read-only view of project and global instincts by domain and confidence.

## Usage

```
/ccc-instinct-status
```

## What happens

1. **Locate the CLI.** Run in one Bash call:

   ```bash
   CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py}"
   [ -f "$CLI" ] || CLI="$HOME/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py"
   [ -f "$CLI" ] && echo "cli: $CLI" || echo "cli: missing"
   ```

   On `cli: missing`, stop and report that the `continuous-learning-v2` skill is not installed.

2. **Show status.**

   ```bash
   python3 "$CLI" status
   ```

   The CLI detects the current project (git remote or path hash), reads project instincts from `~/.claude/homunculus/projects/<project-id>/instincts/` and global instincts from `~/.claude/homunculus/instincts/`, merges them (a project instinct overrides a global one with the same id) and prints them by domain.

3. **Report.** Show the CLI output as-is. If it reports zero instincts, say so and point to the observer hook in the `continuous-learning-v2` skill, which records observations that later become instincts. A traceback is a failure: report the error text.

## Output shape

```
============================================================
  INSTINCT STATUS - 12 total
============================================================

  Project: my-app (a1b2c3d4e5f6)
  Project instincts: 8
  Global instincts:  4

## PROJECT-SCOPED (my-app)
  ### WORKFLOW (3)
    ███████░░░  70%  grep-before-edit [project]
              trigger: when modifying code

## GLOBAL (apply to all projects)
  ### SECURITY (2)
    █████████░  85%  validate-user-input [global]
              trigger: when handling user input
```

## Guardrails

- Read-only: never edit or delete instinct files from this command.

## See also

- `/ccc-instinct-export` — share instincts as YAML
- `/ccc-instinct-import` — adopt a shared file
- `/ccc-promote` — move project instincts to global scope
- `/ccc-evolve` — cluster instincts into skills, commands or agents
