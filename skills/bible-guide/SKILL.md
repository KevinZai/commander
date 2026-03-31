---
name: bible-guide
description: Interactive onboarding guide for the CC Commander — skill discovery, progressive disclosure, capability overview for beginners through experts
tags: [guide, onboarding, beginner, discovery]
version: "1.2"
---

# Bible Guide — Interactive Onboarding

> Welcome to the CC Commander by Kevin Z. This guide helps you discover the right skills, commands, and workflows for your experience level and goals.

---

## Welcome

CC Commander is a comprehensive toolkit: **280+ skills**, **10 CCC domains**, **88+ commands**, **37 hooks**, **9 workflow modes**, and **36+ prompt templates**. That is a lot. This guide helps you find exactly what you need without reading everything.

**How this guide works:**
1. Tell me what you are building (Skill Discovery Wizard below)
2. I suggest the right CCC domains, modes, and commands
3. You start building immediately

---

## Skill Discovery Wizard

Answer one question: **What are you building?**

| If you are building... | Start with this mode | Load this CCC domain | First command to run |
|------------------------|---------------------|---------------------|---------------------|
| A landing page or marketing site | `design` | `ccc-design` | `/init` then `/cc mode design` |
| A SaaS product | `saas` | `ccc-saas` | `/init` then `/cc mode saas` |
| A REST API or backend service | `normal` | `ccc-saas` | `/init` then `/plan` |
| A mobile app (iOS/Android) | `normal` | `ccc-mobile` | `/init` then load `ccc-mobile` |
| A CLI tool or library | `normal` | none needed | `/init` then `/plan` |
| Marketing content or SEO | `marketing` | `ccc-marketing` + `ccc-seo` | `/cc mode marketing` |
| DevOps / CI/CD / infrastructure | `normal` | `ccc-devops` | load `ccc-devops` |
| Research or competitive analysis | `research` | `ccc-research` | `/cc mode research` |
| An overnight batch job | `night` | `overnight-runner` | `/cc mode night` |
| A quick prototype or demo | `yolo` | stack-specific only | `/cc mode yolo` |

**Not sure?** Run `/init` and the decision tree will ask the right questions and configure everything for you.

---

## Progressive Disclosure

### Beginner: The 4 Essential Commands

If you learn nothing else, learn these four commands. They cover 80% of daily usage.

| Command | What it does | When to use it |
|---------|-------------|----------------|
| `/init` | Initializes your project. Creates `CLAUDE.md`, detects your stack, sets up modes. | First time in any project. |
| `/plan` | Creates an implementation plan before coding. Breaks work into steps. | Before building any feature with 2+ steps. |
| `/verify` | Runs a verification loop: tests pass, no errors, feature works end-to-end. | Before marking any work as done. |
| `/cc` | Opens the command center. Interactive menu for everything else. | When you are not sure what command to use. |

**Beginner workflow:**
```
/init                    # Set up your project
/plan                    # Plan your feature
# ... build it ...
/verify                  # Confirm everything works
```

That is it. Four commands. You are now using CC Commander effectively.

---

### Intermediate: Modes, CCC Domains, Prompts, Hooks

Once you are comfortable with the basics, unlock these capabilities:

#### Workflow Modes

Switch your entire workflow persona with one command:

```
/cc mode design          # Visual-first: design/animation skills, critique loop
/cc mode saas            # Full SaaS lifecycle: auth, billing, DB, deploy
/cc mode marketing       # Content + CRO: SEO, copy, conversion
/cc mode research        # Deep research: citations, confidence, sources
/cc mode night           # Autonomous overnight: checkpoints, recovery
/cc mode yolo            # Max speed: skip confirmations, auto-approve
```

#### CCC Domains

Load ONE CCC domain to get an entire domain. Each CCC domain bundles 8-46 specialist skills behind a single router:

```
# Load a CCC domain by name
"use ccc-design skill"
"use ccc-saas skill"
"use ccc-devops skill"
```

The router inside each CCC domain dispatches your request to the right specialist automatically.

#### Prompt Templates

36+ battle-tested prompts across 6 categories. Access them with:

```
/cc prompts              # Browse the prompt library
/cc prompts coding       # Filter by category
```

