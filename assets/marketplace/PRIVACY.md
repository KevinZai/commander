# CC Commander Privacy Policy

**Canonical URL:** `https://cc-commander.com/privacy`  
**Effective date:** 2026-04-26  
**Plugin version:** v4.0.0-beta.11+

---

## What CC Commander collects

CC Commander collects **local-only telemetry** to help you understand how the plugin is being used
within your own sessions. All data stays on your machine.

### Telemetry events recorded

The following event kinds are written to a local JSONL file when a CC Commander skill, agent,
hook, or MCP tool fires:

| Event kind | What it records |
|---|---|
| `skill.invoked` | Skill name + ISO timestamp |
| `agent.dispatched` | Agent name + ISO timestamp |
| `hook.fired` | Hook event name + session ID + working directory |
| `mcp_tool.called` | MCP tool name + ISO timestamp |
| `session.lifecycle` | Session phase (start/stop) + session ID |

Every record also includes `plugin_version` and a UTC timestamp (`ts`).

### What is NOT collected

- No code content, file contents, or diffs
- No personally identifiable information (PII)
- No API keys, tokens, or credentials
- No network requests — zero egress to any server
- No analytics platform, no third-party SDK

---

## Where data is stored

Telemetry is appended to a single JSONL file on your local filesystem:

```
~/.codex/commander-telemetry.jsonl
```

The file is created with mode `0600` (owner read/write only). The directory is created with
mode `0700` if it does not already exist.

---

## How to opt out

Set the environment variable before starting Codex:

```sh
export CODEX_COMMANDER_TELEMETRY_DISABLED=1
```

Or override the output path (e.g. to `/dev/null`):

```sh
export CODEX_COMMANDER_TELEMETRY_PATH=/dev/null
```

When `CODEX_COMMANDER_TELEMETRY_DISABLED=1` is set, `emitTelemetry()` returns `null`
immediately and no file I/O occurs.

---

## Data sharing

CC Commander **never transmits telemetry data** anywhere. No server receives it. No third party
sees it. The JSONL file is yours — you can read, delete, or rotate it at any time.

---

## Contact

Questions: [kevin@kevinz.ai](mailto:kevin@kevinz.ai)  
Source of truth for telemetry behavior: `commander/adapters/codex/telemetry.js`
