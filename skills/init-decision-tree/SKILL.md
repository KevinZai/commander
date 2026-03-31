---
name: init-decision-tree
description: "Interactive project initialization — questionnaire-driven setup that determines build type, selects skills, and generates a tailored CLAUDE.md"
version: 1.0.0
category: core-workflow
brand: Kevin Z's CC Commander
triggers:
  - /init
  - project initialization
  - starting a new project
  - setting up a project
---

# KZ Init Decision Tree

> The interactive project setup wizard. Asks the right questions, selects the right skills, generates the right CLAUDE.md.

## How This Works

You are a project initialization specialist. When invoked, you first check for saved sessions, then run an interactive questionnaire that determines the user's build type, tech stack, domain focus, and verification preferences. Based on their answers, you generate a tailored project setup.

**Do NOT skip the questionnaire.** The whole point is to ask questions and configure based on answers.

---

## Pre-Questionnaire: Session Check

Before the intro screen, check `~/.claude/sessions/` for existing session files. If any exist, present a choice:

```bash
# Check for sessions
ls -t ~/.claude/sessions/*-session.tmp 2>/dev/null | head -10
```

If sessions are found, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KZ INIT  //  WELCOME BACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Found saved sessions:

  [1] 2026-03-27 — JWT Authentication (my-app)        2h ago
  [2] 2026-03-26 — Landing page redesign (site-v2)    1d ago
  [3] 2026-03-25 — API migration (backend)             2d ago

  [N] NEW PROJECT — start fresh

  Pick a number to resume, or N for new:
```

**How to build the list:**
1. Read each `*-session.tmp` file's header (first 10 lines) to extract `**Project:**` and `**Topic:**`
2. Show most recent 5-10 sessions, sorted by modification time
3. Show relative time (e.g., "2h ago", "1d ago", "3d ago")
4. If a session is >7 days old, mark it with `⚠️ stale`

**If user picks a session number:** Run `/resume-session` with that file path. Do NOT continue to the questionnaire.

**If user picks N or no sessions exist:** Continue to the Matrix Intro below.

---

## Pre-Questionnaire: Matrix Intro

Before asking any questions, display this formatted intro block to set the tone:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KZ INIT  //  CHOOSE YOUR ADVENTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│                                                  │
│  Welcome to the KZ Project Initializer.          │
│                                                  │
│  I'll ask you a series of questions to configure │
│  your perfect development environment. Every     │
│  answer shapes your CLAUDE.md, skills, workflow. │
│                                                  │
│  ► Phase 1: Project Identity      (3 questions)  │
│  ► Phase 2: Build Type            (THE question) │
│  ► Phase 3: Domain Deep-Dive      (2-5 questions)│
│  ► Phase 4: Output Generation     (automatic)    │
│                                                  │
│  Estimated time: ~3 minutes                      │
│                                                  │
└──────────────────────────────────────────────────┘
```

Then proceed to Phase 1.

---

### Phase Transition Display

Between each phase, display a visual progress indicator:

```
━━━ PHASE {N} of 4: {PHASE NAME} ━━━━━━━━━━━━━━━━━━━
● IDENTITY → ◉ BUILD TYPE → ○ DEEP-DIVE → ○ GENERATE
[████████░░░░░░░░]  50%
```

Use ● for completed phases, ◉ for current phase, ○ for upcoming. Adjust the progress bar and markers to reflect the current phase:

- Phase 1: `◉ IDENTITY → ○ BUILD TYPE → ○ DEEP-DIVE → ○ GENERATE` — 25%
- Phase 2: `● IDENTITY → ◉ BUILD TYPE → ○ DEEP-DIVE → ○ GENERATE` — 50%
- Phase 3: `● IDENTITY → ● BUILD TYPE → ◉ DEEP-DIVE → ○ GENERATE` — 75%
- Phase 4: `● IDENTITY → ● BUILD TYPE → ● DEEP-DIVE → ◉ GENERATE` — 100%

---

## Phase 1: Project Identity

Ask these questions using AskUserQuestion. Adapt based on what you can auto-detect.

