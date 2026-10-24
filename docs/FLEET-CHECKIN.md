# Fleet check-in contract (`ccc checkin`)

`ccc checkin` is CCC's side of the Fleet check-in gate. It answers one question in one call: is CC Commander healthy on this lane, and which versions is it running? Fleet's dispatch gate and every Superfleet brief run it before work starts.

It is read-only and offline. It reads the lane's config dir and the `ccc` checkout, and the only subprocess it starts is `claude --version`.

## Usage

```bash
ccc checkin                # one human line
ccc checkin --json         # the schema-1 object below
ccc checkin --json --no-cli  # skip the `claude --version` probe
```

`ccc --checkin` works the same way.

The lane comes from `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude` (see `commander/lib/lane.js`). `CCC_CLAUDE_BIN` overrides the `claude` binary that is probed.

## Exit codes

| Code | Meaning | What Fleet should do |
|---|---|---|
| 0 | Healthy. Warnings are allowed. | Proceed. |
| 1 | A blocking check failed, for example the plugin is disabled. | Fail closed and keep the job queued. |
| 3 | No usable commander plugin: no record, a missing cache dir, or a cache without a readable `.claude-plugin/plugin.json` and `skills/ccc/SKILL.md`. | Fail closed (CCC is down on this lane). |

## JSON (schema 1)

```json
{
  "schema": 1,
  "generated_at": "2026-10-24T14:00:00.000Z",
  "ccc_version": "8.1.2",
  "ccc_sha": "128f178a…",
  "plugin_version": "8.1.2",
  "plugin_sha": "128f178a…",
  "cli_version": "2.1.309",
  "drift": [],
  "lane": { "name": "ai4", "account": "ai4", "config_dir": "/Users/me/.claude-ai4", "state_dir": "/Users/me/.claude-ai4/commander", "source": "CLAUDE_CONFIG_DIR", "known": true },
  "health": { "ok": true, "checks": [ { "id": "plugin_installed", "status": "ok", "blocking": false, "message": "commander@commander-hub 8.1.2" } ] },
  "next": []
}
```

| Field | Notes |
|---|---|
| `schema` | Bumped only on breaking changes. Consumers check `schema === 1`. New keys can be added without a bump. |
| `ccc_version`, `ccc_sha` | The checkout `ccc` runs from (`package.json`, `.git` HEAD). The sha is `null` for an npm install. |
| `plugin_version`, `plugin_sha` | The installed `commander@*` record for this lane. The installed `plugin.json` version wins over the record. Both are `null` when no plugin is installed. |
| `cli_version` | `claude --version`, or `null` when skipped or unavailable. |
| `drift[]` | `{kind, message, fix, …}`. Kinds: `checkout_behind_plugin`, `plugin_behind_checkout`, `plugin_record_stale`, `cli_below_floor` (below 2.1.304, the MCP Tasks floor). |
| `lane` | `name` is `pri` for `~/.claude`, `<name>` for `~/.claude-<name>`, `ai5` for `~/.claude-guestnetworks`, and `custom` for any other dir name (`known: false`). |
| `health.checks[]` | `{id, status: ok/warn/fail/skip, blocking, message}`. The ids are `plugin_installed`, `plugin_enabled`, `ccc_checkout`, `claude_cli` and `lane`. Only `fail` can block. |
| `plugin_enabled` | Fails unless `enabledPlugins["commander@commander-hub"]` is `true` after Claude Code's precedence: the lane's `settings.json`, then the project's `.claude/settings.json`, then `.claude/settings.local.json` (the project is the cwd). An unreadable settings file also fails. |
| `next[]` | Suggested fix commands, in order. Fleet shows them; it never runs them. |

The human line has this shape:
`CCC check-in OK: ccc 8.1.2, plugin 8.1.2, claude 2.1.309, lane ai4, 0 warnings`

## Fleet consumption

- **Superfleet Step 0:** run `ccc checkin` and record the line in `STATUS.md`. A non-zero exit means CCC is red. Record it and continue, unless you are the CCC lane.
- **Dispatch gate** (fleet#328): call `ccc checkin --json --no-cli` with the lane's `CLAUDE_CONFIG_DIR`. Exit 3 means `ccc_unavailable`. Store the object on the card as `task.ccc.checkin`.
