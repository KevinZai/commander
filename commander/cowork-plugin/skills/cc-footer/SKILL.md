---
name: cc-footer
description: "CC Commander Footer Bar — render live session status with emoji meters. Use when the user says 'status bar', 'footer', 'show metrics', 'session stats'."
allowed-tools:
  - Bash
  - Read
---

# CC Footer Bar

Render the CCC status footer showing live session metrics. Display this at session start and after every major action.

## Footer Format

```
━━ CCC2.1.0│🔥Opus1M│🔑gAA│🧠▐██45%░░▌│⏱️▐██░░░░░▌5h│📅▐██░░░░░▌7d│💰$2.34│⬆️640K⬇️694K│⏰8h0m│🎯357│📋CC-150│📂~/project
```

## Segment Reference

| Segment | Emoji | Source | Description |
|---------|-------|--------|-------------|
| Version | none | hardcoded | `CCC2.1.0` |
| Model | 🔥 | `$ANTHROPIC_MODEL` env or session context | `Opus1M`, `Sonnet`, `Haiku` |
| Account | 🔑 | session metadata | Account tier: `gAA` (Pro), `gFR` (Free) |
| Context | 🧠 | token count / context limit | `▐██45%░░▌` — % of context window used |
| Time | ⏱️ | session start timestamp | `▐██░░░░░▌5h` — hours elapsed in session |
| Streak | 📅 | `~/.claude/commander/sessions/` count | `▐██░░░░░▌7d` — active days streak |
| Cost | 💰 | session token cost (input + output) | `$2.34` — cumulative session cost |
| Tokens | ⬆️⬇️ | session token counts | `640K` out / `694K` in |
| Uptime | ⏰ | session duration | `8h0m` |
| Skills | 🎯 | skill catalog count | `357` installed skills |
| Task | 📋 | active Linear issue or task | `CC-150` |
| Project | 📂 | current working directory | `~/project` |

## Color Thresholds (for meter bars)

Apply these thresholds to context, time, and streak meters:

- **Green** — below 50%
- **Yellow** — 50% to 80%
- **Red** — above 80%

In plain text (no ANSI), use percentage numbers instead: `45%`, `72%`, `91%`.

## How to Gather Data

Use Bash to collect what's available:

```bash
# Session cost (if ccc is installed)
ccc --stats --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cost','?'))" 2>/dev/null || echo "?"
# Current directory
pwd | sed "s|$HOME|~|"
# Active Linear task (from git branch name)
git branch --show-current 2>/dev/null | grep -oE 'CC-[0-9]+' || echo "none"
```

If a data point is unavailable, show `?` for that segment — never omit the segment entirely.

## Example Outputs

Healthy mid-session (45% context, 5h in, 7-day streak):
```
━━ CCC2.1.0│🔥Sonnet│🔑gAA│🧠45%│⏱️5h│📅7d│💰$1.12│⬆️320K⬇️340K│⏰5h0m│🎯357│📋CC-150│📂~/my-project
```

Late-session warning (85% context, cost approaching limit):
```
━━ CCC2.1.0│🔥Sonnet│🔑gAA│🧠85%│⏱️8h│📅7d│💰$9.20│⬆️900K⬇️950K│⏰8h30m│🎯357│📋CC-200│📂~/big-project
```

## Source

`commander/cockpit.js` — `renderCockpitFooter()` function. CLI equivalent: `ccc --status`.