#### Kit-Native Hooks (Automatic)

13 hooks run automatically during your sessions:
- **context-guard** — warns when context window is getting full
- **auto-checkpoint** — creates git checkpoints at safe points
- **cost-alert** — alerts when session cost exceeds thresholds
- **confidence-gate** — checks confidence before major operations
- **session-coach** — periodic coaching nudges for better workflow

No setup needed. Hooks activate automatically after install.

---

### Advanced: Task-Commander, Multi-Agent, Night Mode, Custom Plugins

#### Task-Commander

For large features spanning multiple files and multiple steps:

```
/task-commander
```

This breaks your feature into subtasks, dispatches parallel subagents, tracks progress, and assembles the result. Use it for anything that takes more than one session.

#### Multi-Agent Workflows

```
/orchestrate             # Multi-agent pipeline
/devfleet                # Dispatch fleet of dev agents
/code-review             # Multi-perspective code review
```

The `/orchestrate` command creates a pipeline where specialized agents handle different parts of the work in parallel.

#### Night Mode

For autonomous overnight work (migrations, large refactors, batch processing):

```
/cc mode night
```

Night mode enables:
- Automatic git checkpoints every N minutes
- Error recovery with rollback
- Progress logging to a file
- Cost monitoring with kill threshold

#### Custom Plugins

Create your own skills:

```
/skill-create            # Interactive skill creator wizard
```

Skills are just markdown files in `~/.claude/skills/your-skill/SKILL.md` with YAML frontmatter. CC Commander includes templates for creating new skills.

---

## What Can You Help With?

| Category | Skills/Commands | Example Use Case |
|----------|----------------|-----------------|
| **Project Setup** | `/init`, `ccc-saas`, `saas-scaffolder` | Start a new Next.js SaaS from scratch |
| **Frontend/UI** | `ccc-design`, `frontend-design`, `shadcn-ui` | Build a landing page with animations |
| **Backend/API** | `ccc-saas`, `api-design`, `backend-patterns` | Design a REST API with auth and billing |
| **Mobile** | `ccc-mobile`, `react-native`, `flutter` | Build a cross-platform mobile app |
| **Testing** | `ccc-testing`, `/tdd`, `/e2e`, `/verify` | Set up TDD workflow with full coverage |
| **DevOps** | `ccc-devops`, `docker-development`, `aws-*` | Configure CI/CD pipeline with Docker |
| **SEO/Marketing** | `ccc-seo`, `ccc-marketing`, `aaio` | Optimize site for search engines and AI |
| **Security** | `ccc-security`, `pentest-checklist`, `harden` | Run a security audit on your app |
| **Data/Analytics** | `ccc-data`, `database-designer`, `analytics-*` | Design a data pipeline with dashboards |
| **Research** | `ccc-research`, `/cc mode research` | Competitive analysis with citations |
| **Code Quality** | `/code-review`, `coding-standards`, `refactor-clean` | Review and clean up existing code |
| **Debugging** | `systematic-debugging`, `/build-fix` | Track down and fix a complex bug |

---

## Quick Commands Reference (Top 10)

| # | Command | Purpose |
|---|---------|---------|
| 1 | `/init` | Initialize project with CLAUDE.md and stack detection |
| 2 | `/plan` | Create implementation plan before coding |
| 3 | `/verify` | Run verification loop before marking done |
| 4 | `/cc` | Open command center (interactive menu) |
| 5 | `/cc mode <name>` | Switch workflow mode (design, saas, marketing, etc.) |
| 6 | `/tdd` | Start test-driven development workflow |
| 7 | `/code-review` | Multi-perspective code review |
| 8 | `/checkpoint` | Create a git safety checkpoint |
| 9 | `/build-fix` | Auto-resolve build errors |
| 10 | `/compact` | Compress context window (keeps key info) |

---

## Walkthrough Scenarios

### Scenario 1: Build a Landing Page

**Goal:** Create a high-converting landing page with animations.

