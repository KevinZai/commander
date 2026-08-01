---
name: ccc-console
description: "The Commander Console: one inline panel — agents, usage, safety, memory, history — plus a prompt bar that reaches this session. Publishing a snapshot is separate and consent-gated."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[open | overview | usage | safety | memory | history | launch | refresh | publish | on | off]"
---

# /ccc-console — the Commander Console

**The Console lives in your chat. Publishing makes a snapshot page you can keep or share.**

One panel instead of four separate decks: who's working, what it cost, what got blocked, what you've done over the last month, and a box you can type into that reaches *this* session. It reads only your own local telemetry under `~/.claude/commander/` — the same logs `/ccc-mission-control`, `/ccc-usage` and `/ccc-safety` already read, composed once by `lib/console-model.js`. The one exception is **Memory**, which reads your own claude-mem store at `~/.claude-mem/` if (and only if) you have one.

> 🔒 **Opening is local.** The inline widget renders from local logs and nothing leaves the machine. **Publishing is a separate act** and always asks first — see below.

## How it routes

On `/ccc-console` with no argument, open the widget on the **Overview** tab (below). Explicit sub-commands skip straight to their tab or action:

| Argument | What happens |
|---|---|
| `overview` (default) | agents working, anything awaiting your approval, task counts |
| `usage` | saved / spent / dispatches, cost by app |
| `safety` | blocked, auto-fixed, approved, tool-failure hotspots |
| `memory` | recent claude-mem observation titles + counts — **optional**, see below |
| `history` | the last 30 days day by day: cost, dispatches, tasks, failures, top skills |
| `launch` | one-click chips for the common Commander workflows |
| `refresh` | re-read the logs and render a fresh widget |
| `publish` | build the **snapshot artifact** — consent-gated, see below |
| `on` / `off` | turn the session-start auto-open on or off (see below) |

## 🖥️ Open the console (the default — inline widget)

Build the widget HTML, then render it **inline with the visualize MCP's `show_widget`** — **not** the Artifact tool. This is the whole point of the surface: an inline widget can call the host's `sendPrompt(text)`, so its chips and its prompt bar reach this live session. A published artifact cannot (strict CSP, no completion capability), which is why publishing is a different verb.

Prefer the in-plugin copy, falling back to the repo checkout — the same pattern `/ccc-browse` uses, because not every install ships `scripts/`:

```bash
if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
  node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" --tab overview
else
  node commander/cowork-plugin/scripts/build-console.mjs --tab overview
fi
```

The script prints the widget HTML on stdout (add `--out <path>` to write a file instead; `--no-recompute` skips the `ccusage` refresh when you just want a fast read). Pass the output to `show_widget` as `widget_code`, with a specific snake_case `title` such as `commander_console_overview`.

**Zero-state:** a machine that has never run an agent renders friendly cards ("No agent activity yet — spawn one with `/ccc-spawn`"), not errors, and every stat tile shows `—` rather than a fabricated `0`. Never treat missing telemetry as a failure.

**If the visualize MCP isn't available in this session:** say so plainly and offer the published snapshot instead (`/ccc-console publish`) or the deck skills. Do not fake the widget with a markdown table pretending to be interactive.

### What the widget can do

- **Prompt bar** — the text box sends **exactly what the user typed** into this session via `sendPrompt(text)`, after `sanitizePromptText()` collapses newlines and caps the text at 500 characters. It is never pre-filled from telemetry.
- **Chips** — every chip is a **fixed template command** (`/ccc-doctor`, `/ccc-suggest`, `/ccc-usage`, `/ccc-browse`, the deck launchers, `/ccc-console refresh|publish`, and the Launch-tab workflows) and displays the exact command it will send *before* the click.
- **What chips deliberately cannot do:** no chip payload is ever built from an agent name, a task subject, a branch, a file path or a log line. Anything that can append to a JSONL under `~/.claude/commander/` would otherwise be able to compose a command the user appears to have typed. Model text renders as escaped text only. If you extend this skill, keep that rule — `commander/tests/console-widget.test.js` enforces it.
- **Tabs and refresh cost a round-trip on purpose.** Switching tabs sends `/ccc-console <tab>`; refreshing sends `/ccc-console refresh`. The widget is a snapshot at render time and cannot fetch anything — no polling, no localhost, no live data. That is honest and cheap.

## 🔆 Auto-open at session start (`on` / `off`)

Since v7.4.0 a SessionStart handler (`hooks/console-autopen.js`) asks the model to render this widget once, near the top of a session. **Opening is local** — it reads your own logs and draws a panel in this chat. It never publishes, and it never asks the network for anything.

It stays quiet unless all of these hold: auto-open isn't switched off · you aren't on CI · the session is genuinely starting (not a resume or a post-compact re-fire) · this session hasn't already been nudged · there is actually telemetry to show. On a fresh install with no agent history, nothing happens. If the user's opening message is a real request, answer that and skip the console.

**Turning it off** — any one of these:

| Off switch | How |
|---|---|
| `/ccc-console off` | write `{"autoOpen": false}` to `~/.claude/commander/console.json` (create the file/dir if needed, preserving any other keys), then confirm in one line. `/ccc-console on` writes `{"autoOpen": true}`. |
| Config file | edit `~/.claude/commander/console.json` by hand |
| Environment | `CCC_NO_AUTOCONSOLE=1` |

A missing or malformed `console.json` means **on** — a corrupt config must never silently disable something the user didn't turn off.

## 🧠 The Memory tab — optional, and absent is normal

Memory reads **your own** claude-mem store at `~/.claude-mem/claude-mem.db`, read-only, titles only. Commander does **not** bundle claude-mem: it is AGPL-3.0 and Commander is MIT.

