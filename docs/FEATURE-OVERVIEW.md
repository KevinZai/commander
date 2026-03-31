# CC Commander v1.6.0 — Complete Feature Overview

> CC Commander — 280+ skills. One command. Your AI work, managed by AI. 280+ skills, 10 CCC domains, 88+ commands, 37 hooks (18 kit-native + 19 ECC), 36+ prompt templates, 9 workflow modes, 4 themes, 3 starter templates, real-time agent dashboard, modular installer. One install.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## What Is CC Commander?

CC Commander is a batteries-included configuration toolkit for [Claude Code](https://claude.ai/code), Anthropic's official CLI for AI-assisted development. It transforms a stock Claude Code installation into a structured, skill-aware, hook-driven development environment with over 280 curated skills, 87 slash commands, 35 lifecycle hooks, and a methodology (The Kevin Z Method) that codifies best practices from 200+ community sources.

The kit is designed for developers who want Claude Code to work like a senior engineering partner rather than an autocomplete engine. It provides opinionated workflows for planning, building, testing, shipping, and reviewing code -- along with specialized skill packs for frontend, backend, DevOps, security, data, mobile, marketing, SEO, and more. Whether you are building a quick prototype or a full SaaS product, the kit routes you to the right tools and enforces verification before marking work done.

Installation takes under a minute. The interactive installer sets up skills, commands, hooks, and a CLAUDE.md configuration file in `~/.claude/`. Everything is modular: you can use the full kit, load individual CCC domains on demand, or cherry-pick specific commands and hooks. The kit works with Claude Code in the terminal, VS Code, Cursor, and JetBrains IDEs.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Installation

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```

### Local Install

```bash
git clone https://github.com/KevinZai/cc-commander.git
cd cc-commander
./install.sh
```

### Requirements

- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Node.js v18+ (v24 recommended)
- macOS, Linux, or WSL

### Installer Options

| Flag | Description |
|------|-------------|
| `./install.sh` | Interactive install with matrix rain ASCII art and progress visualization |
| `./install.sh --dry-run` | Preview what would be installed without making changes |
| `./install.sh --verify` | Validate an existing installation |
| `./install.sh --force` | Skip confirmation prompts |
| `./uninstall.sh` | Clean removal with backup detection and restore support |

### What Gets Installed

- `~/.claude/skills/` -- 280+ skill directories (each containing a SKILL.md)
- `~/.claude/commands/` -- 88+ slash command definitions (.md files)
- `~/.claude/hooks/` -- 18 kit-native hook scripts (JS) + hooks.json configuration
- `~/.claude/CLAUDE.md` -- Global context file with methodology and rules
- `~/.claude/SKILLS-INDEX.md` -- Searchable skill directory
- `~/.claude/CHEATSHEET.md` -- Daily reference card
- `lib/` -- Terminal art, status line, config reader utilities
- `compatibility/` -- VS Code snippets, Cursor rules, iTerm2 color theme

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Feature Categories

### 1. Skills (280+)

Skills are structured instruction sets that Claude Code loads on demand. Each skill lives in its own directory under `~/.claude/skills/` and contains a `SKILL.md` file with triggers, methodology, and domain knowledge. Load any skill by saying: _"use the `skill-name` skill"_.

#### CCC Domains (10)

Mega-skills are routers: load one and it dispatches to the right specialist sub-skill automatically. Each covers an entire domain.

| CCC Domain | Sub-Skills | What It Covers |
|------------|-----------|----------------|
| `ccc-seo` | 19 | Technical SEO, AI search optimization (AAIO), content strategy, analytics, programmatic SEO, search console |
| `ccc-design` | 35+ | Animations, SVG, motion design, visual effects, design systems, landing pages, Impeccable polish suite (18 sub-skills) |
| `ccc-testing` | 15 | TDD workflow, E2E (Playwright), visual testing, load testing, QA, regression, verification loops |
| `ccc-marketing` | 46 | Content marketing, CRO, growth channels, sales enablement, ad creative, email, analytics, intelligence |
| `ccc-saas` | 20 | Auth (Better Auth), billing (Stripe), database (Drizzle+Neon), API design, frontend stack (Next.js+shadcn+Tailwind), metrics |
| `ccc-devops` | 20 | CI/CD (GitHub Actions), Docker, AWS (Lambda, S3, CloudFront, IAM), monitoring (Prometheus, Grafana), Terraform, zero-downtime deploy |
| `ccc-research` | 8 | Deep research, literature review, competitive analysis, citation management, data synthesis, source validation |
| `ccc-mobile` | 7 | iOS/Swift, Android/Kotlin, React Native, Flutter, cross-platform patterns, app store optimization |
| `ccc-security` | 9 | OWASP Top 10, supply chain security, secrets management, threat modeling, security headers, auth hardening, API security, incident response, compliance (SOC 2, ISO 27001, HIPAA) |
| `ccc-data` | 8 | ETL pipelines, data warehousing (star schema, SCD), analytics engineering (dbt), visualization, ML ops, data quality, streaming (Kafka), governance |

#### Individual Skills by Category

**Core Workflow (Planning, Execution, Verification)**

| Skill | Description |
|-------|-------------|
| `spec-interviewer` | Interview user, produce spec doc, execute in fresh session |
| `evals-before-specs` | Define success criteria before writing specs |
| `writing-plans` / `executing-plans` | Structured planning and execution with review checkpoints |
| `delegation-templates` | 7 subagent types (Implementer, Researcher, Reviewer, Batch, Explorer, Creative, Session) with report formats |
| `dialectic-review` | Multi-agent FOR/AGAINST/Referee pattern for important decisions |
| `confidence-check` | Pre-execution confidence assessment (0-100%) across 4 dimensions |
| `four-question-validation` | Post-implementation hallucination detection (94% accuracy) |
| `verification-loop` / `verification-before-completion` | Proof-of-work verification before marking done |
| `tdd-workflow` | Test-driven development: red/green/refactor cycle |
| `systematic-debugging` / `investigate` | 4-phase root cause analysis |
| `operationalize-fixes` | Post-bug-fix protocol: test, sweep, update instructions, root cause chain |
| `overnight-runner` | Autonomous batch jobs with checkpoint files, usage limit retries, human gates |
| `context-budget` | Visual context window budget analyzer with gauge and zone indicators |
| `corrective-framing` | Prompt engineering: present claims to trigger correction |
| `strategic-compact` | Manual context compaction at logical intervals |
| `project-kickoff` | Initialize project with CLAUDE.md, tasks/, settings.json, git worktree |
| `freeze` / `unfreeze` | Restrict/restore file edit boundaries for the session |

**Ship and Review**

| Skill | Description |
|-------|-------------|
| `ship` | Build, test, PR, deploy pipeline |
| `review` / `codex` | Code review with structured feedback / adversarial second-opinion |
| `design-review` | Visual design audit |
| `plan-eng-review` / `plan-ceo-review` / `plan-design-review` | Engineering, strategy, and design plan reviews |
| `retro` | Post-ship retrospective and lessons extraction |
| `document-release` | Post-ship doc update (README, ARCH, CONTRIBUTING, CLAUDE.md) |
| `qa` / `qa-only` | QA web app and fix bugs atomically / report-only QA with health score |
| `gstack` | Full dev lifecycle with browser QA and workflow stages |

**Backend and Database**

| Skill | Description |
|-------|-------------|
| `api-design` | REST API patterns, status codes, pagination |
| `backend-patterns` / `senior-backend` | Node.js/Express/Next.js backend architecture, microservices, auth |
| `database-designer` / `database-migrations` | Full database design, schema changes, rollbacks |
| `postgres-patterns` / `redis-patterns` / `clickhouse-io` | Database-specific optimization and patterns |
| `drizzle-neon` | Drizzle ORM + Neon Postgres: schema, migrations, queries, serverless |
| `fastify-api` | Fastify patterns: routes, hooks, WebSocket, testing, MCP server |
| `mcp-server-patterns` | Build MCP servers with Node/TypeScript SDK |
| `stripe-subscriptions` | Stripe lifecycle, webhooks, checkout |

**Frontend (React / Next.js)**

| Skill | Description |
|-------|-------------|
| `frontend-patterns` | React, Next.js, state management, performance |
| `nextjs-app-router` | Next.js 15+ App Router: RSC, server actions, streaming, caching |
| `shadcn-ui` | shadcn/ui component patterns: forms, data tables, theming, charts |
| `tailwind-v4` | Tailwind CSS v4: CSS-based config, container queries, migration |
| `landing-page-builder` | High-converting landing pages (Next.js) |
| `frontend-design` | Anti-slop design system (Anthropic official) |
| `coding-standards` / `plankton-code-quality` | Code quality enforcement |

**Laravel and Vue.js**

| Skill | Description |
|-------|-------------|
| `laravel-patterns` / `laravel-tdd` / `laravel-verification` | Routing, Eloquent, testing, linting, static analysis |
| `vue-nuxt` | Vue 3 Composition API, Nuxt 4, Pinia, TypeScript |
| `mywifi-platform` / `wifi-captive-portal` | WiFi management and captive portal patterns |

**Auth and Security**

| Skill | Description |
|-------|-------------|
| `better-auth` | Better Auth: OAuth, sessions, multi-tenant, plugins |
| `container-security` / `github-actions-security` | Docker and CI/CD hardening |
| `pci-compliance` / `gdpr-data-handling` | Payment and data privacy compliance |
| `pentest-checklist` | Penetration test planning and checklists |
| `accessibility-compliance` | WCAG, inclusive design, assistive tech |

**Design Polish (Impeccable Suite -- 18 skills)**

| Skill | Description |
|-------|-------------|
| `audit` | Full interface quality audit |
| `critique` | Evaluate design effectiveness |
| `polish` | Final quality pass before shipping |
| `animate` | Purposeful animations and micro-interactions |
| `bolder` / `quieter` | Amplify or tone down design intensity |
| `colorize` / `typeset` | Strategic color and typography |
| `arrange` / `adapt` | Layout, spacing, responsive design |
| `clarify` | UX copy, error messages, microcopy |
| `distill` | Strip to essence, remove complexity |
| `delight` | Joy, personality, memorable touches |
| `extract` | Extract reusable components and tokens |
| `harden` | Error handling, i18n, text overflow |
| `normalize` | Match design system consistency |
| `onboard` | Onboarding flows and empty states |
| `optimize` | Loading speed, rendering, bundle size |
| `overdrive` | Shaders, 60fps, spring physics, scroll-driven |

**Visual Effects (12 skills)**

| Skill | Description |
|-------|-------------|
| `svg-animation` | Animated SVGs: GSAP, Lottie, morphing |
| `motion-design` | Framer Motion, CSS keyframes, parallax |
| `interactive-visuals` | Cursor trails, hover distortions, physics |
| `particle-systems` | Canvas/WebGL: confetti, fire, snow, aurora |
| `generative-backgrounds` | Noise gradients, voronoi, cellular automata |
| `retro-pixel` | CRT scanlines, 8-bit, VHS glitch, ASCII |
| `webgl-shader` | Three.js + custom GLSL shaders |
| `canvas-design` | Visual art in PNG/PDF |
| `remotion` / `remotion-best-practices` | Video generation with Remotion (30 rule files) |
| `video-gallery` | Video gallery/player (YouTube, Vimeo, self-hosted) |
| `slack-gif-creator` | Animated GIFs optimized for Slack |

**SEO and Content**

| Skill | Description |
|-------|-------------|
| `aaio` | Agentic AI Optimization -- robots.txt AI policy, JSON-LD, markdown twins |
| `ai-seo` | Optimize for AI search engines and LLM citations |
| `seo-optimizer` | Technical SEO: meta, OG, JSON-LD, sitemaps |
| `site-architecture` | Page hierarchy, navigation, URL structure |
| `content-strategy` | Content planning and editorial calendar |
| `bulk-page-generator` | Programmatic SEO pages at scale |
| `search-console` | Google Search Console data analysis |
| `guest-blogger` | Guest blog strategy and pitch templates |

**Email and Messaging**

| Skill | Description |
|-------|-------------|
| `email-systems` / `sendgrid-automation` | Email deliverability and SendGrid integration |
| `cold-email` | B2B cold outreach sequences |
| `whatsapp-automation` / `whatsapp-cloud-api` | WhatsApp Business and Cloud API |
| `twilio-communications` | SMS, voice, WhatsApp via Twilio |
| `intercom-automation` | Intercom conversations, contacts, segments |

**Business and Growth (20 skills)**

| Skill | Description |
|-------|-------------|
| `saas-metrics-coach` | ARR, MRR, churn, LTV, CAC analysis |
| `monetization-strategy` | 3-5 monetization strategies with validation |
| `experiment-designer` / `ab-test-setup` | Product experiments and A/B testing |
| `billing-automation` / `churn-prevention` | Recurring payments, dunning, cancellation flows |
| `signup-flow-cro` / `form-cro` / `paywall-upgrade-cro` | Conversion rate optimization |
| `referral-program` / `free-tool-strategy` | Viral growth and engineering-as-marketing |
| `analytics-conversion` / `analytics-product` | GA4, PostHog funnels, cohorts, retention |

**Skill Packs (Multi-Skill Bundles)**

| Pack | Skills | Coverage |
|------|--------|----------|
| `c-level-pack` | 28 | 10 C-level executive roles |
| `product-pack` | 20 | Product management lifecycle |
| `marketing-pack` | 42 | 7 marketing pods |
| `business-pack` | -- | Business strategy |
| `engineering-pack` | -- | Engineering leadership |
| `finance-pack` | -- | Financial analysis and planning |

**Multi-Agent and Peers**

| Skill | Description |
|-------|-------------|
| `claude-peers-bible` | Claude Peers guide with 5 coordination patterns (coordinator, swarm, expert, review, research) |
| `spawn-manager` | Spawn and manage multiple Claude Code peers with Quick/Team/Swarm/Expert patterns |
| `task-commander` | Multi-agent orchestration brain: P0-P10 scoping, 6 DAG workflows, circuit breaker, cost ceiling |
| `contextual-assist` | Proactive suggestion system with 5 configurable levels |

**Integrations**

| Skill | Description |
|-------|-------------|
| `cowork-bible` / `cowork-plugin-builder` | Claude Desktop Cowork integration and plugin creation |
| `dispatch-bible` / `dispatch-templates` | Background task system with 8 pre-built templates |
| `openclaw-bridge` / `openclaw-patterns` | OpenClaw platform integration |
| `paperclip-bridge` | Paperclip task management with bidirectional sync |
| `agency-orchestrator` | Multi-agent orchestration patterns |

**Observability and QA**

| Skill | Description |
|-------|-------------|
| `benchmark` | Performance regression detection with Core Web Vitals baselines |
| `canary` | Post-deploy canary monitoring for errors and regressions |
| `browse` | Headless browser for QA, dogfooding, annotated screenshots |
| `cache-monitor` | Claude Code session cost and cache efficiency analysis |

**Python**

| Skill | Description |
|-------|-------------|
| `python-patterns` | Pythonic idioms, PEP 8, type hints |
| `python-testing` | Pytest, TDD, fixtures, mocking |

**DevOps and Cloud**

| Skill | Description |
|-------|-------------|
| `docker-development` / `senior-devops` | Dockerfile optimization, CI/CD, IaC |
| `github-actions-reusable-workflows` / `github-actions-security` | Reusable workflows, secrets, OIDC |
| `aws-solution-architect` / `aws-lambda-best-practices` / `aws-s3-patterns` / `aws-cloudfront-optimization` / `aws-iam-security` | AWS services |
| `prometheus-configuration` / `promql-alerting` / `grafana-dashboards` | Monitoring stack |
| `network-engineer` | Cloud networking and security architectures |
| `turborepo-monorepo` | Turborepo monorepo: pipeline, caching, shared packages |

**Documents and Media**

| Skill | Description |
|-------|-------------|
| `pptx` | PowerPoint file handling |
| `pdf-official` | PDF: extract, create, merge, split |
| `doc-coauthoring` | Structured documentation co-authoring |

**Miscellaneous**

| Skill | Description |
|-------|-------------|
| `web-scraper` / `firecrawl-scraper` | Multi-strategy and API-based web scraping |
| `i18n-localization` | Detect hardcoded strings, manage translations |
| `trading-analysis` | Trading analysis patterns |
| `bible-guide` | Interactive onboarding for beginners |
| `vscode-bible` | VS Code integration guide with buttons, snippets, shortcuts |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 2. Commands (87)

Commands are slash commands invoked directly in the Claude Code REPL. They live as `.md` files in `~/.claude/commands/` and execute predefined workflows.

#### Command Center

| Command | Description |
|---------|-------------|
| `/cc` | Interactive command center -- main menu for all kit features |
| `/cc skills` | Browse 280+ skills by category |
| `/cc mega [name]` | Drill into a CCC domain's sub-skills |
| `/cc settings` | View current model, permissions, MCP, hooks |
| `/cc grill` | 7 Socratic questions to stress-test your plan |
| `/cc confidence` | Pre-execution confidence assessment (0-100%) |
| `/cc mode <name>` | Switch workflow mode (9 modes) |
| `/cc prompts` | Browse 36+ prompt templates by category |
| `/cc status` | Kit health dashboard |
| `/cc help` | Compact reference |

#### Planning and Execution

| Command | Description |
|---------|-------------|
| `/plan` | Spec-first planning: interview, spec doc, fresh session execute |
| `/orchestrate` | Multi-agent pipeline for complex work |
| `/multi-plan` | Plan across multiple workspaces |
| `/multi-execute` | Execute plan across multiple targets |
| `/multi-frontend` / `/multi-backend` | Frontend/backend multi-target commands |
| `/multi-workflow` | Multi-stage workflow orchestration |

#### Code Quality

| Command | Description |
|---------|-------------|
| `/code-review` | Multi-agent code review (runs 3 reviewers) |
| `/tdd` | Start test-driven workflow (write test, implement, refactor) |
| `/verify` | Run verification loop before claiming done |
| `/quality-gate` | Run quality checks (lint, type, test) |
| `/build-fix` | Auto-resolve build errors |
| `/audit` | Full interface or code quality audit |
| `/test-coverage` | Check test coverage |
| `/e2e` | Run Playwright E2E tests |
| `/refactor-clean` | Safe refactoring with test preservation |
| `/python-review` | Python-specific code review |

#### Code Understanding and Improvement

| Command | Description |
|---------|-------------|
| `/code:understand:explain` | Explain what code does |
| `/code:understand:document` | Generate documentation for code |
| `/code:understand:trace` | Trace execution flow |
| `/code:improve:debug` | Debug with structured approach |
| `/code:improve:clean` | Clean up code quality |
| `/code:improve:refactor` | Structured refactoring |
| `/code:improve:optimize` | Performance optimization |
| `/code:improve:security` | Security hardening |

#### Session and Context Management

| Command | Description |
|---------|-------------|
| `/save-session` | Persist context to `~/.claude/sessions/` |
| `/resume-session` | Reload last saved session |
| `/sessions` | List and manage saved sessions |
| `/aside` | Quick side-task without losing main context |
| `/context-budget` | Check context window usage |
| `/checkpoint` | Git checkpoint -- save state mid-work |
| `/complete` | Mark task complete with verification |

#### Learning and Patterns

| Command | Description |
|---------|-------------|
| `/learn` | Extract reusable patterns from current work |
| `/learn-eval` | Evaluate learned patterns |
| `/instinct-status` | View learned patterns inventory |
| `/instinct-export` / `/instinct-import` | Export/import learned instincts |
| `/rules-distill` | Distill rules from experience |
| `/evolve` | Evolve skill definitions based on usage |

#### Multi-Agent

| Command | Description |
|---------|-------------|
| `/spawn` | Spawn multiple Claude Code peers |
| `/peers` | Discover and communicate with other Claude Code instances |
| `/devfleet` | Fleet management for development agents |
| `/claw` | OpenClaw management commands |

#### SDD (Spec-Driven Development) -- 13 Commands

| Command | Description |
|---------|-------------|
| `/sdd:core:init-sdd` | Initialize SDD in project |
| `/sdd:core:spec` / `/sdd:core:spec-all` | Generate specs for components |
| `/sdd:core:design` | Design system architecture |
| `/sdd:core:plan` / `/sdd:core:build` | Plan and build from specs |
| `/sdd:core:test` / `/sdd:core:review` | Test and review against specs |
| `/sdd:core:refine` / `/sdd:core:validate` | Refine and validate implementation |
| `/sdd:core:status` / `/sdd:core:reset` | Status check and reset |
| `/sdd:orchestration:next` | Next step in SDD workflow |
| `/sdd:orchestration:parallel` | Parallel SDD execution |
| `/sdd:orchestration:prototype` | Quick prototype from spec |

#### Project Management

| Command | Description |
|---------|-------------|
| `/project:init` / `/project:setup` | Initialize and configure project |
| `/project:status` | Project health check |
| `/project:dependencies` | Dependency analysis |
| `/project:migrate` | Migration planning and execution |
| `/project:todo` / `/project:lessons` | Task and lessons management |
| `/projects` | List active projects |
| `/paperclip` | Manage tasks in Paperclip |
| `/pm2` | Manage PM2 processes |
| `/pr` | Create pull request |
| `/deploy` | Deploy to production |

#### Documentation

| Command | Description |
|---------|-------------|
| `/docs` | Generate/update documentation |
| `/update-docs` | Refresh all doc files |
| `/update-codemaps` | Refresh code maps |

#### Other

| Command | Description |
|---------|-------------|
| `/careful` | Enable maximum safety mode |
| `/eval` | Run evaluation harness |
| `/harness-audit` | Audit kit setup health |
| `/loop-start` / `/loop-status` | Start/check recurring tasks |
| `/model-route` | Route to optimal model for task |
| `/prompt-optimize` | Optimize prompt for better results |
| `/setup-pm` | Set up project management tooling |
| `/skill-create` / `/skill-health` | Create new skills / audit skill quality |
| `/tools:api` | API tools reference |
| `/promote` | Promote changes between environments |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 3. Hooks (37)

Hooks are JavaScript scripts that fire automatically at specific points in the Claude Code lifecycle. The kit ships 18 kit-native hooks; with ECC (Everything Claude Code) installed, 19 additional hooks bring the total to 37. Without ECC, kit-native hooks work standalone via `hooks-standalone.json`.

#### PreToolUse Hooks (fire before tool execution)

| Hook | Description | Disable |
|------|-------------|---------|
| `careful-guard.js` | Blocks destructive commands (rm -rf, DROP TABLE, force push) | `KZ_DISABLE_CAREFUL_GUARD=1` |
| `pre-commit-verify.js` | TypeScript check before git commit -- blocks on tsc errors | `KZ_DISABLE_PRE_COMMIT_VERIFY=1` |
| `confidence-gate.js` | Warns on multi-file bash operations (sed -i on globs, find -exec) | `KZ_DISABLE_CONFIDENCE_GATE=1` |

#### PostToolUse Hooks (fire after tool execution)

| Hook | Description | Disable |
|------|-------------|---------|
| `auto-notify.js` | Notifications on significant events (PR created, deploy) | `KZ_DISABLE_AUTO_NOTIFY=1` |
| `preuse-logger.js` | Logs tool usage for cost analysis | `KZ_DISABLE_PREUSE_LOGGER=1` |
| `context-guard.js` | Warns at ~70% context usage, auto-saves session | `KZ_DISABLE_CONTEXT_GUARD=1` |
| `auto-checkpoint.js` | Git-stash checkpoint every 10 file edits | `KZ_DISABLE_AUTO_CHECKPOINT=1` |
| `cost-alert.js` | Cost proxy alerts at ~$0.50 (30 calls) and ~$2.00 (60 calls) | `KZ_DISABLE_COST_ALERT=1` |
| `auto-lessons.js` | Captures errors and corrections to tasks/lessons.md | `KZ_DISABLE_AUTO_LESSONS=1` |
| `rate-predictor.js` | Predicts remaining session duration from tool call rate | `KZ_DISABLE_RATE_PREDICTOR=1` |
| `self-verify.js` | Auto-verifies file changes against stated intent, catches drift | `KZ_DISABLE_SELF_VERIFY=1` |

#### Stop Hooks (fire when session ends)

| Hook | Description | Disable |
|------|-------------|---------|
| `status-checkin.js` | Session end status summary | `KZ_DISABLE_STATUS_CHECKIN=1` |
| `session-end-verify.js` | Verifies modified files, checks for leftover console.log | `KZ_DISABLE_SESSION_END_VERIFY=1` |
| `session-coach.js` | Periodic coaching nudges -- skill tips, checkpoint reminders (interval: `KZ_COACH_INTERVAL`) | `KZ_COACH_DISABLE=1` |

#### PreCompact Hooks (fire before context compaction)

| Hook | Description | Disable |
|------|-------------|---------|
| `pre-compact.js` | Saves session state and critical context before compaction | `KZ_DISABLE_PRE_COMPACT=1` |

#### Platform Integration Hook

| Hook | Description | Disable |
|------|-------------|---------|
| `openclaw-adapter.js` | Translates CC Commander hook events to OpenClaw webhook format | `KZ_DISABLE_OPENCLAW_ADAPTER=1` |

#### ECC Hooks (19 additional)

When Everything Claude Code (ECC) is installed, 19 additional hooks activate across the same lifecycle stages: block `--no-verify`, tmux reminders, git push review, doc file warnings, continuous learning observer, config protection, PR logging, build analysis, quality gate, auto-format, typecheck, console.log detection, session persistence, pattern evaluation, cost tracking, and sound notification.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 4. Prompt Templates (41)

Battle-tested prompt templates for common development scenarios. Located in `prompts/` and accessible via `/cc prompts`.

#### Coding (10 templates)

| Template | Purpose |
|----------|---------|
| `api-design.md` | API endpoint design with contracts and error handling |
| `code-review.md` | Structured code review prompt |
| `debug-systematic.md` | Systematic debugging with root cause analysis |
| `documentation.md` | Code documentation generation |
| `optimize-performance.md` | Performance audit and optimization |
| `refactor-safe.md` | Safe refactoring with test preservation |
| `schema-design.md` | Database schema design |
| `security-audit.md` | Security vulnerability assessment |
| `test-generation.md` | Test suite generation |
| `typescript-strict.md` | TypeScript strict mode enforcement |

#### Planning (5 templates)

| Template | Purpose |
|----------|---------|
| `architecture-decision.md` | Architecture decision records |
| `feature-plan.md` | Feature implementation plan |
| `migration-plan.md` | Migration strategy and execution |
| `spec-interview.md` | Spec interview guide |
| `tech-debt-assessment.md` | Technical debt audit |

#### Design (5 templates)

| Template | Purpose |
|----------|---------|
| `animation-polish.md` | Animation and micro-interaction brief |
| `component-design.md` | Component design specification |
| `design-system.md` | Design system setup |
| `landing-page.md` | Landing page design and copy |
| `responsive-audit.md` | Responsive design audit |

#### Marketing (5 templates)

| Template | Purpose |
|----------|---------|
| `ad-copy.md` | Ad headline and creative generation |
| `competitor-analysis.md` | Competitor teardown and positioning |
| `email-campaign.md` | Email sequence design |
| `seo-content.md` | SEO content brief |
| `social-media.md` | Social media calendar and copy |

#### DevOps (5 templates)

| Template | Purpose |
|----------|---------|
| `ci-cd-pipeline.md` | CI/CD pipeline design |
| `deploy-strategy.md` | Deployment strategy planning |
| `docker-setup.md` | Docker configuration and optimization |
| `incident-response.md` | Incident response playbook |
| `monitoring-setup.md` | Monitoring and alerting configuration |

#### Meta (6 templates)

| Template | Purpose |
|----------|---------|
| `cost-optimize.md` | Session cost optimization |
| `mode-switch.md` | Workflow mode switching |
| `overnight-runner.md` | Overnight autonomous job configuration |
| `parallel-research.md` | Multi-agent parallel research |
| `session-handoff.md` | Session handoff between contexts |
| `task-commander.md` | Task Commander multi-agent session |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 5. Workflow Modes (9)

Switch your entire development persona with one command. Each mode adjusts behavior, verbosity, risk tolerance, and auto-loaded skills. Switch with `/cc mode <name>`.

| Mode | Behavior | Best For |
|------|----------|----------|
| `normal` | Balanced defaults -- plan-first, verify-before-done | Most development work |
| `design` | Visual-first -- loads design/animation skills, critique loop, Impeccable suite | Building UIs, landing pages, design systems |
| `saas` | Full SaaS lifecycle -- auth, billing, DB, deploy pipeline | Building a SaaS product from scratch |
| `marketing` | Content + CRO focus -- SEO, copy, conversion optimization | Marketing campaigns, content creation |
| `research` | Deep research -- citations, confidence levels, source verification | Competitive analysis, technical research |
| `writing` | Long-form content -- structured drafts, editing, style | Blog posts, documentation, reports |
| `night` | Autonomous overnight -- checkpoints, error recovery, notifications | Batch jobs, migrations, long-running tasks |
| `yolo` | Maximum speed -- skip confirmations, auto-approve, ship fast | Quick prototypes, demos, hackathons |
| `unhinged` | No guardrails -- experimental, creative, push boundaries | Experiments, creative exploration |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 6. Dashboard

A real-time React + Vite dashboard for monitoring agent activity, costs, and context usage. Located in `dashboard/` with the KZ Matrix visual theme.

| Feature | Description |
|---------|-------------|
| Agent Monitoring | Live view of active Claude Code instances and their status |
| Spawn Tree | Visual tree of spawned subagents and their parent relationships |
| Cost Tracker | Running session cost with alerts at $0.50 and $2.00 thresholds |
| Context Gauge | Visual context window usage with color-coded zones (green/yellow/orange/red) |
| Live Log Stream | Real-time tool call and event log |
| Task Progress | Active task tracking with completion status |

No database required -- reads from Claude Code session files and hook output directly.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 7. Integrations

#### Claude Peers

Multi-instance collaboration where multiple Claude Code sessions coordinate on the same machine. Five coordination patterns: coordinator (one lead, many workers), swarm (peer-to-peer), expert (specialist consultation), review (multi-reviewer), and research (parallel data gathering). Commands: `/spawn`, `/peers`.

#### Cowork (Claude Desktop)

Integration with Claude Desktop's autonomous session mode. Includes plugin compatibility, scheduled tasks, and handoff protocol between interactive and autonomous sessions. The `cowork-plugin-builder` skill provides 5 example plugins with packaging and testing guides.

#### Dispatch

Background task system for overnight builds, batch processing, and long-running operations. Includes 8 pre-built templates: overnight-build, batch-review, security-scan, perf-benchmark, dependency-update, content-generation, data-migration, and monitoring-setup.

#### OpenClaw

Bridge between CC Commander and OpenClaw's 38-agent orchestration platform. Provides skill mapping, hook translation, agent profile generation, and session handoff. The `openclaw-adapter.js` hook translates CC Commander hook events to OpenClaw webhook format.

#### Paperclip

Task management integration with Paperclip's REST API (port 3110). Issue creation, priority mapping, bidirectional sync, and agent assignment.

#### VS Code

Integration guide with buttons, 20+ code snippets (`compatibility/vscode-snippets.json`), keyboard shortcuts, walkthrough, and status bar customization. Also includes Cursor rules example (`compatibility/cursorrules-example.txt`).

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 8. Starter Templates (3)

Ready-to-use project scaffolds in `templates/`. Each template produces a complete, production-ready project structure.

| Template | Stack | What You Get |
|----------|-------|-------------|
| `nextjs-shadcn-starter.md` | Next.js 15 + shadcn/ui + Better Auth + Drizzle + Neon | Full SaaS scaffold: auth, dashboard, DB schema, middleware, API routes |
| `turborepo-fullstack-starter.md` | Turborepo + Next.js + Fastify + shared packages | Monorepo: web app, API server, shared DB/types/validators |
| `marketing-site-starter.md` | Next.js 15 + MDX + PostHog + Framer Motion | Marketing site: hero, pricing, blog, analytics, OG images |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


### 9. Quick Start Guides (5)

Developer-specific onboarding paths in `guides/`. Each guide provides a focused walkthrough tailored to a specific background.

| Guide | Audience |
|-------|----------|
| `quickstart-beginner.md` | Complete beginner -- never used Claude Code before |
| `quickstart-frontend.md` | Frontend developer -- React, Next.js, Tailwind workflows |
| `quickstart-backend.md` | Backend developer -- APIs, databases, auth patterns |
| `quickstart-fullstack.md` | Full-stack developer -- combined frontend + backend workflow |
| `quickstart-mobile.md` | Mobile developer -- React Native, Flutter, Swift, Kotlin |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## The Kevin Z Method (BIBLE.md)

The Kevin Z Method is a 7-chapter development methodology distilled from 200+ community articles and real-world usage. It is documented in `BIBLE.md` and structured as a practical learning guide.

### Golden Rules

1. **Plan before coding** -- `/plan` every multi-step task
2. **Context is milk** -- fresh + condensed = best output
3. **Verify, don't trust** -- always `/verify` before done
4. **Subagents = fresh context** -- parallel work, no context bloat
5. **CLAUDE.md = investment** -- your rules compound over time
6. **Boring solutions win** -- AI has a bias for complexity; push back
7. **Operationalize fixes** -- every bug becomes a test and a rule update

### Chapters

| Chapter | Title | Content |
|---------|-------|---------|
| 1 | Genesis | Starting a new project: `/init`, build type selection (Quick/Deep/SaaS/Overnight), CLAUDE.md setup |
| 2 | Foundations | Daily development loop: session management, context hygiene, when to compact |
| 3 | Construction | Building features: spec-first development, TDD, subagent patterns |
| 4 | Debugging | Fixing and debugging: systematic debugging, root cause analysis, operationalizing fixes |
| 5 | Deployment | Shipping and production: build, test, PR, deploy pipeline, post-deploy monitoring |
| 6 | Autonomy | Long-running and autonomous work: overnight runner, checkpoints, error recovery |

### Appendices

Build type checklists, CLAUDE.md templates, full skills catalog, commands reference, tools reference, prompt templates, 45 tips quick reference, power combos, workflow modes, prompt library, integrations, proactive automation suite, settings reference, model selection guide, and contributor credits.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Architecture

### Directory Structure

```
cc-commander/
├── skills/              # 280+ skill directories, each with SKILL.md
│   ├── mega-*/          # 10 CCC domain routers with sub-skill directories
│   ├── mode-switcher/   # 9 workflow mode definitions
│   └── */               # Individual skills
├── commands/            # 87 slash command definitions (.md files)
│   ├── cc.md            # /cc command center
│   ├── sdd/             # Spec-Driven Development commands (13)
│   ├── code/            # Code understanding + improvement commands (8)
│   ├── project/         # Project management commands (7)
│   ├── test/            # Testing commands
│   └── tools/           # Tool commands
├── prompts/             # 36+ prompt templates
│   ├── coding/          # 10 coding prompts
│   ├── planning/        # 5 planning prompts
│   ├── design/          # 5 design prompts
│   ├── marketing/       # 5 marketing prompts
│   ├── devops/          # 5 devops prompts
│   └── meta/            # 6 meta prompts + PROMPTS.md index
├── hooks/               # 18 kit-native hooks (JS) + configuration
│   ├── hooks.json       # Full hook config (kit + ECC = 37 hooks)
│   └── hooks-standalone.json  # Standalone config (kit-only = 18 hooks)
├── templates/           # 3 project starter templates
├── guides/              # 5 quickstart guides by developer type
├── dashboard/           # Real-time React + Vite monitoring dashboard
├── lib/                 # Shared utilities
│   ├── terminal-art.sh  # Bash terminal art (ASCII, matrix rain, progress)
│   ├── terminal-art.js  # JS terminal art for hooks
│   ├── statusline.sh    # KZ status line (context gauge, cost, tokens)
│   └── config-reader.js # Shared config utility for bible-config.json
├── compatibility/       # IDE integration files
│   ├── vscode-snippets.json     # 20+ VS Code snippets
│   ├── vscode-settings-example.json
│   ├── cursorrules-example.txt
│   └── kz-matrix.itermcolors    # iTerm2 KZ Matrix color theme
├── kevin/               # Kevin's personal overlay (not public-installed)
├── tests/               # Hook test harness (61 tests, Node.js test runner)
├── docs/                # GitHub Pages landing site
├── BIBLE.md             # The Kevin Z Method (7 chapters + appendices)
├── CHEATSHEET.md        # Daily reference card
├── SKILLS-INDEX.md      # Searchable skill directory
├── CHANGELOG.md         # Version history
├── CLAUDE.md.staff-template  # Staff CLAUDE.md template
├── install.sh           # Interactive installer
├── install-remote.sh    # One-line remote installer
└── uninstall.sh         # Clean removal
```

### How Skills Work

Each skill is a directory containing a `SKILL.md` file with YAML front matter (name, version, description, triggers) and markdown body (methodology, steps, examples). Skills are loaded on demand by saying "use the `skill-name` skill" in conversation. Mega-skills use a router pattern: one SKILL.md dispatches to the right sub-skill based on the user's request.

### How Hooks Work

Hooks are JavaScript files that receive tool call context via stdin (JSON) and return JSON responses. They fire at five lifecycle stages: `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, and `PreCompact`. Each hook can be individually disabled via environment variables (`KZ_DISABLE_<HOOK_NAME>=1`).

### How Commands Work

Commands are markdown files in `~/.claude/commands/`. Invoking `/command-name` in the Claude Code REPL loads the markdown as instructions. Nested commands use subdirectory paths (e.g., `/sdd:core:spec`).

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Configuration

### bible-config.json

Central configuration file with kit-wide settings. Supports environment variable overrides via `lib/config-reader.js`.

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `KZ_NO_COLOR` | Disable ANSI color output | `0` |
| `KZ_NO_ANIMATION` | Disable terminal animations | `0` |
| `KZ_COACH_DISABLE` | Disable session coach nudges | `0` |
| `KZ_COACH_INTERVAL` | Responses between coaching nudges | `10` |
| `KZ_DISABLE_*` | Disable individual hooks | `0` |

### settings.json Integration

The kit configures Claude Code's `settings.json` at both global (`~/.claude/settings.json`) and project (`.claude/settings.json`) levels. Settings control model selection, tool permissions (allow/deny patterns), MCP server configuration, and the KZ status line.

### KZ Status Line

A persistent footer displayed under every Claude Code response showing live session metrics:

```
-- KZ |████████████░░░░░░░░| 62% | Opus | $1.24 | in:89K out:14K | 23m | +142-37 | my-project
```

Elements: context gauge (color-coded zones), model, session cost, token counts, session duration, lines changed, rate limit usage, and project name. Configured via `statusLine` in `settings.json`. Script: `lib/statusline.sh`.

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Quick Start Bundles

Pre-configured skill combinations for common project types:

| Bundle | Skills to Load | Use Case |
|--------|---------------|----------|
| **Web Wizard** | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` + `drizzle-neon` | Full-stack web apps |
| **Security Engineer** | `pci-compliance` + `container-security` + `github-actions-security` + `pentest-checklist` | Security audits and hardening |
| **Content Creator** | `ccc-marketing` + `ccc-seo` + `blog-engine` | Content and SEO campaigns |
| **Full Stack SaaS** | `ccc-saas` + `ccc-devops` + `ccc-testing` | SaaS product from scratch |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Comparison

| Feature | CC Commander | Stock Claude Code | SuperClaude | Other Kits |
|---------|----------------|-------------------|-------------|------------|
| Skills | 280+ | 0 | ~20 | 10-50 |
| Commands | 87 | Built-in only | ~15 | 5-20 |
| Hooks | 35 | Manual only | 0 | 0-5 |
| Prompt Templates | 41 | 0 | 0 | 0-10 |
| Workflow Modes | 9 | 0 | 0 | 0 |
| CCC Domains (routers) | 10 | 0 | 0 | 0 |
| Starter Templates | 3 | 0 | 0 | 0-2 |
| Multi-Agent | Peers + Spawn + Task Commander | Subagents only | 0 | 0-1 |
| Dashboard | Real-time React app | 0 | 0 | 0 |
| Methodology | BIBLE.md (7 chapters) | Docs only | README | README |
| Installer | Interactive (matrix rain) | npm install | Manual | Manual/Script |
| IDE Support | VS Code, Cursor, JetBrains, Terminal | Terminal + VS Code | Terminal | Terminal |

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


## Getting Help

- **GitHub Repository:** [github.com/KevinZai/cc-commander](https://github.com/KevinZai/cc-commander)
- **Issues:** [github.com/KevinZai/cc-commander/issues](https://github.com/KevinZai/cc-commander/issues)
- **Landing Page:** [kevinzai.github.io/cc-commander](https://kevinzai.github.io/cc-commander)
- **In-Kit Help:** `/cc help` for compact reference, `bible-guide` skill for interactive onboarding
- **Daily Reference:** `CHEATSHEET.md` for commands, workflows, and power user tips
- **Skill Discovery:** `SKILLS-INDEX.md` for searchable skill directory
- **Learning Guide:** `BIBLE.md` for the full Kevin Z Method (read once)

---

## CC Commander — Interactive CLI Project Manager

| Feature | Description |
|---------|-------------|
| **Arrow-key menus** | Navigate with arrows or letter shortcuts |
| **4 themes** | Cyberpunk, Fire, Graffiti, Futuristic |
| **11 adventure flows** | Build, content, research, learn, stats, settings, YOLO |
| **Spec-driven builds** | 3 questions (guided) or 10 questions (YOLO Mode) |
| **Plugin orchestration** | Auto-detects gstack, CE, Superpowers — 8-step pipeline |
| **Knowledge compounding** | Learns from every session, injects past lessons |
| **YOLO Mode** | 10-question spec → autonomous Opus build ($10, 100 turns) |
| **YOLO Loop** | 3-10 cycles of build → review → improve → compound |
| **Session tracking** | Persistent history, cost, streaks, achievements |
| **Progressive disclosure** | Guided → Assisted (5 sessions) → Power (20 sessions) |
| **Project import** | Reads CLAUDE.md without modifying .claude/ |
| **Cowork plugin** | 4 skills for Claude Desktop |
| **101 tests** | 22 self-test + 61 hooks + 18 path tests |

---


*Built by Kevin Z. Incorporates best practices from 200+ community sources. See BIBLE.md Appendix B for full contributor credits.*
