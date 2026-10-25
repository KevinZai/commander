---
name: ccc-tuneup
description: "Audit and safely optimize the local Commander setup: versions, junk, count drift, hooks, settings, MCP, cost. Read-only first; asks before any fix."
allowed-tools:
  - Read
  - Bash
  - Edit
  - AskUserQuestion
  - mcp__ccd_session__spawn_task
argument-hint: "[--check | --fix | --aggressive]"
model: sonnet
effort: high
---

# /ccc-tuneup — Safe local setup optimizer

**CC Commander** · /ccc-tuneup · read-only scan → scorecard → confirm → backup, archive, fix → verify

## When to use / when not to

- Use to clean and tune a local install: archive junk, add missing structural settings keys, retire superseded local agents, fix count drift in a maintainer checkout, and surface cost settings.
- `/ccc-doctor` diagnoses and stays read-only; this skill remediates, with backups and a confirm step. Use `/ccc-update` to change the plugin version and `/ccc-settings` to change preferences.
- Arguments:
  - `--check` — audit and scorecard only. No picker, no mutation. Default when the user seems unsure.
  - `--fix` — audit, then offer safe fixes; opt-in cleanups start unselected.
  - `--aggressive` — like `--fix`, with session archival and superseded-agent retirement pre-selected.
  - no argument — audit, scorecard, then the fix picker.
- In Codex, ask each picker as a plain-text question with the same options; skip the Desktop-only `spawn_task` suggestion.

## What happens

### 1. Read-only audit

#### 1a. Resolve the clone root

The clone root `~/.claude/plugins/marketplaces/commander-hub` holds `.git`; the plugin source is one level further at `commander/cowork-plugin/`. Do not substitute `installed_plugins.json`'s `installPath` here: it points into `plugins/cache/<mp>/<plugin>/<version>/`, a differently shaped copy with no repo wrapper.

```bash
CLONE="$HOME/.claude/plugins/marketplaces/commander-hub"
if [ ! -d "$CLONE" ]; then
  # Authoritative fallback: known_marketplaces.json's installLocation.
  CLONE=$(node -e "
    try {
      const d=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/known_marketplaces.json','utf8'));
      const m=d['commander-hub'];
      if(m&&m.installLocation) process.stdout.write(m.installLocation);
    } catch(e) {}
  " 2>/dev/null || echo "")
fi
[ -z "$CLONE" ] && CLONE="n/a"
[ "$CLONE" != "n/a" ] && [ ! -d "$CLONE" ] && CLONE="n/a"
echo "CLONE=$CLONE"
```

Shell state does not persist between Bash calls: carry the printed `CLONE` value into each later block (`CLONE='<value>'` as its first line).

#### 1b. Run the probe script

```bash
[ "$CLONE" != "n/a" ] && bash "$CLONE/commander/cowork-plugin/skills/ccc-tuneup/lib/tuneup-probes.sh" "$CLONE" || echo "PROBE=n/a"
```

It emits `KEY=VALUE` lines under `SECTION:` markers, every field side-effect-free with an `n/a` fallback. What each key measures and which scorecard row it feeds is in [references/probe-keys.md](references/probe-keys.md). Every count comes from the filesystem and manifests at run time.

#### 1c. Consume the shared doctor diagnostics

```bash
[ "$CLONE" != "n/a" ] && node -e "
  const d=require('$CLONE/commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics');
  for(const r of d.runDiagnostics('$CLONE')){
    console.log(r.status+'|'+r.category+'|'+r.message+'|'+(r.remediation||''));
  }
" 2>/dev/null || echo "diagnostics n/a"
```

Surface every row in the scorecard so `--check` covers the same full stack as `/ccc-doctor full`. Use the probe output, not these rows, to plan remediation.

#### 1d. Version freshness

