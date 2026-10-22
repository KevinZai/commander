---
name: ccc-console
description: "Open the Commander Console inline (agents, usage, safety, memory, history, launch chips, prompt bar) or publish one tab as a private snapshot page after consent. Use when the user asks what is going on, wants the console, or types $ccc-console."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - Artifact
  - mcp__visualize__show_widget
argument-hint: "[open | overview | usage | safety | memory | history | launch | refresh | publish [tab] | on | off]"
model: sonnet
effort: medium
---

# $ccc-console — one panel, two surfaces

**CC Commander** · $ccc-console · agents, cost, guardrails and recent history in one place, with a prompt bar that reaches this session.

The console reads only the user's own local telemetry under `~/.claude/commander/`, composed once by `lib/console-model.js`. The Memory tab also reads the user's own claude-mem store at `~/.claude-mem/` when one exists (opt-in, absent by default).

It has two surfaces. Keep them separate:

| Surface | Tool | Interactive | Shareable | Leaves the machine |
|---|---|---|---|---|
| Inline widget (default) | visualize MCP `show_widget` | chips and prompt bar call `sendPrompt` into this session | no, it exists only in this chat | no |
| Published snapshot | Artifact tool `publish` | no prompt bar; a published page cannot send prompts into the session | yes, a private claude.ai page the user may share | yes, after consent |

## When to use / when not to

- Use for "what's going on?", a mid-session status glance, or an end-of-day snapshot page.
- Use `$ccc-mission-control` for the full roster, the live task board and suggestion triage; `$ccc-browse` for the skill and agent catalog; `$ccc-suggest` for advice instead of a report.

## What happens

### 1. Route the argument

| Argument | Action |
|---|---|
| none, `open`, `overview` | step 2 with `--tab overview` |
| `usage`, `safety`, `memory`, `history`, `launch` | step 2 with that tab |
| `refresh` | step 2 again with the last tab (re-reads the logs) |
| `publish [tab]` | step 4; tab defaults to `overview` |
| `on` / `off` | step 5 |

Tab contents and data sources are in [references/console-tabs.md](references/console-tabs.md). Read it when the user asks what a tab shows or reads.

### 2. Build the inline widget

```bash
if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
  node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" --tab overview
else
  node commander/cowork-plugin/scripts/build-console.mjs --tab overview
fi
```

stdout is the widget HTML. `--no-recompute` skips the `ccusage` refresh for a faster read; `--out <path>` writes a file instead. A non-zero exit prints `build-console: <reason>` on stderr: report that line and stop. A `section "<name>" unavailable` line on stderr is not fatal; that tab renders its zero-state.

### 3. Render it with `show_widget`

Call the visualize MCP's `show_widget` with the stdout as `widget_code` and a snake_case `title` such as `commander_console_overview`. Do not send the widget through the Artifact tool: only the inline widget can call `sendPrompt`.

If `show_widget` is not available in this session (including Codex), say so in one line and offer, with AskUserQuestion (Codex: a plain-text question):

- 🟢 Publish a snapshot of this tab — a private page; asks before anything leaves the machine
- Plain-English status here — runs `$ccc-mission-control status`
- Skip

Never imitate the widget with a markdown table.

Widget rules that `commander/tests/console-widget.test.js` enforces; keep them when extending the skill:

- The prompt bar sends exactly what the user typed, after `sanitizePromptText()` collapses newlines and caps it at 500 characters. It is never pre-filled from telemetry.
- Every chip is a fixed template command and displays that command before the click. No chip payload is built from an agent name, task subject, branch, path or log line; model text renders escaped.
- Tabs and refresh are round-trips (`$ccc-console <tab>`, `$ccc-console refresh`). The widget fetches nothing: no polling, no localhost.

Zero-state is normal: stat tiles show `—`, cards say how to start (`$ccc-spawn`). Missing telemetry is not a failure.

### 4. Publish a snapshot (consent-gated)

1. `launch` has no published form (a chip launcher is meaningless on a static page); the builder refuses it. Offer another tab.
2. First publish this session: ask with AskUserQuestion before building.
   - Question: "Publish the <tab> tab as a private claude.ai page? Agent names, task subjects and timings leave this machine." For `memory` add "and claude-mem observation titles"; for `usage` add "and per-app dollar estimates".
   - 🟢 Publish — create or update the private page
   - Show it inline instead — no upload
   - Cancel
   Publish only on an explicit yes. A later `$ccc-console publish` in the same session is the refresh consent: republish without asking again.
3. Build the page onto the shared Commander path. The console snapshot reuses the Cockpit's page (`$ccc-browse`) instead of minting another URL:
   ```bash
   mkdir -p "<scratchpad>"
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
     --surface artifact --tab overview --out <scratchpad>/commander-cockpit.html
   ```
   `<scratchpad>` is this session's scratchpad directory. Use the same `if [ -f … ]` fallback as step 2. The output already follows the Artifact page contract: `<title>` first, theme tokens with the dark-mode guards, explicit body background, 16 px gutters, no scripts, no external URLs.
4. Publish with the Artifact tool:
   - Already published from this path in this session: publish the same `file_path` again. Omit `icon` and `capabilities` so the page keeps both.
   - Not yet published in this session: call `action: "list"` and look for "Commander Cockpit" or a "Commander" deck title on this path's page. If found, call `action: "read"` with its `url`, then publish `file_path` with that `url`. If none exists, publish `file_path` with `icon: "dashboard"` and `description: "Commander snapshot of agents, usage, safety and history from local telemetry."`.
   - On Codex or without the Artifact tool: give the user the HTML file path; it opens in any browser.
5. Report the page title, the URL from the tool result, and one headline number from the tab.

### 5. Session-start auto-open (`on` / `off`)

`hooks/console-autopen.js` asks once, near the start of a fresh session that has telemetry, for this widget. It never publishes.

- `$ccc-console off`: write `{"autoOpen": false}` into `~/.claude/commander/console.json`, preserving other keys (create the file and directory if missing). `$ccc-console on` writes `true`.
- Other switches: edit that file by hand, or set `CCC_NO_AUTOCONSOLE=1`.
- A missing or malformed `console.json` means on.
- If the opening message is a real request, answer it and skip the console.

## Done when

- Widget: `build-console.mjs` exited 0 and `show_widget` returned without error, or the user got the one-line "widget unavailable" note and the fallback picker.
- Publish: the Artifact tool returned a URL and you reported it.
- `on`/`off`: `node -e "console.log(JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/commander/console.json','utf8')).autoOpen)"` prints the value you wrote.

## Guardrails

- Never publish without the step 4 consent, and never publish automatically; the auto-open hook only opens the inline widget.
- Never move the published path: a new path is a new URL.
- Never call the published page live or say it can send prompts. It changes only when republished, and it cannot reach this session. The inline widget cannot be shared.
- Never treat a missing claude-mem store as an error or point to `$ccc-doctor` for it. Commander does not bundle claude-mem (AGPL-3.0; Commander is MIT).
- Never invent history: there is no per-message content, no session summary, and nothing before the first `metrics.jsonl` row.

## See also

- `$ccc-mission-control` — full agent board, live task board, suggestion triage
- `$ccc-usage`, `$ccc-safety` — one-tab decks published through the same builder
- `$ccc-browse` — the Cockpit catalog on the same published page
- `$ccc-doctor` — check that hooks are wired

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