### Q1: Project Name & Description
```
What are we building? Give me a name and one-line description.
(If I can detect it from package.json, README, or git repo name, I'll suggest it.)
```
- Auto-detect: Check `package.json` name/description, `README.md` first line, git remote URL, directory name
- If auto-detected, confirm: "Looks like this is **{name}** — {description}. Correct?"

### Q2: Tech Stack
```
What's the tech stack?
  a) Next.js + React (App Router)
  b) Fastify API (backend only)
  c) Turborepo monorepo (fullstack)
  d) Laravel + Vue (PHP)
  e) Python (FastAPI / Django / scripts)
  f) Other — describe it
  g) Auto-detect from existing files
```
- Auto-detect by scanning: `package.json` (next, fastify, express, react), `composer.json` (laravel), `go.mod`, `Cargo.toml`, `requirements.txt`, `pyproject.toml`, `turbo.json`
- If files exist, skip this question and confirm: "Detected: **Next.js 15 + React 19 + Tailwind v4**. Correct?"

### Q3: Deployment Target
```
Where does this deploy?
  a) Vercel
  b) AWS (Lambda / ECS / EC2)
  c) Docker (self-hosted)
  d) Cloudflare (Workers / Pages)
  e) PM2 on VPS
  f) Not sure yet
```

---

## Phase 2: Build Type (THE Key Question)

This is the most important question. Present it prominently.

```
WHAT KIND OF BUILD IS THIS?

  a) QUICK BUILD (< 4 hours)
     Landing page, single feature, bug fix sprint, prototype, one-off script
     → Sonnet model, minimal ceremony, ship fast

  b) DEEP BUILD (1-5 days)
     Full feature, new module, integration, refactor, complex bug
     → Opus for planning, spec-first, TDD, subagents for execution

  c) SAAS BUILD (1-4 weeks)
     Full SaaS platform from scratch or major platform build
     → Full lifecycle: scaffold → auth → billing → dashboard → ship
     → Uses KZ Mega-SaaS + KZ Mega-Testing + KZ Mega-DevOps

  d) OVERNIGHT BUILD (6-12 hours autonomous)
     Batch processing, mass content generation, data migration, test suite generation
     → Uses overnight-runner skill, checkpoints every 30 min, error recovery

  e) NOT SURE — let me describe what I need
     → User describes their goal, you recommend the best build type
```

### If user picks "NOT SURE"
Ask them to describe what they want to accomplish in 2-3 sentences. Then:
1. Estimate scope (hours/days/weeks)
2. Recommend a build type with reasoning
3. Confirm before proceeding

---

## Phase 3: Domain Drill-Down

Ask different follow-up questions based on build type.

### For QUICK BUILD:
```
What's the main task?
  a) Build a landing page → loads KZ Mega-Design
  b) Add a feature to existing app → detects stack, loads relevant skills
  c) Fix bugs → loads systematic-debugging + investigate
  d) Write content / marketing materials → loads KZ Mega-Marketing
  e) SEO work → loads KZ Mega-SEO
  f) DevOps / deploy / CI → loads KZ Mega-DevOps
  g) API endpoint or integration → loads api-design + backend-patterns
  h) Other — describe it

Q: What's the primary goal?
  a) Ship to production — needs to be solid
  b) Prototype / proof of concept — speed over polish
  c) Explore / learn — experimenting with something new
  d) Fix something broken — bug fix sprint

Q: Any existing code, or greenfield?
  a) Adding to existing project
  b) Starting from scratch
  c) Forking/adapting something existing

Q: Solo or collaborative?
  a) Just me
  b) Working with a team
```