```bash
INSTALLED_V="$(node -e "
  try{
    const j=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
    const k=Object.keys(j.plugins||{}).find(k=>k.startsWith('commander@'));
    if(k&&j.plugins[k][0])process.stdout.write(j.plugins[k][0].version||'n/a');
    else process.stdout.write('n/a');
  }catch(e){process.stdout.write('n/a');}
" 2>/dev/null || echo n/a)"

CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
CACHE="$CCC_STATE/update-cache.json"
# commander/update-check.js writes the shared ~/.claude/commander cache; read it when this lane has no copy
[ -f "$CACHE" ] || CACHE="$HOME/.claude/commander/update-cache.json"
CACHED_REMOTE="$(node -e "
  try{
    const d=JSON.parse(require('fs').readFileSync('$CACHE','utf8'));
    process.stdout.write(Date.now()-d.timestamp<14400000 ? (d.remoteVersion||'stale') : 'stale');
  }catch(e){process.stdout.write('stale');}
" 2>/dev/null || echo stale)"

# Stale cache: the update-check runner self-fetches and is silent on failure.
if [ "$CACHED_REMOTE" = "stale" ] && [ "$CLONE" != "n/a" ]; then
  CACHED_REMOTE=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo n/a)
fi

# Inline semver compare: update-check.js has no module.exports to import.
semver_gt() {
  local a="\$1" b="\$2"
  IFS='.' read -r a1 a2 a3 <<< "${a//[^0-9.]}"
  IFS='.' read -r b1 b2 b3 <<< "${b//[^0-9.]}"
  [ "${a1:-0}" -gt "${b1:-0}" ] && return 0
  [ "${a1:-0}" -lt "${b1:-0}" ] && return 1
  [ "${a2:-0}" -gt "${b2:-0}" ] && return 0
  [ "${a2:-0}" -lt "${b2:-0}" ] && return 1
  [ "${a3:-0}" -gt "${b3:-0}" ] && return 0
  return 1
}
VERSION_STATUS="up-to-date"
semver_gt "$CACHED_REMOTE" "$INSTALLED_V" 2>/dev/null && VERSION_STATUS="update available: $INSTALLED_V → $CACHED_REMOTE"
echo "VERSION_STATUS=$VERSION_STATUS"
```

Run this block with `bash` (it uses `<<<` and `local`).

#### 1e. CLAUDE.md count drift (maintainer mode only)

Count edits are allowed only from a verified Commander checkout: the git top level's basename is `cc-commander` and it contains `scripts/audit-counts.js`. Otherwise the row is detect-only.

```bash
GIT_ROOT=$(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null || echo "")
CLAUDE_MD_MODE="detect-only"
if [ -n "$GIT_ROOT" ] && [ "$(basename "$GIT_ROOT")" = "cc-commander" ] && [ -f "$GIT_ROOT/scripts/audit-counts.js" ]; then
  CLAUDE_MD_MODE="maintainer"
fi
echo "CLAUDE_MD_MODE=$CLAUDE_MD_MODE GIT_ROOT=$GIT_ROOT"
```

Compare the probe's `SKILL_COUNT`, `AGENT_COUNT`, `EVENT_COUNT` and `HANDLER_COUNT` with the claims in that repo's `CLAUDE.md` (for example `grep -oE '[0-9]+ plugin skills'`). Record `CLAUDE_MD_DRIFT=<description>` or `CLAUDE_MD_DRIFT=none`.

#### 1f. Normalize model strings

Before comparing an agent's `model:` value with a canonical one, strip context suffixes such as `[1m]`:

```bash
normalize_model() { echo "\$1" | sed 's/ *\[.*\]$//' | xargs; }
```

#### 1g. Cost settings (suggest-only)

