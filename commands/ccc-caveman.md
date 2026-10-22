---
description: "Switch responses to caveman mode at lite, full or ultra intensity to cut output tokens while keeping technical accuracy. Use when iterating fast and you want terse answers."
---

# /ccc-caveman — terse output mode

**CC Commander** · /ccc-caveman · compressed responses for fast iteration; code, commands and error text stay exact.

## Arguments

`$ARGUMENTS`: `lite`, `full` or `ultra` (default `full`); `off` deactivates.

## What happens

1. Read the grammar rules and intensity definitions from the caveman skill: `skills/caveman/SKILL.md` in this repository, or `~/.claude/skills/caveman/SKILL.md` when installed. If neither exists, say the skill is not installed and stop.
2. Activate the requested intensity and confirm in one line:
   - lite: `Caveman lite active. Fluff gone, grammar stays.`
   - full: `Caveman mode. Few words. Full brain.`
   - ultra: `Ultra. Max compress. Go.`
3. Apply the caveman rules to every response until deactivated.
4. Deactivate on `/ccc-caveman off`, "stop caveman" or "normal mode", and confirm with `Normal mode.`

## Done when

The confirmation line for the chosen level (or `Normal mode.`) has been sent.

## Guardrails

- Never compress code blocks, commands, file paths or quoted error messages.
- Safety warnings and confirmation questions stay in full sentences.

## See also

`/ccc-context-budget` · `/ccc-cost`
