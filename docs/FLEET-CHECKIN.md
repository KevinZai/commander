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
| 1 | A blocking check failed, for example the plugin is disabled or its hook chain cannot load. | Fail closed and keep the job queued. |
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
  "hooks": { "status": "ok", "hooks_dir": "/Users/me/.claude-ai4/plugins/cache/commander-hub/commander/8.1.3/hooks", "loadable": true, "registered": 46, "unregistered": [], "missing": [], "legacy_require": [], "no_esm_import": [], "shared_state_writers": [] },
  "connectors": { "catalog": 16, "configured": { "user": 2, "local": 0, "project": 0, "total": 2 } },
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
| `hooks` | Hook health of the lane's installed plugin, computed with the same functions as `ccc doctor`'s hook-chain check. `null` when no usable plugin is installed. See below. |
| `connectors` | `catalog`: rows in the installed plugin's `CONNECTORS.md` opt-in MCP table. `configured`: MCP servers set up for this lane by scope: `user` (top-level `mcpServers` in `<config dir>/.claude.json`, or `~/.claude.json` for the default dir), `local` (that file's `projects[<cwd>]`) and `project` (`<cwd>/.mcp.json`). Counts come from the same functions as `ccc doctor`'s mcp-availability check. A missing table or a malformed config is `null` (unknown), never `0`, and makes `total` `null`. Informational: it never blocks. |
| `health.checks[]` | `{id, status: ok/warn/fail/skip, blocking, message}`. The ids are `plugin_installed`, `plugin_enabled`, `ccc_checkout`, `claude_cli`, `hooks` and `lane`. Only `fail` can block. |
| `plugin_enabled` | Fails unless `enabledPlugins["commander@commander-hub"]` is `true` after Claude Code's precedence: the lane's `settings.json`, then the project's `.claude/settings.json`, then `.claude/settings.local.json` (the project is the cwd). An unreadable settings file also fails. |
| `next[]` | Suggested fix commands, in order. Fleet shows them; it never runs them. |

### `hooks` block

A handler is registered when `hooks/hooks.json` runs it or the SessionStart orchestrator imports it.

| Field | Meaning |
|---|---|
| `status` | `ok`; `warn` when any of `unregistered`, `no_esm_import` or `shared_state_writers` is non-empty; `fail` when `loadable` is false or `missing` or `legacy_require` is non-empty. |
| `hooks_dir` | The installed plugin's `hooks/` dir that was inspected. |
| `loadable` | `false` when `hooks.json` is missing or is not valid JSON. |
| `registered` | Count of registered handler files that exist. |
| `unregistered[]` | Shipped `hooks/*.js` and `hooks/_archive/*.js` files that nothing registers and that are not allowlisted. Warning. |
| `missing[]` | Registered handlers whose file is missing. Blocking. |
| `legacy_require[]` | Registered handlers that call `require()`; they cannot load as ESM. Blocking. |
| `no_esm_import[]` | Registered handlers with no `import`. Warning. |
| `shared_state_writers[]` | Hook files that build the shared `~/.claude/commander` path instead of the lane state dir, so parallel lanes would write one file. Releases up to 8.1.2 report about 33; they warn but do not block. |

The `hooks` check (`health.checks[]`) is `warn` or `fail` to match. A `fail` adds `claude plugin install commander@commander-hub` to `next`. Fleet's dispatch gate proceeds on `warn` (exit 0) and fails closed on `fail` (exit 1).

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

## Status line segment (Superfleet runs)

`lib/statusline-superfleet.sh` (sourced by `lib/statusline.sh`) adds `🚀 ai4 SF-CCC-20261024 3/7 CC-2093 5h:6%` when a session runs inside a Superfleet run dir:

