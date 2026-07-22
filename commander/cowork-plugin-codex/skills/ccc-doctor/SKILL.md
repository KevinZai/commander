---
name: ccc-doctor
description: "Diagnostic tool for CC Commander. Paste-ready report covering plugin version, update freshness, Node, marketplace clone state, MCP servers, settings.json, sessions, and full-stack drift checks."
model: sonnet
effort: medium
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
argument-hint: "[quick | full]"
---

# $ccc-doctor — CC Commander Diagnostic Report

Generates a paste-ready diagnostic snapshot. Paste the output into a GitHub issue or Discord support thread.

## What to do

Run the Bash block below in a single call. Handle every missing file gracefully — use `2>/dev/null || echo "n/a"`. Never crash if a file doesn't exist.

```bash
# ── Marketplace clone root ───────────────────────────────────────────
# The marketplace clone dir is named after the MARKETPLACE key
# (commander-hub), not the plugin — .git lives directly here. The repo's
# OWN top-level layout then nests the plugin source one level further at
# commander/cowork-plugin/. Both segments are real; do not collapse them.
CLONE="$HOME/.claude/plugins/marketplaces/commander-hub"
[ -d "$CLONE" ] || CLONE="n/a"

PLUGIN_SRC="n/a"
if [ "$CLONE" != "n/a" ] && [ -d "$CLONE/commander/cowork-plugin" ]; then
  PLUGIN_SRC="$CLONE/commander/cowork-plugin"
fi

# Cache-only fallback (no marketplace clone — removed by the user, or an
# install flow that never cloned): the INSTALLED runtime recorded in
# installed_plugins.json is authoritative. SHAPE DIFFERENCE: the clone nests
# the source at commander/cowork-plugin/; the cache installPath IS the plugin
# source directly — no wrapper segment.
if [ "$PLUGIN_SRC" = "n/a" ] && [ -f "$HOME/.claude/plugins/installed_plugins.json" ]; then
  PLUGIN_SRC=$(node -e "
    try {
      const j=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
      const rows=(j.plugins&&(j.plugins['commander@commander-hub']||j.plugins['commander']))||[];
      const r=Array.isArray(rows)?rows[0]:rows;
      if(r&&r.installPath) process.stdout.write(r.installPath);
    } catch(e) {}
  " 2>/dev/null || echo "")
  [ -z "$PLUGIN_SRC" ] && PLUGIN_SRC="n/a"
  [ "$PLUGIN_SRC" != "n/a" ] && [ ! -d "$PLUGIN_SRC" ] && PLUGIN_SRC="n/a"
fi

# ── Plugin version (from the marketplace clone's own plugin.json) ────
PLUGIN_JSON="$PLUGIN_SRC/.claude-plugin/plugin.json"
PLUGIN_VERSION="n/a"
[ "$PLUGIN_SRC" != "n/a" ] && PLUGIN_VERSION=$(node -e "
  try { process.stdout.write(JSON.parse(require('fs').readFileSync('$PLUGIN_JSON','utf8')).version || 'n/a'); }
  catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo "n/a")

# ── Node + system ────────────────────────────────────────────────────
NODE_VER=$(node --version 2>/dev/null || echo "n/a")
OS_INFO=$(uname -srm 2>/dev/null || echo "n/a")

# ── git HEAD SHA of the marketplace clone (git root is $CLONE, NOT
#    $CLONE/commander — there is no .git one level deeper) ───────────
GIT_SHA="n/a"
[ "$CLONE" != "n/a" ] && GIT_SHA=$(git -C "$CLONE" rev-parse --short HEAD 2>/dev/null || echo "n/a")

# ── Marketplace clone presence ──────────────────────────────────────
if [ "$CLONE" != "n/a" ]; then CLONE_PRESENT="yes — $CLONE"; else CLONE_PRESENT="NO — directory missing"; fi

# ── Temp dirs (mid-clone drift indicator) ───────────────────────────
TEMP_DIRS=$(ls "$HOME/.claude/plugins/marketplaces/" 2>/dev/null | grep '^temp_' | tr '\n' ' ')
if [ -z "$TEMP_DIRS" ]; then TEMP_DIRS="none"; fi

# ── installed_plugins.json ──────────────────────────────────────────
# Shape: { version, plugins: { "<plugin>@<marketplace>": [{ installPath,
# version, installedAt, lastUpdated, gitCommitSha, scope }] } }. installPath
# points into plugins/cache/<mp>/<plugin>/<version>/ — the ACTUAL executing
# copy, distinct from the marketplace source clone above.
INSTALLED_JSON="$HOME/.claude/plugins/installed_plugins.json"
INSTALLED_VERSION="n/a"
INSTALLED_PATH="n/a"
if [ -f "$INSTALLED_JSON" ]; then
  INSTALLED_COMMANDER=$(node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('$INSTALLED_JSON','utf8'));
      const k = Object.keys(d.plugins||{}).find(k => k.startsWith('commander@'));
      if (k && d.plugins[k][0]) {
        const e = d.plugins[k][0];
        process.stdout.write('found — ' + k + ' v' + e.version + ' @ ' + e.installPath);
      } else {
        process.stdout.write('not found in installed list');
      }
    } catch(e) { process.stdout.write('parse error: ' + e.message); }
  " 2>/dev/null || echo "parse error")
  INSTALLED_VERSION=$(node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('$INSTALLED_JSON','utf8'));
      const k = Object.keys(d.plugins||{}).find(k => k.startsWith('commander@'));
      process.stdout.write(k && d.plugins[k][0] ? (d.plugins[k][0].version||'n/a') : 'n/a');
    } catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo "n/a")
  INSTALLED_PATH=$(node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('$INSTALLED_JSON','utf8'));
      const k = Object.keys(d.plugins||{}).find(k => k.startsWith('commander@'));
      process.stdout.write(k && d.plugins[k][0] ? (d.plugins[k][0].installPath||'n/a') : 'n/a');
    } catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo "n/a")
else
  INSTALLED_COMMANDER="installed_plugins.json not found"
fi

# ── settings.json sanity ────────────────────────────────────────────
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  HAS_MARKETPLACE=$(python3 -c "
import json
try:
    d = json.load(open('$SETTINGS'))
    ekm = d.get('extraKnownMarketplaces', [])
    names = [m if isinstance(m, str) else m.get('name','') for m in ekm]
    found = any('commander' in n.lower() for n in names)
    print('yes — commander-hub in extraKnownMarketplaces' if found else 'NO — commander-hub missing')
except Exception as e:
    print('parse error: ' + str(e))
" 2>/dev/null || echo "parse error")

  ENABLED=$(python3 -c "
import json
try:
    d = json.load(open('$SETTINGS'))
    ep = d.get('enabledPlugins', [])
    found = any('commander' in str(p).lower() for p in ep)
    print('yes — commander in enabledPlugins' if found else 'NO — commander not in enabledPlugins')
except Exception as e:
    print('parse error: ' + str(e))
" 2>/dev/null || echo "parse error")
else
  HAS_MARKETPLACE="settings.json not found"
  ENABLED="settings.json not found"
fi

# ── MCP servers (list only, no connectivity test) ───────────────────
MCP_JSON="$PLUGIN_SRC/.mcp.json"
if [ "$PLUGIN_SRC" != "n/a" ] && [ -f "$MCP_JSON" ]; then
  MCP_SERVERS=$(python3 -c "
import json
try:
    d = json.load(open('$MCP_JSON'))
    servers = d.get('mcpServers', {})
    print(', '.join(servers.keys()) if servers else 'none')
except:
    print('parse error')
" 2>/dev/null || echo "n/a")
else
  MCP_SERVERS=".mcp.json not found at $MCP_JSON"
fi

# ── Recent sessions ─────────────────────────────────────────────────
SESSION_DIR="$HOME/.claude/sessions"
if [ -d "$SESSION_DIR" ]; then
  SESSION_COUNT=$(ls "$SESSION_DIR" | wc -l | tr -d ' ')
  LATEST_SESSION=$(ls -t "$SESSION_DIR" 2>/dev/null | head -1 || echo "none")
else
  SESSION_COUNT="0"
  LATEST_SESSION="sessions dir not found"
fi

# ── Update freshness (reuses the SessionStart nudge cache when fresh;
#    falls back to a live check via the shared update-check module) ──
REMOTE_VERSION="n/a"
if [ "$CLONE" != "n/a" ]; then
  REMOTE_VERSION=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo "n/a")
fi
VERSION_STATUS="unknown — could not reach update server"
if [ "$REMOTE_VERSION" != "n/a" ] && [ "$INSTALLED_VERSION" != "n/a" ]; then
  VERSION_STATUS=$(node -e "
    const a='$REMOTE_VERSION'.split('.').map(Number), b='$INSTALLED_VERSION'.split('.').map(Number);
    let gt=false;
    for(let i=0;i<3;i++){ if((a[i]||0)>(b[i]||0)){gt=true;break;} if((a[i]||0)<(b[i]||0))break; }
    process.stdout.write(gt ? 'UPDATE AVAILABLE: $INSTALLED_VERSION -> $REMOTE_VERSION' : 'up to date ($INSTALLED_VERSION)');
  " 2>/dev/null || echo "unknown")
fi

# ── Installed-executable-copy cache: cache/<mp>/commander/<version>/ ─
# No auto-clean — old versions linger. List them, flag if more than one.
CACHE_ROOT="$HOME/.claude/plugins/cache/commander-hub/commander"
CACHE_VERSIONS="none"
CACHE_VERSION_COUNT=0
if [ -d "$CACHE_ROOT" ]; then
  CACHE_VERSIONS=$(ls "$CACHE_ROOT" 2>/dev/null | sort -V | tr '\n' ',' | sed 's/,$//')
  CACHE_VERSION_COUNT=$(ls "$CACHE_ROOT" 2>/dev/null | wc -l | tr -d ' ')
  [ -z "$CACHE_VERSIONS" ] && CACHE_VERSIONS="none"
fi

# ── Desktop inline copy (bypasses the marketplace clone on some installs) ─
INLINE_DIR="$HOME/.claude/plugins/data/commander-inline"
INLINE_PRESENT="no"
INLINE_VERSION="n/a"
if [ -d "$INLINE_DIR" ]; then
  INLINE_PRESENT="yes"
  INLINE_VERSION=$(node -e "
    try { process.stdout.write(JSON.parse(require('fs').readFileSync('$INLINE_DIR/.claude-plugin/plugin.json','utf8')).version || 'n/a'); }
    catch(e) { process.stdout.write('n/a (present but no cached plugin.json found)'); }
  " 2>/dev/null || echo "n/a")
fi

# ── Plugin catalog cache age (Desktop's marketplace listing cache) ───
CATALOG_CACHE="$HOME/.claude/plugins/plugin-catalog-cache.json"
CATALOG_AGE_HOURS="n/a"
if [ -f "$CATALOG_CACHE" ]; then
  CATALOG_AGE_HOURS=$(node -e "
    try { process.stdout.write(String(Math.floor((Date.now()-require('fs').statSync('$CATALOG_CACHE').mtimeMs)/3600000))); }
    catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo "n/a")
fi

# ── autoUpdate flag for commander-hub ─────────────────────────────────
KNOWN_MARKETPLACES="$HOME/.claude/plugins/known_marketplaces.json"
AUTOUPDATE_FLAG="n/a"
if [ -f "$KNOWN_MARKETPLACES" ]; then
  AUTOUPDATE_FLAG=$(node -e "
    try {
      const j = JSON.parse(require('fs').readFileSync('$KNOWN_MARKETPLACES','utf8'));
      const m = j['commander-hub'];
      process.stdout.write(m ? String(!!m.autoUpdate) : 'not-registered');
    } catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo "n/a")
else
  AUTOUPDATE_FLAG="known_marketplaces.json not found"
fi

# ── Output ───────────────────────────────────────────────────────────
echo "PLUGIN_VERSION=$PLUGIN_VERSION"
echo "NODE_VER=$NODE_VER"
echo "OS_INFO=$OS_INFO"
echo "GIT_SHA=$GIT_SHA"
echo "CLONE_PRESENT=$CLONE_PRESENT"
echo "TEMP_DIRS=$TEMP_DIRS"
echo "INSTALLED_COMMANDER=$INSTALLED_COMMANDER"
echo "INSTALLED_VERSION=$INSTALLED_VERSION"
echo "INSTALLED_PATH=$INSTALLED_PATH"
echo "HAS_MARKETPLACE=$HAS_MARKETPLACE"
echo "ENABLED=$ENABLED"
echo "MCP_SERVERS=$MCP_SERVERS"
echo "SESSION_COUNT=$SESSION_COUNT"
echo "LATEST_SESSION=$LATEST_SESSION"
echo "REMOTE_VERSION=$REMOTE_VERSION"
echo "VERSION_STATUS=$VERSION_STATUS"
echo "CACHE_VERSIONS=$CACHE_VERSIONS"
echo "CACHE_VERSION_COUNT=$CACHE_VERSION_COUNT"
echo "INLINE_PRESENT=$INLINE_PRESENT"
echo "INLINE_VERSION=$INLINE_VERSION"
echo "CATALOG_AGE_HOURS=$CATALOG_AGE_HOURS"
echo "AUTOUPDATE_FLAG=$AUTOUPDATE_FLAG"
```

