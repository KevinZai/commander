# Codex CLI commands used by /ccc-codex

Checked against Codex CLI help output. When a flag here is rejected, run `codex <subcommand> --help` and trust that output.

Global options (any subcommand): `-c key=value` (TOML value override), `--enable <feature>`, `--disable <feature>`. Root only: `-p/--profile <name>`, `-m/--model`, `-s/--sandbox`, `-a/--ask-for-approval`, `-C/--cd`, `--remote <addr>`.

| Area | Command | Writes state | Notes |
|---|---|---|---|
| Health | `codex doctor --json --summary` | no | redacted JSON: `overallStatus`, `checks.<id>.{status,summary,remediation}` |
| Health | `codex doctor --all --no-color` | no | full human report |
| Version | `codex --version` | no | |
| Update | `codex update` | yes (binary) | ask first |
| Run | `codex exec [--json] [-o/--output-last-message <file>] [-m <id>] [--cd <dir>] [--sandbox read-only\|workspace-write] [-p <profile>] [--skip-git-repo-check] -- "<prompt>"` | files in `--cd` when `workspace-write` | `-` as the prompt reads stdin |
| Resume | `codex exec resume --last [--json] [-o <file>] [-m <id>] "<prompt>"` | per session sandbox | no `--cd` / `--sandbox`; run from the session's directory; set sandbox with `-c sandbox_mode="..."` |
| Resume | `codex exec resume <session-id> "<prompt>"` | same | |
| Review | `codex review --uncommitted \| --base <branch> \| --commit <sha> [--title <t>] ["<instructions>"]` | no | model via `-c review_model="<id>"` |
| Review (headless) | `codex exec review --uncommitted \| --base <branch> \| --commit <sha> [-m <id>] [--json] [-o <file>]` | no | |
| Plugins | `codex plugin list [--json] [--available] [-m <marketplace>]` | no | |
| Plugins | `codex plugin add <plugin>@<marketplace> [--json]` | config + cache | |
| Plugins | `codex plugin remove <plugin>@<marketplace>` | config + cache | ask first |
| Marketplaces | `codex plugin marketplace list` | no | |
| Marketplaces | `codex plugin marketplace add <path \| owner/repo[@ref] \| git-url> [--ref <ref>] [--sparse <path>] [--json]` | config | |
| Marketplaces | `codex plugin marketplace upgrade` | snapshot | Git marketplaces only |
| Marketplaces | `codex plugin marketplace remove <name>` | config | ask first |
| MCP | `codex mcp list` / `codex mcp get <name>` | no | |
| MCP | `codex mcp add <name> [--env K=V] -- <command...>` | config | stdio |
| MCP | `codex mcp add <name> --url <url> [--bearer-token-env-var <VAR>]` | config | streamable HTTP |
| MCP | `codex mcp login <name> [--scopes a,b] [--no-browser]` / `codex mcp logout <name>` | credentials | user runs it in their own terminal |
| MCP | `codex mcp remove <name>` | config | ask first |
| Agents | `codex agents` | no | interactive TUI of app-server sessions |
| Cloud | `codex cloud list [--env <id>] [--limit n] [--json]` | no | experimental |
| Cloud | `codex cloud exec --env <id> [--branch <b>] [--attempts n] "<task>"` | remote task | branch must be on the remote |
| Cloud | `codex cloud status <task>` / `codex cloud diff <task>` | no | |
| Cloud | `codex cloud apply <task> [--attempt n]` | working tree | ask first; clean tree |
| Remote | `codex remote-control start [--json] [--no-daemon]` | daemon | experimental; ask first |
| Remote | `codex remote-control pair [--json]` | pairing code | show once, never log |
| Remote | `codex remote-control stop` | daemon | |
| Features | `codex features list` | no | |
| Features | `codex features enable <f>` / `codex features disable <f>` | config | back up first |
| Login | `codex login` / `codex logout` | credentials | user runs it |

Interactive-only slash commands (inside `codex`): `/model`, `/plugins`, `/hooks` (trust plugin hooks), `/mcp`, `/import`, `/review`, `/goal`, `/agent`, `/worktree`, `/usage`.

`codex mcp-server` no longer exists; `codex app-server` (experimental) replaced it.
