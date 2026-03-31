# Windsurf Compatibility Guide

Windsurf (formerly Codeium) uses `.windsurfrules` files for AI behavior configuration. This guide maps CC Commander skills to Windsurf equivalents so teams using both tools can maintain consistent workflows.

## How Windsurf Rules Work

Windsurf reads `.windsurfrules` at the project root (similar to `.cursorrules`). These files define coding standards, workflow preferences, and AI behavior for Windsurf's Cascade AI.

CC Commander installs to `~/.claude/` and has no effect on Windsurf. The two systems are independent. This guide helps you translate CC Commander workflows into Windsurf rules if you use both.

## Mapping CC Commander Skills to Windsurf Rules

### Coding Standards

CC Commander uses `CLAUDE.md` for coding standards. Windsurf uses `.windsurfrules`. To keep both aligned, extract the coding standards section of your `CLAUDE.md` into a `.windsurfrules` file:

```
# .windsurfrules (generated from CC Commander CLAUDE.md)

## Code Style
- TypeScript strict mode, ESM only
- Functional style preferred
- No unnecessary comments
- Error handling: fail fast, throw early, catch at boundaries

## File Organization
- Many small files over few large files
- 200-400 lines typical, 800 max
- Organize by feature/domain, not by type
```

### Planning and Review

Kit provides `/plan`, `/code-review`, and `/verify` commands. Windsurf does not have a direct equivalent, but you can add workflow instructions to `.windsurfrules`:

```
## Workflow
- Before implementing features, outline the plan and get approval
- After writing code, review for security, performance, and correctness
- Before marking work complete, verify all acceptance criteria are met
```

### TDD

Kit's `/tdd` command enforces test-driven development. Add the equivalent to Windsurf:

```
## Testing
- Write tests before implementation
- Run tests after each change
- Minimum 80% coverage
```

## Skills Without Windsurf Equivalents

These Kit features have no Windsurf counterpart:

| Kit Feature | Notes |
|-------------|-------|
| Hooks (PreToolUse, PostToolUse, Stop) | Windsurf has no lifecycle hook system |
| Slash commands (`/plan`, `/verify`, etc.) | Windsurf uses natural language only |
| Mega-skills (bundled skill routers) | No equivalent -- include all rules in `.windsurfrules` |
| Mode switcher (design, saas, marketing) | No equivalent -- create separate `.windsurfrules` files |
| Dashboard | No equivalent |
| Multi-agent orchestration | Windsurf Cascade is single-agent |

## Coexistence

Both tools can exist in the same project without conflict:

- `CLAUDE.md` -- Claude Code reads this, Windsurf ignores it
- `.windsurfrules` -- Windsurf reads this, Claude Code ignores it
- `.claude/settings.json` -- Claude Code only
- `.cursorrules` -- Cursor only (Windsurf ignores this too)

If you maintain both files, consider a shared source of truth (a `coding-standards.md` file) that both `CLAUDE.md` and `.windsurfrules` reference or copy from.
