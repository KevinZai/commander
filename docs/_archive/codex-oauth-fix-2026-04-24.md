# Codex OAuth-Only Auth Bug — Root Cause + Remediation

**Reported:** 2026-04-24
**Symptom:** Codex CLI keeps reverting to API-key auth + hitting "quota exceeded". The `~/.local/bin/codex` wrapper that unsets `OPENAI_API_KEY` doesn't help.

## 🚨 Root cause (4 compounding issues)

### Issue 1: `OPENAI_API_KEY` hardcoded in launchd plist
**File:** `~/Library/LaunchAgents/ai.openclaw.gateway.plist`

The OpenClaw gateway plist contains an `<key>OPENAI_API_KEY</key>` entry with a plaintext API key value embedded in the XML.

This means every process launched by the gateway (Codex, agents, MCP servers) inherits `OPENAI_API_KEY` in its env. Codex auto-detects the env var and caches it to `auth.json` as `auth_mode: "apikey"`.

### Issue 2: Auth file gets re-corrupted
**File:** `~/.codex/auth.json`

Whenever Codex starts with `OPENAI_API_KEY` set, it writes a JSON file with `auth_mode: "apikey"` and the env-var key embedded. This overwrites OAuth tokens. From that point on, Codex reads auth.json (apikey mode) and uses the embedded key — even if env is later unset.

### Issue 3: PATH ordering bypasses the wrapper
**File:** `~/.zshrc`

Line 36 prepends `~/.local/bin` (where the unset wrapper lives).
Line 80 prepends `~/.openagents/nodejs/bin` (where the raw npm-global Codex lives).

Line 80 runs LAST → openagents wins → wrapper never fires. `which codex` returns the raw binary, not the wrapper.

### Issue 4: Shell function only works in interactive shells
**File:** `~/.zshrc:51`

```zsh
codex() {
  unset OPENAI_API_KEY
  command codex "$@"
}
```

Shell functions don't propagate to non-interactive subprocesses (Emdash, OpenAgents, MCP servers, launchd-spawned anything). Only your direct shell typing benefits.

## ✅ Remediation steps (in order)

### Step 1: Auth file already wiped ✅

`~/.codex/auth.json` was cleared to `{}` and the corrupted file backed up to `~/.codex/auth.json.bak-20260424-203338`. Codex will fail until you re-auth via OAuth.

### Step 2: Remove `OPENAI_API_KEY` from launchd plist (you must do this)

```bash
# Backup first
cp ~/Library/LaunchAgents/ai.openclaw.gateway.plist \
   ~/Library/LaunchAgents/ai.openclaw.gateway.plist.bak-codex-fix-$(date +%Y%m%d-%H%M%S)

# Edit the plist — REMOVE the OPENAI_API_KEY <key>+<string> pair entirely.
# KEEP OPENAI_OAUTH_API_KEY (that's the OAuth-issued JWT, different beast).
$EDITOR ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# Reload launchd (this restarts the gateway — your CLAUDE.md says NEVER restart
# without explicit approval, so confirm before running):
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load   ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# Verify:
launchctl list | grep openclaw
openclaw gateway status
```

### Step 3: Remove `OPENAI_API_KEY` from `~/.openclaw/.env`

The .env file is regenerated from FIFO on gateway restart. The authoritative source is the 1Password "Developer Environment" item. Edit there:

1. Open 1Password → vault "Alfred" → "Developer Environment"
2. Remove the `OPENAI_API_KEY` field (KEEP `OPENAI_OAUTH_API_KEY`)
3. Save
4. Trigger a FIFO refresh (or just restart the gateway — Step 2 covers it)

### Step 4: Fix PATH ordering in `~/.zshrc`

**Option A (cleanest)** — append at end of .zshrc:

```bash
# Force ~/.local/bin to win PATH precedence (codex wrapper > raw binary)
export PATH="$HOME/.local/bin:$PATH"
```

This re-prepends after line 80's openagents prepend, so .local/bin wins.

**Option B** — move line 80 ABOVE line 36 in .zshrc.

**Option C (most robust)** — replace the `~/.openagents/nodejs/bin/codex` symlink with the wrapper:

```bash
mv ~/.openagents/nodejs/bin/codex ~/.openagents/nodejs/bin/codex-real-binary
ln -s ~/.local/bin/codex ~/.openagents/nodejs/bin/codex

# Then the wrapper at ~/.local/bin/codex needs to know it should call the original.
# Edit ~/.local/bin/codex to:
#   exec ~/.openagents/nodejs/bin/codex-real-binary "$@"
```

Risk: npm reinstalls of `@openai/codex` will overwrite the symlink. But it's the most robust runtime guarantee.

### Step 5: Re-auth via OAuth

```bash
codex login
# Opens browser, OAuth flow, writes auth.json with auth_mode: "chatgpt" + OAuth tokens
```

Verify:
```bash
codex login status
# Should say: "Logged in via ChatGPT" (not "API key")

cat ~/.codex/auth.json | head -3
# Should show: "auth_mode": "chatgpt" with tokens object, OPENAI_API_KEY: null
```

### Step 6: Rotate the leaked API key (recommended — paranoid path)

The key was sitting in plaintext in:
- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
- `~/.openclaw/.env`
- `~/.codex/auth.json` (now wiped)

If any of those leaked (backups, screen-shares, screenshots, etc.) the key is compromised. Rotate at https://platform.openai.com/api-keys.

## 🛡️ Prevent regression

Add a sanity check to your shell startup:

```bash
# In ~/.zshrc, after PATH setup:
if [ -n "$OPENAI_API_KEY" ]; then
  echo "⚠️  OPENAI_API_KEY is set in env — Codex will revert to apikey mode."
  # Optional: auto-unset
  # unset OPENAI_API_KEY
fi
```

Or a more aggressive pre-Codex check in the wrapper:

```bash
#!/bin/zsh
# /Users/ai/.local/bin/codex
unset OPENAI_API_KEY

# Defensive: if auth.json shows apikey mode, abort
if [ -f ~/.codex/auth.json ] && grep -q '"auth_mode": "apikey"' ~/.codex/auth.json; then
  echo "❌ ~/.codex/auth.json is in apikey mode — likely leak. Aborting."
  echo "   Run: rm ~/.codex/auth.json && codex login"
  exit 1
fi

exec /Users/ai/.openagents/nodejs/bin/codex-real-binary "$@"
```

## 📍 Why this kept recurring

You'd run `codex login` → OAuth flow → auth.json updates to chatgpt mode.
Next time the gateway restarts (or any service that sets OPENAI_API_KEY launches Codex), Codex re-detects the env var and overwrites auth.json back to apikey mode.

The cycle: OAuth login → gateway restart → API key in env → apikey mode written to auth.json → "quota exceeded" → repeat.

The launchd plist is the persistent leak source. Until that's fixed, the cycle won't stop.

## Files changed by this session (for your records)

- `~/.codex/auth.json` — wiped to `{}` (backup at `~/.codex/auth.json.bak-20260424-203338`)
- `docs/codex-oauth-fix-2026-04-24.md` — this remediation doc

## Files YOU need to change (no auto-edit by me, per CLAUDE.md gateway protocol)

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist` — remove OPENAI_API_KEY entry
- 1Password "Developer Environment" — remove OPENAI_API_KEY field (or move to a separate item that's NOT loaded into gateway env)
- `~/.zshrc` — append `export PATH="$HOME/.local/bin:$PATH"` at the end (or use Option C symlink trick)
- Run `codex login` after Step 2-4 for OAuth re-auth
- Optionally rotate the leaked OpenAI API key