| Env | Meaning |
|---|---|
| `SF_RUN_DIR` | The run dir. It needs an `ITEMS.tsv` with columns `item, commit, state, …`. |
| `SF_RUNS_ROOT` | Alternative to `SF_RUN_DIR`: the parent of the run dirs. The matching run dir is the one whose `SESSION_ID` file holds the session's id. |
| `CCC_LANE_USAGE_FILE` | A `lane-usage-cli.json`-shaped file. The segment shows the lane's `session` window as `5h:N%`. A reading older than 30 minutes, or no reading at all, shows `5h:?`. |
| `CCC_STATUSLINE_SF=off` | Hides the segment. |

- **Progress:** `done` and `skipped` rows count as finished. The current ticket is the first `wip` row; if there is none, the first row that is not done, skipped or blocked.
- **Batch key:** the `Batch key:` line in `BRIEF.md`, shortened to 16 characters. Without that line, the run dir name is used.
- **Cost:** the segment is read-only and offline. Its output is cached for 15 seconds under `$TMPDIR`.

### Rolling the status line out (`ccc statusline sync`)

`claude plugin update` does not touch the status line. `install.sh` copies `lib/statusline*.sh` into a config dir once, and each lane's `settings.json` runs that copy. `ccc statusline sync` shows which lanes run an old copy:

```bash
ccc statusline sync                 # dry run: every lane, changes nothing
ccc statusline sync --lane ai4      # one lane (lane name or config dir name)
ccc statusline sync --json          # {schema: 1, source_dir, applied, in_sync, targets[]}
ccc statusline sync --apply         # archive, then copy
```

- **Source:** `statusline.sh` and `statusline-superfleet.sh` in the `lib/` of the checkout `ccc` runs from.
- **Target:** the dir of the `statusline.sh` that the lane's `statusLine.command` runs, else `<config dir>/lib`. Lanes that run the same file (all lanes that point at `~/.claude/lib/statusline.sh`) are one target. Quoted paths with spaces are understood. A lane with no status line configured, or a `statusLine.command` that runs something other than `statusline.sh`, is skipped. Unknown arguments (including `--lane=X`) exit 2 before anything is written. An unreadable or malformed `settings.json` is a warning that counts as drift (exit 1), and `--apply` leaves that lane alone.
- **Per file:** `same`, `differs` (with `+added/-removed` lines), `missing`, `unreadable`, or after `--apply` `copied` or `apply_failed`.
- **`--apply`:** copies each `differs` or `missing` file. It first copies the old file to `<config dir>/commander/archive/<timestamp>/<dir>/`, under the config dir that owns the target. Nothing is deleted.
- **Exit codes:** 0 in sync (or applied cleanly), 1 drift remains or a copy failed, 2 bad arguments or an unknown lane.
- Lanes do not run `--apply` themselves. The coordinator runs it once with the release.

## Fleet routing hook

The UserPromptSubmit classifier (`hooks/intent-classifier.js` with `hooks/lib/fleet-intent.mjs`) recognizes Fleet control-plane requests: launching a lane, Superfleet or `SF-<KEY>` batch status, a lane sweep, finishing a Superfleet batch, lane usage or headroom, and what's running on the fleet. It answers with a `<ccc-fleet-route>` block that names the claude-fleet skill, the read-only `fleet` commands and the `ccc checkin` line.

- **CCC prompts stay in CCC:** local parallel-agent prompts (parallel, subagents, fan-out, worktrees) keep normal CCC routing, including `/ccc-fleet`. A generic "batch" or "account" never counts as a Fleet request.
- **Opt-in:** Fleet routing is on when the claude-fleet skill is installed (Claude: `<config dir>/skills`, `.claude/skills`; Codex: `.agents/skills`, `~/.agents/skills`, `/etc/codex/skills`), or when `CCC_FLEET_ROUTE=on`. `CCC_FLEET_ROUTE=off` turns it off. Opted in without any Fleet tools, the block says so in one line.
- **Suggest mode:** `CCC_ROUTE_MODE=suggest` offers the skill and asks before using it. `CCC_ROUTE_MODE=off` disables all routing.
- **Never acts:** the hook never launches, stops or messages a lane. Its only subprocess is `ccc checkin --no-cli`, capped at 3 seconds, and output that is not a check-in line is dropped.