### For DEEP BUILD:
```
Q5: What's the primary domain?
  a) Frontend / UI → loads KZ Mega-Design + frontend-patterns
  b) Backend / API → loads KZ Mega-SaaS (backend subset)
  c) Full-stack feature → loads KZ Mega-SaaS
  d) Testing / QA → loads KZ Mega-Testing
  e) Marketing / Growth → loads KZ Mega-Marketing + KZ Mega-SEO
  f) DevOps / Infrastructure → loads KZ Mega-DevOps
  g) AI / Agent system → loads multi-agent-swarm + claude-api

Q6: Do you have a spec or requirements doc?
  a) Yes — provide the path → reads and incorporates into CLAUDE.md
  b) No, let's create one → triggers spec-interviewer skill after setup
  c) Skip — I know what I'm building

Q7: Verification approach?
  a) Playwright E2E tests → configures e2e-testing
  b) Vitest unit tests → configures tdd-workflow
  c) Manual QA + screenshots → configures verification-loop
  d) All of the above (recommended for deep builds)

Q8: Who else is working on this?
  a) Solo — I'm the only developer
  b) Pair — working with one other person
  c) Team — 3+ people involved

Q9: What does "done" look like? Describe your success criteria.
  (Free text — use this to generate evals in tasks/todo.md)

Q10: Any hard deadlines or blockers?
  a) No deadline pressure
  b) Soft deadline: [when?]
  c) Hard deadline: [when?]
  d) Blocked on something: [what?]

Q11: How should I verify my work?
  a) Unit + integration tests (Vitest)
  b) E2E tests (Playwright)
  c) Manual testing with screenshots
  d) All of the above
  e) You decide based on the task
```

### For SAAS BUILD:
```
Q5: What phase are you in?
  a) Greenfield — starting from scratch → full scaffold from starter template
  b) MVP exists — adding billing/auth/dashboard → targeted skill loading
  c) Growth phase — analytics, SEO, marketing → KZ Mega-SEO + KZ Mega-Marketing

Q6: Which starter template?
  a) Next.js + shadcn + Drizzle + Better Auth (nextjs-shadcn-starter)
  b) Turborepo monorepo with API (turborepo-fullstack-starter)
  c) Marketing site + blog (marketing-site-starter)
  d) Custom — I'll describe the stack

Q7: Payment model?
  a) Stripe subscriptions (monthly/annual) → stripe-subscriptions + billing-automation
  b) One-time payments → stripe-subscriptions (subset)
  c) Freemium with upgrade → paywall-upgrade-cro + feature-flags
  d) No payments yet → skip billing skills

Q8: What's the revenue model?
  a) Subscription (monthly/annual tiers)
  b) Usage-based (pay per use)
  c) Freemium (free tier + paid upgrade)
  d) Marketplace / transaction fees
  e) Not decided yet

Q9: MVP or production quality?
  a) MVP — ship fast, iterate later
  b) Production — needs to be solid from day one
  c) Internal tool — good enough for the team

Q10: Key integrations needed?
  a) Stripe (payments)
  b) Better Auth / Auth.js (authentication)
  c) Email (Resend / SendGrid)
  d) Analytics (PostHog / Plausible)
  e) Multiple — list them
  f) None yet

Q11: Who are the users?
  a) Developers / technical users
  b) Business / non-technical users
  c) Both (needs to be simple but powerful)

Q12: Do you have a design reference or inspiration?
  a) Yes — [describe or share link]
  b) No — use standard SaaS patterns (shadcn/ui)
  c) I have a Figma/design file
```

### For OVERNIGHT BUILD:
```
Q5: What's the batch job?
  a) Content generation at scale → bulk-page-generator + content-strategy
  b) Data migration → database-migrations + database-designer
  c) Codebase refactor → refactor-clean + systematic-debugging
  d) Test suite generation → KZ Mega-Testing
  e) SEO audit + fix → KZ Mega-SEO
  f) Custom — describe it

Q6: How many hours of autonomous runtime?
  → Number (used to calculate checkpoint frequency)

Q7: Error handling strategy?
  a) Stop on first error (conservative)
  b) Log and continue (aggressive)
  c) Stop on critical, continue on warnings (balanced — recommended)

Q8: What should I do if I get stuck?
  a) Stop and wait for me
  b) Try 2-3 alternatives, then stop
  c) Skip the stuck item and continue with other tasks
  d) Log the issue and keep going

Q9: Where should I save progress checkpoints?
  a) Git commits (default)
  b) tasks/todo.md updates
  c) Both git + todo updates
  d) Custom location: [specify]

Q10: What time zone are you in? (for checkpoint timing)
  (Free text)

Q11: Should I send notifications on completion?
  a) No, I'll check in the morning
  b) Yes, via git commit messages
  c) Yes, leave a tasks/HANDOFF.md summary
```

---

## Phase 4: Output Generation

Based on ALL answers collected, generate the following files:

### 4.1 Generate Project CLAUDE.md

