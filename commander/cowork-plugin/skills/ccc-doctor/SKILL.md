---
name: ccc-doctor
description: "Paste-ready Commander health report: install mode, versions, cache, settings, MCP servers, plugin validation. Use when Commander misbehaves."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
argument-hint: "[quick | full]"
---

# /ccc-doctor — Diagnose the Commander install

**CC Commander** · /ccc-doctor · one probe → paste-ready diagnostic report → the exact next command

## When to use / when not to

- Use when Commander skills or hooks misbehave, after an update, or to produce a report for a GitHub issue or support thread.
- Doctor is read-only. Its single write is the consent-gated `autoUpdate` toggle in Step 4, always backed up and verified.
- To update the plugin, use `/ccc-update`. To clean junk or add settings keys, use `/ccc-tuneup`. For this repository's vendor submodules, use `/ccc-upgrade`.
- `$ARGUMENTS`: `quick` (default) runs Steps 1–5; `full` adds the source-tree drift checks in Step 6.
- In Codex, ask each AskUserQuestion picker as a plain-text question with the same options; the probe runs unchanged and reports Codex rows.

## What happens

### 1. Probe the install and platform (one Bash call)

Run the block below in a single Bash call. It runs under `bash` regardless of the login shell, never fails on a missing file (every field falls back to `n/a`), and makes no network call except the version check.

