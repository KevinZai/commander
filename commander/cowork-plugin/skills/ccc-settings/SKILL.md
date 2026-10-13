---
name: ccc-settings
description: "Settings hub: Commander preferences (name, level, cost ceiling, theme, animations, launch mode, Linear, reset) plus Claude Code permission mode, effort, model restrictions and workflow size, each written with a backup. Use when the user says settings, configure, change theme, set effort, auto mode."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[name | level | cost | theme | animations | launch | linear | reset | mode | effort | models | workflows | --power]"
model: sonnet
effort: low
---

# /ccc-settings — Commander and Claude Code settings

**CC Commander** · /ccc-settings · see current values → pick one → confirm → write with backup → read back

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

## When to use / when not to

- Use to change Commander preferences in `~/.claude/commander/config.json`, or the Claude Code settings this skill covers in `~/.claude/settings.json`: permission mode, effort, model restrictions, workflow size.
- Not for switching the current model: that is `/model` in the session, and the user's selected model is preserved.
- Not for cleanup or missing structural keys: `/ccc-tuneup`. Not for unattended permission setups: `/ccc-yolo-setup`.
- `$ARGUMENTS` jumps straight to one setting (`theme`, `effort`, `mode`, …); `linear` runs only the Linear flow; `--power` (or `all`) opens the full menu.
- In Codex, ask each picker as a plain-text question with the same options. The Claude Code settings in Step 4 do not apply to Codex; say so and point to `~/.codex/config.toml` keys `model_reasoning_effort`, `approval_policy` and `sandbox_mode` instead.

## What happens

### 1. Read current values

```bash
cat ~/.claude/commander/config.json 2>/dev/null || echo '{}'
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

### 3. Commander preferences (`~/.claude/commander/config.json`)

Ask the preferences pickers (two pages of four, same pattern as `/ccc-more`). Entries marked CLI-only configure the `ccc` terminal binary and have no effect in Claude Code Desktop or Cowork; show them anyway and say so. The menu definition used by the CLI is [references/settings.json](references/settings.json).

| Setting | How to ask | Write |
|---|---|---|
| Display name | "What name should I use?" | `name` |
| Experience level | Picker: beginner / intermediate / expert. Affects verbosity, auto-confirm thresholds, suggested skill complexity | `level` |
| Cost ceiling | "Max budget per dispatch (USD)?" Validate a positive number. Default 10. The night-mode hard ceiling is separate | `costCeiling` |
| Theme (CLI-only) | Picker: Claude Anthropic (default) / OLED Black / Matrix / Surprise me. Apply with `ccc --theme <name>` when available, else it takes effect on the next `ccc` launch | `theme` |
| Animations (CLI-only) | Picker: enable / disable. Disabling also means `CC_NO_ANIMATION=1` in the shell profile; print the line for the user to add | `animations` |
| Launch mode (CLI-only) | Picker: simple (single pane) / advanced (tabbed tmux split, `ccc --split`) | `launchMode` |

File shape (placeholders, not real values):

```json
{
  "name": "<display name>",
  "level": "expert",
  "costCeiling": 10,
  "theme": "claude-anthropic",
  "animations": true,
  "launchMode": "simple",
  "linear": { "teamId": "<team key>", "projectId": "<project slug>" }
}
```

Show the proposed change as `key: old → new` and confirm before writing. Then back up and write the whole object with Write, preserving every key you did not change:

```bash
cp ~/.claude/commander/config.json ~/.claude/commander/config.json.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null; mkdir -p ~/.claude/commander
```

Verify with `node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/commander/config.json','utf8')).<key>)"` and report the value read back.

**Linear setup** (opt-in, absent by default):

1. Check whether `LINEAR_CC_CLIENT_ID` and `LINEAR_CC_CLIENT_SECRET` are set without printing them: `[ -n "$LINEAR_CC_CLIENT_ID" ] && [ -n "$LINEAR_CC_CLIENT_SECRET" ] && echo set || echo missing`.
2. Missing: tell the user to export both in their shell profile or secrets manager (`export LINEAR_CC_CLIENT_ID=<your_client_id>`, `export LINEAR_CC_CLIENT_SECRET=<your_client_secret>`). Never ask them to paste a secret into the chat.
3. Set: test the connection, show the linked team and project, and offer to change them (write `linear.teamId`, `linear.projectId`).
4. If ~~project tracker is connected, show its connection status, allow switching teams or projects, and after a successful setup offer to import open issues.

**Reset all state:** ask the reset picker. "Archive, then reset" moves `~/.claude/commander/sessions/` and `~/.claude/commander/knowledge/` into `~/.claude/commander/reset-archive/<UTC-stamp>/`; "Delete permanently" runs `rm -rf ~/.claude/commander/sessions/ ~/.claude/commander/knowledge/`. Skills are preserved either way. Verify with `ls ~/.claude/commander/` and report what remains.