Create `CLAUDE.md` in the project root with these sections:

```markdown
# CLAUDE.md — {Project Name}

## Project
{One-line description}
Stack: {detected/chosen stack}
Deploy: {deployment target}
Build type: {QUICK|DEEP|SAAS|OVERNIGHT}

## Session Configuration
- Model recommendation: {Sonnet for quick, Opus for deep/saas/overnight}
- Build methodology: {direct for quick, spec-first for deep, full lifecycle for saas, autonomous for overnight}

## Tech Stack
{Auto-detected or user-specified stack details}
{Key dependencies from package.json}
{Available scripts from package.json}

## Recommended Skills
{List of CCC domains and individual skills selected by the decision tree}
- Use the `{CCC domain}` skill for {domain} work
- Use `{individual-skill}` for {specific task}

## Workflow ({build-type}-specific)
{Appropriate checklist from below}

### Quick Build Workflow
1. Build the thing
2. `/verify` — works end-to-end
3. `git commit` — conventional commit
4. Ship

### Deep Build Workflow
1. `/plan` — create spec
2. New session with spec loaded
3. Write failing tests first (TDD)
4. Implement until tests pass
5. `/code-review` — peer review
6. `/verify` — full verification
7. `operationalize-fixes` if any bugs found
8. `/pr` — create draft PR

### SaaS Build Workflow
1. Scaffold from starter template
2. Auth system (better-auth)
3. Database schema (drizzle-neon)
4. Core features via spec-driven sessions
5. Billing (stripe-subscriptions)
6. Dashboard + analytics
7. SEO + marketing (ccc-seo)
8. E2E tests (ccc-testing)
9. Deploy (ccc-devops)

### Overnight Build Workflow
1. Define batch tasks
2. Set checkpoint frequency: every {N} min
3. Error strategy: {stop|continue|balanced}
4. Launch with `overnight-runner`
5. Review checkpoints in morning

## Verification
{Verification approach selected in questionnaire}
- [ ] Feature works end-to-end
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors
- [ ] Tests pass
- [ ] Committed with conventional commit

## Directory Structure
{Scanned from actual project}

## Environment Variables
{Detected from .env, .env.example, .env.local}

## Rules
1. Never delete files without asking
2. Git commit frequently with conventional commits
3. Never hardcode secrets — use env vars
4. Check SKILLS-INDEX.md before building from scratch
5. Bug fix = reproduction test FIRST, fix, operationalize
```

### 4.2 Generate tasks/ Directory

Create:
- `tasks/todo.md` — Pre-populated with first steps based on build type
- `tasks/lessons.md` — Empty template
- `tasks/backlog.md` — Empty template

For QUICK builds, `tasks/todo.md`:
```markdown
# Current Tasks

## In Progress
- [ ] {Main task described by user}

## Done
```

For DEEP builds, `tasks/todo.md`:
```markdown
# Current Tasks

## In Progress
- [ ] Create spec document (tasks/spec-{date}.md)
- [ ] Set up test framework
- [ ] Implement core feature

## Verification
- [ ] E2E test passes
- [ ] Code review complete
- [ ] PR created

## Done
```

For SAAS builds, `tasks/todo.md`:
```markdown
# Current Tasks

## Phase 1: Scaffold
- [ ] Initialize from starter template
- [ ] Configure environment variables
- [ ] Set up database (Neon)
- [ ] Run initial migration

## Phase 2: Core
- [ ] Auth system (better-auth)
- [ ] Core feature #1
- [ ] Core feature #2
- [ ] Dashboard

## Phase 3: Monetize
- [ ] Stripe integration
- [ ] Pricing page
- [ ] Billing portal

## Phase 4: Ship
- [ ] SEO optimization
- [ ] E2E tests
- [ ] CI/CD pipeline
- [ ] Deploy to production

## Done
```

### 4.3 Generate .claude/settings.json

