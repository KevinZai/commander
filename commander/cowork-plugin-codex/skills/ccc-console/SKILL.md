---
name: ccc-console
description: "The Commander Console: one inline panel with your agents, usage, safety and a prompt bar that talks back to this session. Opens in chat — publishing a snapshot is separate and consent-gated."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[open | overview | usage | safety | launch | refresh | publish]"
---

# $ccc-console — the Commander Console

**The Console lives in your chat. Publishing makes a snapshot page you can keep or share.**

One panel instead of four separate decks: who's working, what it cost, what got blocked, and a box you can type into that reaches *this* session. It reads only your own local telemetry under `~/.claude/commander/` — the same logs `$ccc-mission-control`, `$ccc-usage` and `$ccc-safety` already read, composed once by `lib/console-model.js`.

> 🔒 **Opening is local.** The inline widget renders from local logs and nothing leaves the machine. **Publishing is a separate act** and always asks first — see below.

## How it routes

On `$ccc-console` with no argument, open the widget on the **Overview** tab (below). Explicit sub-commands skip straight to their tab or action:

| Argument | What happens |
|---|---|
| `overview` (default) | agents working, anything awaiting your approval, task counts |
| `usage` | saved / spent / dispatches, cost by app |
| `safety` | blocked, auto-fixed, approved, tool-failure hotspots |
| `launch` | one-click chips for the common Commander workflows |
| `refresh` | re-read the logs and render a fresh widget |
| `publish` | build the **snapshot artifact** — consent-gated, see below |

## 🖥️ Open the console (the default — inline widget)

Build the widget HTML, then render it **inline with the visualize MCP's `show_widget`** — **not** the Artifact tool. This is the whole point of the surface: an inline widget can call the host's `sendPrompt(text)`, so its chips and its prompt bar reach this live session. A published artifact cannot (strict CSP, no completion capability), which is why publishing is a different verb.

Prefer the in-plugin copy, falling back to the repo checkout — the same pattern `$ccc-browse` uses, because not every install ships `scripts/`:

```bash
if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
  node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" --tab overview
else
  node commander/cowork-plugin/scripts/build-console.mjs --tab overview
fi
```

The script prints the widget HTML on stdout (add `--out <path>` to write a file instead; `--no-recompute` skips the `ccusage` refresh when you just want a fast read). Pass the output to `show_widget` as `widget_code`, with a specific snake_case `title` such as `commander_console_overview`.

**Zero-state:** a machine that has never run an agent renders friendly cards ("No agent activity yet — spawn one with `$ccc-spawn`"), not errors, and every stat tile shows `—` rather than a fabricated `0`. Never treat missing telemetry as a failure.

**If the visualize MCP isn't available in this session:** say so plainly and offer the published snapshot instead (`$ccc-console publish`) or the deck skills. Do not fake the widget with a markdown table pretending to be interactive.

### What the widget can do

- **Prompt bar** — the text box sends **exactly what the user typed** into this session via `sendPrompt(text)`, after `sanitizePromptText()` collapses newlines and caps the text at 500 characters. It is never pre-filled from telemetry.
- **Chips** — every chip is a **fixed template command** (`$ccc-doctor`, `$ccc-suggest`, `$ccc-usage`, `$ccc-browse`, the deck launchers, `$ccc-console refresh|publish`, and the Launch-tab workflows) and displays the exact command it will send *before* the click.
- **What chips deliberately cannot do:** no chip payload is ever built from an agent name, a task subject, a branch, a file path or a log line. Anything that can append to a JSONL under `~/.claude/commander/` would otherwise be able to compose a command the user appears to have typed. Model text renders as escaped text only. If you extend this skill, keep that rule — `commander/tests/console-widget.test.js` enforces it.
- **Tabs and refresh cost a round-trip on purpose.** Switching tabs sends `$ccc-console <tab>`; refreshing sends `$ccc-console refresh`. The widget is a snapshot at render time and cannot fetch anything — no polling, no localhost, no live data. That is honest and cheap.

## 📤 Publish a snapshot (`$ccc-console publish`)

A frozen, shareable page — think "export to PDF", not "live dashboard". Render the **artifact** surface for one tab and publish it with the **Artifact** tool.

**LIVING PATTERN:** always render to the same file path so republishing updates one page instead of leaving a trail:

```bash
mkdir -p scratchpad
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
  --surface artifact --tab overview --out scratchpad/commander-console.html
```

(Same `if [ -f … ]` fallback as above when `${CLAUDE_PLUGIN_ROOT}/scripts/` isn't present.)

Publish that file with favicon `🎛️` and the stable title **"Commander Console"**.

**Confirm before the FIRST publish this session:** use `AskUserQuestion` to tell the user that **agent names, task subjects and timings will leave the machine** for their private claude.ai artifact URL — private to their account, but off the machine. Publish only after an explicit confirmation, and never publish automatically. **Re-invoking `$ccc-console publish` IS the refresh consent** — republish the same path without re-asking.

`--tab launch` has no artifact form (a chip launcher is meaningless on a static page); the script refuses it rather than emitting a dead page.

> **On Codex:** some panels are thin on Codex today — Safety's failure hotspots, the agent roster and Usage's savings hero are fed by Claude-side hooks. The same note the decks carry applies here.

## When you'd reach for it

- "What's going on?" at the top of a session — one panel instead of four commands.
- Mid-session, when you want to fire off `$ccc-doctor` or `$ccc-suggest` without breaking your train of thought.
- End of day: `publish` a snapshot as the durable record.

## When NOT to use

- You want the **full** roster, event feed and charts — that's `$ccc-mission-control` (and the deck artifacts are richer than 680px allows).
- You want the searchable skill/agent catalog with the prompt enhancer — that's `$ccc-browse` (the Cockpit).
- You want advice rather than a report — that's `$ccc-suggest`.

## Limitations

- The console only sees work journaled by the plugin's hooks — agents run without CC Commander installed leave no trace.
- The widget is a snapshot at render time; it has no network access in either direction. `refresh` re-runs the read.
- `agent-runs.jsonl` rotates at 10MB, so ancient detail ages out.
- Memory and History tabs land in a follow-up; this release ships Overview, Usage, Safety and Launch.

## Related

- `$ccc-mission-control` — the full agent board (live dashboard + snapshot)
- `$ccc-usage` — the money deck in full
- `$ccc-safety` — blocked and auto-fixed actions in full
- `$ccc-browse` — the Cockpit catalog
- `$ccc-doctor` — check your hooks are actually wired

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
