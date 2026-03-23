# Claude Code Cheatsheet
> Quick reference for commands, workflows, and best practices

---

## 🚀 Essential Commands

### Planning & Execution
| Command | When to Use |
|---------|-------------|
| `/plan` | Before ANY multi-step task. Spec-first, then execute. |
| `/orchestrate` | Multi-agent pipeline for complex work |
| `/build-fix` | Auto-resolve build errors after `npm run build` fails |
| `/verify` | Run verification loop before claiming "done" |
| `/checkpoint` | Git checkpoint — save state mid-work |
| `/complete` | Mark task complete with verification |

### Code Quality
| Command | When to Use |
|---------|-------------|
| `/code-review` | Multi-agent code review (runs 3 reviewers) |
| `/tdd` | Start test-driven workflow (write test → implement → refactor) |
| `/quality-gate` | Run quality checks (lint, type, test) |
| `/refactor-clean` | Safe refactoring with test preservation |

### Context & Sessions
| Command | When to Use |
|---------|-------------|
| `/save-session` | Before closing — persist context to disk |
| `/resume-session` | On startup — reload last session state |
| `/context-budget` | Check how much context you're using |
| `/aside` | Quick side-task without losing main context |

### Learning & Patterns
| Command | When to Use |
|---------|-------------|
| `/learn` | Extract reusable patterns from current work |
| `/instinct-status` | View learned patterns inventory |
| `/instinct-export` | Export learned instincts |
| `/instinct-import` | Import learned instincts |

### Project Management
| Command | When to Use |
|---------|-------------|
| `/paperclip` | Manage tasks in Paperclip |
| `/projects` | List active projects |
| `/pm2` | Manage PM2 processes |
| `/pr` | Create pull request |
| `/deploy` | Deploy to production |

### Testing
| Command | When to Use |
|---------|-------------|
| `/e2e` | Run Playwright E2E tests |
| `/test` | Run test suite |
| `/test-coverage` | Check test coverage |

### Documentation
| Command | When to Use |
|---------|-------------|
| `/docs` | Generate/update documentation |
| `/update-docs` | Refresh all doc files |
| `/update-codemaps` | Refresh code maps |

### Skills & Config
| Command | When to Use |
|---------|-------------|
| `/skill-create` | Create a new custom skill |
| `/skill-health` | Audit skill quality |
| `/harness-audit` | Audit ECC setup health |
| `/rules-distill` | Distill rules from experience |

---

## 🔑 Best Practices

### 1. Always Plan First
```
You: /plan
Claude: [asks 5-7 clarifying questions]
You: [answer them]
Claude: [writes spec to tasks/spec-YYYYMMDD.md]
You: [approve spec]
Claude: [executes from spec]
```
**Why:** Prevents wasted tokens on wrong approaches. One spec saves 3-5 failed attempts.

### 2. Use Subagents for Parallel Work
```
You: Build the API endpoint AND the test suite
Claude: [spawns 2 subagents — one for API, one for tests]
```
**Why:** Keeps main context clean. Each subagent gets full context window.

### 3. Project-Level CLAUDE.md > Global
- Global `~/.claude/CLAUDE.md` = universal rules (coding standards, workflow)
- Project `./CLAUDE.md` = stack-specific (Next.js? Laravel? Python?)
- Project `.claude/settings.json` = project permissions (not global)

### 4. Verify Before Done
Never accept "it works" without proof:
```
You: /verify
Claude: [runs tests, screenshots, type-check, lint]
Claude: "All 4 checks pass. Here's the evidence: [output]"
```

### 5. Context Management
- Save sessions before closing: `/save-session`
- Use `/aside` for quick side-questions (preserves main context)
- Compact manually at logical breakpoints: `/context-budget` to check
- Never change models mid-session — spawn subagent instead

### 6. Use "use context7" for Library Docs
```
You: Build a Stripe checkout flow. Use context7 for the latest Stripe API docs.
Claude: [fetches current Stripe docs via context7 MCP, not stale training data]
```

### 7. Spec-Based Development for Anything >1 Day
```
You: /plan
→ Interview → Spec doc → New session → Execute from spec
```
**Why:** Specs survive context compaction. Fresh sessions have full context budget.

---

## ⚡ Power Combos

### New Feature (Full Workflow)
```
/plan → approve spec → /tdd → implement → /verify → /code-review → /pr → /deploy
```

### Bug Fix
```
systematic-debugging skill → root cause → /tdd → fix → /verify → /pr
```

### Design Work
```
/plan → brainstorming skill → frontend-design skill → /verify → design-review → /ship
```

### Content/SEO
```
seo-content-brief → content-strategy → write → seo-optimizer → /verify
```

---

## 🛠️ MCP Server Quick Reference

| Say this... | To use... | For... |
|-------------|-----------|--------|
| "use context7" | context7 MCP | Latest library/API docs |
| "check the repo" | github MCP | Issues, PRs, CI status |
| "run the workflow" | n8n-mcp | n8n automation |
| "screenshot this" | playwright MCP | Visual verification |
| "check my notes" | granola MCP | Meeting transcripts |

---

## 🎯 Skill Selection Guide

### "I need to build..."
| Scenario | Skills to Use |
|----------|--------------|
| REST API | `api-design` + `backend-patterns` + `tdd-workflow` |
| Landing page | `landing-page-builder` + `frontend-design` + `signup-flow-cro` |
| Laravel feature | `laravel-patterns` + `laravel-tdd` + `laravel-verification` |
| AWS infra | `aws-solution-architect` + relevant AWS skill |
| Docker setup | `docker-development` + `container-security` |

### "I need to improve..."
| Scenario | Skills to Use |
|----------|--------------|
| Performance | `optimize` + `harden` |
| Design quality | `critique` → `bolder`/`quieter` → `polish` |
| SEO | `seo-optimizer` + `ai-seo` + `site-architecture` |
| Conversion | `signup-flow-cro` or `form-cro` + `analytics-conversion` |

### "I need to review..."
| Scenario | Skills to Use |
|----------|--------------|
| Code review | `/code-review` command or `review` skill |
| Security audit | `pentest-checklist` + `container-security` |
| Design review | `design-review` + `audit` + `critique` |
| Business plan | `plan-ceo-review` + `saas-metrics-coach` |

---

## ⚠️ Common Mistakes

| Mistake | Fix |
|---------|-----|
| Global permissions bloat | Use project-level `.claude/settings.json` |
| Changing models mid-session | Spawn subagent with different model |
| No verification before "done" | Always `/verify` or use `verification-before-completion` skill |
| Huge context window | `/save-session` → start fresh → `/resume-session` |
| Building from scratch | Check `SKILLS-INDEX.md` first — there's probably a skill for it |
| Stale library docs | Add "use context7" to your prompt |
| Forgetting lessons | Check `tasks/lessons.md` at session start |

---

## 📐 Project CLAUDE.md Template

Create `CLAUDE.md` in each project root:

```markdown
# CLAUDE.md — [Project Name]

## Stack
- Framework: [Next.js 15 / Laravel 11 / etc.]
- Language: [TypeScript / PHP / Python]
- Database: [PostgreSQL / MySQL / SQLite]
- Testing: [Vitest / PHPUnit / Pytest]

## Build & Test
- Dev: `npm run dev` / `php artisan serve`
- Build: `npm run build` / `php artisan optimize`
- Test: `npm test` / `php artisan test`
- Lint: `npm run lint` / `./vendor/bin/pint`

## Architecture
[Key decisions, patterns, folder structure]

## Active Tasks
See `tasks/todo.md`

## Rules
[Project-specific rules that override global]
```
