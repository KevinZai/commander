---
name: theme
description: "Switch between visual theme skins — OLED Black, Matrix, Claude Anthropic, Surprise Me"
usage: /theme [list|set|preview|random]
version: 1.3.0
---

# Theme — Visual Skin Switcher

## Available Themes

| Skin | ID | Description |
|------|-----|-------------|
| Claude Anthropic | `claude` | Professional warm amber on deep navy (DEFAULT) |
| OLED Black | `oled` | Pure black background for OLED displays |
| Matrix | `matrix` | Classic green-on-black with CRT scanline effect |
| Surprise Me | `random` | Random curated palette each session |

## Subcommands

### `/theme list`

Display all available themes with color swatches:

```
THEMES:
  ● claude   — Warm amber (#D97706) on deep navy (#0F0F1A)  [DEFAULT]
  ● oled     — White (#FFFFFF) on pure black (#000000)
  ● matrix   — Matrix green (#00FF41) on black (#0A0A0A)
  ● random   — Surprise palette (cyberpunk / sunset / arctic / coral / neon)
```

### `/theme set [name]`

Switch to a theme. Sets `CC_THEME` in bible-config.json and updates the dashboard.

1. Validate theme name against available options
2. Update `~/.claude/bible-config.json` → `"theme": "[name]"`
3. If dashboard is running, it picks up the change via localStorage
4. Confirm: `Theme set to [name]. Terminal colors will apply on next session.`

### `/theme preview [name]`

Show a color swatch preview without switching:

```
THEME PREVIEW: Matrix
  Background: ██ #0A0A0A
  Primary:    ██ #00FF41
  Secondary:  ██ #00CC33
  Accent:     ██ #00FFFF
  Success:    ██ #00FF00
  Warning:    ██ #FFAA00
  Error:      ██ #FF0000
```

### `/theme random`

Apply a random palette from the curated pool:
- Cyberpunk (Pink + Electric Blue)
- Sunset (Orange + Purple)
- Arctic (Ice Blue + Frost — Nord-inspired)
- Coral Reef (Coral + Teal)
- Neon (Lime + Hot Pink)

Shows which palette was selected.

## Configuration

- **Config file**: `~/.claude/bible-config.json` → `"theme": "claude"`
- **Env override**: `CC_THEME=matrix` (takes precedence over config)
- **Dashboard**: Reads from localStorage `cc-dashboard-theme`
- **Terminal hooks**: Read from config via `lib/themes.js` → `getTheme()`

## Integration

- Terminal art (`lib/terminal-art.sh`) sources `lib/themes.sh` for color vars
- Node hooks (`hooks/*.js`) import `lib/themes.js` for ANSI codes
- Dashboard CSS loads `themes/*.css` based on `data-theme` attribute
- iTerm2 profiles available in `compatibility/` for each theme
