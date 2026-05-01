---
name: improve-commands
description: "[C:meta] — Audit and improve the slash command library — prune stale commands, identify gaps, enhance existing ones"
usage: /improve-commands
version: 1.3.0
---

# Improve Commands — Command Library Audit

Perform a comprehensive audit of all slash commands in `~/.claude/commands/`.

## Step 1: Inventory

List all command files with:
- File name
- Description (from frontmatter)
- Last modified date
- Line count (complexity indicator)

## Step 2: Quality Check

For each command, evaluate:
- **Clarity**: Is the description clear? Does the name match what it does?
- **Completeness**: Does it cover all steps needed?
- **Output format**: Does it define a structured output?
- **Edge cases**: Does it handle when things go wrong?
- **Freshness**: Is it still relevant to current workflows?

## Step 3: Gap Analysis

Check if these essential categories are covered:
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

## Step 4: Recommendations

Output a prioritized list:

```
COMMAND AUDIT REPORT

Total commands: [count]
Healthy: [count]
Needs update: [count]
Stale (remove): [count]
Missing (create): [count]

UPDATES NEEDED:
1. [command] — [what to fix]
2. ...

COMMANDS TO ADD:
1. [name] — [what it would do]
2. ...

COMMANDS TO REMOVE:
1. [name] — [why it's stale]
2. ...
```

## Step 5: Auto-Fix (if approved)

For each recommended change, ask for confirmation before:
- Updating command content
- Creating new command files
- Archiving stale commands (move to `commands/archive/`)