## Format the output

After running the Bash block, render the following markdown report. Substitute each variable. Determine pass/fail for each check row automatically.

```
## CC Commander Diagnostic Report

**When:** <current UTC datetime> · **By:** $ccc-doctor

| Item | Value |
|------|-------|
| Plugin version (marketplace clone) | <PLUGIN_VERSION> |
| Plugin version (installed/running) | <INSTALLED_VERSION> — <INSTALLED_PATH> |
| Latest on GitHub main | <REMOTE_VERSION> |
| **Update status** | **<VERSION_STATUS>** |
| Node | <NODE_VER> |
| OS | <OS_INFO> |
| Marketplace clone SHA | <GIT_SHA> |
| Clone directory present | <CLONE_PRESENT> |
| temp_* dirs (drift indicator) | <TEMP_DIRS> |
| installed_plugins.json — commander | <INSTALLED_COMMANDER> |
| Cached executable versions (`plugins/cache/commander-hub/commander/`) | <CACHE_VERSIONS> (<CACHE_VERSION_COUNT> version dir(s) — no auto-clean, old ones linger by design) |
| Desktop inline copy present | <INLINE_PRESENT> (version: <INLINE_VERSION>) |
| Plugin catalog cache age | <CATALOG_AGE_HOURS>h |
| Marketplace `autoUpdate` flag | <AUTOUPDATE_FLAG> |
| settings.json — extraKnownMarketplaces | <HAS_MARKETPLACE> |
| settings.json — enabledPlugins | <ENABLED> |
| Bundled MCP servers | <MCP_SERVERS> |
| Recent sessions count | <SESSION_COUNT> |
| Latest session file | <LATEST_SESSION> |

### Common issues checklist

- [<pass/fail>] Marketplace clone present (directory exists)
- [<pass/fail>] No temp_* dirs (no mid-clone drift)
- [<pass/fail>] commander in extraKnownMarketplaces
- [<pass/fail>] commander in enabledPlugins
- [<pass/fail>] installed_plugins.json references commander
- [<pass/fail>] Up to date (VERSION_STATUS does not start with "UPDATE AVAILABLE")
- [<pass/fail>] At most 1 cached executable version (CACHE_VERSION_COUNT ≤ 1 — more means stale versions are lingering, harmless but worth a mental note)

Mark [x] for pass, [ ] for fail.

### If an update is available

If `VERSION_STATUS` starts with `UPDATE AVAILABLE`, tell the user:

```
⬆️ CC Commander vREMOTE_VERSION is available (you have vINSTALLED_VERSION).

