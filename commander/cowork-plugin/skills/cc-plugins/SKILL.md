---
name: cc-plugins
description: "CC Commander Plugin Manager — detect installed Claude Code packages, show orchestration plan. Use when the user says 'what plugins do I have', 'show installed packages', 'plugin status', or 'orchestration plan'."
allowed-tools:
  - Read
  - Glob
  - Bash
  - AskUserQuestion
---

# Plugin Manager

Detect and report on installed Claude Code packages, then show an orchestration plan for the current build.

## Step 1 — Detect Installed Plugins Programmatically

Scan directories using Bash to find package signature files:

```bash
# gstack: look for plan-ceo-review, plan-eng-review, qa commands
ls ~/.claude/commands/ 2>/dev/null | grep -E 'plan-ceo|plan-eng'
# Compound Engineering: look for ce: prefixed commands
ls ~/.claude/commands/ 2>/dev/null | grep -E '^ce:|compound'
# Superpowers: look for standalone plan, tdd, verify commands
ls ~/.claude/commands/ 2>/dev/null | grep -E '^plan$|^tdd$|^verify$'
# ECC: look for hooks.json and agents directory
test -f ~/.claude/hooks.json && echo "ecc:hooks" && ls ~/.claude/agents/ 2>/dev/null | wc -l
# Simone: look for simone command
ls ~/.claude/commands/ 2>/dev/null | grep simone
```

## Step 2 — Display Status Report

```
Installed Claude Code Packages
────────────────────────────────────────────────────
gstack              ✓ INSTALLED   /plan-ceo-review, /plan-eng-review, /qa
Compound Eng        ✓ INSTALLED   /ce:plan, /ce:review, /ce:compound
Superpowers         ✗ NOT FOUND
ECC                 ✓ INSTALLED   28 agents, hooks.json present
Simone              ✗ NOT FOUND

CC Commander        ✓ ACTIVE      450+ skills, 83 commands, 28 hooks
```

## Step 3 — Show Orchestration Plan

Display the 8-phase build pipeline with the best available tool per phase:

```
Build Orchestration Plan
─────────────────────────────────────────────────────────
Phase 1: Clarify     → CC Commander spec-interviewer
Phase 2: Decide      → gstack /plan-ceo-review        [if installed]
                       CC Commander spec flow          [fallback]
Phase 3: Plan        → CC Commander /plan
                       Superpowers /plan               [if installed]
Phase 4: Execute     → CC Commander dispatcher
Phase 5: Review      → Compound Eng /ce:review        [if installed]
                       CC Commander /review            [fallback]
Phase 6: Test        → gstack /qa                     [if installed]
                       CC Commander /qa                [fallback]
Phase 7: Learn       → Compound Eng /ce:compound      [if installed]
                       CC Commander knowledge base     [fallback]
Phase 8: Ship        → CC Commander /ship + git commit
```

Phases marked `[if installed]` only appear when that package is detected.

## Step 4 — Recommend Next Action

Use AskUserQuestion:
- "Run full orchestration plan for my current task" → execute phases in order
- "Install a missing package" → show install commands for uninstalled packages
- "See what each package does" → display Known Packages table below
- "Back to main menu"

## Known Packages Reference

| Package | Author | Stars | Best For |
|---------|--------|-------|----------|
| gstack | Garry Tan | 58K | CEO/Eng decision gates, QA |
| Compound Engineering | Every Inc | 11.5K | Knowledge compounding, deep review |
| Superpowers | Jesse Vincent | 29K | Structured plan→tdd→verify workflow |
| ECC (Everything CC) | Community | 120K | Lifecycle hooks, 28 agents, profiles |
| Simone | banagale | 3K | PM framework, sprint planning |

## Install Commands

```bash
# ECC (Everything Claude Code)
curl -fsSL https://raw.githubusercontent.com/anthropics/everything-claude-code/main/install.sh | bash

# CC Commander (this package)
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```