```bash
bash -s <<'PROBE'
J() { node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=process.argv[2].split(".").reduce((o,k)=>o==null?o:o[k],j);process.stdout.write(v==null?"n/a":String(v))}catch(e){process.stdout.write("n/a")}' "\$1" "\$2" 2>/dev/null || echo n/a; }
has() { command -v "\$1" >/dev/null 2>&1; }
P="$HOME/.claude/plugins"

# Clone root (has .git) and plugin source (has .claude-plugin/plugin.json) are
# different directories: the repo nests the plugin at commander/cowork-plugin/.
CLONE="$P/marketplaces/commander-hub"; [ -d "$CLONE" ] || CLONE="n/a"
PLUGIN_SRC="n/a"
[ "$CLONE" != "n/a" ] && [ -d "$CLONE/commander/cowork-plugin" ] && PLUGIN_SRC="$CLONE/commander/cowork-plugin"

# installed_plugins.json: the executing copy. Its installPath IS the plugin
# source (cache/<mp>/<plugin>/<version>/), with no commander/cowork-plugin wrapper.
INSTALLED_JSON="$P/installed_plugins.json"
INST=$(node -e 'try{const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const k=Object.keys(d.plugins||{}).find(k=>k.startsWith("commander@"));const e=k&&[].concat(d.plugins[k])[0];process.stdout.write(e?[k,e.version||"n/a",e.installPath||"n/a"].join("\t"):"not listed\tn/a\tn/a")}catch(e){process.stdout.write("not found or unparseable\tn/a\tn/a")}' "$INSTALLED_JSON" 2>/dev/null)
INSTALLED_KEY=$(printf '%s' "$INST" | cut -f1); INSTALLED_VERSION=$(printf '%s' "$INST" | cut -f2); INSTALLED_PATH=$(printf '%s' "$INST" | cut -f3)
[ "$PLUGIN_SRC" = "n/a" ] && [ -d "$INSTALLED_PATH" ] && PLUGIN_SRC="$INSTALLED_PATH"

# Desktop-managed (account-synced): no clone and no installed_plugins.json
# entry is HEALTHY in this mode. Update path: Desktop settings, not the CLI.
INSTALL_MODE="cli-marketplace"
if [ "$PLUGIN_SRC" = "n/a" ]; then
  INSTALL_MODE="not-found"
  DM=$(/bin/ls -t "$HOME/Library/Application Support/Claude/"local-agent-mode-sessions/*/*/rpm/plugin_*/.claude-plugin/plugin.json 2>/dev/null | head -50 | while read -r f; do
    /usr/bin/grep -q '"name"[[:space:]]*:[[:space:]]*"commander"' "$f" 2>/dev/null && { echo "$f"; break; }; done)
  [ -n "$DM" ] && { INSTALL_MODE="desktop-managed"; PLUGIN_SRC=$(dirname "$(dirname "$DM")"); }
fi

PLUGIN_VERSION=$(J "$PLUGIN_SRC/.claude-plugin/plugin.json" version)
NODE_VER=$(node --version 2>/dev/null || echo n/a)
OS_INFO=$(uname -srm 2>/dev/null || echo n/a)
GIT_SHA=n/a; [ "$CLONE" != "n/a" ] && GIT_SHA=$(git -C "$CLONE" rev-parse --short HEAD 2>/dev/null || echo n/a)
TEMP_DIRS=$(ls "$P/marketplaces/" 2>/dev/null | /usr/bin/grep '^temp_' | tr '\n' ' '); [ -z "$TEMP_DIRS" ] && TEMP_DIRS=none

# settings.json: extraKnownMarketplaces and enabledPlugins may be arrays or objects.
SETTINGS="$HOME/.claude/settings.json"
read -r HAS_MARKETPLACE ENABLED <<EOF
$(node -e 'try{const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const keys=x=>Array.isArray(x)?x.map(m=>typeof m==="string"?m:(m&&m.name)||""):Object.keys(x||{});const ep=d.enabledPlugins||{};const k=keys(ep).find(n=>/^commander(@|$)/i.test(n));const en=!k?"no":(!Array.isArray(ep)&&ep[k]===false?"disabled":"yes");process.stdout.write((keys(d.extraKnownMarketplaces).some(n=>/commander/i.test(n))?"yes":"no")+" "+en)}catch(e){process.stdout.write("n/a n/a")}' "$SETTINGS" 2>/dev/null)
EOF

MCP_SERVERS=$(node -e 'try{const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).mcpServers||{};process.stdout.write(Object.keys(s).join(", ")||"none")}catch(e){process.stdout.write("n/a")}' "$PLUGIN_SRC/.mcp.json" 2>/dev/null)
SESSION_COUNT=$(ls "$HOME/.claude/sessions" 2>/dev/null | wc -l | tr -d ' ')
LATEST_SESSION=$(ls -t "$HOME/.claude/sessions" 2>/dev/null | head -1); [ -z "$LATEST_SESSION" ] && LATEST_SESSION=none

# Update freshness: shared update-check module, else the published manifest.
REMOTE_VERSION=n/a
if [ "$CLONE" != "n/a" ]; then REMOTE_VERSION=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo n/a)
else REMOTE_VERSION=$(curl -fsSL --max-time 8 "https://raw.githubusercontent.com/KevinZai/commander/main/commander/cowork-plugin/.claude-plugin/plugin.json" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=JSON.parse(s).version;process.stdout.write(/^\d+\.\d+\.\d+$/.test(v)?v:"n/a")}catch(e){process.stdout.write("n/a")}})' 2>/dev/null || echo n/a); fi
CMP=$INSTALLED_VERSION; [ "$CMP" = "n/a" ] && CMP=$PLUGIN_VERSION
VERSION_STATUS="unknown — could not reach update server"
[ "$REMOTE_VERSION" != "n/a" ] && [ "$CMP" != "n/a" ] && VERSION_STATUS=$(node -e 'const [r,i]=process.argv.slice(1);const a=r.split(".").map(Number),b=i.split(".").map(Number);let gt=false;for(let n=0;n<3;n++){if((a[n]||0)>(b[n]||0)){gt=true;break}if((a[n]||0)<(b[n]||0))break}process.stdout.write(gt?"UPDATE AVAILABLE: "+i+" -> "+r:"up to date ("+i+")")' "$REMOTE_VERSION" "$CMP" 2>/dev/null || echo unknown)

# Cache dirs linger by design (no auto-clean); more than one is normal.
CACHE_ROOT="$P/cache/commander-hub/commander"
CACHE_VERSIONS=$(ls "$CACHE_ROOT" 2>/dev/null | sort -V | tr '\n' ',' | sed 's/,$//'); [ -z "$CACHE_VERSIONS" ] && CACHE_VERSIONS=none
CACHE_VERSION_COUNT=$(ls "$CACHE_ROOT" 2>/dev/null | wc -l | tr -d ' ')
INLINE_DIR="$P/data/commander-inline"; INLINE_PRESENT=no; INLINE_VERSION=n/a
[ -d "$INLINE_DIR" ] && { INLINE_PRESENT=yes; INLINE_VERSION=$(J "$INLINE_DIR/.claude-plugin/plugin.json" version); }
CATALOG_AGE_HOURS=$(node -e 'try{process.stdout.write(String(Math.floor((Date.now()-require("fs").statSync(process.argv[1]).mtimeMs)/3600000)))}catch(e){process.stdout.write("n/a")}' "$P/plugin-catalog-cache.json" 2>/dev/null)
AUTOUPDATE_FLAG=$(node -e 'try{const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))["commander-hub"];process.stdout.write(m?String(!!m.autoUpdate):"not-registered")}catch(e){process.stdout.write("known_marketplaces.json not found")}' "$P/known_marketplaces.json" 2>/dev/null)

# Claude Code platform checks (absent CLI is normal for Desktop-managed installs).
CLAUDE_VER=n/a; VALIDATE=n/a; DETAILS=n/a; MOD_SUPPORT=n/a
if has claude; then
  CLAUDE_VER=$(claude --version 2>/dev/null | head -1 | awk '{print \$1}')
  if [ "$PLUGIN_SRC" != "n/a" ]; then
    VALIDATE_OUT=$(claude plugin validate --strict "$PLUGIN_SRC" 2>&1); RC=$?
    [ $RC -eq 0 ] && VALIDATE=pass || VALIDATE="fail (exit $RC)"
  fi
  DETAILS=$(claude plugin details commander 2>&1 | head -40)
  MOD_SUPPORT=$(node -e 'const v=(process.argv[1]||"").split(".").map(Number);const m=[2,1,287];let ok=true;for(let i=0;i<3;i++){if((v[i]||0)>m[i])break;if((v[i]||0)<m[i]){ok=false;break}}process.stdout.write(ok?"yes":"no (needs 2.1.287+)")' "$CLAUDE_VER" 2>/dev/null)
fi
MODS_SHIPPED=$(ls "$PLUGIN_SRC/mods" 2>/dev/null | tr '\n' ' '); [ -z "$MODS_SHIPPED" ] && MODS_SHIPPED=none
MODS_INSTALLED=$(node -e 'try{const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).plugins||{};const out=[];for(const k of Object.keys(d)){const e=[].concat(d[k])[0];try{if(e&&/"modules"/.test(fs.readFileSync(e.installPath+"/hooks/hooks.json","utf8")))out.push(k)}catch(x){}}process.stdout.write(out.join(" ")||"none")}catch(e){process.stdout.write("n/a")}' "$INSTALLED_JSON" 2>/dev/null)

# Codex (only when installed).
CODEX_VER="not installed"; CODEX_DOCTOR=n/a; CODEX_PLUGIN=n/a
if has codex; then
  CODEX_VER=$(codex --version 2>/dev/null | head -1)
  CODEX_DOCTOR_OUT=$(codex doctor --json 2>&1); RC=$?
  [ $RC -eq 0 ] && CODEX_DOCTOR=pass || CODEX_DOCTOR="fail (exit $RC)"
  CODEX_PLUGIN=$(codex plugin list --json 2>/dev/null | /usr/bin/grep -o '"commander[^"]*"' | head -3 | tr '\n' ' '); [ -z "$CODEX_PLUGIN" ] && CODEX_PLUGIN="commander not listed"
fi

for v in INSTALL_MODE PLUGIN_SRC PLUGIN_VERSION INSTALLED_KEY INSTALLED_VERSION INSTALLED_PATH REMOTE_VERSION VERSION_STATUS \
  NODE_VER OS_INFO GIT_SHA CLONE TEMP_DIRS HAS_MARKETPLACE ENABLED MCP_SERVERS SESSION_COUNT LATEST_SESSION \
  CACHE_VERSIONS CACHE_VERSION_COUNT INLINE_PRESENT INLINE_VERSION CATALOG_AGE_HOURS AUTOUPDATE_FLAG \
  CLAUDE_VER VALIDATE MOD_SUPPORT MODS_SHIPPED MODS_INSTALLED CODEX_VER CODEX_DOCTOR CODEX_PLUGIN; do
  printf '%s=%s\n' "$v" "${!v}"
done
echo "--- validate (last 30 lines) ---"; printf '%s\n' "${VALIDATE_OUT:-n/a}" | tail -30
echo "--- plugin details ---"; printf '%s\n' "$DETAILS"
echo "--- codex doctor --json (first 3000 chars) ---"; printf '%s' "${CODEX_DOCTOR_OUT:-n/a}" | head -c 3000; echo
PROBE
```

