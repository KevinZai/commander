# Install modes and recovery for /ccc-update

Linked from [../SKILL.md](../SKILL.md). Read the section for the mode Step 1 detected.

## Mode signals

| Mode | Signals from Step 1 | Update path |
|---|---|---|
| CLI marketplace | `CLONE` or `INSTALLED_VERSION` is not `n/a` | `/plugin` marketplace sequence (SKILL.md Step 3) |
| Desktop-managed | `CLONE` and `INSTALLED_VERSION` are `n/a`, `DESKTOP_VERSION` is set | Desktop settings (below) |
| Dev checkout | `DEV_REPO` is set, the others are `n/a` | `git pull` in the checkout, then restart |
| Codex | the user runs Commander from the Codex plugin | `codex plugin` (below) |
| Not installed | `INSTALLED_VERSION`, `DESKTOP_VERSION` and `DEV_REPO` all `n/a` | install guide (below) |

## CLI marketplace

The user runs, in Claude Code:

```
/plugin marketplace update commander-hub
/plugin update commander
```

Scripted equivalent:

```bash
claude plugin marketplace update commander-hub && claude plugin update commander
```

`claude plugin details commander` is an optional cross-check of the installed
entry. The authoritative record for verification stays
`~/.claude/plugins/installed_plugins.json` (SKILL.md Step 5).

## Desktop-managed (account-synced)

Claude Desktop and Cowork provision the plugin from the user's claude.ai
account into a per-session folder under
`~/Library/Application Support/Claude/local-agent-mode-sessions/`. There is no
marketplace clone and no `installed_plugins.json` entry by design, so the
`claude plugin marketplace` CLI sequence has nothing to update.

1. Desktop → Settings → Plugin Marketplace → update (or reinstall) the `commander` entry.
2. Fully quit the app (Cmd+Q, not closing the window) and relaunch.
3. If Desktop still shows the old version: remove the plugin at claude.ai (web), quit Desktop with Cmd+Q, then reinstall.

## Dev checkout

The maintainer runs from the repository. Version truth is `package.json`.
Run `git pull` in the checkout, then start a new session. This is the only mode
where `git pull` applies.

## Codex

The Codex mirror installs through Codex's own plugin manager, not `/plugin`.
The user runs:

```bash
codex plugin marketplace upgrade
codex plugin list --json
```

Restart the Codex session afterwards; confirm the listed Commander version
matches the latest version from Step 1.

## Not installed

Point at the install guide, not `/ccc-doctor`:

- Claude Code: `/plugin marketplace add KevinZai/commander`, then `/plugin install commander@commander-hub`.
- Desktop: Settings → Plugin Marketplace → Add from GitHub → `KevinZai/commander`.

## Update did not apply

Symptoms and next steps after a restart:

| Symptom | Cause | Next step |
|---|---|---|
| Clone shows the new version, `NEW_VERSION` is old | Marketplace refreshed, plugin update not applied | Run `claude plugin update commander`, then fully restart |
| `NEW_VERSION` old after update and restart | App was not fully quit; the old process keeps the old plugin loaded | Cmd+Q, relaunch, re-run `/ccc-update` |
| Hook pipe-test prints nothing or crashes | Hooks in the installed runtime are not wired | Run `/ccc-doctor` |
| Still stale after all of the above | Stale plugin cache | Follow the cache-clearing sequence in [mintlify-docs/install-recovery.mdx](../../../../../mintlify-docs/install-recovery.mdx) or run `/ccc-doctor` |
