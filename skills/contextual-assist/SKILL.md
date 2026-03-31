---
name: contextual-assist
version: 1.0.0
description: |
  Proactive contextual suggestion system with 5 configurable levels.
  Monitors user activity (file types, commands, errors) and suggests
  relevant mega-skills, commands, and prompts at natural breakpoints.
  Respects assistance level from bible-config.json or KZ_ASSIST_LEVEL env var.
triggers:
  - "contextual assist"
  - "suggest skills"
  - "what should I use"
  - "help me find the right skill"
  - "I'm stuck"
  - "what's available"
tags: [coaching, discovery, onboarding, meta]
---

# Contextual Assist

> Proactive skill and workflow suggestions based on what you're actually doing. Five levels from silent to full mentoring. Configure via `bible-config.json` or `KZ_ASSIST_LEVEL` env var.

## Assistance Levels

| Level | Env Value | Behavior |
|-------|-----------|----------|
| **off** | `KZ_ASSIST_LEVEL=off` | No suggestions. Fully silent. For experts who know the kit. |
| **minimal** | `KZ_ASSIST_LEVEL=minimal` | Only suggest when stuck (>60s no action or 3+ consecutive errors). |
| **standard** | `KZ_ASSIST_LEVEL=standard` | Suggest relevant skills at natural breakpoints (after completing a task phase, switching contexts, or hitting errors). Default level. |
| **guided** | `KZ_ASSIST_LEVEL=guided` | Active coaching with "Did you know?" tips. Suggests workflows before you ask. Points out unused skills relevant to your current work. |
| **mentored** | `KZ_ASSIST_LEVEL=mentored` | Full handholding. Explains every step, suggests next actions, provides progressive disclosure of the full kit. Ideal for first-time users or onboarding. |

Configure in `~/.claude/bible-config.json`:
```json
{
  "assistLevel": "standard"
}
```

Or override per-session: `export KZ_ASSIST_LEVEL=guided`

---

## How It Works

### Signal Detection

The contextual assist system monitors these signals to understand what you're doing:

| Signal | Source | Example Triggers |
|--------|--------|-----------------|
| **File extensions** | Edit/Write/Read tool calls | `.tsx` = React, `.prisma` = database, `.yml` = DevOps |
| **File paths** | Edit/Write/Read tool calls | `tests/` = testing, `docs/` = documentation, `deploy/` = deployment |
| **Commands run** | Bash tool calls | `npm test`, `git push`, `docker build`, `playwright test` |
| **Error patterns** | Bash/Edit tool output | TypeScript errors, build failures, test failures |
| **Time gaps** | Time between tool calls | >60s = potentially stuck |
| **Repetition** | Repeated similar tool calls | Same file edited 3+ times = possibly struggling |
| **Project files** | Filesystem scan | `package.json`, `tsconfig.json`, `Dockerfile`, `next.config.js` |

### Suggestion Categories

Suggestions are drawn from across the entire Bible kit:

1. **Mega-Skills** — Route to the right mega-skill for the domain
2. **Individual Skills** — Specific skills for specific tasks
3. **Slash Commands** — Quick actions via `/cc` commands
4. **Prompt Templates** — Starting templates for common scenarios
5. **Workflow Modes** — Suggest mode switches when activity pattern shifts
6. **Hooks** — Mention relevant automated protections

---

## Pattern Matching Rules

### Project Type Detection

When the contextual assist system detects a project type, it loads the relevant suggestion set:

**Next.js / React Project** (detected: `next.config.js`, `app/`, `.tsx` files)
```
Detected: Next.js project

Relevant mega-skills:
  mega-saas     — Auth, billing, database, API patterns
  mega-design   — UI components, animations, landing pages
  mega-testing  — E2E with Playwright, component testing

Quick starts:
  /cc mega saas        — Full SaaS stack (auth + billing + DB)
  /cc mega design      — UI polish, animations, component library
  /cc mode design      — Switch to design-first workflow
  /cc mode saas        — Switch to full-stack SaaS workflow

Relevant skills:
  nextjs-app-router    — App Router patterns and best practices
  shadcn-ui            — Component library integration
  tailwind-v4          — Tailwind CSS v4 patterns
  better-auth          — Authentication setup
  stripe-subscriptions — Billing integration
```