If the block itself errors, report the error line and continue with the rows that printed.

### 2. Read the platform rows

- `VALIDATE` is the result of `claude plugin validate --strict` on the plugin source. On `fail`, quote the validator lines that name a file or rule; the listing of gating hooks and mod `hooks:`/`calls:` in that output is informational.
- The `plugin details` section is the Claude Code view of the installed `commander` entry: version, component inventory, and projected always-on token cost. Flag a version that differs from `INSTALLED_VERSION`, or a note about dropped hooks from a plugin-name collision. Report the always-on token figure in the details row.
- Mods: `MODS_SHIPPED` lists mods bundled in the plugin source; `MODS_INSTALLED` lists installed plugins whose hooks file loads a module. A shipped mod that is not installed is optional, not a failure. When a mod is installed and `MOD_SUPPORT` is `no`, that is the failure.
- Codex rows appear only when `codex` is on `PATH`. Summarize `codex doctor --json` as its failing checks, if any; `CODEX_PLUGIN` shows whether the Commander mirror is installed.
- `/doctor prompt-audit` is an interactive Claude Code command, not something a Bash call can run. Recommend it in the report as the check for older-model prompting patterns in CLAUDE.md, skills, agents and commands.

### 3. Render the report

Render one markdown block the user can paste as-is. Lead with the update status when an update is available; that is usually why the user came.

