---
name: ccc-improve-commands
description: "Audit the slash command library: inventory every command, grade quality, find missing categories, and apply approved updates, additions, and archivals. Use when the command library feels stale, duplicated, or incomplete."
usage: /ccc-improve-commands
version: 1.3.0
---

# /ccc-improve-commands — command library audit

**CC Commander** · /ccc-improve-commands · a prioritized report of commands to update, add, and archive, then the approved fixes.

Target: `~/.claude/commands/`. If `$ARGUMENTS` names another directory (for example `.claude/commands`), audit that instead.

## What happens

### 1. Inventory

Run:

```bash
for f in ~/.claude/commands/*.md ~/.claude/commands/**/*.md; do
  [ -f "$f" ] || continue
  printf '%s\t%s\t%s\n' "$f" "$(date -r "$f" +%Y-%m-%d)" "$(wc -l < "$f")"
done
```

For each file record the name, the `description` from its frontmatter, last-modified date, and line count (a complexity signal). Skip `archive/`.

### 2. Quality check

1. If the Claude Code CLI is available, run `/doctor prompt-audit` and fold its findings for commands into this report.
2. Grade each command on:
   - **Clarity** — the description says what it does; the name matches the behavior
   - **Completeness** — every step needed is present, with exact commands
   - **Output format** — a defined, structured output
   - **Edge cases** — what happens when a step fails
   - **Freshness** — still relevant to current workflows; no stale model names, version literals, or typed-letter menus

### 3. Gap analysis

Mark each category covered or missing:

- [ ] Code review / quality gate
- [ ] Testing (generation, TDD, coverage)
- [ ] Deployment (check, deploy, rollback)
- [ ] Debugging (session, investigation)
- [ ] Feature workflow (start, plan, ship)
- [ ] Documentation (generate, update)
- [ ] Git operations (checkpoint, commit, PR)
- [ ] Session management (save, resume, compact)
- [ ] Team coordination (peers, spawn, status)
- [ ] Project setup (init, configure)

### 4. Recommendations

```
COMMAND AUDIT REPORT

Total commands: <n>
Healthy: <n>
Needs update: <n>
Stale (archive): <n>
Missing (create): <n>

UPDATES NEEDED:
1. <command> — <what to fix>

COMMANDS TO ADD:
1. <name> — <what it would do>

COMMANDS TO ARCHIVE:
1. <name> — <why it is stale>
```

Counts come from the inventory in step 1, not estimates.

### 5. Apply approved changes

For each recommendation, ask with AskUserQuestion (plain-text question where unavailable), batching up to four related items per question:

- 🟢 Apply — show the diff or new file content first, then write it
- Skip — leave it for later
- Edit first — the user adjusts the proposal before it is applied

Archival moves the file to `~/.claude/commands/archive/` (`mkdir -p` first, then `mv`); nothing is deleted.

Verify: re-run the step 1 inventory and report the before and after totals, plus each file changed.

## Done when

The report has been printed from the actual inventory, and every applied change shows in the re-run inventory.

## Guardrails

- No file is written, created or moved without an Apply pick for that item.
- Stale commands are archived, never deleted.

## See also

`/ccc-skill-health` · `/ccc-improve` · `/ccc-harness-audit` · `/ccc-skill-create`
