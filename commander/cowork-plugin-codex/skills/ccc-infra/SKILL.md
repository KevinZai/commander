---
name: ccc-infra
description: "Dev services status: probes the local services you declare in an optional services.json, plus Claude MCP connections and Codex CLI health, and recommends the next action. Use when the user asks for infrastructure or service status, whether a dev server is up, or why an MCP is down."
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
argument-hint: "[probe [service-name] | full]"
model: haiku
effort: low
disable-model-invocation: true
---

# $ccc-infra — Dev services status

**CC Commander** · $ccc-infra · a status table for your declared services, Claude MCPs and the Codex CLI.

Scope is Claude Code and Codex tooling plus whatever the user lists in `<config dir>/commander/services.json` (`~/.claude/commander/services.json` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`; until the lane has its own copy, read the `~/.claude/commander/` copy and write to the lane). The skill ships with no hardcoded ports, hosts or process names. Menu actions mirror [references/infrastructure.json](references/infrastructure.json).

Codex: ask the pickers as plain-text questions.

## When to use / when not to

- Use for "is my dev server up?", "which MCPs are connected?", "is Codex installed?", or a quick health table before starting work.
- Not for: a failing CI run (`$ccc-ci`), Commander's own install diagnostics (`$ccc-doctor`), or production monitoring and alerting (`$ccc-devops`).

## Config (optional)

`<config dir>/commander/services.json`, written by the user or by step 5 with their answers:

```json
{
  "services": [
    { "name": "API", "url": "http://localhost:3000/health" },
    { "name": "Worker", "port": 8080 }
  ]
}
```

Each entry has a `name` and either an `http(s)` `url` or an integer `port` (1–65535). Skip entries that fail this shape and list them as "invalid entry". No file: skip to the tooling checks; never invent a service.

## What happens

1. **Read the config.**
   ```bash
   CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"; SVC="$CCC_STATE/services.json"; [ -e "$SVC" ] || SVC="$HOME/.claude/commander/services.json"
   test -f "$SVC" && cat "$SVC" || echo "no services.json"
   ```

2. **Probe declared services only.** With `probe <name>`, probe just that entry.
   ```bash
   CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"; SVC="$CCC_STATE/services.json"; [ -e "$SVC" ] || SVC="$HOME/.claude/commander/services.json"
   jq -r '.services[] | [.name, (.url // ""), ((.port // "") | tostring)] | @tsv' "$SVC" |
   while IFS=$'\t' read -r name url port; do
     if [ -n "$url" ]; then
       code=$(curl -s -o /dev/null -w '%{http_code}' --proto '=http,https' --max-time 2 "$url"); echo "$name	url	$code"
     else
       lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && echo "$name	port	LISTEN" || echo "$name	port	DOWN"
     fi
   done
   ```
   `jq` absent: Read the file and probe each entry with the same `curl` or `lsof` line.

3. **Check Claude and Codex tooling.**
   ```bash
   claude mcp list 2>/dev/null || echo "claude mcp: not available"
   command -v codex >/dev/null 2>&1 && { codex --version; codex doctor --summary 2>/dev/null; } || echo "codex: not installed"
   ```
   `full` (or `--power`) runs `codex doctor --json` instead of `--summary` and reports each failing check.

4. **Show the status table** and classify:
   ```
   Service       Source           Status         Notes
   ─────────────────────────────────────────────────────────
   API           services.json    UP             200
   Worker        services.json    DOWN           not listening
   Claude MCPs   claude mcp list  <n> connected  <failed names>
   Codex CLI     codex doctor     INSTALLED      <version>, <failing checks>
   ```
   HTTP 2xx or a listening port: UP. Other HTTP codes: DEGRADED. `000`, not listening, or a missing binary: DOWN or NOT INSTALLED. Fill values from step 2–3 output only.

5. **Recommend the next action** with the picker (Decision points), showing only options that apply:
   - A declared service is DOWN: there is no generic start command. Read the project's `package.json` scripts, `Procfile`, `docker-compose*.yml` or README and suggest the exact start command; run it only on the user's yes.
   - No `services.json`: ask the user which local services to watch, then Write the file in the shape above and rerun step 2.
   - An MCP shows failed: tell the user to run `/mcp reconnect all`, or `$ccc-connect` to set one up.
   - Codex missing and the user wants it: the install is `npm install -g @openai/codex` (global install, ask first), then the user runs `codex login`. Never route an API key through this skill.

6. **Connectors (opt-in, absent by default).** If a monitoring connector is connected, pull CPU, memory and error rates for the declared services and link their dashboards. If a CI/CD connector is connected, list recent pipeline runs beside the table; deploying is `$ccc-deploy`, not this skill.

## Decision points

After the quick table (AskUserQuestion, 2–4 options):
- 🟢 Full status: every entry plus `codex doctor --json` and MCP detail
- Set up services.json: answer a few questions, the file is written for you
- Back to `/ccc`: return to the main menu

When something is down (only the options that apply):
- 🟢 Find the start command: reads the project's scripts, suggests one
- Reconnect MCPs: you run `/mcp reconnect all`
- Install Codex CLI: global npm install after your yes
- Done

## Done when

- Every row in the table came from a probe or command run in this turn; nothing is filled from memory.
- After writing `services.json`, step 2 reran and its result is shown.
- After a start command ran (on approval), the service was re-probed and its new status reported.

## Guardrails

- Probe only entries in the user's `services.json` and the Claude/Codex checks above; never scan ports or guess process names.
- Never start, stop or install anything without the user's yes for that exact command.
- Never print environment values or tokens; `services.json` holds names, URLs and ports only.
- Timeouts stay at 2 seconds per probe; a slow service reports DOWN, not a hang.

## See also

- `$ccc-doctor` — Commander install and hook health
- `$ccc-connect` — set up an MCP connector
- `$ccc-ci` — CI and deploy failures
- `$ccc-devops` — monitoring and alerting setup

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
