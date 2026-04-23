# CC Commander — CLI Install Guide

> **Power-user path.** Full terminal experience + tabbed tmux TUI + headless agent dispatch + npm-global `ccc` binary. If you live in the terminal, this is for you.

**Version:** v4.0.0-beta.7 · **Target audience:** developers who prefer CLI, CI pipelines, multi-agent workflows.

**⚠️ Not the recommended entry point for most users.** If you're on Claude Cowork Desktop or Claude Code Desktop, install the [plugin](./plugin.md) instead — same skills, click-first UX, no terminal.

---

## What the CLI is (vs. the plugin)

| Surface | Install | What you get |
|---|---|---|
| **Plugin** (recommended) | GUI marketplace | 33 plugin skills, click-first menus via AskUserQuestion, auto-route to specialists. [Install guide](./plugin.md) |
| **CLI** (this doc) | `npm install -g cc-commander` | Everything in the plugin PLUS: `ccc` terminal binary, interactive TUI, tabbed tmux split mode, `ccc --dispatch` headless, parallel agent fleet runner, cockpit status bar, adventure JSON menus, CI-friendly flags |

The plugin works everywhere Claude Code runs — Desktop, CLI, Cursor/Windsurf/Cline via hosted MCP. The npm CLI runs standalone in your terminal, independent of Claude sessions.

You can have **both installed**. They don't conflict — the plugin lives in `~/.claude/plugins/cache/commander-hub/`, the CLI binary lives in `$(npm config get prefix)/bin/ccc`.

---

## 30-second install

```bash
npm install -g cc-commander
ccc --version   # expect: 4.0.0-beta.7
ccc             # launches the interactive TUI
```

Or, for the full developer environment (includes vendor submodules, starter templates, iTerm2 color profiles):

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
```

---

## First 60 seconds in the CLI

```bash
# Launch the TUI — arrow-key navigation, 10 themes, ASCII banner
ccc

# Quick stats dashboard
ccc --stats

# Headless dispatch (CI-friendly) — returns JSON
ccc --dispatch "review my last PR" --json

# Tabbed tmux split mode (3 panes: commander, logs, dashboard)
ccc --split

# Run the test suite (187 tests)
ccc --test

# List all 502+ skills as JSON (for agent consumption)
ccc --list-skills --json
```

---

## `/plugin` slash commands (Claude Code CLI terminal only)

Inside a **Claude Code terminal session** (the `claude` command's REPL), you can manage plugins via slash commands:

```
/plugin marketplace add KevinZai/commander
/plugin install commander
/plugin list                  # expect: commander  4.0.0-beta.7  Kevin Zicherman
/plugin update commander      # pulls latest from GitHub
/plugin disable commander     # temporarily turn off
/plugin enable commander
/plugin uninstall commander
```

**Important:** these `/plugin` commands do NOT exist in Claude Cowork Desktop or Claude Code Desktop — those clients use the Settings GUI. See [docs/plugin.md](./plugin.md) for the GUI flow.

---

## Common CLI workflows

### Parallel agent fleet (multiple Sonnet subagents, isolated worktrees)

```bash
ccc --fleet "refactor the auth module" --agents 3 --isolation worktree
```

Spawns 3 parallel Sonnet agents, each in its own git worktree, each approaching the problem differently. Progress streams to your terminal. On completion, pick the winning implementation.

### Night mode (autonomous overnight builds)

```bash
ccc --night --task "build CRUD API with tests" --max-hours 8 --cost-ceiling 20
```

Dispatches agents to work autonomously with guardrails — cost ceiling, test gates, commit cadence. Wake up to a PR draft.

### Knowledge compounding

```bash
ccc --knowledge-report            # what CC Commander learned this week
ccc --knowledge-search "auth"     # recall past patterns by keyword
```

Session transcripts are indexed into `~/.claude/commander/knowledge/` and queryable across sessions.

---

## Global CLI flags

```
ccc [COMMAND] [OPTIONS]

Commands:
  (no command)          Launch interactive TUI
  --test                Run 187 tests across 14 suites
  --stats               Quick stats dashboard
  --list-skills         Skill catalog (optionally --json)
  --dispatch <task>     Headless agent dispatch
  --split               Tabbed tmux split mode
  --status              Health check
  --fleet               Parallel agent dispatch
  --night               Autonomous overnight mode
  --knowledge-*         Knowledge search / report

Global flags:
  --json                JSON output (machine-parseable)
  --model <name>        Force model (haiku/sonnet/opus)
  --theme <name>        Pick from 10 themes
  --debug               Verbose output
  --no-color            Disable colors (CI-friendly)
  --no-animation        Disable progress animations
```

Full flag reference: `ccc --help`.

---

## Uninstall

```bash
# CLI:
npm uninstall -g cc-commander

# Plugin (if installed, CLI terminal):
/plugin uninstall commander

# State (optional deep clean):
rm -rf ~/.claude/commander/
rm -rf ~/.claude/plugins/cache/commander-hub/
```

Or the scripted full reset (handles legacy v1.x installs too):
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/reset-commander-install.sh) --full
```

---

## When to use CLI vs plugin

| Task | Recommended surface |
|---|---|
| Building a feature inside a Claude session | Plugin `/ccc-build` |
| Reviewing code before a PR | Plugin `/ccc-review` |
| Running a CI pipeline | CLI `ccc --dispatch --json` |
| Multi-agent parallel work | CLI `ccc --fleet` |
| Autonomous overnight build | CLI `ccc --night` |
| Browsing skills | Plugin `/ccc-browse` OR CLI `ccc --list-skills` |
| Onboarding a new project | Plugin `/ccc-start` |
| Scripting / automation | CLI (use `--json` flags) |

---

## Next

- Plugin install: [docs/plugin.md](./plugin.md)
- Full skills catalog: [SKILLS-INDEX.md](../SKILLS-INDEX.md)
- Ecosystem + contribution protocol: [docs/ECOSYSTEM.md](./ECOSYSTEM.md)
- CHANGELOG: [CHANGELOG.md](../CHANGELOG.md)