**Most machines will not have it, and that is not a problem to report.** When the store is missing the tab renders one quiet card — "claude-mem not detected", plus how to install it and why it isn't bundled. Do not describe this as an error, do not treat it as a broken install, and do not offer to fix it unless the user asks. `/ccc-doctor` is the wrong pointer here.

Commander reads only `id / project / type / title / created_at_epoch`. It never touches claude-mem's `text`, `facts` or `narrative` columns, and every title is redacted (secret patterns + `/Users/<name>` → `<home>`) and capped before it is rendered. Say so if the user asks what's being read.

## 📜 The History tab — real data only

History is built from telemetry Commander already writes. **There is no history collector, and you should not invent one.**

- **Backbone:** `mission-control/metrics.jsonl` — durable per-day rollups (cost, dispatches, tasks, failures, sessions). It survives the detail logs' rotation, so it carries the long horizon and is the only source of cost.
- **Detail (last 30 days):** `skill-runs.jsonl`, `tasks.jsonl`, `agent-runs.jsonl`, `subagent-runs.jsonl`, and the `sessions/` stubs — counted by **filename only**; their contents are never opened.

What does **not** exist and must never be claimed: per-message content, session summaries, or rollups before the first `metrics.jsonl` row. A day with a rollup but no detail is honest — the detail aged out. If a source can't be read, the tab says which one in a muted footnote and shows the rest.

## 📤 Publish a snapshot (`/ccc-console publish`)

A frozen, shareable page — think "export to PDF", not "live dashboard". Render the **artifact** surface for one tab and publish it with the **Artifact** tool.

**LIVING PATTERN:** always render to the same file path so republishing updates one page instead of leaving a trail. That path is the **Cockpit's** existing one, `<scratchpad>/commander-cockpit.html` (the session-placeholder convention `/ccc-browse` uses — not a literal `scratchpad/` directory relative to cwd) — the console snapshot **absorbs the Cockpit's living URL** rather than minting a fifth Commander URL (Kevin's call, v7.4.0). `/ccc-browse` republishes the same path with the catalog page; both keep favicon `🎛️`, so the bookmark stays the one Commander page it has always been.

```bash
mkdir -p <scratchpad>
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
  --surface artifact --tab overview --out <scratchpad>/commander-cockpit.html
```

(Same `if [ -f … ]` fallback as above when `${CLAUDE_PLUGIN_ROOT}/scripts/` isn't present.)

Publish that file with favicon `🎛️` and the stable title **"Commander Console"**. Never invent a new path or filename for it — a new path is a new URL, and every existing bookmark stops updating.

**Same-file-path alone only redeploys to the same URL within the session that first published it.** A fresh session that never itself ran `/ccc-browse` or `/ccc-console publish` has no memory of the Commander Cockpit's URL, and publishing by file path alone in that session mints a brand-new URL instead of updating the shared one. Before publishing, check whether you already know the URL (from earlier in this same session); if not, call the Artifact tool's `list` action to find the existing "Commander Cockpit" artifact and pass its URL via `url=` on the publish call. Only fall back to a plain file-path publish (which mints a new URL) if `list` finds no prior "Commander Cockpit" artifact at all.

The four deck skills work the same way in reverse: `/ccc-mission-control`, `/ccc-usage` and `/ccc-safety` publish **one tab each** through this same builder onto their own existing paths (`<scratchpad>/mission-control-live.html`, `<scratchpad>/ccc-usage-live.html`, `<scratchpad>/ccc-safety-live.html`), so their URLs keep updating in place and every page comes from one renderer — the same `url=` lookup applies to each of them.

**Confirm before the FIRST publish this session:** use `AskUserQuestion` to tell the user that **agent names, task subjects and timings will leave the machine** for their private claude.ai artifact URL — private to their account, but off the machine. Publish only after an explicit confirmation, and never publish automatically. **Re-invoking `/ccc-console publish` IS the refresh consent** — republish the same path without re-asking.

`--tab launch` has no artifact form (a chip launcher is meaningless on a static page); the script refuses it rather than emitting a dead page. `--tab memory` and `--tab history` both publish. **Memory adds a consent consideration:** publishing it sends claude-mem observation *titles* off the machine — name that explicitly in the confirmation, not just "agent names and task subjects".

> **On Codex:** some panels are thin on Codex today — Safety's failure hotspots, the agent roster and Usage's savings hero are fed by Claude-side hooks. The same note the decks carry applies here.

## When you'd reach for it

- "What's going on?" at the top of a session — one panel instead of four commands.
- Mid-session, when you want to fire off `/ccc-doctor` or `/ccc-suggest` without breaking your train of thought.
- End of day: `publish` a snapshot as the durable record.

## When NOT to use

- You want the **full** roster, event feed and charts — that's `/ccc-mission-control` (and the deck artifacts are richer than 680px allows).
- You want the searchable skill/agent catalog with the prompt enhancer — that's `/ccc-browse` (the Cockpit).
- You want advice rather than a report — that's `/ccc-suggest`.

## Limitations

- The console only sees work journaled by the plugin's hooks — agents run without CC Commander installed leave no trace.
- The widget is a snapshot at render time; it has no network access in either direction. `refresh` re-runs the read.
- `agent-runs.jsonl` rotates at 10MB, so ancient detail ages out.
- `--tab launch` is widget-only: a chip launcher is meaningless on a static page, so it has no published form.

## Related

- `/ccc-mission-control` — the full agent board (live dashboard + snapshot)
- `/ccc-usage` — the money deck in full
- `/ccc-safety` — blocked and auto-fixed actions in full
- `/ccc-browse` — the Cockpit catalog
- `/ccc-doctor` — check your hooks are actually wired

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