```
Step 1: /init
   → Select "landing page" when asked about build type
   → Bible auto-configures design mode

Step 2: /cc mode design
   → Activates design-first workflow

Step 3: "use ccc-design skill"
   → Loads 35+ design skills behind the router

Step 4: "Build a landing page for a SaaS product called Acme.
         Hero section with gradient animation, features grid,
         pricing table, and CTA with hover effects."
   → ccc-design routes to landing-page-builder + animate + colorize

Step 5: /verify
   → Checks: responsive, accessible, fast, no console errors

Step 6: "use critique skill on the landing page"
   → Gets design feedback, then apply polish
```

**Time:** 30-60 minutes for a polished, animated landing page.

---

### Scenario 2: Debug a Production Bug

**Goal:** Find and fix a bug reported by a user.

```
Step 1: "use systematic-debugging skill"
   → Structured debugging: reproduce, isolate, hypothesize, verify

Step 2: Describe the bug with reproduction steps
   → Agent narrows down the root cause

Step 3: /tdd
   → Write a failing test that reproduces the bug FIRST

Step 4: Fix the implementation
   → Test should now pass

Step 5: /verify
   → Full verification: tests pass, no regressions, no console errors

Step 6: /checkpoint
   → Git commit with conventional commit message (fix: ...)
```

**Time:** 15-45 minutes depending on bug complexity.

---

### Scenario 3: Set Up CI/CD Pipeline

**Goal:** Configure GitHub Actions with Docker, tests, and deployment.

```
Step 1: "use ccc-devops skill"
   → Loads 20 DevOps skills behind the router

Step 2: "Set up a CI/CD pipeline with GitHub Actions.
         Run tests on PR, build Docker image on merge to main,
         deploy to AWS ECS."
   → Routes to github-actions-reusable-workflows + docker-development + setup-deploy

Step 3: "Add container security scanning"
   → Routes to container-security

Step 4: "Add monitoring and alerting"
   → Routes to prometheus-configuration + grafana-dashboards

Step 5: /verify
   → Validates: workflow syntax, Dockerfile best practices, security scan config

Step 6: /checkpoint
   → Git commit (ci: add GitHub Actions pipeline with Docker + AWS ECS deploy)
```

**Time:** 1-2 hours for a production-grade pipeline.

---

## Show Me More

| Resource | What it covers | When to read |
|----------|---------------|-------------|
| [BIBLE.md](../../BIBLE.md) | The full learning guide — 7 chapters from project setup to autonomous work | Once, when you want to deeply understand the system |
| [CHEATSHEET.md](../../CHEATSHEET.md) | Daily reference — commands, skill selection tables, power combos | Every day, for quick lookups |
| [SKILLS-INDEX.md](../../SKILLS-INDEX.md) | Searchable directory of all 280+ skills by keyword and category | When you need to find a specific skill |
| [guides/quickstart-beginner.md](../../guides/quickstart-beginner.md) | Complete beginner guide — installation to first project | If you have never used Claude Code before |
| [guides/quickstart-frontend.md](../../guides/quickstart-frontend.md) | Frontend developer guide — design mode, React/Vue/Svelte/Next.js | If you primarily build frontends |
| [guides/quickstart-backend.md](../../guides/quickstart-backend.md) | Backend developer guide — SaaS mode, APIs, databases | If you primarily build backends |
| [guides/quickstart-fullstack.md](../../guides/quickstart-fullstack.md) | Full-stack guide — mode switching, combined CCC domains | If you build both frontend and backend |
| [guides/quickstart-mobile.md](../../guides/quickstart-mobile.md) | Mobile developer guide — React Native, Flutter, SwiftUI | If you build mobile apps |

---

## Tips for Getting the Most Out of CC Commander

1. **Start with `/init`** — it detects your stack and configures everything automatically
2. **Use modes** — they change Claude's entire behavior to match your workflow
3. **Load CCC domains, not individual skills** — the router picks the right specialist
4. **Use `/plan` before building** — plans prevent wasted tokens and wrong-direction work
5. **Always `/verify` before done** — catches errors before they reach production
6. **Use `/compact` when context gets long** — keeps quality high by freeing context space
7. **Run `/cc` when stuck** — the command center shows every available action
8. **Try prompt templates** — `/cc prompts` gives you battle-tested starting points
9. **Use subagents for parallel work** — `/orchestrate` dispatches independent tasks simultaneously
10. **Read BIBLE.md once, use CHEATSHEET.md daily** — learning guide vs quick reference
