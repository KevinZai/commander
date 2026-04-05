---
name: project-kickoff
description: |
  Initialize a new project with full Claude Code + OpenClaw integration.
  Creates CLAUDE.md, tasks/, .claude/settings.json, git worktree setup,
  Paperclip ticket, and agent assignment. One command to go from idea to
  ready-to-build.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
---

# Project Kickoff

## When to Use
- Starting any new project or significant module
- Setting up a repo for Claude Code development
- Onboarding a new codebase

## Process

### Step 1: Quick Interview (3-5 questions)
1. **Project name** — slug for directories (e.g., `dmhub-billing`)
2. **Tech stack** — Next.js? Express? Python? Existing repo?
3. **Primary developer** — Kevin (Claude Code) or agent (OpenClaw)?
4. **Deploy target** — Vercel? Self-hosted? Docker? PM2?
5. **Related projects** — Does this integrate with anything existing?

### Step 2: Create Structure
```bash
# If new project
mkdir -p ~/projects/{name}
cd ~/projects/{name}
git init
mkdir -p tasks .claude

# Create files
touch tasks/todo.md tasks/lessons.md
```

### Step 3: Generate CLAUDE.md
Template based on tech stack:
```markdown
# CLAUDE.md — {Project Name}

## Overview
{One paragraph from interview answers}

## Tech Stack
- Framework: {framework}
- Database: {db}
- Deploy: {target}

## Development
- Dev server: `{dev command}`
- Build: `{build command}`
- Test: `{test command}`

## Verification Protocol (MANDATORY)
After every change:
- {stack-specific checks}
- No TypeScript errors (`npx tsc --noEmit`)
Never mark done without evidence.

## Project-Specific Rules
- {Any special constraints from interview}
```

### Step 4: Create .claude/settings.json (if needed)
Only for project-specific permissions not in global settings.

### Step 5: Create Paperclip Ticket
```bash
curl -s -X POST http://localhost:3110/api/companies/{companyId}/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "Project setup: {name}", "description": "Initial scaffolding", "priority": "medium"}'
```

### Step 6: Git Worktree Setup (for parallel work)
```bash
git worktree add ../project-{name}-feature feature/initial-build
```

## Output Checklist
- [ ] Project directory created
- [ ] CLAUDE.md written
- [ ] tasks/todo.md with initial items
- [ ] tasks/lessons.md (empty, ready)
- [ ] .claude/settings.json (if needed)
- [ ] Paperclip ticket created
- [ ] Git initialized + first commit
- [ ] Ready for `spec-interviewer` skill
