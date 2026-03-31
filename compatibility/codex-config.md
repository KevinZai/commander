# OpenAI Codex CLI Compatibility Guide

OpenAI's Codex CLI is an open-source terminal coding agent (similar to Claude Code but using OpenAI models). This guide maps CC Commander concepts to Codex equivalents.

## How Codex Works

Codex reads configuration from `~/.codex/` and project-level `AGENTS.md` or `codex.md` files. It supports instructions files and sandboxed execution but has a different configuration model than Claude Code.

CC Commander installs to `~/.claude/` and has no effect on Codex. The two systems are independent.

## Mapping Kit Concepts to Codex

### Instructions File

Kit uses `CLAUDE.md` at the project root. Codex uses `AGENTS.md` or `codex.md`. To keep both aligned:

```bash
# Option 1: Symlink (both read the same content)
ln -s CLAUDE.md codex.md

# Option 2: Separate files with shared standards
# Extract common rules into a shared file and reference from both
```

### Autonomy Levels

Codex has three built-in autonomy modes:

| Codex Mode | Kit Equivalent | Description |
|------------|----------------|-------------|
| `suggest` | Default mode | Suggests changes, asks for approval |
| `auto-edit` | `/yolo` mode (partial) | Applies file edits without asking |
| `full-auto` | `/yolo` mode (full) | Runs commands and edits without asking |

Kit's mode-switcher skill provides 9 modes (normal, design, saas, marketing, research, writing, night, yolo, unhinged) which have no direct Codex equivalents. Codex focuses on autonomy level rather than domain-specific behavior.

### Sandbox Execution

Codex runs commands in a sandboxed environment by default. Kit uses `settings.json` allowlists and hook-based validation instead. Both approaches achieve similar safety guarantees through different mechanisms.

### Model Configuration

Codex defaults to OpenAI models but supports other providers via environment variables:

```bash
# Use Claude models with Codex (via OpenAI-compatible API)
export OPENAI_API_KEY="your-anthropic-key"
export OPENAI_BASE_URL="https://api.anthropic.com/v1"
```

Kit is purpose-built for Claude models and does not support other providers.

## Skills Without Codex Equivalents

| Kit Feature | Codex Status |
|-------------|-------------|
| 280+ skills | Codex has no skill system -- use instructions files |
| Hooks (lifecycle automation) | No equivalent |
| Slash commands | No equivalent -- use natural language |
| Dashboard | No equivalent |
| Multi-agent orchestration | Codex is single-agent |
| Mode switcher | Limited to 3 autonomy levels |
| Templates | No equivalent -- use instructions |
| Theme system | No equivalent |

## Coexistence

Both tools can exist in the same project:

- `CLAUDE.md` -- Claude Code reads this, Codex ignores it
- `AGENTS.md` / `codex.md` -- Codex reads this, Claude Code ignores it
- `~/.claude/` -- Claude Code only
- `~/.codex/` -- Codex only

The two tools use completely separate configuration directories and do not interfere with each other.