claude plugin marketplace update commander-hub
claude plugin update commander

Then restart Claude Code / Cowork Desktop to apply.
```

Never suggest `git pull` for a marketplace install — there is no working
tree to pull into; the marketplace clone at `~/.claude/plugins/marketplaces/commander-hub`
is Claude Code's own cache, not something the user edits directly.

If `AUTOUPDATE_FLAG` is `false` or `not-registered`, offer (do not apply
without confirmation):

> 💡 Skip the manual `marketplace update` step going forward — enable
> auto-update for commander-hub?

Call `AskUserQuestion` with options `Enable auto-update` / `Not now`. On
"Enable auto-update":
1. Back up first: `cp ~/.claude/plugins/known_marketplaces.json ~/.claude/plugins/known_marketplaces.json.backup-$(date +%Y%m%d-%H%M%S)`
2. Set `known_marketplaces["commander-hub"].autoUpdate = true`, preserving every other key and every other marketplace entry untouched:
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
3. Re-read the file and confirm `autoUpdate === true` before reporting success. If verification fails, restore the backup and say so.

This is the ONLY mutation `$ccc-doctor` ever performs, it is always
consent-gated, and it always backs up first — every other finding in this
report is diagnostic-only (see `$ccc-tuneup` for general remediation).

### Post-update verification (run after the user says they updated)

Verify the **installed runtime**, not the marketplace clone — a successful
`marketplace update` with a failed/unapplied `plugin update` leaves the clone
new while the runtime stays old, and probing the clone would falsely report
success.

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
# NO fallback to $PLUGIN_SRC here — with a marketplace clone present, that
# fallback would "verify" the CLONE (which a marketplace refresh updates even
# when the plugin update failed) and falsely report the new version as
# running. If there is no installed-runtime record, say so honestly instead.
{ [ -z "$RUNTIME_SRC" ] || [ ! -d "$RUNTIME_SRC" ]; } && RUNTIME_SRC="n/a"

RUNTIME_VERSION="n/a"
[ "$RUNTIME_SRC" != "n/a" ] && RUNTIME_VERSION=$(node -e "
  try { process.stdout.write(JSON.parse(require('fs').readFileSync('$RUNTIME_SRC/.claude-plugin/plugin.json','utf8')).version||'n/a'); }
  catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo "n/a")
echo "RUNTIME_VERSION=$RUNTIME_VERSION"

[ "$RUNTIME_SRC" != "n/a" ] && echo '{}' | node "$RUNTIME_SRC/hooks/session-end.js" | head -c 200 || echo "n/a — no installed runtime found to test"
```

