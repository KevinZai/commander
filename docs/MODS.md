# Commander mods

A mod is a hooks module that runs inside Claude Code itself (see
`docs/reference/platform-facts-2026-10.md` §2.6). Commander ships one: the
**Commander HUD**, at `commander/cowork-plugin/mods/commander-hud/`.

## What the HUD shows

A one-line band above the prompt:

```
Commander · Fable armed · 2 agents running · 42 tool calls (~$0.42 budget) [update 8.0.0 available]
```

| Part | Source (under `~/.claude/commander/`) | Shown when |
| --- | --- | --- |
| Fable armed / off | `state.json` (`fableMethod.armed` or `fableArmed`) | always; anything missing or unreadable reads "off" |
| N agents running | starts in `subagent-runs.jsonl` with no matching stop in `agent-runs.jsonl`, started in the last 6 hours (the window Mission Control uses) | `subagent-runs.jsonl` exists |
| N tool calls (~$x budget) | `sessions/active-cost-<session>.json`, written by `cost-tracker.js` | that file exists |
| update pill | `update-nudge.json` with `outdated: true` | a newer version is cached |

The tool-call figure is the budget unit `cost-tracker.js` keeps ($0.01 per
tool call). It measures activity, not real spend; use `/ccc-usage` for spend.

The HUD reads those files when the session starts, every 30 seconds after
that, and when `/ccc-hud` runs. It stats each file first and re-reads one only
when its size or modification time changed. Drawing the band never touches
the disk, so typing at the prompt costs nothing.

## `/ccc-hud`

Runs at once, even mid-turn, without starting a Claude turn.

| Command | Effect |
| --- | --- |
| `/ccc-hud` | toggle the band, then print the summary |
| `/ccc-hud off` / `/ccc-hud on` | hide or show the band |
| `/ccc-hud status` | print the summary, change nothing |

The shown/hidden choice is kept across sessions in the plugin's own store.

## Turning it off

1. `/ccc-hud off` hides the band (the timer still refreshes the summary).
2. In `/plugin`, disable the Commander plugin, or its HUD mod where the
   plugin manager lists hooks modules separately.
3. `"disableAllHooks": true` in settings stops every hook, the HUD included.

## Where it runs

- Claude Code CLI and the Desktop app's Code tab: the band draws.
- VS Code, `claude -p`, SDK hosts and cloud sessions: the module loads and
  its hooks run, but nothing is drawn.
- Minimum version: Claude Code 2.1.287 (Desktop 2.1.286). Older versions
  ignore the hooks module, and the rest of Commander works as before.

## Privacy

The HUD only observes. It registers no tool-call, permission or prompt
hooks, so it cannot approve, block or rewrite anything. It makes no model
calls and no network requests. It reads only the fixed file names above,
under `~/.claude/commander/`, plus the `HOME` and `CLAUDE_SESSION_ID`
environment variables it needs to find them. It writes one value, the
shown/hidden flag, to the plugin's own store. Nothing leaves the machine.
If a file is missing or malformed, that part is left out of the band and
nothing else changes.

## Developing

```bash
cd commander/cowork-plugin/mods/commander-hud
claude plugin validate .   # lists the module's hooks: and calls:
claude plugin test .       # runs tests/*.test.ts against the engine
```

`.claude-plugin/plugin.json` in the mod folder exists only so the mod can be
validated, tested, or loaded on its own with `claude --plugin-dir`. Inside
Commander, the module loads through the main manifest's `hooks` entry
(`./mods/commander-hud/hooks/hooks.json`). The test fixtures in
`tests/fixtures.ts` are synthetic.
