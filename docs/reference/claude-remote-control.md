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
reports and missing reports reject the dispatch. The CLI observation `--timeout`
writes a blocked report and leaves the interactive session available; it does
not terminate Claude. Use the supervised bounds below to end a session. The simple menu's Escape/q stops observation; the Claude session remains.
Report completion must follow any authorized pingback in the original task.

Print-mode options `--budget`, structured JSON schemas and output formats are
rejected explicitly; they are not silently ignored, and dollar caps remain
unenforceable in this transport. `--max-turns` is supported as a supervised
bound (see below), not as a Claude flag.

## Bounds for unattended daemon jobs

The runner supervises Claude from its tmux pane. `start()` accepts `maxTurns` and
`wallTimeoutMs`; both are recorded in `launch.json` and the job metadata.

- Wall-clock timeout: when it elapses the supervisor writes a `blocked` report,
  sends SIGTERM to Claude and SIGKILL after 10 seconds. The session ends and its
  tmux pane closes. Daemon jobs default to 45 minutes.
- Max-turn watchdog: every 5 seconds it counts distinct assistant messages in
  `<config-dir>/projects/*/<session-id>.jsonl`. Past `maxTurns` it writes a
  `blocked` report and terminates the session the same way. Daemon default: 30.
- A terminal report already written by Claude is never overwritten.
- Manual `ccc --dispatch` sessions set no wall timeout unless the caller passes
  one, so a finished report still leaves the session open for steering.

`commander/daemon.js` dispatches queued tasks only when
`~/.claude/commander/daemon-policy.json` sets `"autoDispatch": true` (override
path with `CCC_DAEMON_POLICY`). Otherwise queued tasks stay pending with a held
notice. Admission, checked in order, holds the task (never fails it) when:

1. `maxRunning` (default 1) queued jobs are already running;
2. domain: any text, `domain`, tag, project or cwd naming GN, Guest Networks or
   MyWiFi is always held (hard-coded, not overridable by policy); otherwise
   `item.domain` or a tag must be in `allowedDomains` (default `personal`,
   `platform`), so an absent or ambiguous domain is held. Extra `blockedDomains`
   regexes may add holds;
3. a `quota` snapshot (`{file, sessionPctMax, weeklyPctMax, maxAgeSec}`) is
   required: no quota policy, or a missing, stale, future-dated (over 60 s of
   skew), unparseable snapshot, or a percentage that is not a finite number
   from 0 to 100, holds the task (fails closed);
4. the pre-dispatch cost estimate exceeds `maxEstimateUsd` (default $5). The
   estimate is an admission gate, not a runtime cap.

Admitted tasks launch with Remote Control, `maxTurns` and `wallTimeoutMs`.
Each tick settles running items from their report status (`done` becomes done;
`blocked` and `failed` become failed with the report line as the error).

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