**API / Backend Project** (detected: `routes/`, `controllers/`, `prisma/`, `drizzle/`)
```
Detected: API / Backend project

Relevant mega-skills:
  mega-saas     — Database, API design, auth
  mega-devops   — CI/CD, Docker, monitoring
  mega-testing  — API testing, load testing

Quick starts:
  /cc mega saas        — Full backend patterns
  /cc mega devops      — Infrastructure and deployment

Relevant skills:
  api-design           — RESTful API design patterns
  backend-patterns     — Service layer, repository pattern
  database-designer    — Schema design and migrations
  postgres-patterns    — PostgreSQL optimization
  drizzle-neon         — Drizzle ORM with Neon DB
  fastify-api          — Fastify API patterns
  harden               — Security hardening
```

**DevOps / Infrastructure** (detected: `Dockerfile`, `.github/workflows/`, `terraform/`, `k8s/`)
```
Detected: DevOps / Infrastructure project

Relevant mega-skills:
  mega-devops   — Full DevOps suite (25+ skills)

Quick starts:
  /cc mega devops      — CI/CD, Docker, monitoring, security

Relevant skills:
  docker-development   — Docker best practices
  github-actions-reusable-workflows — CI/CD pipeline patterns
  container-security   — Container hardening
  senior-devops        — Infrastructure architecture
  infra-runbook        — Operational runbooks
  setup-deploy         — Deployment configuration
```

**Marketing / Content** (detected: `blog/`, `content/`, `landing/`, MDX/MD heavy)
```
Detected: Marketing / Content project

Relevant mega-skills:
  mega-marketing  — Content strategy, copywriting, CRO
  mega-seo        — Technical SEO, content optimization

Quick starts:
  /cc mega marketing   — Full marketing toolkit
  /cc mega seo         — SEO optimization suite
  /cc mode marketing   — Switch to marketing workflow

Relevant skills:
  landing-page-builder — High-converting landing pages
  seo-content-brief    — SEO-optimized content briefs
  content-strategy     — Content planning and calendars
  email-capture        — Lead generation forms
  ab-test-setup        — A/B testing configuration
```

### Activity Pattern Detection

Beyond project type, the system detects real-time activity patterns:

**Stuck Pattern** (3+ errors in a row, or >60s with no action)
```
You seem stuck. Here are some options:

  /tdd            — Write a test first to clarify the expected behavior
  /build-fix      — Auto-resolve build errors
  /investigate    — Systematic debugging approach
  /clarify        — Ask structured clarifying questions

Or try: "What's the simplest thing that could possibly work?"
```

**Testing Pattern** (editing test files, running test commands)
```
Working on tests? CC Commander has you covered:

  /tdd                 — Full TDD red-green-refactor cycle
  /verify              — Run verification loop (tests + types + lint)
  /e2e                 — E2E testing with Playwright
  /test-coverage       — Check and improve test coverage
  mega-testing         — 15+ testing skills

Tip: Write the test assertion first, then make it pass.
```

**Refactoring Pattern** (many edits to same files, renaming, moving)
```
Refactoring detected. Useful tools:

  /refactor-clean      — Dead code cleanup + restructuring
  /code-review         — Multi-agent code review
  /checkpoint          — Save a restore point before big changes
  /quality-gate        — Verify quality metrics

Tip: Run /verify after each refactoring step to catch regressions early.
```

**New Feature Pattern** (creating new files, new directories)
```
Building something new? Start with structure:

  /plan                — Spec-first planning
  /tdd                 — Test-driven development
  /init                — Project setup wizard (if new project)
  confidence-check     — Assess confidence before diving in

Tip: "What does done look like?" — define success criteria first.
```

**Deployment Pattern** (git commands, CI files, deploy scripts)
```
Deploying? Safety checks:

  /verify              — Full verification before push
  /checkpoint          — Git checkpoint (safe restore point)
  /harden              — Security hardening check
  /deploy              — Deployment checklist

  mega-devops          — Full CI/CD, monitoring, rollback patterns
```

