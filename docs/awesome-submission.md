# awesome-claude-code Submission Draft

Draft PR entry for [awesome-claude-code](https://github.com/anthropics/awesome-claude-code) (or community equivalents).

## Category: Frameworks / Toolkits

### PR Title

Add CC Commander -- comprehensive skills, commands, and hooks toolkit

### Entry

```markdown
- [CC Commander](https://github.com/KevinZai/cc-commander) - The complete Claude Code configuration toolkit with 441+ skills, 78+ commands, 25 hooks, 9 workflow modes, 10 themes, prompt templates, starter project templates, real-time agent dashboard, and a one-line installer. Includes beginner-friendly PM mode, multi-agent orchestration, and cross-surface state sync.
```

### PR Description

```markdown
## What is CC Commander?

A comprehensive, modular toolkit for Claude Code that installs to `~/.claude/`. Built by scanning 200+ articles from the Claude Code community and distilling the best patterns into one install.

**Key features:**
- 441+ skills organized by category (11 CCC domains with router pattern)
- 88+ slash commands (`/plan`, `/verify`, `/tdd`, `/code-review`, `/init`, etc.)
- 25 hooks (18 kit-native lifecycle automations)
- 9 workflow modes (normal, design, saas, marketing, research, writing, night, yolo, unhinged)
- 4 terminal themes (Claude Anthropic, OLED Black, Matrix, Surprise Me)
- 36+ prompt templates across 6 categories
- 3 starter project templates (Next.js, API, CLI)
- Real-time React dashboard for agent monitoring
- Beginner PM mode for non-technical users
- Cross-surface state sync (Chat/Cowork/Code)
- Multi-agent orchestration patterns
- One-line install: `curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash`

**Works everywhere Claude Code runs:** Terminal, VS Code, Cursor, JetBrains, SSH sessions.

**Install:**
```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```

Or via npx:
```bash
npx cc-commander
```
```

## Submission Checklist

- [ ] Fork the awesome-claude-code repo
- [ ] Add entry in alphabetical order within the appropriate category
- [ ] Verify the link works and repo is public
- [ ] Submit PR with the title and description above
- [ ] Follow up if maintainers request changes
