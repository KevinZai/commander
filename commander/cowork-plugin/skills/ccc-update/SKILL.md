---
name: ccc-update
description: "Update the installed Commander plugin: detect install mode and versions, give the exact update commands, verify after restart. Use when outdated."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
argument-hint: ""
---

# /ccc-update — Get onto the latest

**CC Commander** · /ccc-update · Detect → update → restart → verify

## When to use / when not to

- Use to move an installed Commander plugin to the latest published version.
- Use after a restart to confirm an update landed.
- Not for vendor submodules under this repository (maintainer-only): that is `/ccc-upgrade`.
- Not for a full health report: `/ccc-doctor` also flags staleness, as one row of a larger diagnostic.

In Codex, ask plain-text questions where this skill says AskUserQuestion, and use the Codex path in [references/install-modes.md](references/install-modes.md#codex).

## What happens

### Step 1 — Detect install mode and versions

Run:

```bash
CLONE="$HOME/.claude/plugins/marketplaces/commander-hub"
if [ ! -d "$CLONE" ]; then
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

INSTALLED_JSON="$HOME/.claude/plugins/installed_plugins.json"
INSTALLED_VERSION="n/a"
if [ -f "$INSTALLED_JSON" ]; then
  INSTALLED_VERSION=$(node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('$INSTALLED_JSON','utf8'));
      const k = Object.keys(d.plugins||{}).find(k => k.startsWith('commander@'));
      process.stdout.write(k && d.plugins[k][0] ? (d.plugins[k][0].version||'n/a') : 'n/a');
    } catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo "n/a")
fi

# Desktop-managed install: provisioned per session from the claude.ai account,
# with no marketplace clone and no installed_plugins.json entry.
DESKTOP_VERSION="n/a"
if [ "$CLONE" = "n/a" ] && [ "$INSTALLED_VERSION" = "n/a" ]; then
  DESKTOP_MANIFEST=$(/bin/ls -t "$HOME/Library/Application Support/Claude/"local-agent-mode-sessions/*/*/rpm/plugin_*/.claude-plugin/plugin.json 2>/dev/null | head -50 | while read -r f; do
    if /usr/bin/grep -q '"name"[[:space:]]*:[[:space:]]*"commander"' "$f" 2>/dev/null; then echo "$f"; break; fi
  done)
  if [ -n "$DESKTOP_MANIFEST" ]; then
    DESKTOP_VERSION=$(node -e "
      try { process.stdout.write(JSON.parse(require('fs').readFileSync('$DESKTOP_MANIFEST','utf8')).version||'n/a'); }
      catch(e) { process.stdout.write('n/a'); }
    " 2>/dev/null || echo "n/a")
  fi
fi

# Dev checkout: running inside the cc-commander repository itself.
DEV_REPO="n/a"
if [ -f "package.json" ] && /usr/bin/grep -q '"name": "cc-commander"' package.json 2>/dev/null; then
  DEV_REPO="$(pwd)"
fi

REMOTE_VERSION="n/a"
if [ "$CLONE" != "n/a" ]; then
  REMOTE_VERSION=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo "n/a")
else
  # No clone to run the checker from: read the published manifest on main.
  REMOTE_VERSION=$(curl -fsSL --max-time 8 "https://raw.githubusercontent.com/KevinZai/commander/main/commander/cowork-plugin/.claude-plugin/plugin.json" 2>/dev/null | node -e "
    let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const v=JSON.parse(s).version;process.stdout.write(/^\d+\.\d+\.\d+$/.test(v)?v:'n/a');}catch(e){process.stdout.write('n/a');}});
  " 2>/dev/null || echo "n/a")
fi

echo "CLONE=$CLONE"
echo "INSTALLED_VERSION=$INSTALLED_VERSION"
echo "DESKTOP_VERSION=$DESKTOP_VERSION"
echo "DEV_REPO=$DEV_REPO"
echo "REMOTE_VERSION=$REMOTE_VERSION"
```

### Step 2 — Route by mode and report

Report plainly: `Installed: vX.Y.Z · Latest: vA.B.C`, using whichever installed value is set.

1. `REMOTE_VERSION` is `n/a`: say GitHub could not be reached (offline or rate-limited) and stop.
2. Installed equals or is newer than `REMOTE_VERSION`: say the install is already current, run Step 5 to confirm the runtime and hooks, and stop.
3. Otherwise route by mode:
   - **CLI marketplace** (`CLONE` or `INSTALLED_VERSION` set): continue to Step 3.
   - **Desktop-managed** (`DESKTOP_VERSION` set, the others `n/a`): no local clone exists by design. Give the Desktop steps from [references/install-modes.md](references/install-modes.md#desktop-managed-account-synced) and do not run the `claude plugin marketplace` sequence.
   - **Dev checkout** (`DEV_REPO` set, the others `n/a`): tell the maintainer to `git pull` and restart the session; version truth is `package.json`.
   - **Not installed** (`INSTALLED_VERSION`, `DESKTOP_VERSION`, `DEV_REPO` all `n/a`): point at the install guide in [references/install-modes.md](references/install-modes.md#not-installed), not `/ccc-doctor`.

### Step 3 — Confirm and hand over the update commands

Call AskUserQuestion:

```yaml
question: "Update CC Commander vINSTALLED_VERSION to vREMOTE_VERSION?"
header: "Update"
multiSelect: false
options:
  - label: "🟢 Update now"
    description: "You run two /plugin commands, then restart; this skill verifies after."
    preview: "/plugin marketplace update commander-hub\n/plugin update commander"
  - label: "Not now"
    description: "Nothing changes; run /ccc-update again anytime."
```

On "Update now", give the user these commands to run themselves. A skill cannot invoke `/plugin` built-ins.

```
/plugin marketplace update commander-hub
/plugin update commander
```

Scripted CLI equivalent: `claude plugin marketplace update commander-hub && claude plugin update commander`.

### Step 4 — Restart

Tell the user, every time:

> ⚠️ A restart is required. `/plugin update` stages the new version; it does not hot-swap the running session. Fully quit Claude Code or Desktop (Cmd+Q, not closing the window) and reopen, or start a new CLI session. Then run `/ccc-update` again to verify.

### Step 5 — Verify the installed runtime

Verify the installed runtime, not the marketplace clone. A successful marketplace refresh with an unapplied plugin update leaves the clone on the new version while the old runtime keeps running.

```bash
# installed_plugins.json is the client's authoritative record; its installPath
# is the plugin source directly (no commander/cowork-plugin wrapper).
RUNTIME_SRC=$(node -e "
  try {
    const j=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
    const rows=(j.plugins&&(j.plugins['commander@commander-hub']||j.plugins['commander']))||[];
    const r=Array.isArray(rows)?rows[0]:rows;
    if(r&&r.installPath) process.stdout.write(r.installPath);
  } catch(e) {}
" 2>/dev/null || echo "")
{ [ -z "$RUNTIME_SRC" ] || [ ! -d "$RUNTIME_SRC" ]; } && RUNTIME_SRC="n/a"

NEW_VERSION="n/a"
[ "$RUNTIME_SRC" != "n/a" ] && NEW_VERSION=$(node -e "
  try { process.stdout.write(JSON.parse(require('fs').readFileSync('$RUNTIME_SRC/.claude-plugin/plugin.json','utf8')).version||'n/a'); }
  catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo "n/a")
echo "NEW_VERSION=$NEW_VERSION"

# Prove the hook chain in the installed runtime runs.
[ "$RUNTIME_SRC" != "n/a" ] && echo '{}' | node "$RUNTIME_SRC/hooks/session-end.js" | head -c 200
```

- Desktop-managed mode has no `installed_plugins.json`: re-run Step 1 and compare `DESKTOP_VERSION` to `REMOTE_VERSION` instead.
- `NEW_VERSION` must equal `REMOTE_VERSION`. If the clone shows the new version but `NEW_VERSION` is old, say exactly that: the marketplace refreshed but the plugin update did not apply, or the app was not fully quit. Next steps are in [references/install-modes.md](references/install-modes.md#update-did-not-apply).
- The hook pipe-test must print one JSON line, for example `{"continue":true,...}`. No output or a crash means the installed runtime's hooks are not wired; send the user to `/ccc-doctor`.

### Step 6 — Optional: turn on auto-update

If the user updates often, offer the marketplace `autoUpdate` toggle. Point to `/ccc-doctor`, which owns the consent-gated backup, edit and verify sequence; do not duplicate that mutation here.

## Decision points

- Step 3: update now (🟢) or not now. Ask only once versions differ, never at the start.

## Done when

- Step 5 printed `NEW_VERSION` equal to `REMOTE_VERSION` (or Step 1 `DESKTOP_VERSION` equal to it in Desktop mode), and
- the hook pipe-test printed a JSON line,
- and the skill reported both results verbatim. Otherwise report the mismatch and the next step; do not claim success.

## Guardrails

- Never tell a marketplace or Desktop user to `git pull`; there is no working tree. `git pull` is for the dev checkout only.
- Never claim to have run `/plugin update`; hand the exact commands to the user.
- Never skip the restart reminder; an update without a restart is the most common cause of "I updated but nothing changed".
- Never report success from Step 3 alone; Step 5 is the proof.
- Never run the `claude plugin marketplace` sequence in Desktop-managed mode.
- This skill reads local files and the public manifest only; it writes nothing. The `autoUpdate` change belongs to `/ccc-doctor` and needs the user's consent there.

## See also

- `/ccc-doctor` — full install diagnostics, cache recovery, `autoUpdate` toggle
- `/ccc-upgrade` — maintainer-only vendor submodule updater
- `/ccc-changelog` — what changed between versions

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