Read the `COST_<KEY>` and `COST_FLAGGED` rows. The audited keys, verdict meanings and suggested values are in [references/probe-keys.md](references/probe-keys.md#cost-settings-audit-suggest-only). These are never applied by this skill.

When the user asks about context cost or skill-listing truncation, explain the `skillOverrides` `"name-only"` middle ground and its plugin-skill limit from [references/probe-keys.md](references/probe-keys.md#skill-listing-budget-inform-only); never write it.

### 2. Scorecard

Print one table. Fill every cell from the probe; a check that could not run is ⏭️, never a crash.

```
### 🔧 Tune-Up Report — <UTC datetime>

| Check | Status | Top finding | Action |
|-------|--------|-------------|--------|
| 📦 Version freshness | 🟢/🟡 | installed <X> vs latest <Y> | Marketplace update (commands below) |
| 🔄 Junk sweep | 🟢/🟡/🔴 | <JUNK_TEMP> temp_* + <JUNK_BAK> stale backups + <ARCHIVE_DUPES> archive dupes | Archive |
| 📝 CLAUDE.md count drift | 🟡/⏭️ | claims <N> <thing>, live <M> | Fix counts (maintainer) / detect-only |
| 🤖 Local agent supersession | 🟢/🟡 | <name>.md superseded by the plugin agent | Retire local (opt-in) |
| 🔬 Hooks coverage | 🟢/🟡 | <EVENT_COUNT> events · <HANDLER_COUNT> handlers, all scripts resolve | — |
| 🔐 Plugin enabled | 🟢/🔴 | commander in enabledPlugins | Enable in /plugin or Settings |
| 🌐 Opt-in MCP staleness | 🟢/🟡 | <server> path missing | Re-run /ccc-connect |
| 🔧 Settings keys | 🟢/🟡 | <SETTINGS_MISSING_KEYS> | Add missing keys |
| 💰 Cost settings | 🟢/🟡 | <COST_FLAGGED> keys missing or suboptimal | Suggest only (copy-paste) |
| ⏳ Stale sessions | ⏭️/🟡 | <STALE_SESSIONS> files older than 30 days | Archive (opt-in) |
| 🔬 Doctor diagnostics | 🟢/🟡/🔴 | <first non-ok row from 1c> | See /ccc-doctor full |

🎯 My call: fix <lowest-scoring row> first — <one-line rationale>.
```

Rubric: 🟢 90–100 · 🟡 50–89 · 🔴 0–49 · ⏭️ n/a. Do not render rows that passed as if they need fixing.

When `COST_FLAGGED` is above 0, print the cost detail block under the table on every mode (format in [references/probe-keys.md](references/probe-keys.md#cost-settings-audit-suggest-only)): each non-`ok` key as `key: current → suggested (reason)`, then one copy-paste snippet. For `model`, only inform that a premium main-thread pin makes routine turns costly and that routine work can go to `sonnet` or `haiku` subagents; the user's selected model is preserved.

On `--check`, stop after the scorecard.

### 3. Confirm fixes

Offer only rows that are 🟡 or 🔴 and safely fixable, using the pickers in Decision points: the scope picker first, then the individual-fix picker if chosen, then the opt-in cleanup picker when superseded agents or stale sessions were found. Offer "Fix CLAUDE.md counts" only when `CLAUDE_MD_MODE=maintainer` and drift was detected. With `--aggressive`, pre-select the opt-in cleanups.

### 4. Apply (transactional: backup, archive, fix)

**Backups first, for every file this run will mutate:**

```bash
TS=$(date +%Y%m%d-%H%M%S)
cp ~/.claude/settings.json ~/.claude/settings.json.backup-$TS 2>/dev/null
# Maintainer mode only, for each CLAUDE.md that will be edited:
cp "$GIT_ROOT/CLAUDE.md" "$GIT_ROOT/CLAUDE.md.backup-$TS" 2>/dev/null
```

Record each backup path. On any failure later in the run, restore every backup in reverse order and stop.

**Backup retention:** if a source file now has more than 3 `*.backup-*` siblings, ask with the backup-retention picker before moving the oldest into `<config dir>/commander/tuneup-archive/old-backups-$TS/` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`).

**Archive dir:**

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
ARCHIVE="$CCC_STATE/tuneup-archive/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$ARCHIVE"
```

**Junk sweep (move, never delete):**

```bash
# temp_* dirs
for d in "$HOME/.claude/plugins/marketplaces/temp_"*; do
  [ -d "$d" ] && mv "$d" "$ARCHIVE/" && echo "archived: $d"
done

# Stale .bak/.old files (older than 14 days)
find "$HOME/.claude" -maxdepth 4 \( -name "*.bak" -o -name "*.old" \) -mtime +14 \
  -not -path "$CCC_STATE/tuneup-archive/*" -not -path "$HOME/.claude/commander/tuneup-archive/*" \
  -exec mv {} "$ARCHIVE/" \; 2>/dev/null

# Archive-hook dupes: names in BOTH hooks/_archive/ and hooks/, computed at run time
if [ "$CLONE" != "n/a" ]; then
  HOOKS_DIR="$CLONE/commander/cowork-plugin/hooks"
  if [ -d "$HOOKS_DIR/_archive" ]; then
    comm -12 <(ls "$HOOKS_DIR/_archive/" | sort) <(ls "$HOOKS_DIR/" | grep '\.js$' | sort) |
    while read -r f; do
      mv "$HOOKS_DIR/_archive/$f" "$ARCHIVE/" 2>/dev/null && echo "archived dupe: $f"
    done
  fi
fi
```

**Superseded local agents and stale sessions (opt-in only):** `mv` each selected `~/.claude/agents/<name>.md` or `~/.claude/sessions/` file older than 30 days into `$ARCHIVE/agents/` or `$ARCHIVE/sessions/`, and print each moved path.

**Count fixes (only when `CLAUDE_MD_MODE=maintainer`):** for each drifted claim in `$GIT_ROOT/CLAUDE.md`:

1. Re-read the file immediately before editing and compare its mtime with the scan. If it changed, skip and report "file changed since scan — skipped".
2. Edit the exact stale number only, one Edit per claim.
3. Re-run the same live count and confirm the edited line matches. On mismatch, restore that file's backup and report the failure.

**Settings keys:** Edit `~/.claude/settings.json` (backup already taken) to add only the keys listed in `SETTINGS_MISSING_KEYS` (`showThinkingSummaries`, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `toolConcurrency`). Never overwrite an existing value. After each edit, confirm the file parses:

```bash
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/settings.json','utf8'));console.log('settings.json: valid JSON')"
```

**Version refresh (print only, never run):** a marketplace install has no working tree to `git pull` into. Give the user:

```
# Update the plugin — paste into a terminal:
claude plugin marketplace update commander-hub
claude plugin update commander
# Then restart Claude Code or Desktop.
#
# To skip the first command next time, enable autoUpdate for commander-hub:
# /ccc-doctor offers this with a backup and a confirmation.
```

Desktop-managed installs update from Desktop settings instead; see [../ccc-update/references/install-modes.md](../ccc-update/references/install-modes.md#desktop-managed-account-synced).

### 5. Verify

Re-run the probe (1b) and report the rows that changed; each should now read 🟢. In maintainer mode after count edits, also run:

```bash
node "$GIT_ROOT/scripts/audit-counts.js" --check 2>/dev/null || echo "audit-counts: failed"
```

If any fix regressed a row, restore that file's `*.backup-$TS` and report it.

### 6. Report

```
## Tune-Up complete

✅ Fixed: <each fix applied, with its verification result>
🔄 Archived (reversible): <config dir>/commander/tuneup-archive/<stamp>/  (restore: mv <path> back)
📝 Backups: <each *.backup-<stamp> path>
⏭️ For you to run: marketplace update + restart (version), /ccc-connect (MCP staleness)
```

For heavy or out-of-scope cleanup (for example sessions older than 90 days that need review before deletion), offer one `mcp__ccd_session__spawn_task` suggestion when that tool is available. Never spawn it automatically.

## Decision points

Scope picker:

```yaml
question: "Which fixes should I apply?"
header: "Tune-Up"
multiSelect: false
options:
  - label: "🟢 All safe fixes"
    description: "Junk sweep plus missing settings keys. Fully reversible; no CLAUDE.md edits."
  - label: "Pick individual fixes"
    description: "Choose from the safe fixes, including CLAUDE.md counts in a maintainer checkout."
  - label: "Cancel"
    description: "No changes. Re-run any time with /ccc-tuneup."
```

Individual-fix picker (`multiSelect: true`; list only flagged rows, and if the junk sweep is not flagged, mark the first listed fix 🟢):

```yaml
question: "Pick the fixes to apply."
header: "Fixes"
multiSelect: true
options:
  - label: "🟢 Sweep junk to archive"
    description: "Moves temp_* dirs, stale *.bak/*.old and archive-hook dupes into a timestamped archive. Nothing deleted."
  - label: "Add settings keys"
    description: "Backs up settings.json, then adds only the missing structural keys."
  - label: "Fix CLAUDE.md counts"
    description: "Maintainer checkout only. Backs up, edits each stale number, verifies against the live count."
```

Opt-in cleanup picker (`multiSelect: true`; pre-selected with `--aggressive`):

```yaml
question: "Also archive these? Both are off by default."
header: "Opt-in"
multiSelect: true
options:
  - label: "🟢 Skip both"
    description: "Archives neither; local agents and sessions stay in place. Ignored if a cleanup below is also selected."
  - label: "Retire superseded local agents"
    description: "Moves matching ~/.claude/agents/*.md to the archive; the plugin agent takes over."
  - label: "Archive stale sessions (older than 30 days)"
    description: "Moves old ~/.claude/sessions/ files to the archive; transcripts are preserved."
```

Backup-retention picker:

```yaml
question: "Some files have more than 3 backups. Archive the oldest?"
header: "Backups"
multiSelect: false
options:
  - label: "🟢 Archive older backups"
    description: "Keeps the newest 3 per file; moves the rest to tuneup-archive/old-backups-<stamp>/."
  - label: "Keep all"
    description: "No change."
```

## Done when

- `--check`: the scorecard printed, every row filled or ⏭️, and nothing was mutated.
- Fix modes: every applied fix has a backup or archive path, Step 5 re-ran the probe and the changed rows are 🟢 (or the backup was restored and reported), and `settings.json` parses after any edit.
- Maintainer count fixes: `node "$GIT_ROOT/scripts/audit-counts.js" --check` result is reported.

## Guardrails

- Never `rm` or `trash`; junk, agents and sessions move to `<config dir>/commander/tuneup-archive/<UTC-stamp>/`.
- Back up `settings.json` and any `CLAUDE.md` before editing (`cp <file> <file>.backup-$(date +%Y%m%d-%H%M%S)`); take every backup before the first edit; on any failure restore all of them in reverse order.
- `settings.json` is the one file under `~/.claude/` this skill edits, and only to add missing keys. Never edit `~/.claude/CLAUDE.md` or other user config; it may contain counts that are not Commander's to rewrite.
- Edit a `CLAUDE.md` only inside a verified Commander checkout (`CLAUDE_MD_MODE=maintainer`); end-user installs are detect-only. Never edit the plugin clone's source otherwise.
- Never run `git pull`, app restarts or marketplace re-adds; print them as commands.
- Never apply the cost settings or override the user's `model` pin; they are suggestions.
- Re-read each file before each Edit; if it changed since the scan, skip and report.
- Never hardcode counts or versions; read them live. Probes use `bash`, `jq` and `node -e`, not `python3`.
- Reuse `ccc-doctor/lib/diagnostics.js` for shared rows instead of reimplementing them.

## See also

- `/ccc-doctor` — read-only diagnostic report
- `/ccc-update` — update the plugin and verify the runtime
- `/ccc-settings` — preferences and Claude Code settings
- `/ccc-connect` — reconnect opt-in MCP servers

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