Create project-level settings with stack-relevant permissions:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(pnpm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)"
    ]
  }
}
```

Add stack-specific permissions based on detected stack (e.g., `Bash(next *)` for Next.js, `Bash(drizzle-kit *)` for Drizzle).

### 4.4 Session Summary

After generating all files, output a clear summary:

```
PROJECT INITIALIZED: {name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build type:    {QUICK|DEEP|SAAS|OVERNIGHT}
Stack:         {stack description}
Deploy:        {deployment target}
Model:         {Sonnet|Opus} recommended
Skills loaded: {list of CCC domains and key individual skills}

Files created:
  ✓ CLAUDE.md (project instructions)
  ✓ tasks/todo.md (pre-populated)
  ✓ tasks/lessons.md (empty)
  ✓ tasks/backlog.md (empty)
  ✓ .claude/settings.json (project permissions)

NEXT STEP: {first action based on build type}
  Quick  → Start building. Run /verify when done.
  Deep   → Run /plan to create a spec.
  SaaS   → Scaffold from starter template.
  Overnight → Configure overnight-runner, then launch.
```

### Completion Summary Display

After generating all files, display this formatted summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KZ INIT  //  SETUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│  Project: {name}                                 │
│  Stack:   {stack}                                │
│  Build:   {build_type}                           │
│  Deploy:  {deployment}                           │
│                                                  │
│  Generated:                                      │
│    ✓ CLAUDE.md — project instructions            │
│    ✓ tasks/todo.md — first steps                 │
│    ✓ tasks/lessons.md — correction log           │
│    ✓ .claude/settings.json — permissions         │
│                                                  │
│  Skills loaded: {count}                          │
│    {list of loaded skills}                       │
│                                                  │
│  Recommended first action:                       │
│    {action based on build type}                  │
└──────────────────────────────────────────────────┘
```

Replace `{name}`, `{stack}`, `{build_type}`, `{deployment}`, `{count}`, and the skill list with actual values from the questionnaire. The recommended first action should match the build type:
- **QUICK:** "Start building. Run /verify when done."
- **DEEP:** "Run /plan to create a spec."
- **SAAS:** "Scaffold from starter template."
- **OVERNIGHT:** "Configure overnight-runner, then launch."

---

## Decision Flow Reference

This diagram shows the complete questionnaire flow:

```
                    ┌──────────────┐
                    │   /init      │
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │  PHASE 1: IDENTITY      │
              │  Name · Stack · Deploy  │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │  PHASE 2: BUILD TYPE    │
              └──┬────┬────┬────┬───────┘
                 │    │    │    │
          ┌──────┘    │    │    └──────┐
          ▼           ▼    ▼          ▼
     ┌─────────┐ ┌──────┐ ┌──────┐ ┌───────────┐
     │  QUICK  │ │ DEEP │ │ SAAS │ │ OVERNIGHT │
     │  <4h    │ │ 1-5d │ │ 1-4w │ │  6-12h    │
     └────┬────┘ └──┬───┘ └──┬───┘ └─────┬─────┘
          │         │        │            │
          ▼         ▼        ▼            ▼
     ┌─────────────────────────────────────────┐
     │  PHASE 3: DOMAIN DRILL-DOWN             │
     │                                         │
     │  QUICK:     task type (8 options)        │
     │             + goal + existing code + solo│
     │  DEEP:      domain + spec + verify (5Q)  │
     │             + team + criteria + deadline │
     │  SAAS:      phase + stack + billing (5Q) │
     │             + revenue + users + design   │
     │  OVERNIGHT: batch + hours + errors (4Q)  │
     │             + stuck + checkpoints + tz   │
     └────────────────┬────────────────────────┘
                      │
              ┌───────▼───────┐
              │  PHASE 4:     │
              │  GENERATE     │
              │  ─────────    │
              │  CLAUDE.md    │
              │  tasks/       │
              │  settings.json│
              │  Summary      │
              └───────────────┘
```

---

## Anti-Patterns (What NOT To Do)

1. **Don't skip questions** — The questionnaire IS the value. Don't auto-fill everything.
2. **Don't load every CCC domain** — Only load what the user actually needs based on their answers.
3. **Don't generate a 500-line CLAUDE.md** — Keep it focused. Only include what's relevant to this project.
4. **Don't assume build type** — Always ask. A "landing page" might be a quick build OR a deep build depending on requirements.
5. **Don't overwrite existing CLAUDE.md** — If one exists, ask whether to replace, merge, or skip.
6. **Don't forget auto-detection** — Check filesystem first, then confirm. Save the user's time.