Expect a single JSON line back (e.g. `{"continue":true,...}`). That proves
the hook chain in the RUNNING install works — not just that the clone's
version string changed. If `RUNTIME_VERSION` still shows the old version
while the clone shows the new one, say exactly that: the marketplace
refreshed but `claude plugin update commander` didn't apply (or the app
hasn't been restarted) — re-run the update step.

### Nuclear fix commands (paste into terminal if needed)

If the clone is missing or corrupted:
```bash
# Remove stale marketplace state and re-add
rm -rf ~/.claude/plugins/marketplaces/commander-hub
# Then in Claude Code Desktop: Settings → Plugins → Add Marketplace → KevinZai/commander
```

If temp_* dirs exist (mid-clone drift):
```bash
ls ~/.claude/plugins/marketplaces/
rm -rf ~/.claude/plugins/marketplaces/temp_*
```

If commander not in enabledPlugins:
```bash
# Open Settings → Plugin Marketplace → find commander → Enable
# Or check ~/.claude/settings.json and add "commander" to enabledPlugins array
```

If MCP servers not responding:
```bash
# Restart Claude Code Desktop and retry $ccc-doctor
# Check .mcp.json at: ~/.claude/plugins/marketplaces/commander-hub/commander/cowork-plugin/.mcp.json
```
```

### Recommended services

After diagnostics, scan for missing infrastructure and suggest relevant partners:

**If `package.json` has no `database` or `db` dependency detected:**
> 💾 **[Supabase](https://supabase.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=supabase-db)** — Need a database? Postgres + auth + real-time, free tier generous.

**If no `deploy` script or `vercel.json` detected:**
> 🌐 **[Vercel](https://vercel.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=vercel-deploy)** — Deploy to production. Free tier suitable for most projects.

**If no cache or queue setup detected:**
> ⚡ **[Upstash](https://upstash.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=upstash-cache)** — Redis + Kafka serverless. Pay only for what you use.

**If using serverless without edge support:**
> 🔗 **[Cloudflare Workers](https://www.cloudflare.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=cloudflare-edge)** — Deploy globally with edge computing.

[View all partners →](./affiliate-disclosure.mdx)

## Anti-patterns — DO NOT

- Never test MCP connectivity (just list server names — network calls are slow and flaky)
- Never crash if any file is missing — graceful n/a for every field
- Never hardcode the plugin version — always read from plugin.json
- Never output more than one code block to paste — keep it a single unified markdown block
- Never tell a marketplace-installed user to `git pull` — there is no working tree to pull into. The remediation is always `claude plugin marketplace update <mp> && claude plugin update <plugin>` + restart.
- Never write to `known_marketplaces.json` (or any file) without the AskUserQuestion confirmation and a prior backup — the autoUpdate toggle is the one narrow exception, and even it follows backup-then-verify.
- Never collapse the marketplace-clone root and the plugin-source root into one path — `$CLONE` (`marketplaces/commander-hub`, has `.git`) and `$PLUGIN_SRC` (`$CLONE/commander/cowork-plugin`, has `.claude-plugin/plugin.json`) are different directories with different contents.

## Tips

1. Run the full Bash block in one call — avoids extra turns.
2. The report is self-contained: user pastes it into a GitHub issue as-is.
3. If PLUGIN_VERSION is n/a and CLONE_PRESENT is NO, the fix is always: re-add the marketplace.
4. temp_* dirs are the #1 cause of "plugin not loading" — always flag them prominently.
5. If VERSION_STATUS says UPDATE AVAILABLE, that is usually the actual root cause the user came here for — lead the report with it, don't bury it under Node/OS trivia.
6. CACHE_VERSION_COUNT > 1 is normal (no auto-clean) — don't alarm on it, just note it.

## Deeper drift checks (full mode)

When the user passes `full` or asks for a thorough audit, run the source-tree drift checks via the bundled helper module. These run against the cloned plugin source — not the user's `~/.claude/` state.

```bash
PLUGIN_DIR="$HOME/.claude/plugins/marketplaces/commander-hub"
node -e "
const diag = require('$PLUGIN_DIR/commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics');
const results = diag.runDiagnostics('$PLUGIN_DIR');
for (const r of results) {
  const icon = r.status === 'ok' ? 'OK' : r.status === 'warn' ? 'WARN' : 'FAIL';
  console.log('[' + icon + '] ' + r.category + ' — ' + r.message);
  if (r.remediation) console.log('       fix: ' + r.remediation);
}
"
```

The helper runs full-stack categories: Claude settings, contract counts, vendors, bundled MCPs, hooks, agents, tests, display name, version parity, and critical files. Append the table below after the main report when the user requested `full`.

| # | Category | What it verifies |
|---|----------|------------------|
| 1 | `license-cleanup` | No `license.json`, `licenseFile`, `tier === 'free'`, or `isPro()` references in plugin hooks. CC Commander's core is free forever — any residue is a red flag. |
| 2 | `hook-chain` | Every `.js` referenced from `hooks.json` exists on disk and uses ESM `import` (not legacy `require`). Flags unregistered orphan hook files. |
| 3 | `mcp-availability` | `.mcp.json` lists exactly the 2 bundled servers (context7 + sequential-thinking) and `CONNECTORS.md` advertises 16 opt-in connectors. Drift either way is flagged. |
| 4 | `agent-models` | All 22 sub-agent `.md` frontmatter has the expected `model:` pin. `architect`, `security-auditor`, `debugger`, `product-manager` must be on `claude-opus-4-8`; `designer`, `researcher`, `reviewer` must be on `claude-sonnet-5`. Other agents on legacy aliases (`opus`, `sonnet`, `haiku`) are flagged as upgrade candidates. |
| 5 | `test-suite` | Required audit scripts (`audit-frontmatter.js`, `audit-counts.js`, `check-version-parity.js`) exist. Doctor doesn't shell out to them — it only verifies presence so the user can run `--check` manually. |
| 6 | `display-name` | `plugin.json.displayName === "Commander"` AND `marketplace.json.plugins[0].displayName === "Commander"` (per brand commit `0954a3a`). |
| 7 | `version-parity` | Spot-check that `package.json` and `plugin.json` versions match. Full parity check covered by `scripts/check-version-parity.js`. |
| 8 | `critical-files` | `CHANGELOG.md`, `README.md`, `LICENSE`, `package.json`, `commander/core/registry.yaml` all present. |

### Result shape

`runDiagnostics(root)` returns an array of:

```
{
  category: string,    // e.g. 'hook-chain'
  status: 'ok' | 'warn' | 'fail',
  message: string,     // one-line human summary
  remediation?: string // present when status !== 'ok'
}
```

Quick mode (default) skips this section. Pass `full` to run it. Doctor never blocks — even a `fail` row is just diagnostic output.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