```
## CC Commander Diagnostic Report

**When:** <current UTC datetime> · **By:** /ccc-doctor · **Install mode:** <INSTALL_MODE>

| Item | Value |
|------|-------|
| **Update status** | **<VERSION_STATUS>** |
| Plugin version (plugin source) | <PLUGIN_VERSION> |
| Plugin version (installed runtime) | <INSTALLED_VERSION> — <INSTALLED_PATH> |
| Latest published | <REMOTE_VERSION> |
| Claude Code | <CLAUDE_VER> |
| `claude plugin validate --strict` | <VALIDATE> |
| `claude plugin details commander` | <one-line summary> |
| Mods shipped / installed / supported | <MODS_SHIPPED> / <MODS_INSTALLED> / <MOD_SUPPORT> |
| Codex | <CODEX_VER> · doctor: <CODEX_DOCTOR> · plugin: <CODEX_PLUGIN> |
| Node / OS | <NODE_VER> / <OS_INFO> |
| Marketplace clone | <CLONE> @ <GIT_SHA> |
| temp_* dirs | <TEMP_DIRS> |
| installed_plugins.json entry | <INSTALLED_KEY> |
| Cached versions | <CACHE_VERSIONS> (<CACHE_VERSION_COUNT> dirs; old ones linger by design) |
| Desktop inline copy | <INLINE_PRESENT> (version: <INLINE_VERSION>) |
| Plugin catalog cache age | <CATALOG_AGE_HOURS>h |
| Marketplace `autoUpdate` | <AUTOUPDATE_FLAG> |
| settings.json — marketplace / enabled | <HAS_MARKETPLACE> / <ENABLED> |
| Bundled MCP servers | <MCP_SERVERS> |
| Sessions (count / latest) | <SESSION_COUNT> / <LATEST_SESSION> |

### Checklist
- [ ] Plugin source found (INSTALL_MODE is not `not-found`)
- [ ] No temp_* dirs
- [ ] commander in extraKnownMarketplaces (CLI marketplace mode only)
- [ ] commander enabled in enabledPlugins (CLI marketplace mode only)
- [ ] installed_plugins.json lists commander (CLI marketplace mode only)
- [ ] Up to date (VERSION_STATUS does not start with "UPDATE AVAILABLE")
- [ ] `claude plugin validate --strict` passes (n/a without the claude CLI)
- [ ] Installed mods supported by this Claude Code version
- [ ] `codex doctor --json` passes (only when Codex is installed)

Next: run `/doctor prompt-audit` in Claude Code to audit prompts for older-model patterns.
```

