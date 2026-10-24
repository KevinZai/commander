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

## Instance audit (`ccc doctor --instances`)

`ccc doctor --instances` audits every Claude config dir in `$HOME` (or `--home DIR`). A config dir is `~/.claude` or `~/.claude-<lane>` that contains `plugins/` or `projects/`. For each dir it reports:

- the lane;
- the installed commander version against `latest` (the version in this checkout's `package.json`);
- whether the plugin is enabled in that dir's `settings.json`;
- whether the plugin cache has `hooks/hooks.json`;
- local `skills/ccc*` copies that are real directories rather than symlinks, because these shadow the plugin.

It is read-only and never starts `claude`. It exits 1 when any dir has a gap. `--json` returns `{schema: 1, host, home, latest, ok, instances[]}`. Without `--json` it prints a Markdown table you can paste into a Fleet issue.

To audit another machine, run the same command there with its own checkout: `ccc doctor --instances` (or `node <checkout>/bin/kc.js doctor --instances --json`).

## What next (`ccc next --json`)

`ccc next` takes one job and answers what to run and when. Pass the job as JSON on stdin (`{"kind","tags","title","description"}`) or with `--kind`, `--tags a,b` and `--title`. The output is one JSON line, a drop-in for the fleet#328 `bin/ccc-next` stopgap (set `dispatchGate.ccc.command` to `["ccc","next","--json"]`):

```json
{"schema":1,"action":"proceed","when":"now","skill":"/ccc-security","reason":"CCC 8.1.2: registry high match 0.95 -> /ccc-security","version":"8.1.2","source":"ccc-next","tier":"high","score":0.95,"route_source":"installed","candidates":[{"skill":"/ccc-security","score":0.95}]}
```

- **Skill:** `title`, `description` and `tags` are scored against the #188 routing registry (`hooks/lib/ccc-routes.json`) of the lane's installed plugin. If that plugin has no registry, the checkout's registry is used (`route_source: "checkout"`). Only skills the installed plugin actually has can be returned. With no medium or high match, the fallback is the first tag in the map, then the kind (`code`, `research`, `review`, `docs`, `other`), then `/ccc`.
- **Timing:** `fleet-hold.json` in the lane state dir, or the legacy `~/.claude/commander/`, controls timing. `{"hold":true,"reason":…}` gives `action: "hold"`. `{"until":"<ISO>","reason":…}` gives `action: "defer"` with `when` set to that time. An unreadable or malformed hold file fails closed as a hold.
- **Exit codes:** 0 answered, 2 bad input (not a JSON object, or more than 64 KB), 3 no usable commander plugin on the lane.
- **Read-only:** it never dispatches, writes or makes network calls.
