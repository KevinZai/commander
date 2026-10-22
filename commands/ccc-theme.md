---
name: ccc-theme
description: "List, preview or switch the Commander terminal color theme (Claude, OLED Black, Matrix, or a random palette) used by hooks and terminal art. Use when the user asks to change the theme, colors or skin."
usage: /ccc-theme [list|set <name>|preview <name>|random]
version: 1.3.0
---

# /ccc-theme — switch the terminal skin

**CC Commander** · /ccc-theme · reads the theme definitions from `lib/themes.js` and writes the chosen theme to the Commander config.

## Themes

| Skin | ID | Look |
|---|---|---|
| Claude Anthropic | `claude` | Warm amber `#D97706` on deep navy `#0F0F1A` (default) |
| OLED Black | `oled` | White `#FFFFFF` on pure black `#000000` |
| Matrix | `matrix` | Green `#00FF41` on black `#0A0A0A` |
| Surprise Me | `random` | One curated palette per session: cyberpunk, sunset, arctic, coral, neon |

The definitions live in `lib/themes.js` (`THEMES`, `RANDOM_PALETTES`) and `lib/themes.sh`. The installed copy is under `~/.claude/lib/`; in a repo checkout use `lib/`. Below, `THEMES_JS` means whichever of those exists:

```bash
THEMES_JS="$HOME/.claude/lib/themes.js"; [ -f "$THEMES_JS" ] || THEMES_JS="$PWD/lib/themes.js"
```

## Arguments

`$ARGUMENTS` is one of `list`, `set <name>`, `preview <name>`, `random`. Empty means `list` followed by the picker in step 2 of `set`.

## What happens

### `list`

Print every theme with its colors and mark the active one:

```bash
node -e 'const t=require(process.argv[1]); const a=t.getTheme().name; for (const [id,v] of Object.entries(t.THEMES)) console.log((v.name===a?"● ":"  ")+id.padEnd(8)+v.name+"  bg "+v.css.bg+"  primary "+v.css.primary+"  accent "+v.css.accent); console.log("  random  palettes: "+t.RANDOM_PALETTES.map(p=>p.name).join(", "))' "$THEMES_JS"
```

### `preview <name>`

Show the theme without switching: print `THEMES[<name>].css` (bg, primary, accent, emerald) and a sample line in its ANSI colors:

```bash
node -e 'const t=require(process.argv[1]).THEMES[process.argv[2]]; if(!t){console.error("unknown theme");process.exit(1)} console.log(t.name, t.css); console.log(t.primary+"primary "+t.accent+"accent "+t.success+"success "+t.warn+"warn "+t.error+"error"+t.reset)' "$THEMES_JS" <name>
```

### `set <name>`

1. Validate `<name>` against `claude`, `oled`, `matrix`, `random`. If it is missing or unknown, ask with AskUserQuestion (plain-text question where it is unavailable): 🟢 claude (default, amber on navy) · oled (white on black, for OLED screens) · matrix (green on black) · random (new palette each session).
2. Write the choice to `~/.claude/bible-config.json`, preserving every other key:

   ```bash
   node -e 'const fs=require("fs"),p=require("os").homedir()+"/.claude/bible-config.json"; let c={}; try{c=JSON.parse(fs.readFileSync(p,"utf8"))}catch(e){if(e.code!=="ENOENT"){console.error("cannot parse "+p+": "+e.message);process.exit(1)}} c.theme=process.argv[1]; fs.writeFileSync(p, JSON.stringify(c,null,2)+"\n")' <name>
   ```

3. If `CC_THEME` is set in the environment, tell the user it overrides the config file and must be changed or unset for the new theme to apply.
4. Verify: `node -e 'console.log(JSON.parse(require("fs").readFileSync(require("os").homedir()+"/.claude/bible-config.json","utf8")).theme)'` prints `<name>`. Report: `Theme set to <name>. Terminal colors apply from the next session.`

### `random`

Run `set random`. Each new session then picks one palette from `RANDOM_PALETTES` on top of the `claude` base. Report the pool of palette names.

## How the theme is resolved

- `CC_THEME` environment variable wins (for example `CC_THEME=matrix`).
- Otherwise Node hooks and scripts call `getTheme()` from `lib/themes.js`, which reads `"theme"` from `~/.claude/bible-config.json`, defaulting to `claude`.
- Shell scripts call `cc_load_theme` from `lib/themes.sh`, which reads `CC_THEME` only.
- `CC_NO_COLOR=1` or `NO_COLOR` disables color everywhere.
- Matching iTerm2 color profiles for `claude`, `oled` and `matrix` are in `compatibility/*.itermcolors`; import them in iTerm2 to match the terminal background.

## Done when

The verify command in `set` step 4 prints the chosen theme, or for `list` and `preview` the command output is shown.

## Guardrails

- Never overwrite other keys in `~/.claude/bible-config.json`; a parse failure of an existing file is reported, not replaced, unless the user confirms.
- Do not edit `lib/themes.js` or `lib/themes.sh` from this command.

## See also

`/ccc-settings` · `/ccc-tuneup`
