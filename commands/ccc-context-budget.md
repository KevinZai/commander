---
description: "Show how full the context window is, which components use the most of it, and when to save the session and compact. Use when the session feels slow, long or near its context limit."
---

# /ccc-context-budget — gauge context, cut bloat

**CC Commander** · /ccc-context-budget · a usage gauge, the biggest consumers and the next action.

## Usage

```
/ccc-context-budget              # gauge plus top recommendations
/ccc-context-budget --verbose    # full per-component breakdown
```

Arguments: `$ARGUMENTS`

## What happens

1. Load the `context-budget` skill (repo source: [skills/context-budget/SKILL.md](../skills/context-budget/SKILL.md)) and follow its five phases in order: Inventory, Classify, Visual Report, Recommendations, Quick Actions. If the skill is not installed, do the same phases inline: estimate tokens for the system prompt, loaded instructions (`CLAUDE.md`, rules), invoked skills, tool definitions, file reads and conversation turns.
2. Pass `--verbose` through when it appears in `$ARGUMENTS`.
3. Use the window size of the session's model. Current Claude models have a 1M-token window; use a smaller size only when the user names one or the session reports one.
4. Show the gauge and the zone from the table below. Label every figure as an estimate.
5. End with the skill's Quick Actions block.

## Zones

| Usage | Zone | Action |
|---|---|---|
| 0–50% | 🟢 Green | Continue normally |
| 50–70% | 🟡 Yellow | Monitor; plan a compact soon |
| 70–80% | Orange | Run `/ccc-save-session`, then `/compact` or start fresh |
| 80–90% | 🔴 Red | Run `/ccc-save-session` now |
| 90%+ | ⚠️ Danger | Stop new work; save the session and start a new one |

In Orange or above, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Save the session now — runs `/ccc-save-session` so nothing is lost
- Compact in place — runs `/compact`; older detail is summarized
- Keep going — accept the risk of automatic compaction

## Done when

The report shows the gauge, the zone, the top consumers and the Quick Actions block. If the user chose to save, the saved handoff file path is reported.

## See also

`/ccc-save-session` (save state for resumption) · `/ccc-resume-session` (load it in a fresh context) · `/compact` (built-in history compression)