### 4. Claude Code settings (`~/.claude/settings.json`)

Ask the Claude Code picker in Decision points, then the value picker for the chosen setting. Values, layers and caveats for each are in [references/claude-code-settings.md](references/claude-code-settings.md).

- **Permission mode** → `permissions.defaultMode`. Offer 🟢 `auto` (the interactive default since Claude Code 2.1.284), `default` (ask before edits and commands), `acceptEdits`, `plan`. Mention Shift+Tab to switch for one session. Route `bypassPermissions` requests to `/ccc-yolo-setup`.
- **Effort** → `effortLevel`. Offer `low` / `medium` / 🟢 `high` / `xhigh`. Say that `max` is session-only (`/effort max`), that `/effort` opens the slider, and that `/effort ultracode on|off` is a separate toggle that does not change the effort level.
- **Model restrictions** → `availableModels`, `availableModelsMatch`, `deniedModels`. Show current values from Step 1. These are administrator controls: print a managed-settings snippet from the reference instead of writing them. Use aliases (`fable`, `opus`, `sonnet`, `haiku`) or full ids such as `claude-opus-5-5`.
- **Workflow size** → `workflowSizeGuideline`. Offer `small` / 🟢 `medium` / `large` / `unrestricted`. Mention `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` only if the user wants every workflow agent pinned to one model.

### 5. Write a Claude Code setting

Show `key: old → new`, confirm, then run (replace the key and JSON value):

```bash
F="$HOME/.claude/settings.json"
[ -f "$F" ] && cp "$F" "$F.backup-$(date +%Y%m%d-%H%M%S)"
node -e '
const fs=require("fs");const [f,key,raw]=process.argv.slice(1);
const j=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):{};
const ks=key.split(".");let o=j;for(const k of ks.slice(0,-1)){o[k]=o[k]&&typeof o[k]==="object"?o[k]:{};o=o[k];}
o[ks[ks.length-1]]=JSON.parse(raw);fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n");
const back=ks.reduce((x,k)=>x&&x[k],JSON.parse(fs.readFileSync(f,"utf8")));console.log(key+" = "+JSON.stringify(back));' "$F" permissions.defaultMode '"auto"'
```

The printed read-back must equal the chosen value. If the write or parse fails, restore the backup and report the error. New sessions pick up the change; tell the user to restart or use the in-session command (`/effort`, Shift+Tab) for the current one.

## Decision points

Top picker:

```yaml
question: "What would you like to change?"
header: "Settings"
multiSelect: false
options:
  - label: "🟢 Commander preferences"
    description: "Name, level, cost ceiling, theme, animations, launch mode. Currently: <name> · <level> · $<costCeiling>."
  - label: "Claude Code settings"
    description: "Permission mode, effort, model restrictions, workflow size."
  - label: "Linear setup"
    description: "Opt-in: check credentials, choose team and project."
  - label: "Reset all state"
    description: "Clears Commander sessions and knowledge; skills stay. Asks again before acting."
```

Commander preferences, page 1 (page 2: theme, animations, launch mode, back):

```yaml
question: "Which preference?"
header: "Preferences"
multiSelect: false
options:
  - label: "Display name"
    description: "Currently: <name>"
  - label: "Experience level"
    description: "Currently: <level>; changes verbosity and suggestions."
  - label: "Cost ceiling"
    description: "Currently: $<costCeiling> per dispatch."
  - label: "More…"
    description: "Theme, animations, launch mode (CLI-only)."
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

Reset:

```yaml
question: "Reset Commander sessions and knowledge? Skills are preserved."
header: "Reset"
multiSelect: false
options:
  - label: "🟢 Archive, then reset"
    description: "Moves both folders to ~/.claude/commander/reset-archive/<stamp>/; reversible."
  - label: "Delete permanently"
    description: "Removes both folders; cannot be undone."
  - label: "Cancel"
    description: "No change."
```

## Done when

- The chosen value was read back from the file it was written to and reported (`key = value`).
- Each write has a backup path reported, or the file did not exist before.
- For reset, `ls ~/.claude/commander/` shows the folders gone (and the archive path when archived).

## Guardrails

- Never write without showing `old → new` and getting a confirmation; never silently overwrite.
- Back up `config.json` or `settings.json` before every write; write only the picked key and keep all others.
- Never write managed settings; print a snippet for the administrator.
- Never change the user's selected model; `/model` does that.
- Never print, store or ask for a secret value; check presence only.
- Reset requires its own picker answer; config is never reset automatically.

## See also

- `/ccc-tuneup` — audit and add missing structural settings keys
- `/ccc-doctor` — read-only health report
- `/ccc-yolo-setup` — unattended permission setups and their trade-offs
- `/ccc-linear` — work with the opt-in Linear connection

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
