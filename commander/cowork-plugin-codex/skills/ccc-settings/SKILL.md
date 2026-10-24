---
name: ccc-settings
description: "Settings hub: Commander preferences (name, level, cost ceiling, auto-routing, theme, animations, launch mode, Linear, reset) plus Claude Code permission mode, effort, models and workflow size, written with a backup. Use when the user says settings, configure, change theme, set effort, auto mode."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[name | level | cost | routing | theme | animations | launch | linear | reset | mode | effort | models | workflows | --power]"
model: sonnet
effort: low
---

# $ccc-settings — Commander and Claude Code settings

**CC Commander** · $ccc-settings · see current values → pick one → confirm → write with backup → read back

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

## When to use / when not to

- Use to change Commander preferences in `<config dir>/commander/config.json` (`~/.claude/commander/config.json` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`; until the lane has its own copy, read the `~/.claude/commander/config.json` copy and write to the lane), or the Claude Code settings this skill covers in user (`~/.claude/settings.json`) or project (`.claude/settings.json`) settings: permission mode, effort, model restrictions, workflow size.
- Not for switching the current model: that is `/model` in the session, and the user's selected model is preserved.
- Not for cleanup or missing structural keys: `$ccc-tuneup`. Not for unattended permission setups: `$ccc-yolo-setup`.
- `$ARGUMENTS` jumps straight to one setting (`theme`, `effort`, `mode`, …); `linear` runs only the Linear flow; `--power` (or `all`) opens the full menu.
- In Codex, ask each picker as a plain-text question with the same options. The Claude Code settings in Step 4 do not apply to Codex; say so and point to `~/.codex/config.toml` keys `model_reasoning_effort`, `approval_policy` and `sandbox_mode` instead.

## What happens

### 1. Read current values

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
CFG="$CCC_STATE/config.json"; [ -e "$CFG" ] || CFG="$HOME/.claude/commander/config.json"
cat "$CFG" 2>/dev/null || echo '{}'
node -e '
const fs=require("fs"),p=require("path");
const files={user:p.join(process.env.HOME,".claude/settings.json"),project:".claude/settings.json"};
for(const [layer,f] of Object.entries(files)){let j={};try{j=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}
  const pick={defaultMode:(j.permissions||{}).defaultMode,effortLevel:j.effortLevel,availableModels:j.availableModels,availableModelsMatch:j.availableModelsMatch,deniedModels:j.deniedModels,workflowSizeGuideline:j.workflowSizeGuideline,workflowSubagentModel:(j.env||{}).CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL};
  console.log(layer+": "+JSON.stringify(pick));}'
```

Unset values print as missing; treat them as platform defaults (auto permission mode, the model's default effort). Managed settings are not read here; if the user reports a model or mode they cannot change, an administrator's managed settings are the likely cause.

### 2. Top picker

Skip when `$ARGUMENTS` names a setting. Otherwise ask the top picker in Decision points. Below it print: `Or say "back" to return to /ccc.`

### 3. Commander preferences (`<config dir>/commander/config.json`)

Ask the preferences page-1 picker in Decision points; "More…" opens the page-2 picker, and "Other" with "back" returns to page 1. Entries marked CLI-only configure the `ccc` terminal binary and have no effect in Claude Code Desktop or Cowork; show them anyway and say so. The menu definition used by the CLI is [references/settings.json](references/settings.json).

For each setting, ask as below. Value pickers list the 🟢 option first; put the current value in its description.

| Setting | How to ask | Write |
|---|---|---|
| Display name | "What name should I use?" | `name` |
| Experience level | Picker: 🟢 intermediate (balanced detail) / beginner (more explanation, more confirmations) / expert (terse, fewer confirmations). Affects verbosity, auto-confirm thresholds, suggested skill complexity | `level` |
| Cost ceiling | "Max budget per dispatch (USD)?" Validate a positive number. Default 10. The night-mode hard ceiling is separate | `costCeiling` |
| Auto-routing | Picker: 🟢 auto (clear matches run the skill, close ones show a menu; default) / suggest (always a menu, never auto-runs) / off (no routing and no what-next menu). Read by the routing hook from the next prompt on; a `CCC_ROUTE_MODE` environment variable overrides it, so mention it when set | `routeMode` |
| Theme (CLI-only) | Picker: 🟢 Claude Anthropic (default) / OLED Black / Matrix / Surprise me. Apply with `ccc --theme <name>` when available, else it takes effect on the next `ccc` launch | `theme` |
| Animations (CLI-only) | Picker: 🟢 enable (default) / disable (for slow terminals, screen readers or CI). Disabling also means `CC_NO_ANIMATION=1` in the shell profile; print the line for the user to add | `animations` |
| Launch mode (CLI-only) | Picker: 🟢 simple (single pane, default) / advanced (tabbed tmux split, `ccc --split`) | `launchMode` |

File shape (placeholders, not real values):

```json
{
  "name": "<display name>",
  "level": "expert",
  "costCeiling": 10,
  "routeMode": "auto",
  "theme": "claude-anthropic",
  "animations": true,
  "launchMode": "simple",
  "linear": { "teamId": "<team key>", "projectId": "<project slug>" }
}
```

Show the proposed change as `key: old → new` and confirm before writing. Then back up and write the whole object with Write, preserving every key you did not change:

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
cp "$CCC_STATE/config.json" "$CCC_STATE/config.json.backup-$(date +%Y%m%d-%H%M%S)" 2>/dev/null; mkdir -p "$CCC_STATE"
```

Verify with `node -e "const p=require('path');console.log(JSON.parse(require('fs').readFileSync(p.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||p.join(require('os').homedir(),'.claude'),'commander','config.json'),'utf8')).<key>)"` and report the value read back.

**Linear setup** (opt-in, absent by default):

1. Check whether `LINEAR_CC_CLIENT_ID` and `LINEAR_CC_CLIENT_SECRET` are set without printing them: `[ -n "$LINEAR_CC_CLIENT_ID" ] && [ -n "$LINEAR_CC_CLIENT_SECRET" ] && echo set || echo missing`.
2. Missing: tell the user to export both in their shell profile or secrets manager (`export LINEAR_CC_CLIENT_ID=<your_client_id>`, `export LINEAR_CC_CLIENT_SECRET=<your_client_secret>`). Never ask them to paste a secret into the chat.
3. Set: test the connection, show the linked team and project, and offer to change them (write `linear.teamId`, `linear.projectId`).
4. If ~~project tracker is connected, show its connection status, allow switching teams or projects, and after a successful setup offer to import open issues.

**Reset all state:** ask the reset picker. Skills are preserved either way; "Cancel" changes nothing.

1. "Archive, then reset": move whichever of `sessions/` and `knowledge/` exist into a UTC-stamped archive. A missing folder is skipped and reported; if neither exists, report that there is nothing to reset and stop.

   ```bash
   base="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"; stamp=$(date -u +%Y%m%dT%H%M%SZ); dest="$base/reset-archive/$stamp"
   if [ ! -d "$base/sessions" ] && [ ! -d "$base/knowledge" ]; then echo "nothing to reset"; else
     mkdir -p "$dest" || { echo "cannot create $dest"; exit 1; }
     for d in sessions knowledge; do
       if [ -d "$base/$d" ]; then mv "$base/$d" "$dest/$d" && echo "archived $d" || echo "FAILED to move $d"; else echo "skipped $d (missing)"; fi
     done
     echo "archive: $dest"; ls "$dest"; ls "$base"
   fi
   ```

   Look for each existing folder listed under the archive path and absent from `ls "$base"`. On a failed move, stop and report it; nothing has been deleted.
2. "Delete permanently": run `rm -rf "$base/sessions/" "$base/knowledge/"` (with `base` set as in the archive block) (a missing folder is not an error).
3. Verify with `ls "$base"` and report what remains, plus the archive path when archived.

### 4. Claude Code settings (user or project `settings.json`)

Ask the Claude Code picker in Decision points, then the value picker for the chosen setting. For permission mode and workflow size, then ask the settings-layer picker (🟢 user settings unless the user wants this repository only). Effort is always written to user settings. Values, layers and caveats for each are in [references/claude-code-settings.md](references/claude-code-settings.md).

- **Permission mode** → `permissions.defaultMode`. Offer 🟢 `auto` (the interactive default since Claude Code 2.1.284), `default` (ask before edits and commands), `acceptEdits`, `plan`. Mention Shift+Tab to switch for one session. Route `bypassPermissions` requests to `$ccc-yolo-setup`.
- **Effort** → `effortLevel`. Offer `low` / `medium` / 🟢 `high` / `xhigh`. Say that `max` is session-only (`/effort max`), that `/effort` opens the slider, and that `/effort ultracode on|off` is a separate toggle that does not change the effort level.
- **Model restrictions** → `availableModels`, `availableModelsMatch`, `deniedModels`. Show current values from Step 1. These are administrator controls: print a managed-settings snippet from the reference instead of writing them. Use aliases (`fable`, `opus`, `sonnet`, `haiku`) or full ids such as `claude-opus-5-5`.
- **Workflow size** → `workflowSizeGuideline`. Offer `small` / 🟢 `medium` / `large` / `unrestricted`. Mention `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` only if the user wants every workflow agent pinned to one model.

### 5. Write a Claude Code setting

Show `key: old → new` and the target file, confirm, then run (set `F` for the chosen layer, replace the key and JSON value). For project settings, run from the repository root.

```bash
F="$HOME/.claude/settings.json"   # project layer: F=".claude/settings.json"
mkdir -p "$(dirname "$F")"
if [ -f "$F" ]; then B="$F.backup-$(date +%Y%m%d-%H%M%S)"; cp "$F" "$B" && echo "backup: $B"; else echo "no existing file; no backup"; fi
node -e '
const fs=require("fs");const [f,key,raw]=process.argv.slice(1);
const j=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):{};
const ks=key.split(".");let o=j;for(const k of ks.slice(0,-1)){o[k]=o[k]&&typeof o[k]==="object"?o[k]:{};o=o[k];}
o[ks[ks.length-1]]=JSON.parse(raw);fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n");
const back=ks.reduce((x,k)=>x&&x[k],JSON.parse(fs.readFileSync(f,"utf8")));console.log(key+" = "+JSON.stringify(back));' "$F" permissions.defaultMode '"auto"'
```

The printed read-back must equal the chosen value. If the write or parse fails, restore with `cp "<backup path>" "$F"` using the printed backup path, and report the error. New sessions pick up the change; tell the user to restart or use the in-session command (`/effort`, Shift+Tab) for the current one.

## Decision points

Top picker:

```yaml
question: "What would you like to change?"
header: "Settings"
multiSelect: false
options:
  - label: "🟢 Commander preferences"
    description: "Recommended start: touches only Commander's own config.json. Currently: <name> · <level> · $<costCeiling>."
  - label: "Claude Code settings"
    description: "Permission mode, effort, model restrictions, workflow size."
  - label: "Linear setup"
    description: "Opt-in: check credentials, choose team and project."
  - label: "Reset all state"
    description: "Clears Commander sessions and knowledge; skills stay. Asks again before acting."
```

Commander preferences, page 1:

```yaml
question: "Which preference?"
header: "Preferences"
multiSelect: false
options:
  - label: "🟢 Experience level"
    description: "Currently: <level>; changes verbosity and suggestions everywhere."
  - label: "Auto-routing"
    description: "Currently: <routeMode or auto>; auto, suggest (menu only) or off."
  - label: "Cost ceiling"
    description: "Currently: $<costCeiling> per dispatch."
  - label: "More…"
    description: "Display name, then theme, animations, launch mode (CLI-only)."
```

Commander preferences, page 2 (after "More…"):

```yaml
question: "Which other preference? Theme, animations and launch mode affect only the ccc terminal binary."
header: "Preferences"
multiSelect: false
options:
  - label: "🟢 Display name"
    description: "Currently: <name>"
  - label: "Theme"
    description: "Currently: <theme>; applies with ccc --theme or on next launch."
  - label: "Animations"
    description: "Currently: <animations>; disabling also needs CC_NO_ANIMATION=1."
  - label: "Launch mode"
    description: "Currently: <launchMode>; simple single pane or tmux split."
```

Claude Code settings:

```yaml
question: "Which Claude Code setting?"
header: "Claude Code"
multiSelect: false
options:
  - label: "🟢 Permission mode"
    description: "Currently: <defaultMode or auto>. Auto is the interactive default."
  - label: "Effort"
    description: "Currently: <effortLevel or model default>. Higher means more thinking tokens."
  - label: "Model restrictions"
    description: "availableModels / deniedModels; shown, with an admin snippet."
  - label: "Workflow size"
    description: "Currently: <workflowSizeGuideline or unset>; caps dynamic workflow size."
```

Settings layer (permission mode and workflow size only):

```yaml
question: "Which settings file should hold this value?"
header: "Layer"
multiSelect: false
options:
  - label: "🟢 User settings"
    description: "~/.claude/settings.json; applies to every project on this machine."
  - label: "Project settings"
    description: ".claude/settings.json in this repository; overrides user settings and is shared if committed."
```

Reset:

```yaml
question: "Reset Commander sessions and knowledge? Skills are preserved."
header: "Reset"
multiSelect: false
options:
  - label: "🟢 Archive, then reset"
    description: "Moves both folders to <config dir>/commander/reset-archive/<stamp>/; reversible."
  - label: "Delete permanently"
    description: "Removes both folders; cannot be undone."
  - label: "Cancel"
    description: "No change."
```

## Done when

- The chosen value was read back from the file it was written to and reported (`key = value`).
- Each write has a backup path reported, or the file did not exist before.
- For reset, `ls "$base"` shows the folders gone (and the archive path when archived).

## Guardrails

- Never write without showing `old → new` and getting a confirmation; never silently overwrite.
- Back up `config.json` or `settings.json` before every write; write only the picked key and keep all others.
- Never write managed settings; print a snippet for the administrator.
- Never change the user's selected model; `/model` does that.
- Never print, store or ask for a secret value; check presence only.
- Reset requires its own picker answer; config is never reset automatically.

## See also

- `$ccc-tuneup` — audit and add missing structural settings keys
- `$ccc-doctor` — read-only health report
- `$ccc-yolo-setup` — unattended permission setups and their trade-offs
- `$ccc-linear` — work with the opt-in Linear connection

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
