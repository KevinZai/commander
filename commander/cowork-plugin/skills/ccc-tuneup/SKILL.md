---
name: ccc-tuneup
description: "Audit + safely optimize your local ~/.claude CC Commander setup. Read-only scan by default; backs up + archives (never deletes), asks before fixes. Covers versions, junk, drift, agents, hooks, MCP."
model: sonnet
effort: high
allowed-tools:
  - Read
  - Bash
  - Edit
  - AskUserQuestion
  - mcp__ccd_session__spawn_task
argument-hint: "[--check | --fix | --aggressive]"
---

# /ccc-tuneup — Local Setup Optimizer

The companion to `/ccc-doctor`. Doctor *diagnoses* (read-only). Tune-up *remediates* — but safely: read-only scan first, backup before any edit, archive (never `rm`) for junk, and an explicit click-to-confirm before anything mutates.

**CC Commander** · Tune-Up · [Docs](https://commanderplugin.com)

## Arguments
- `--check` — read-only audit + scorecard. NO prompt, NO mutation. (Default if the user seems unsure.)
- `--fix` — audit, then offer safe fixes via AskUserQuestion chips (destructive-leaning items OFF by default).
- `--aggressive` — same as `--fix` but pre-selects session archival + superseded-agent retirement chips.
- bare `/ccc-tuneup` — runs the audit, shows the scorecard, then opens the chip picker.

## Safety rules (NON-NEGOTIABLE)

- ❌ NEVER `rm` or `trash` anything — junk moves to `~/.claude/commander/tuneup-archive/<UTC-stamp>/`.
- ✅ Before editing `settings.json` or any `CLAUDE.md`: `cp <file> <file>.backup-$(date +%Y%m%d-%H%M%S)`.
- ❌ NEVER edit `~/.claude/CLAUDE.md` or any file under `~/.claude/**` — the user's global config may contain plugin-count strings that are NOT ours to rewrite.
- ❌ NEVER edit a CLAUDE.md unless the `git rev-parse --show-toplevel` of the target file resolves to a cc-commander checkout (verified by: `basename $(git -C <dir> rev-parse --show-toplevel)` = "cc-commander" AND `test -f <root>/scripts/audit-counts.js`). For end-user installs (no git root, or clone under `~/.claude/plugins`), the CLAUDE.md-count row is **DETECT-ONLY** — show the drift, do NOT offer to fix it.
- ❌ NEVER run `git pull`, `openclaw`/Desktop restarts, or marketplace re-adds — emit them as copy-paste terminal commands.
- ❌ NEVER mutate the plugin clone's own source files unless running from a verified cc-commander git root.
- ✅ Every count is computed LIVE from the filesystem and manifests — NEVER hardcode "61 skills" / "23 events" / a version.
- ✅ Take ALL backups first; apply; on ANY failure restore ALL backups taken this run (ordered rollback).
- ✅ Re-read each file immediately before each Edit and stat-compare to scan; if changed since scan, skip the fix and report "file changed since scan — skipped".
- ✅ Keep only the last 3 `*.backup-<ts>` per file; offer to archive older ones into tuneup-archive.

## Step 1 — Read-only audit (one Bash call)

### 1a. Resolve the clone root

```bash
CLONE="$HOME/.claude/plugins/marketplaces/commander-hub/commander"
if [ ! -d "$CLONE" ]; then
  CLONE=$(node -e "
    try {
      const d=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
      const k=Object.keys(d.plugins||{}).find(k=>k.startsWith('commander'));
      if(k&&d.plugins[k][0]) process.stdout.write(d.plugins[k][0].installPath||'');
    } catch(e) {}
  " 2>/dev/null || echo "")
fi
[ -z "$CLONE" ] && CLONE="n/a"
echo "CLONE=$CLONE"
```

### 1b. Run the side-effect-free probe script

```bash
[ "$CLONE" != "n/a" ] && bash "$CLONE/commander/cowork-plugin/skills/ccc-tuneup/lib/tuneup-probes.sh" "$CLONE" || echo "PROBE=n/a"
```

The probe emits `KEY=VALUE` lines (all side-effect-free, every field `2>/dev/null || echo n/a`):

| Key | What it measures |
|-----|-----------------|
| `JUNK_TEMP` | temp_* dirs in `~/.claude/plugins/marketplaces/` |
| `JUNK_BAK` | `*.bak` / `*.old` / `*.backup-*` files older than 14d (total count) |
| `ARCHIVE_DUPES` | hook files in both `hooks/_archive/` AND `hooks/` (exact name intersection) |
| `STALE_SESSIONS` | `~/.claude/sessions/` files older than 30d (count, for `--aggressive` only) |
| `LOCAL_AGENT_OVERLAP` | `~/.claude/agents/*.md` basenames that exactly match a plugin agent |
| `SETTINGS_MISSING_KEYS` | settings.json keys absent from global `~/.claude/settings.json` |
| `PLUGIN_ENABLED` | whether commander is in `enabledPlugins` (yes/no/missing) |
| `PLUGIN_DISABLED_INSTALLED` | commander installed-but-disabled flag |
| `MCP_CONNECT_STALE` | opt-in MCP server entries in settings.json whose configured path/command is missing |
| `COST_*` | per-key token-spend audit rows: `current\|suggested\|verdict` (verdict ∈ ok/missing/suboptimal) — see 1g |
| `COST_FLAGGED` | count of non-`ok` cost-settings keys (rollup) |
| `SKILL_COUNT` | live skill count from `ls skills/ | wc -l` in clone |
| `AGENT_COUNT` | live agent count from `ls agents/*.md | wc -l` in clone |
| `EVENT_COUNT` | live hook event count from `jq '.hooks | keys | length' hooks/hooks.json` |
| `HANDLER_COUNT` | live handler count from `jq '[.hooks[][].hooks // [] | length] | add // 0' hooks/hooks.json` |
| `VENDOR_COUNT` | live vendor count from `ls vendor/ | wc -l` at repo root (if present) |
| `INSTALLED_VERSION` | version from `installed_plugins.json` or `plugin.json` |
| `CACHED_REMOTE_VERSION` | from `~/.claude/commander/update-cache.json` if < 4h old |

### 1c. Consume ccc-doctor diagnostics (shared full-stack checks)

```bash
[ "$CLONE" != "n/a" ] && node -e "
  const d=require('$CLONE/commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics');
  for(const r of d.runDiagnostics('$CLONE')){
    console.log(r.status+'|'+r.category+'|'+r.message+'|'+(r.remediation||''));
  }
" 2>/dev/null || echo "diagnostics n/a"
```

Use this output for read-only source-tree and settings diagnostics. Keep the probe output as the source of truth for tuneup-specific remediation planning, but surface every `diagnostics.js` row in the scorecard so `/ccc-tuneup --check` covers the same full stack as `/ccc-doctor full`.

### 1d. Semver freshness check (no python3, no require from update-check.js)

```bash
INSTALLED_V="$(node -e "
  try{
    const j=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
    const k=Object.keys(j.plugins||{}).find(k=>k.startsWith('commander'));
    if(k&&j.plugins[k][0])process.stdout.write(j.plugins[k][0].version||'n/a');
    else process.stdout.write('n/a');
  }catch(e){process.stdout.write('n/a');}
" 2>/dev/null || echo n/a)"

CACHE="$HOME/.claude/commander/update-cache.json"
CACHED_REMOTE="$(node -e "
  try{
    const d=JSON.parse(require('fs').readFileSync('$CACHE','utf8'));
    const age=Date.now()-d.timestamp;
    if(age<14400000) process.stdout.write(d.remoteVersion||'stale');
    else process.stdout.write('stale');
  }catch(e){process.stdout.write('stale');}
" 2>/dev/null || echo stale)"

# If cache stale, try the update-check runner (self-fetches, silent on failure)
if [ "$CACHED_REMOTE" = "stale" ] && [ "$CLONE" != "n/a" ]; then
  CACHED_REMOTE=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo n/a)
fi

# Inline 3-field semver compare (no semverCompare import — update-check.js has no module.exports)
semver_gt() {
  local a="$1" b="$2"
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
if semver_gt "$CACHED_REMOTE" "$INSTALLED_V" 2>/dev/null; then
  VERSION_STATUS="update available: $INSTALLED_V → $CACHED_REMOTE"
fi
echo "VERSION_STATUS=$VERSION_STATUS"
```

### 1e. CLAUDE.md drift check (maintainer-mode only)

Only run if the following are BOTH true:
1. `git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null` exits 0
2. `basename $(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null)` = `"cc-commander"` AND `test -f "$(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null)/scripts/audit-counts.js"`

If either condition fails: mark `CLAUDE_MD_MODE=detect-only` — show drift but DO NOT offer the fix edit.

```bash
GIT_ROOT=$(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null || echo "")
CLAUDE_MD_MODE="detect-only"
if [ -n "$GIT_ROOT" ] && [ "$(basename "$GIT_ROOT")" = "cc-commander" ] && [ -f "$GIT_ROOT/scripts/audit-counts.js" ]; then
  CLAUDE_MD_MODE="maintainer"
fi
echo "CLAUDE_MD_MODE=$CLAUDE_MD_MODE"
```

Then read the `SKILL_COUNT`/`AGENT_COUNT`/`EVENT_COUNT`/`HANDLER_COUNT` from probe output and compare to what the local repo's CLAUDE.md claims using `grep -oP '\d+(?= plugin skills)'` etc. Report drift as `CLAUDE_MD_DRIFT=<description>` or `CLAUDE_MD_DRIFT=none`.

### 1f. Normalize model strings before comparison

When comparing agent model strings from frontmatter to plugin.json canonical values, strip any `[1m]` / `[128k]` / `[...]` context-suffix and surrounding whitespace before comparing:

```bash
normalize_model() { echo "$1" | sed 's/ *\[.*\]$//' | xargs; }
```

### 1g. Cost-settings audit (READ-ONLY — surface, suggest, NEVER auto-apply)

The `SECTION:COST` probe rows surface high-impact, often-undocumented `settings.json` keys that reduce token spend. This is **detect-and-suggest only** — unlike the `⚙️ Settings keys` row (which *promotes* 3 structural keys on confirm), the cost row NEVER mutates `settings.json`. Each `COST_<KEY>` line is `current|suggested|verdict`:

| Key | Why it cuts spend | Suggested |
|-----|-------------------|-----------|
| `effortLevel` | Lower effort = fewer thinking tokens on routine turns; `xhigh` ≈ 2× spend | `high` |
| `autoCompactEnabled` | Caps runaway context growth → fewer overflow re-reads | `true` |
| `env.MAX_THINKING_TOKENS` | Bounds per-turn reasoning budget (uncapped ≈ 32k/turn) | `10000` |
| `env.ENABLE_TOOL_SEARCH` | Defers MCP tool schemas — large saver with many connected servers | `1` |
| `showThinkingSummaries` | Summaries cost fewer output tokens than full thinking | `true` |
| `cleanupPeriodDays` | Bounds transcript retention → smaller resume/search surface | `30` |
| `model` | A premium pin (Opus/Fable) on the MAIN thread spends $$$ on routine turns | route routine work to Sonnet/Haiku subagents |

Verdict semantics: `ok` = satisfies intent (do not surface); `missing` = key unset; `suboptimal` = set to a higher-spend value. `model` is **detect-only** — surface the cost note when a premium pin exists but NEVER suggest overriding the user's deliberate model choice; just inform.

`∅` in a `current` field means the key is unset. If `COST_FLAGGED=n/a`, the probe could not read settings — render the row ⚪ and move on (never crash).

## Step 2 — Scorecard (one markdown table)

```
### 🔧 Tune-Up Report — <UTC datetime>

| Check | Status | Top finding | Action |
|-------|--------|-------------|--------|
| 📦 Version freshness | 🟢/🟡 | installed <X> vs latest <Y> | `git pull` |
| 🧹 Junk sweep | 🟠 | N temp_* + M stale .bak + K archive dupes | Archive |
| 📝 CLAUDE.md count drift | 🟠/⚪ | claims "38 handlers", actual 28 | Fix counts (maintainer) / Detect-only |
| 🤖 Local agent supersession | 🟡 | architect.md → plugin version supersedes | Retire local |
| 🪝 Hooks coverage | 🟢 | 23/23 events, all handlers resolve | — |
| 🔌 Plugin enabled | 🟢/🔴 | commander in enabledPlugins | Enable in Settings |
| 🌐 Opt-in MCP staleness | 🟡 | context7 path missing | Re-run /ccc-connect |
| ⚙️ Settings keys | 🟡 | showThinkingSummaries absent | Promote 3 keys |
| 💰 Cost settings | 🟡 | N spend-reducing keys missing/suboptimal (effortLevel=xhigh, …) | Suggest only (copy-paste) |
| 🗂️ Stale sessions (opt-in) | ⚪ | N files >30d | Archive (--aggressive only) |

**🎯 My call: fix <lowest-score row> first — <one-line rationale>.**
```

Score rubric: 🟢 90-100 · 🟡 70-89 · 🟠 50-69 · 🔴 0-49 · ⚪ n/a (probe failed or check skipped — never crash).

On `--check`: STOP HERE. Print the table and nothing else.

### Cost-settings detail block (printed under the scorecard on EVERY mode)

If `COST_FLAGGED` > 0, print a short read-only detail block listing each non-`ok` `COST_<KEY>` as `key: current → suggested  (reason)`, followed by ONE copy-paste snippet the user can paste into `~/.claude/settings.json` themselves. Example:

```
### 💰 Cost settings — suggestions (NOT applied)
- effortLevel: xhigh → high  (xhigh burns ~2× on routine work)
- env.MAX_THINKING_TOKENS: unset → 10000  (caps per-turn reasoning spend)
- env.ENABLE_TOOL_SEARCH: unset → 1  (defer MCP tool schemas — saves heavily with many servers)

# To apply, paste into ~/.claude/settings.json (review first — these are YOUR cost trade-offs):
"effortLevel": "high",
"showThinkingSummaries": true,
"env": { "MAX_THINKING_TOKENS": "10000", "ENABLE_TOOL_SEARCH": "1" }
```

These are **always suggest-only** — the cost-settings audit NEVER appears as a mutating AskUserQuestion chip and `/ccc-tuneup --fix`/`--aggressive` never edits these keys. For `model`, only inform ("you've pinned <model> on the main thread — routine turns are pricey; consider routing them to Sonnet/Haiku subagents") — never propose overwriting it.

## Step 3 — Confirm fixes (AskUserQuestion)

Only list rows that are 🟡/🟠/🔴 AND safely fixable. Call `AskUserQuestion`:

```
question: "Which fixes should I apply?"
header: "Tune-Up"
multiSelect: true
options:
  - label: "⭐ 🌐 All safe fixes"
    description: "Junk sweep + settings keys (the two always-safe items). No CLAUDE.md edits."
    preview: "Recommended starting point. Fully reversible."
  - label: "🧹 Sweep junk → archive"
    description: "Move temp_* dirs, stale *.bak/*.old, archive-hook dupes to a timestamped archive dir."
    preview: "Reversible — nothing deleted. Restore from ~/.claude/commander/tuneup-archive/<stamp>/."
  - label: "⚙️ Add settings keys"
    description: "Promote showThinkingSummaries + agent-teams + tool-concurrency to the right layer."
    preview: "Backs up settings.json first. Adds only missing keys, never overwrites yours."
  - label: "📝 Fix CLAUDE.md counts (maintainer only)"
    description: "Back up then correct stale count claims to match live filesystem. Only offered when running from verified cc-commander git root."
    preview: "Backs up every CLAUDE.md first. One Edit per drifted claim. Verifies after each fix."
  - label: "🤖 Retire superseded local agents"
    description: "Archive ~/.claude/agents/*.md that the plugin persona strictly supersedes."
    preview: "OFF by default — moved to archive, not deleted. Plugin version takes over."
  - label: "🗂️ Archive stale sessions (>30d)"
    description: "Move old ~/.claude/sessions/ files to tuneup-archive."
    preview: "OFF by default. --aggressive pre-selects this. Frees clutter; transcripts preserved."
  - label: "❌ Cancel"
    description: "Make no changes."
    preview: "Re-run anytime with /ccc-tuneup."
```

With `--aggressive`, also pre-select the two OFF-by-default items. The "Fix CLAUDE.md counts" option is only shown when `CLAUDE_MD_MODE=maintainer` AND drift was detected.

## Step 4 — Apply (backup → archive → fix — TRANSACTIONAL)

### Backup phase (ALL backups before ANY edit)

For EVERY file that will be mutated this run, take the backup first:

```bash
TS=$(date +%Y%m%d-%H%M%S)
cp ~/.claude/settings.json ~/.claude/settings.json.backup-$TS 2>/dev/null
# For each CLAUDE.md that will be edited (maintainer mode only):
cp "$GIT_ROOT/CLAUDE.md" "$GIT_ROOT/CLAUDE.md.backup-$TS" 2>/dev/null
```

Record every `*.backup-<TS>` path taken. On ANY failure mid-run: restore all backups in reverse order and abort.

### Backup retention

After backups, check how many `*.backup-*` files exist per source file. If any has more than 3, offer to archive the oldest into `~/.claude/commander/tuneup-archive/old-backups-<TS>/`. Never auto-archive without the user's confirmation (this is an AskUserQuestion chip).

### Archive dir

```bash
ARCHIVE="$HOME/.claude/commander/tuneup-archive/$(date +%Y%m%dT%H%M%SZ)"
mkdir -p "$ARCHIVE"
```

### Junk sweep (mv, never rm)

```bash
# temp_* dirs
for d in "$HOME/.claude/plugins/marketplaces/temp_"*; do
  [ -d "$d" ] && mv "$d" "$ARCHIVE/" && echo "archived: $d"
done

# Stale .bak/.old files (>14d)
find "$HOME/.claude" -maxdepth 4 \( -name "*.bak" -o -name "*.old" \) -mtime +14 \
  -not -path "$HOME/.claude/commander/tuneup-archive/*" \
  -exec mv {} "$ARCHIVE/" \; 2>/dev/null

# Archive-hook dupes: names that exist in BOTH hooks/_archive/ AND hooks/
# (compute intersection at runtime — do NOT use a baked list)
if [ "$CLONE" != "n/a" ]; then
  HOOKS_DIR="$CLONE/commander/cowork-plugin/hooks"
  if [ -d "$HOOKS_DIR/_archive" ]; then
    comm -12 \
      <(ls "$HOOKS_DIR/_archive/" | sort) \
      <(ls "$HOOKS_DIR/" | grep '\.js$' | sort) | \
    while read f; do
      mv "$HOOKS_DIR/_archive/$f" "$ARCHIVE/" 2>/dev/null && echo "archived dupe: $f"
    done
  fi
fi
```

### Count fixes (maintainer mode only — only when `CLAUDE_MD_MODE=maintainer`)

For each drifted claim in `$GIT_ROOT/CLAUDE.md`:

1. **Re-read the file immediately before editing** + compare mtime to scan-time mtime. If changed: skip and report "file changed since scan — skipped".
2. Use `Edit` on the EXACT stale token (one Edit per drifted claim):
   - Replace the number only (e.g., `61 plugin skills` → `62 plugin skills`).
   - **Verify after each fix**: re-run the same live probe count and assert the edited line now matches it. If mismatch: restore the backup for that file and report failure.
3. Never edit `~/.claude/**` — only edit files under the verified cc-commander git root.

### Settings keys

Edit `~/.claude/settings.json` (backup already taken). Add ONLY keys that are missing — never overwrite existing values:

```bash
# Add showThinkingSummaries if absent
# Add env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS if absent globally
# Add toolConcurrency if absent
```

Use `Edit` with surgical key insertion. Verify the file is valid JSON after each edit.

### Version refresh / marketplace re-add (EMIT ONLY — never run)

```
# To update the plugin — paste into terminal:
cd ~/.claude/plugins/marketplaces/commander-hub/commander && git pull
# Then restart Claude Code Desktop
```

## Step 5 — Verify

After all fixes, re-run the probe for ONLY the rows that were changed. Assert each row now reads 🟢. If `CLAUDE_MD_MODE=maintainer` and count edits were made, also run:

```bash
node "$GIT_ROOT/scripts/audit-counts.js" --check 2>/dev/null || echo "audit-counts: failed"
```

If any fix introduced a regression: restore the matching `*.backup-<TS>` for that file and report it clearly.

## Step 6 — Report

```
## Tune-Up complete

✅ Fixed: <list each fix applied>
🗂️ Archived (reversible): ~/.claude/commander/tuneup-archive/<stamp>/  (restore: mv <path> back)
💾 Backups: <each *.backup-stamp path>
⏭️ You must run by hand: git pull + Desktop restart (version), /ccc-connect re-run (MCP staleness)
```

For anything heavy/out-of-scope, offer ONE `mcp__ccd_session__spawn_task` chip (e.g. "deep-clean stale sessions older than 90d — review before deleting"). Never auto-spawn.

## Anti-patterns — DO NOT

- ❌ Mutate anything on `--check`.
- ❌ `rm` or `trash` — archive only, always.
- ❌ Edit `~/.claude/**` — the global config is not ours to modify.
- ❌ Edit `settings.json` or any `CLAUDE.md` without a `*.backup-<stamp>` first.
- ❌ Hardcode counts/versions — read live, diff against claims.
- ❌ Reimplement ccc-doctor's source-tree drift detection — consume `lib/diagnostics.js` for the shared full-stack rows.
- ❌ Use `python3` in probes — pure `jq` + `bash` + `node -e` only.
- ❌ Run `git pull` / restart Desktop yourself — emit commands.
- ❌ Render rows for checks that passed as if they need fixing.
- ❌ Apply any fix without first verifying the result afterward.
- ❌ Offer CLAUDE.md count edits when running from an end-user install (detect-only).
- ❌ Compare model strings without normalizing away `[1m]`/`[128k]`/`[...]` context suffixes first.
- ❌ Auto-apply the 💰 cost-settings keys (effortLevel, MAX_THINKING_TOKENS, ENABLE_TOOL_SEARCH, model, …) — they are read-only suggestions; surface them, emit copy-paste, never edit settings.json for them.
- ❌ Suggest overriding the user's deliberate `model` pin — for cost-settings `model` is inform-only.
- ❌ Render `ok`-verdict cost keys as if they need fixing — only surface `missing`/`suboptimal`.

**Bottom line:** scan read-only → scorecard → click to confirm → backup + archive + fix → verify → report. Safe by default, reversible by design, always current.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
