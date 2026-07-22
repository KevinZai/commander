---
name: ccc-update
description: "Click-first plugin update walkthrough. Detects installed vs latest version, runs the marketplace-update sequence, reminds you to restart, and verifies the new version + hooks are live."
model: sonnet
effort: low
allowed-tools:
  - Bash
  - AskUserQuestion
argument-hint: ""
---

# /ccc-update — Update CC Commander

**CC Commander** · /ccc-update · Detect → update → restart → verify

The end-user counterpart to `$ccc-doctor` (which also detects staleness, but
as one row in a bigger diagnostic report) — this skill does ONE thing:
get the user onto the latest version, correctly, in the fewest steps.

> Looking for the vendor-submodule updater instead (`vendor/*` git
> submodules under this repo, maintainer-only)? That's `$ccc-upgrade` — a
> different tool with a similarly-spelled name. This skill (`$ccc-update`)
> is for end users updating the installed plugin itself.

## Step 1 — Detect installed vs latest

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

REMOTE_VERSION="n/a"
[ "$CLONE" != "n/a" ] && REMOTE_VERSION=$(node "$CLONE/commander/update-check.js" --remote-only 2>/dev/null || echo "n/a")

echo "CLONE=$CLONE"
echo "INSTALLED_VERSION=$INSTALLED_VERSION"
echo "REMOTE_VERSION=$REMOTE_VERSION"
```

Report the result plainly: `Installed: vX.Y.Z · Latest: vA.B.C`.

- If `REMOTE_VERSION` is `n/a`: say you couldn't reach GitHub (offline or
  rate-limited) and stop — nothing else to do until network is back.
- If `INSTALLED_VERSION` equals `REMOTE_VERSION` (or is newer): say
  "You're already on the latest version — nothing to do" and stop.
- Otherwise, continue to Step 2.

## Step 2 — Confirm and run the update

Call `AskUserQuestion`:

```yaml
question: "Update CC Commander vINSTALLED_VERSION -> vREMOTE_VERSION?"
header: "CC Commander Update"
multiSelect: false
options:
  - label: "Update now"
    description: "Runs the marketplace-update sequence, then tells you to restart."
    preview: "claude plugin marketplace update commander-hub && claude plugin update commander"
  - label: "Not now"
    description: "Skip — you can run /ccc-update again anytime."
```

On "Update now", tell the user to run these two commands themselves (this
skill does NOT and cannot invoke `/plugin` commands on your behalf — they
are Claude Code CLI/Desktop built-ins, not something a skill can shell out
to):

```
/plugin marketplace update commander-hub
/plugin update commander
```

(CLI-only equivalent, if you're scripting: `claude plugin marketplace update commander-hub && claude plugin update commander`.)

## Step 3 — Restart reminder

> ⚠️ **A restart is required.** `/plugin update` stages the new version —
> it does not hot-swap the running session. Fully quit Claude Code /
> Cowork Desktop (Cmd+Q, not just closing the window) and reopen, or start
> a new CLI session.

## Step 4 — Verify after restart

Once the user confirms they've restarted, run:

```bash
CLONE="$HOME/.claude/plugins/marketplaces/commander-hub"
[ -d "$CLONE" ] || CLONE="n/a"
PLUGIN_SRC="n/a"
[ "$CLONE" != "n/a" ] && [ -d "$CLONE/commander/cowork-plugin" ] && PLUGIN_SRC="$CLONE/commander/cowork-plugin"

NEW_VERSION="n/a"
[ "$PLUGIN_SRC" != "n/a" ] && NEW_VERSION=$(node -e "
  try { process.stdout.write(JSON.parse(require('fs').readFileSync('$PLUGIN_SRC/.claude-plugin/plugin.json','utf8')).version||'n/a'); }
  catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo "n/a")
echo "NEW_VERSION=$NEW_VERSION"

# Prove the hook chain in the updated clone actually runs.
[ "$PLUGIN_SRC" != "n/a" ] && echo '{}' | node "$PLUGIN_SRC/hooks/session-end.js" | head -c 200
```

- `NEW_VERSION` should now equal `REMOTE_VERSION` from Step 1. If it
  doesn't, the update didn't apply — most likely cause: Desktop wasn't
  fully quit (a closed window keeps the old process, and the old process
  keeps the old plugin loaded). Point the user at `install-recovery.mdx`
  or `$ccc-doctor` for the deeper cache-clearing sequence.
- The hook pipe-test should print one JSON line (e.g.
  `{"continue":true,...}`). No output or a crash means the updated clone's
  hooks aren't wired — again, `$ccc-doctor` is the next step.

## Step 5 — Optional: never do this by hand again

If the user updates often, offer the one-time `autoUpdate` toggle (same
consent-gated flow `$ccc-doctor` offers — see that skill for the exact
backup + edit + verify sequence). Point them there rather than duplicating
the mutation logic in two places.

## Anti-patterns — DO NOT

- Never tell the user to `git pull` — there is no working tree in a
  marketplace install.
- Never claim to have run `/plugin update` yourself — skills cannot invoke
  Claude Code CLI built-ins; always hand the exact commands to the user.
- Never skip the restart reminder — `/plugin update` without a restart is
  the #1 cause of "I updated but nothing changed" reports.
- Never claim success from Step 2 alone — verification (Step 4) is what
  actually confirms the update landed.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
