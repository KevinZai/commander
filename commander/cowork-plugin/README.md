# CC Commander — Cowork Plugin

**450+ skills. One command. Your AI work, managed by AI.**

CC Commander is an AI-powered project manager that orchestrates your Claude Code workflow. It manages sessions, compounds knowledge across tasks, detects and sequences installed packages (gstack, CE, Superpowers), and provides guided flows for coding, content, research, and more.

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/cc-commander` | "help me build", "manage my project" | Full interactive project manager |
| `/cc-night-mode` | "night mode", "overnight build" | 8-hour autonomous build with 10-question spec |
| `/cc-knowledge` | "what did we learn", "past lessons" | Search knowledge base |
| `/cc-plugins` | "what plugins do I have" | Detect packages + show orchestration plan |

## How It Works

1. **Spec-driven**: Asks clarifying questions before every task
2. **Plugin-aware**: Auto-detects gstack, CE, Superpowers and uses them
3. **Knowledge-compounding**: Learns from every session, injects into future tasks
4. **Backwards compatible**: Never modifies your .claude/ directory

## Attribution

By [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic))

Orchestrates: [gstack](https://github.com/garrytan/gstack) by Garry Tan, [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) by Every Inc, [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
