---
description: "Visual context window budget analyzer — shows usage gauge, identifies bloat sources, recommends when to save session and compact."
---

# Context Budget Analyzer

Analyze your Claude Code context window consumption and produce a visual report with actionable recommendations.

## Usage

```
/context-budget              # Summary with gauge and top recommendations
/context-budget --verbose    # Full breakdown per component
```

$ARGUMENTS

## What to Do

Run the **context-budget** skill (`skills/context-budget/SKILL.md`) with the following inputs:

1. Pass `--verbose` flag if present in `$ARGUMENTS`
2. Assume a 200K context window (Claude Sonnet default) unless the user specifies otherwise
3. Follow the skill's five phases: Inventory → Classify → Visual Report → Recommendations → Quick Actions
4. Show the visual gauge, zone indicator, and session-save nudge if usage is high
5. Always end with the Quick Actions block

## Zone Thresholds

| Usage | Zone | Action |
|-------|------|--------|
| 0-50% | GREEN | Continue normally |
| 50-70% | YELLOW | Monitor, consider compacting soon |
| 70-80% | ORANGE | `/ccc-save-session` now, then compact or start fresh |
| 80-90% | RED | `/ccc-save-session` immediately |
| 90%+ | DANGER | STOP. Save and start new session. |

## Related Commands

- `/ccc-save-session` — Save current state for resumption
- `/ccc-resume-session` — Load saved state in fresh context
- `/compact` — Built-in Claude Code command to compress conversation history