Mark `[x]` for pass. For `desktop-managed`, mark the three CLI-only rows `n/a` and say the mode is healthy without a clone. Notes that keep the report honest:

- `INSTALL_MODE=not-found`, no clone: the fix is to re-add the marketplace (Step 4, `references/fixes.md`).
- temp_* dirs are the most common cause of "plugin not loading"; flag them prominently.
- `CACHE_VERSION_COUNT` above 1 is normal; mention it, do not alarm on it.

### 4. Hand over the fix

For each failing row, print the matching block from [references/fixes.md](references/fixes.md) for the user to paste. Doctor does not run repair commands.

If `VERSION_STATUS` starts with `UPDATE AVAILABLE`:

- CLI marketplace mode: tell the user

  ```
  🔄 CC Commander <REMOTE_VERSION> is available (you have <INSTALLED_VERSION>).

  claude plugin marketplace update commander-hub
  claude plugin update commander

  Then restart Claude Code or Desktop, and run /ccc-doctor again (Step 5 verifies the runtime).
  ```

- Desktop-managed mode: give the Desktop steps in [../ccc-update/references/install-modes.md](../ccc-update/references/install-modes.md#desktop-managed-account-synced) instead; there is no clone for the CLI commands to act on.
- Never suggest `git pull` for a marketplace install: `~/.claude/plugins/marketplaces/commander-hub` is Claude Code's own cache, not a working tree.

If `AUTOUPDATE_FLAG` is `false` or `not-registered`, ask with the picker in Decision points. On "Enable auto-update":

1. Back up: `cp ~/.claude/plugins/known_marketplaces.json ~/.claude/plugins/known_marketplaces.json.backup-$(date +%Y%m%d-%H%M%S)`
2. Set only `known_marketplaces["commander-hub"].autoUpdate = true`, leaving every other key and marketplace untouched:

   ```bash
   node -e "
   const fs = require('fs');
   const p = process.env.HOME + '/.claude/plugins/known_marketplaces.json';
   const j = JSON.parse(fs.readFileSync(p, 'utf8'));
   if (!j['commander-hub']) { console.log('commander-hub not registered — nothing to change'); process.exit(0); }
   j['commander-hub'].autoUpdate = true;
   fs.writeFileSync(p, JSON.stringify(j, null, 2));
   console.log('autoUpdate enabled for commander-hub');
   "
   ```

3. Verify: `node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/known_marketplaces.json','utf8'))['commander-hub'].autoUpdate===true)"` must print `true`. If it does not, restore the backup and say so.

### 5. Post-update verification (after the user says they updated)

Verify the installed runtime, not the marketplace clone. A successful `marketplace update` with an unapplied `plugin update` leaves the clone new and the runtime old, so probing the clone would report a false success.

```bash
# Installed runtime source + version (authoritative for what actually runs)
RUNTIME_SRC=$(node -e "
  try {
    const j=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
    const rows=(j.plugins&&(j.plugins['commander@commander-hub']||j.plugins['commander']))||[];
    const r=Array.isArray(rows)?rows[0]:rows;
    if(r&&r.installPath) process.stdout.write(r.installPath);
  } catch(e) {}
" 2>/dev/null || echo "")
# No fallback to the clone here: a marketplace refresh updates the clone even
# when the plugin update failed. No installed-runtime record means say so.
{ [ -z "$RUNTIME_SRC" ] || [ ! -d "$RUNTIME_SRC" ]; } && RUNTIME_SRC="n/a"

RUNTIME_VERSION="n/a"
[ "$RUNTIME_SRC" != "n/a" ] && RUNTIME_VERSION=$(node -e "
  try { process.stdout.write(JSON.parse(require('fs').readFileSync('$RUNTIME_SRC/.claude-plugin/plugin.json','utf8')).version||'n/a'); }
  catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo "n/a")
echo "RUNTIME_VERSION=$RUNTIME_VERSION"

[ "$RUNTIME_SRC" != "n/a" ] && echo '{}' | node "$RUNTIME_SRC/hooks/session-end.js" | head -c 200 || echo "n/a — no installed runtime found to test"
```

Expect one JSON line (for example `{"continue":true,...}`): that proves the hook chain in the running install works. If `RUNTIME_VERSION` is still old while the clone is new, say exactly that: the marketplace refreshed but `claude plugin update commander` did not apply, or the app was not fully restarted. Optionally cross-check with `claude plugin details commander`.

### 6. Full mode: source-tree drift checks

Only when `$ARGUMENTS` is `full` or the user asks for a thorough audit. The checks need a Commander repository root: the marketplace clone, or the current directory when it is a Commander checkout. Desktop-managed installs have neither; report the step as `n/a`.

```bash
ROOT="$HOME/.claude/plugins/marketplaces/commander-hub"
[ -d "$ROOT/commander/cowork-plugin" ] || ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -n "$ROOT" ] && [ -f "$ROOT/commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics.js" ] && node -e '
const diag = require(process.argv[1] + "/commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics");
for (const r of diag.runDiagnostics(process.argv[1])) {
  console.log("[" + (r.status === "ok" ? "OK" : r.status === "warn" ? "WARN" : "FAIL") + "] " + r.category + " — " + r.message);
  if (r.remediation) console.log("       fix: " + r.remediation);
}' "$ROOT" || echo "drift checks n/a — no Commander repository root"
```

Append the rows under the main report as a `### Drift checks` section. What each category verifies is in [references/drift-checks.md](references/drift-checks.md). A `fail` row is diagnostic output; doctor never blocks on it.

### 7. Optional partner suggestions

After the report, and only when the current project shows a gap, print at most two lines from [references/recommended-services.md](references/recommended-services.md). Skip this when the install itself is failing.

## Decision points

Auto-update offer (Step 4), only when `AUTOUPDATE_FLAG` is `false` or `not-registered`:

```yaml
question: "Enable auto-update for the commander-hub marketplace?"
header: "Auto-update"
multiSelect: false
options:
  - label: "🟢 Enable auto-update"
    description: "Backs up known_marketplaces.json, sets autoUpdate on commander-hub only, then verifies."
  - label: "Not now"
    description: "No change; you keep running the marketplace update command by hand."
```

Next step after a report with failures (skip when everything passes):

```yaml
question: "What next?"
header: "Doctor"
multiSelect: false
options:
  - label: "🟢 Fix local state with /ccc-tuneup"
    description: "Archives junk and adds missing settings keys, with backups and a confirm step."
  - label: "Update with /ccc-update"
    description: "Walks the update and verifies the installed runtime after restart."
  - label: "Done"
    description: "Keep the report; nothing else runs."
```

## Done when

- The Step 1 probe ran and every report row holds a value or `n/a`; no row is guessed.
- The checklist is marked from probe values, and each failing row has its fix block from `references/fixes.md` or the update commands.
- After an auto-update toggle, the Step 4 verification printed `true` (or the backup was restored and reported).
- After an update, Step 5 reported `RUNTIME_VERSION` and the hook pipe-test result.

## Guardrails

- Read-only except the `autoUpdate` toggle, which requires the picker answer, a prior backup, and a post-write check. Repair commands are printed for the user, never run.
- Never test MCP connectivity; list server names only.
- Never hardcode the plugin version; read it from `plugin.json` and `installed_plugins.json`.
- Never tell a marketplace-installed user to `git pull`; the remediation is the `claude plugin marketplace update` and `claude plugin update` pair plus a restart.
- Never collapse the clone root (`marketplaces/commander-hub`, has `.git`) and the plugin source (`$CLONE/commander/cowork-plugin`, has `.claude-plugin/plugin.json`) into one path.
- Never treat a missing clone as broken in `desktop-managed` mode.
- Keep the report one paste-ready block.

## See also

- `/ccc-update` — update the plugin and verify the runtime
- `/ccc-tuneup` — safe, backed-up remediation of local setup
- `/ccc-settings` — Commander preferences and Claude Code settings
- `/ccc-upgrade` — maintainer-only vendor submodule updates

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
