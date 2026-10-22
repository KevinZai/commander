# Hooks, Mods, and Permission Modes

## Hooks

Hooks run on lifecycle events: before and after tool calls (`PreToolUse`, `PostToolUse`), on prompts (`UserPromptSubmit`), at session boundaries (`SessionStart`, `SessionEnd`, `Stop`), around subagents, compaction, worktrees, and model switches. Run `/hooks` to list what is configured by event; that listing, not this file, is the source of truth.

- Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.
- Quote `"${CLAUDE_PLUGIN_ROOT}"` in shell-form commands; desktop installs live under a path with a space.
- A hook that must stop the action on failure sets `onFailure: "block"`; the default is to continue.
- Codex supports a smaller event set and no `args`, `onFailure`, `if`, or `once`. Commander keeps shell-form commands so one `hooks.json` mirrors to both.
- Hook output is evidence. Read it when it affects the task; never disable or weaken a hook to make a check pass.

## Mods

A mod is a plugin whose hooks module runs inside Claude Code and can change deeper behavior: panes, bands above the prompt, status lines, notifications, slash commands, tool checks. Mods draw in the CLI and the desktop Code tab and run without drawing elsewhere. Use the bundled `plugin-authoring` skill to build or debug one; `claude plugin validate` lists a mod's hooks and calls.

## Permission modes

- Interactive sessions start in **auto** mode when none is configured. Auto mode reduces prompts for routine work; it does not authorize deploys, pushes, deletions, or outward-facing sends.
- `plan` mode is for when the user asks for a plan or a material design decision needs approval.
- `acceptEdits` suits trusted, well-specified edit runs; return to the default for exploratory work.
- Never use `--dangerously-skip-permissions`. Grant narrow `permissions.allow` rules in project settings instead of broad global ones.

## Task tracking

Use the runtime's task list for multi-step work: it exposes missing, extra, or out-of-order steps early and lets the user steer. A single edit does not need one.