**Documentation Pattern** (editing .md files, README, docs/)
```
Writing docs? Available tools:

  /update-docs         — Sync docs with code changes
  /docs                — Documentation generator
  typeset              — Typography and formatting polish
  doc-coauthoring      — Collaborative documentation

Tip: Keep docs close to the code they describe.
```

---

## Progressive Disclosure (Mentored Level)

At the `mentored` level, the system introduces kit features gradually over the course of a session:

### Phase 1: First 10 Interactions
Introduce only:
- `/plan` — planning
- `/verify` — verification
- `/checkpoint` — saving progress
- Basic file operations

Message style:
```
[Mentored] You just edited 3 files. A good practice is to verify your changes
work correctly before moving on. Try typing: /verify

This runs your tests, type checker, and linter in one step.
```

### Phase 2: Interactions 11-30
Introduce:
- `/tdd` — test-driven development
- `/code-review` — code review
- Mode switching (`/cc mode`)
- Relevant mega-skills for detected project type

Message style:
```
[Mentored] Did you know? CC Commander includes mega-skills — large skill bundles
for common workflows. For your Next.js project, try:

  /cc mega saas — sets up auth, billing, database, and API patterns

You can also switch modes: /cc mode saas activates the full SaaS workflow.
```

### Phase 3: Interactions 31+
Introduce:
- Agency Orchestrator (multi-agent)
- Task Commander (complex orchestration)
- Overnight runner (autonomous sessions)
- Advanced features (dialectic review, strategic compact)

Message style:
```
[Mentored] You're working on a complex task with many files. For tasks this
large, the Task Commander can orchestrate multiple agents in parallel:

  Use the task-commander skill to set up a DAG workflow.
  It manages agent assignment, retries, and cost tracking automatically.

This is an advanced feature — only use when you have 3+ independent subtasks.
```

---

## Integration with Hooks

The contextual assist system works alongside these hooks:

| Hook | Relationship |
|------|-------------|
| `session-coach.js` | Session coach handles periodic nudges; contextual assist handles context-aware suggestions. They complement each other. When both are enabled, session-coach defers to contextual assist at `guided` or `mentored` levels. |
| `confidence-gate.js` | At `guided`+ levels, contextual assist reminds users to run confidence checks before major implementations. |
| `context-guard.js` | Contextual assist suggests `/compact` or `/save-session` when context guard detects high usage. |
| `cost-alert.js` | At `guided`+ levels, contextual assist suggests cheaper alternatives (Haiku agents, model routing) when cost alerts fire. |

---

## Configuration Reference

Full `bible-config.json` options relevant to contextual assist:

```json
{
  "assistLevel": "standard",
  "features": {
    "coach": true,
    "sessionCoach": true
  },
  "thresholds": {
    "stuckTimeoutSec": 60
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `assistLevel` | string | `"standard"` | One of: off, minimal, standard, guided, mentored |
| `features.coach` | boolean | `true` | Master switch for all coaching features |
| `features.sessionCoach` | boolean | `true` | Enable session-coach hook integration |
| `thresholds.stuckTimeoutSec` | number | `60` | Seconds of inactivity before "stuck" detection triggers |

Environment override: `KZ_ASSIST_LEVEL=mentored` (takes precedence over config file).

---

## Quick Reference Table

| You're Doing | Assist Suggests | Command |
|-------------|-----------------|---------|
| React/Next.js work | mega-design, mega-saas | `/cc mega design` |
| Writing API endpoints | api-design, backend-patterns | `/cc mega saas` |
| Database schema work | database-designer, migrations | `database-designer` skill |
| CI/CD pipeline | mega-devops, github-actions | `/cc mega devops` |
| Content/marketing | mega-marketing, mega-seo | `/cc mode marketing` |
| Stuck on errors | investigate, build-fix, tdd | `/build-fix` |
| Starting new feature | plan, confidence-check | `/plan` |
| About to deploy | verify, harden, checkpoint | `/verify` |
| Writing tests | tdd-workflow, e2e, coverage | `/tdd` |
| Refactoring | refactor-clean, code-review | `/refactor-clean` |
| Complex multi-step | task-commander, orchestrate | `/orchestrate` |
| Going to sleep | overnight-runner, night mode | `/cc mode night` |
