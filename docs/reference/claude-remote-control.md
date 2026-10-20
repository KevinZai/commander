# Claude dispatch with Remote Control

Commander starts Claude jobs as interactive tmux sessions with `--remote-control`.
It holds the task until Claude's native session record confirms a live matching
PID, session id and Remote Control bridge id. A local session starting successfully
does not prove Remote Control is available. If registration takes longer than two
minutes, the job writes a blocked report without submitting the task. Use tmux to
resolve login, consent, workspace trust or organization policy, then start a new job.

The CLI, simple menu and split menu use the same runner. Split mode creates a
pane in the existing tmux session. Other modes create a persistent tmux session.
Completing a report leaves Claude available for steering. Prompt content stays in
private local launch files and is submitted using tmux bracketed paste; it is not
part of a shell command or Fleet metadata.

```sh
ccc --dispatch "Inspect the failing test and fix it" --model sonnet --cwd "$PWD" --json
```

`--report PATH` selects a fresh report path; `--timeout SECONDS` controls how long
the CLI observes completion (four hours by default). Each task is instructed to
finish by writing `reports/<job>-REPORT.md` whose first line is
`Status: done|blocked|failed — <one-line result>`. A done report resolves the CLI
JSON result with `result`, `session_id`, `status`, `report` and `tmux_session`.
`cost_usd` is null because this transport does not measure spend. Session history,
replays and Linear summaries show unknown cost. Knowledge and dream totals count
only measured records and expose measured/unknown coverage; their averages
exclude unknown costs. Blocked or failed
reports and missing reports reject the dispatch. A timeout writes a blocked report
and leaves the interactive session available. It does not terminate Claude or cap
spend. The simple menu's Escape/q stops observation; the Claude session remains.
Report completion must follow any authorized pingback in the original task.

Print-mode options `--max-turns`, `--budget`, structured JSON schemas and output
formats are rejected explicitly; they are not silently ignored. Menu launches
show that dollar/turn caps are unavailable. The existing daemon's $5 cap remains
in force as a requirement: its jobs remain pending with an actionable held notice,
because the interactive transport cannot enforce it. Enabling uncapped automatic
daemon jobs needs a separate decision. The estimate-based admission cost gate
still applies; an estimate is not a runtime cap.

Metadata uses `~/.claude-remote/jobs/<job>.json` and includes account, model,
session id, issue, start time, cwd, tmux session and report path. It contains no
prompt. `CLAUDE_CONFIG_DIR` selects the existing account profile;
`CLAUDE_REMOTE_ACCOUNT` can label that profile explicitly.
`CLAUDE_REMOTE_JOBS_DIR` optionally selects another metadata directory.

The runner is self contained and uses the standard Claude CLI and tmux. It has
no dependency on a private launcher or service. Caller attribution (including the
nested-session guard) is preserved across existing tmux servers.

Requirements: a current Claude Code with interactive Remote Control, tmux,
claude.ai subscription login and trusted workspace. Pro, Max, Team and Enterprise
are supported; Team and Enterprise require the organization's Owner to enable
Remote Control. API keys and third-party API endpoints do not support it. No
install or upgrade is performed by this launcher.

The native admission record is an implementation integration verified against
Claude Code 2.1.303 on 2026-10-19: `<config-dir>/sessions/<pid>.json` contains
`pid`, `sessionId` and `bridgeSessionId` (`session_...`). If a future version
changes that schema, admission blocks rather than silently running locally.

Sources, checked 2026-10-19:

- [Remote Control](https://code.claude.com/docs/en/remote-control)
- [CLI reference](https://code.claude.com/docs/en/cli-reference)
- Local `claude --help`: `--remote-control [name]` is interactive;
  `--max-budget-usd` works only with `--print`.
