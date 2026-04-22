# Skills Index — Quick Reference
> CC Commander v4.0.0-beta.8 — by Kevin Zicherman
> Search: `grep -i "keyword" SKILLS-INDEX.md`
> Last verified: 2026-04-22 | Desktop plugin first: 28 plugin skills (12 /ccc-* workflows + 14 ccc-* domain routers + 2 meta) + 15 specialist sub-agents + 8 lifecycle hooks (16 handlers) + 8 bundled MCP servers | 502+ total skills across vendor ecosystem | 11 CCC Domains | 28 kit-native hooks | 3 starter templates | 37 prompt templates | 10 workflow modes | Real-time dashboard | 10 themes | Free forever
> Audit: `./bin/generate-index.sh --check` to find missing or broken skills

> **Which document?** BIBLE.md = learning guide (read once). CHEATSHEET.md = daily reference (quick lookup). **SKILLS-INDEX.md = skill discovery (you are here).**

---

## Specialist Sub-Agents (15)

All 15 sub-agents are free. They fire automatically from skills — no manual invocation needed. Routed by `/ccc-build`, `/ccc-review`, `/ccc-plan`, `/ccc-design`, `/ccc-ship`, and `/ccc-fleet`.

| # | Sub-Agent | Model | Best For |
|---|-----------|-------|---------|
| 1 | `architect` | Opus | System design, tradeoff analysis, irreversibility assessment |
| 2 | `reviewer` | Sonnet | Code review across security / perf / correctness / maintainability |
| 3 | `builder` | Sonnet | Feature implementation, TDD, scaffolding |
| 4 | `security-auditor` | Opus | OWASP audits, threat modeling, adversarial review |
| 5 | `debugger` | Opus | Root-cause investigation (Iron Law: no fix without confirmed root cause) |
| 6 | `designer` | Sonnet | UI/UX critique, accessibility, visual hierarchy |
| 7 | `qa-engineer` | Sonnet | Edge-case hunting, test coverage audit |
| 8 | `devops-engineer` | Sonnet | Deploy planning, rollback specs, monitoring setup |
| 9 | `data-analyst` | Sonnet | Signal extraction, statistical honesty, visualization |
| 10 | `content-strategist` | Sonnet | Brand voice, messaging, copy variants |
| 11 | `product-manager` | Opus | User stories, acceptance criteria, priority sequencing |
| 12 | `performance-engineer` | Sonnet | Hotpath identification, p99 benchmarking |
| 13 | `researcher` | Sonnet | Deep research, competitive analysis, citation management |
| 14 | `technical-writer` | Sonnet | Documentation, API reference, clarity audits |
| 15 | `fleet-worker` | Sonnet | Parallel batch work, scoped execution in fleet mode |

---

## Desktop Plugin Skills (v4.0.0-beta.8)

> Installed at `commander/cowork-plugin/`. Prefix: plain `/ccc-*` (e.g. `/ccc-build`). Install: `/plugin marketplace add KevinZai/commander` then `/plugin install commander`. 28 plugin skills total (12 /ccc-* workflows + 14 ccc-* domain routers + 2 meta). **All free forever.**

| Skill | Description | Trigger Phrases |
|-------|-------------|----------------|
| `/ccc` | Main CCC hub — interactive menu, session overview | "open ccc", "ccc menu", "show commander" |
| `/ccc-start` | First-run onboarding — plan file, first win | "get started with ccc", "ccc start" |
| `/ccc-browse` | Searchable catalog of 502+ skills and 15 sub-agents | "browse skills", "ccc browse" |
| `/ccc-plan` | Spec-first planning — 5-question interview → spec file | "plan a feature", "ccc plan" |
| `/ccc-build` | Build wizard — web, API, CLI or mobile with spec | "ccc build", "start a build", "new project wizard" |
| `/ccc-review` | Branch audit — diff, security, perf, x-ray | "ccc review", "review my code", "code review" |
| `/ccc-ship` | Pre-flight checks + release + deploy (22-point gate) | "ccc ship", "ship this", "ready to deploy?" |
| `/ccc-design` | UI/UX workflow — routes to ccc-design domain (39 skills) | "ccc design", "design this" |
| `/ccc-learn` | Skill discovery across 11 CCC domains | "teach me", "ccc learn", "show domains" |
| `/ccc-xray` | Project health scorecard with fix chips | "audit my project", "ccc xray" |
| `/ccc-linear` | Linear board — view issues, pick, create, sync | "ccc linear", "show my issues", "linear board" |
| `/ccc-fleet` | Multi-agent orchestration — launch, route, monitor | "ccc fleet", "launch agents", "fleet status" |
| `/ccc-connect` | Opt-in MCP connector — Supabase, Vercel, Figma, etc. | "connect my tools", "ccc connect" |
| `/ccc-suggest` | Ambient intelligence — suggests best next skill (auto) | Auto-triggered at session start |
| `/ccc-cheatsheet` | Inline cheatsheet — all counts, commands, hook events | "show cheatsheet", "ccc cheatsheet" |

### Bundled MCP Servers (8)

All 8 are pre-configured in `.mcp.json`. Activate the ones you need — the plugin works fully offline without any of them.

| MCP | Transport | Skills That Use It |
|-----|-----------|--------------------|
| Tavily | stdio | `/ccc-browse`, research tasks |
| Context7 | stdio | Any skill needing live library docs |
| Firecrawl | HTTP | Web scraping in research workflows |
| Exa | stdio | Semantic web search |
| GitHub | HTTP | `/ccc-review`, `/ccc-ship` |
| Figma | HTTP | `/ccc-design` |
| Playwright | stdio | `/ccc-ship` E2E gate |
| claude-mem | stdio | Knowledge compounding across sessions |

---

## CCC Domains (Load ONE, Get Everything)

| CCC Domain | Skills | What It Covers |
|------------|--------|----------------|
| `ccc-seo` | 19 | Technical SEO, AI search optimization, content strategy, analytics, programmatic SEO |
| `ccc-design` | 35+ | Animations, SVG, motion, visual effects, design systems, landing pages, Impeccable polish suite |
| `ccc-testing` | 15 | TDD, E2E (Playwright), verification, QA, regression, visual testing, load testing |
| `ccc-marketing` | 46 | Content, CRO, channels, growth, intelligence, sales (renamed from marketing-pack) |
| `ccc-saas` | 20 | Auth, billing, database, API, frontend stack (Next.js+shadcn+Tailwind), metrics |
| `ccc-devops` | 20 | CI/CD, Docker, AWS, monitoring, zero-downtime deploy, Terraform |
| `ccc-research` | 8 | Deep research, literature review, competitive analysis, citation management, data synthesis |
| `ccc-mobile` | 7 | iOS, Android, React Native, Flutter, cross-platform patterns, app store optimization |
| `ccc-security` | 9 | Pen testing, OWASP top 10, supply chain security, secrets management, threat modeling |
| `ccc-data` | 8 | ETL pipelines, data warehousing, analytics engineering, visualization, ML ops |

Each CCC domain has a router that dispatches to the right specialist. Individual skills inside CCC domains are still accessible by their original names via symlinks.

---

## Token Optimization

| Skill | What it does | Category | Tier |
|-------|-------------|----------|------|
| `context-mode` | Tool output sandboxing via SQLite + FTS5. 98% context reduction. Stores tool results in sandbox, returns BM25 snippets. | optimization | recommended |
| `context-budget` | Visual context window budget analyzer — gauge, zone indicators, bloat sources, session-save nudges | optimization | recommended |
| `cache-monitor` | Analyze Claude Code session costs and cache efficiency from JSONL session files | optimization | recommended |
| `caveman` | Strips markdown/emojis/prose for ~75% output token savings during iteration | optimization | recommended |

---

## 🔧 Core Workflow (Planning, Execution, Verification)
| Skill | What it does |
|-------|-------------|
| `spec-interviewer` | Interview → spec doc → execute in fresh session |
| `evals-before-specs` | **NEW** Define success criteria BEFORE writing specs: evals → spec → plan → implement → verify |
| `writing-plans` | Structured planning before implementation |
| `executing-plans` | Execute written plans with review checkpoints |
| `delegation-templates` | **NEW** 7 structured subagent types (Implementer, Researcher, Reviewer, Batch, Explorer, Creative, Session) with report formats |
| `dialectic-review` | **NEW** Multi-agent FOR/AGAINST/Referee pattern for important decisions |
| `subagent-driven-development` | Multi-agent parallel execution patterns |
| `dispatching-parallel-agents` | 2+ independent tasks without shared state |
| `iterative-retrieval` | Progressive context retrieval for subagents |
| `systematic-debugging` | 4-phase root cause analysis before fixing |
| `investigate` | Systematic root cause investigation — never fix without cause |
| `operationalize-fixes` | **NEW** Post-bug-fix protocol: test → sweep → update instructions → root cause chain |
| `verification-before-completion` | Proof-of-work before marking done |
| `verification-loop` | Comprehensive verification system |
| `tdd-workflow` | Test-driven: red/green/refactor cycle |
| `using-git-worktrees` | Isolated branches for parallel work |
| `finishing-a-development-branch` | Integration decisions after implementation |
| `overnight-runner` | **NEW** Autonomous batch jobs: checkpoint files, usage limit retries, human gates, notifications |
| `strategic-compact` | Manual context compaction at logical intervals |
| `session-startup` | Session startup protocol |
| `using-superpowers` | How to find and use skills (meta-skill) |
| `corrective-framing` | **NEW** Prompt engineering: present possibly-wrong claims to trigger correction > "remember to X" |
| `confidence-check` | **NEW** Pre-execution confidence assessment (0-100%) — 4 dimensions, thresholds at 90/70, 25-250x token savings |
| `four-question-validation` | **NEW** Post-implementation hallucination check — tests passing? requirements met? no assumptions? evidence? (94% detection) |
| `context-budget` | **NEW** Visual context window budget analyzer — gauge, zone indicators, bloat sources, session-save nudges |
| `brainstorming` | Pre-creative-work ideation (use before creative work) |
| `playground` | HTML playgrounds for visual/interactive problems |
| `freeze` | Restrict file edits to a specific directory for the session |
| `unfreeze` | Clear freeze boundary, allowing edits to all directories again |
| `project-kickoff` | Initialize new project with CLAUDE.md, tasks/, .claude/settings.json, git worktree setup |
| `status-updates` | **NEW** Send progress reports to Slack/Discord/email at configurable intervals during long sessions |
| `continuous-improvement` | **NEW** Daily cron scan for ecosystem improvements, multi-agent approval workflow, proposal queue management |

## 🚀 Ship & Review
| Skill | What it does |
|-------|-------------|
| `gstack` | Full dev lifecycle: browser QA, workflow stages |
| `gstack-upgrade` | Upgrade gstack to the latest version |
| `ship` | Build → test → PR → deploy pipeline |
| `review` | Code review with structured feedback |
| `requesting-code-review` | Before merging — verify work |
| `receiving-code-review` | Implementing review feedback |
| `retro` | Post-ship retrospective + lessons |
| `design-review` | Visual design audit |
| `plan-eng-review` | Engineering plan review |
| `plan-ceo-review` | Strategy/business plan review |
| `plan-design-review` | Design plan review |
| `office-hours` | Brainstorming and ideation |
| `codex` | Adversarial second-opinion code review |
| `guard` | Maximum safety mode |
| `document-release` | Post-ship doc update: README, ARCH, CONTRIBUTING, CLAUDE.md |
| `qa` | QA test a web app and fix bugs found, commit atomically |
| `qa-only` | Report-only QA — structured report with health score + screenshots, never modifies code |

## 🤖 AI & Agent Tools
| Skill | What it does |
|-------|-------------|
| `acpx` | Headless ACP CLI for agent-to-agent comms |
| `advisor` | **NEW** Anthropic Advisor Tool — pair Sonnet/Haiku executor with Opus advisor; full API docs, code samples, OpenClaw/ClaudeSwap integration guide |
| `dmux-workflows` | Multi-agent orchestration via tmux |
| `eval-harness` | Formal eval-driven development (EDD) |
| `ai-regression-testing` | AI-assisted dev regression testing |
| `continuous-learning-v2` | Instinct-based learning from session hooks |
| `context-hub` | Fetch curated API docs via `chub` CLI |
| `claude-api` | Build apps with Claude/Anthropic SDK |
| `configure-ecc` | Interactive ECC installer |
| `benchmark` | Performance regression detection — baselines for page load, Core Web Vitals, resource sizes |
| `canary` | Post-deploy canary monitoring — watches live app for errors, regressions, failures |
| `browse` | Fast headless browser for QA, dogfooding, page state verification, annotated screenshots |
| `cache-monitor` | Analyze Claude Code session costs and cache efficiency from JSONL session files |

## 🔗 Multi-Agent & Peers (NEW in v2.3.0)
| Skill | What it does |
|-------|-------------|
| `claude-peers-bible` | **NEW** Comprehensive Claude Peers guide — discovery, messaging, 5 coordination patterns (coordinator, swarm, expert, review, research) |
| `spawn-manager` | **NEW** Spawn and manage multiple Claude Code peers — Quick/Team/Swarm/Expert spawn patterns, coordinator protocol, cost management |
| `task-commander` | **NEW** Multi-agent orchestration brain — P0-P10 scoping, DAG workflows, circuit breaker, cost ceiling, COMP PROVE verification |
| `contextual-assist` | **NEW** Proactive contextual suggestions — 5 levels (off/minimal/standard/guided/mentored), pattern matching, progressive disclosure |

## 🏗️ Integrations (NEW in v2.3.0)
| Skill | What it does |
|-------|-------------|
| `cowork-bible` | **NEW** Claude Desktop Cowork integration — autonomous sessions, plugin compatibility, scheduled tasks, handoff protocol |
| `cowork-plugin-builder` | **NEW** Build custom Cowork plugins — 5 example plugins, packaging guide, testing, publishing |
| `dispatch-bible` | **NEW** Dispatch background task system — overnight builds, batch processing, error handling, cost tracking |
| `dispatch-templates` | **NEW** 8 pre-built Dispatch templates — overnight-build, batch-review, security-scan, perf-benchmark, and more |
| `openclaw-bridge` | **NEW** Bridge CCC ↔ OpenClaw (38-agent platform) — skill mapping, hook translation, agent profiles, session handoff |
| `paperclip-bridge` | **NEW** Paperclip task management integration — issue creation, priority mapping, bidirectional sync, REST API |
| `openclaw-native` | **NEW** OpenClaw native integration — auto-detection, skill sync, bidirectional event forwarding, agent profile generation, memory sync |
| `openclaw-post-install` | Post-upgrade protocol — backup, version-split check (both npm paths), changelog delta, doctor pre-start, launchctl bootstrap, proposals, rollback, Slack contract-api.js crash detection |

## 📖 Beginner Experience (NEW in v2.3.0)
| Skill | What it does |
|-------|-------------|
| `bible-guide` | **NEW** Interactive onboarding — "I'm new" → guided wizard, skill discovery, progressive disclosure |
| `vscode-bible` | **NEW** VS Code integration guide — buttons, snippets, keyboard shortcuts, walkthrough, status bar customization |

## 📘 Quick Start Guides (NEW in v2.3.0)
| Guide | Who it's for |
|-------|-------------|
| `guides/quickstart-beginner.md` | Complete beginner — never used Claude Code |
| `guides/quickstart-frontend.md` | Frontend developer — React, Next.js, Tailwind |
| `guides/quickstart-backend.md` | Backend developer — APIs, databases, auth |
| `guides/quickstart-fullstack.md` | Full-stack developer — combined workflow |
| `guides/quickstart-mobile.md` | Mobile developer — React Native, Flutter, Swift, Kotlin |

## 📊 Dashboard (NEW in v2.3.0)
| Component | What it does |
|-----------|-------------|
| `dashboard/` | Real-time React dashboard — agent monitoring, spawn tree, cost tracker, live logs, 10 themes |

## 🏗️ Backend & Database
| Skill | What it does |
|-------|-------------|
| `api-design` | REST API patterns, status codes, pagination |
| `backend-patterns` | Node.js/Express/Next.js backend architecture |
| `senior-backend` | REST APIs, microservices, auth, security |
| `database-designer` | Full database design skill |
| `database-migrations` | Schema changes, rollbacks, zero-downtime |
| `postgres-patterns` | PostgreSQL query optimization, indexing |
| `redis-patterns` | Caching, pub/sub, rate limiting, sessions |
| `clickhouse-io` | ClickHouse analytics + high-perf queries |
| `jpa-patterns` | JPA/Hibernate for Spring Boot |
| `mcp-server-patterns` | Build MCP servers (Node/TypeScript SDK) |
| `stripe-subscriptions` | Stripe lifecycle, webhooks, checkout |
| `drizzle-neon` ⭐ | Drizzle ORM + Neon Postgres: schema, migrations, queries, relations, serverless |
| `fastify-api` ⭐ | Fastify API patterns: routes, hooks, WebSocket, testing, MCP server |

## ⚛️ Frontend — React / Next.js
| Skill | What it does |
|-------|-------------|
| `frontend-patterns` | React, Next.js, state management, performance |
| `nextjs-app-router` ⭐ | Next.js 15+ App Router: RSC, server actions, streaming, caching, middleware |
| `shadcn-ui` ⭐ | shadcn/ui component patterns: forms, data tables, theming, composition, charts |
| `tailwind-v4` ⭐ | Tailwind CSS v4: CSS-based config, container queries, new utilities, migration |
| `landing-page-builder` | High-converting landing pages (Next.js) |
| `blog-engine` | SEO-optimized blog systems (MDX, Next.js) |
| `frontend-design` | Anti-slop design system (Anthropic official) |
| `coding-standards` | Universal TS/JS/React coding standards |
| `plankton-code-quality` | Write-time code quality enforcement |

## 🔷 Laravel & Vue.js (MyWiFi Stack)
| Skill | What it does |
|-------|-------------|
| `laravel-patterns` | Routing, Eloquent, service layers, queues, events |
| `laravel-tdd` | PHPUnit, Pest, factories, DB testing |
| `laravel-verification` | Linting, static analysis, security scans |
| `mywifi-platform` | MyWiFi multi-tenant WiFi management patterns |
| `wifi-captive-portal` | Splash pages, auth flows for guest WiFi |
| `vue-nuxt` | Vue 3 Composition API, Nuxt 4, Pinia, TypeScript, VueUse, SSR/SSG |

## 🔐 Auth & Security
| Skill | What it does |
|-------|-------------|
| `better-auth` ⭐ | Better Auth authentication: setup, OAuth, sessions, multi-tenant, plugins |
| `container-security` | Docker/container hardening |
| `github-actions-security` | CI/CD security patterns |
| `pci-compliance` | Payment security (PCI DSS) |
| `pentest-checklist` | Penetration test planning + checklists |
| `gdpr-data-handling` | GDPR-compliant data processing |
| `accessibility-compliance` | WCAG, inclusive design, assistive tech |

## 🏗 Monorepo & Infra Tooling
| Skill | What it does |
|-------|-------------|
| `turborepo-monorepo` ⭐ | Turborepo monorepo: pipeline, caching, shared packages, deployment |

## ☁️ DevOps & Cloud
| Skill | What it does |
|-------|-------------|
| `docker-development` | Dockerfile optimization, compose, security |
| `senior-devops` | CI/CD, IaC, containers, cloud platforms |
| `github-actions-reusable-workflows` | Reusable workflows, matrix, caching |
| `github-actions-security` | Secrets, OIDC, permissions hardening |
| `github` | `gh` CLI operations: issues, PRs, CI runs |
| `gh-issues` | Fetch issues, spawn sub-agents for fixes |
| `aws-solution-architect` | Serverless AWS architectures for startups |
| `aws-lambda-best-practices` | Lambda: cold starts, layers, monitoring |
| `aws-s3-patterns` | S3: lifecycle, presigned URLs, encryption |
| `aws-cloudfront-optimization` | CloudFront: cache policies, Lambda@Edge |
| `aws-iam-security` | IAM: least privilege, OIDC, boundaries |
| `network-engineer` | Cloud networking + security architectures |
| `prometheus-configuration` | Prometheus setup + scrape config |
| `promql-alerting` | PromQL queries, SLO-based alerting |
| `grafana-dashboards` | Production-ready Grafana dashboards |
| `infra-runbook` | Infrastructure runbook skill |
| `land-and-deploy` | Deployment patterns |
| `setup-deploy` | Deploy setup patterns |

## 🎨 Design & Frontend UI
| Skill | What it does |
|-------|-------------|
| `frontend-slides` | Animation-rich HTML presentations / PPT convert |
| `web-artifacts-builder` | Multi-component Claude HTML artifacts |
| `brand-guidelines` | Anthropic brand colors + typography |
| `teach-impeccable` | One-time design context setup |
| `theme-factory` | Themed slides, docs, reports, HTML |
| `design-consultation` | Full design system proposal: aesthetic, typography, color, layout, motion |

## ✨ Design Polish (Impeccable Suite)
| Skill | What it does |
|-------|-------------|
| `adapt` | Responsive design across screen sizes |
| `animate` | Purposeful animations + micro-interactions |
| `arrange` | Layout, spacing, visual rhythm fixes |
| `audit` | Full interface quality audit |
| `bolder` | Amplify boring designs |
| `clarify` | UX copy, error messages, microcopy |
| `colorize` | Add strategic color to flat interfaces |
| `critique` | Evaluate design effectiveness |
| `delight` | Joy, personality, memorable touches |
| `distill` | Strip to essence, remove complexity |
| `extract` | Extract reusable components + tokens |
| `harden` | Error handling, i18n, text overflow |
| `normalize` | Match design system consistency |
| `onboard` | Onboarding flows + empty states |
| `optimize` | Loading speed, rendering, bundle size |
| `overdrive` | Shaders, 60fps, spring physics, scroll-driven |
| `polish` | Final quality pass before shipping |
| `quieter` | Tone down aggressive designs |
| `typeset` | Typography: fonts, hierarchy, readability |

## 🎬 Visual Effects
| Skill | What it does |
|-------|-------------|
| `svg-animation` | Animated SVGs: GSAP, Lottie, morphing |
| `motion-design` | Framer Motion, CSS keyframes, parallax |
| `interactive-visuals` | Cursor trails, hover distortions, physics |
| `particle-systems` | Canvas/WebGL: confetti, fire, snow, aurora |
| `generative-backgrounds` | Noise gradients, voronoi, cellular automata |
| `retro-pixel` | CRT scanlines, 8-bit, VHS glitch, ASCII |
| `webgl-shader` | Three.js + custom GLSL shaders |
| `canvas-design` | Visual art in PNG/PDF |
| `remotion` | Video generation with Remotion |
| `remotion-best-practices` | 30 rule files for Remotion |
| `video-gallery` | Video gallery/player (YouTube, Vimeo, self-hosted) |
| `slack-gif-creator` | Animated GIFs optimized for Slack |

## 📈 SEO & Content
| Skill | What it does |
|-------|-------------|
| `aaio` | **NEW** Agentic AI Optimization — robots.txt AI policy, JSON-LD, markdown twins, agent-ready interfaces |
| `ai-seo` | Optimize for AI search engines / LLM citations |
| `seo-optimizer` | Technical SEO: meta, OG, JSON-LD, sitemaps |
| `seo-content-brief` | SEO content briefs for writers |
| `serp-analyzer` | Analyze Google SERP for any keyword |
| `backlink-audit` | Domain backlink profile via SemRush API |
| `site-architecture` | Page hierarchy, navigation, URL structure |
| `content-strategy` | Content planning + editorial calendar |
| `bulk-page-generator` | Programmatic SEO pages at scale |
| `blog-engine` | SEO-optimized blog systems (MDX, Next.js) |
| `social-integration` | OG previews, Twitter cards, sharing |
| `search-console` | Google Search Console data — rankings, clicks, impressions, CTR, index coverage |
| `guest-blogger` | Guest blog search strategy, source analysis, quality evaluation, pitch templates |

## 📧 Email & Messaging
| Skill | What it does |
|-------|-------------|
| `cold-email` | B2B cold outreach sequences |
| `email-capture` | Newsletter signup components |
| `email-systems` | 99.9% deliverability email engineering |
| `sendgrid-automation` | SendGrid: send, contacts, sender identity |
| `whatsapp-automation` | WhatsApp Business via Composio |
| `whatsapp-cloud-api` | WhatsApp Cloud API: templates, webhooks |
| `twilio-communications` | SMS, voice, WhatsApp via Twilio |
| `intercom-automation` | Intercom: conversations, contacts, segments |
| `internal-comms` | Internal communications writing |

## 💰 Business & Growth
| Skill | What it does |
|-------|-------------|
| `saas-metrics-coach` | ARR, MRR, churn, LTV, CAC analysis |
| `revops` | Revenue operations, lead lifecycle |
| `sales-enablement` | Sales decks, one-pagers, objection handling |
| `monetization-strategy` | 3-5 monetization strategies + validation |
| `experiment-designer` | Product experiments, hypotheses, sample size |
| `ab-test-setup` | A/B test gates: hypothesis, metrics, execution |
| `billing-automation` | Recurring payments, invoicing, dunning |
| `churn-prevention` | Cancellation flows, save offers, recovery |
| `paywall-upgrade-cro` | In-app paywalls, upgrade screens, upsells |
| `signup-flow-cro` | Signup/registration/trial optimization |
| `form-cro` | Non-signup form optimization |
| `free-tool-strategy` | Engineering-as-marketing free tools |
| `referral-program` | Viral growth + referral marketing |
| `ad-creative` | Ad headlines, descriptions, creative |
| `competitor-alternatives` | Competitor comparison pages |
| `analytics-conversion` | GA4, Plausible, PostHog conversion tracking |
| `analytics-product` | Product analytics: funnels, cohorts, retention |
| `metrics-dashboard` | Product metrics dashboards + KPIs |
| `posthog-automation` | PostHog: events, flags, user profiles |
| `sentry-automation` | Sentry: issues, alerts, releases |

## 📦 Skill Packs (multi-skill bundles)
| Skill | What it does |
|-------|-------------|
| `c-level-pack` | 28 skills covering 10 C-level roles |
| `product-pack` | 20 product management skills |
| `marketing-pack` | 42 marketing skills across 7 pods |
| `business-pack` | Business strategy skills |
| `engineering-pack` | Engineering leadership skills |
| `finance-pack` | Financial analysis + planning |

## 🐍 Python
| Skill | What it does |
|-------|-------------|
| `python-patterns` | Pythonic idioms, PEP 8, type hints |
| `python-testing` | Pytest, TDD, fixtures, mocking |

## 🧪 Testing
| Skill | What it does |
|-------|-------------|
| `e2e-testing` | Playwright: Page Object Model, CI/CD |
| `webapp-testing` | Playwright for local web apps |
| `screenshots` | Marketing screenshots via Playwright |

## 📄 Documents & Media
| Skill | What it does |
|-------|-------------|
| `pptx` | PowerPoint file handling (in/out) |
| `pdf-official` | PDF: extract, create, merge, split |
| `doc-coauthoring` | Structured documentation co-authoring |
| `partner-logo-standard` | SVG logo standards (Guest Networks) |
| `humanizer` | Content humanization |

## 🏢 OpenClaw / Paperclip
| Skill | What it does |
|-------|-------------|
| `openclaw-health-check` | Full system health audit |
| `openclaw-agent-scaffolder` | Interview → generate agent config |
| `paperclip` | Paperclip task management API |
| `paperclip-create-agent` | Scaffold new Paperclip agents |
| `paperclip-create-plugin` | Scaffold Paperclip plugins |
| `skill-stocktake` | Audit skill quality (quick scan / full) |

## 🌐 Internationalization
| Skill | What it does |
|-------|-------------|
| `i18n-localization` | Detect hardcoded strings, manage translations |

## 📊 Misc / Utilities
| Skill | What it does |
|-------|-------------|
| `web-scraper` | Multi-strategy web scraping |
| `firecrawl-scraper` | Deep scraping via Firecrawl API |
| `chat-widget` | Real-time support chat system |
| `trading-analysis` | Trading analysis patterns |
| `para-memory-files` | PARA method memory organization |
| `setup-browser-cookies` | Browser cookie setup |
| `business-analytics` | AI-powered business analysis |
| `investigate` | Systematic debugging with root cause investigation |
| `project-guidelines-example` | Example project-specific skill template (real production app) |

## 🔬 Observability & QA
| Skill | What it does |
|-------|-------------|
| `benchmark` | Performance regression detection — page load baselines, Core Web Vitals |
| `canary` | Post-deploy canary monitoring — console errors, perf regressions, page failures |
| `browse` | Headless browser for QA and site dogfooding — navigate, interact, screenshot, diff |
| `cache-monitor` | Claude Code/OpenClaw session cost and cache efficiency analysis |
| `qa` | Full QA loop: test web app, fix bugs, commit atomically |
| `qa-only` | Report-only QA: structured report with health score, never modifies code |

## 🔬 Research & Analysis (ccc-research)
| Skill | What it does |
|-------|-------------|
| `deep-research` | Multi-source research with citation management and confidence scoring |
| `literature-review` | Academic and technical literature synthesis |
| `competitive-analysis` | Competitor feature matrices, pricing analysis, positioning |
| `market-research` | TAM/SAM/SOM analysis, market sizing, trend identification |
| `data-synthesis` | Cross-source data aggregation and insight extraction |
| `citation-manager` | Track, format, and verify citations across research |
| `source-validator` | Verify claims against original sources, flag hallucinations |
| `research-brief` | Structured research output — executive summary, findings, recommendations |

## 📱 Mobile Development (ccc-mobile)
| Skill | What it does |
|-------|-------------|
| `react-native-patterns` | React Native: navigation, state, native modules, performance |
| `flutter-patterns` | Flutter: widgets, state management, platform channels |
| `ios-swift` | Swift/SwiftUI patterns, App Store guidelines |
| `android-kotlin` | Kotlin/Jetpack Compose, Play Store guidelines |
| `mobile-testing` | Mobile E2E testing, device farms, screenshot testing |
| `app-store-optimization` | ASO: keywords, screenshots, descriptions, A/B testing |
| `cross-platform-patterns` | Shared code strategies, platform-specific adaptations |

## 🛡️ Security & Compliance (ccc-security)
| Skill | What it does |
|-------|-------------|
| `owasp-top-10` | OWASP Top 10 vulnerability detection and remediation |
| `supply-chain-security` | Dependency auditing, SBOM generation, lockfile verification |
| `secrets-management` | Vault patterns, secret rotation, env var hygiene |
| `threat-modeling` | STRIDE/DREAD threat models, attack surface analysis |
| `security-headers` | HTTP security headers audit and configuration |
| `auth-hardening` | Authentication hardening — MFA, session management, brute force protection |
| `api-security` | API security — rate limiting, input validation, JWT best practices |
| `incident-response-security` | Security incident response playbooks and forensics |
| `compliance-frameworks` | SOC 2, ISO 27001, HIPAA compliance checklists |

## 📊 Data & Analytics (ccc-data)
| Skill | What it does |
|-------|-------------|
| `etl-pipelines` | ETL/ELT pipeline design — extraction, transformation, loading patterns |
| `data-warehousing` | Data warehouse design — star schema, slowly changing dimensions |
| `analytics-engineering` | dbt patterns, data modeling, metrics layer |
| `data-visualization` | Chart selection, dashboard design, storytelling with data |
| `ml-ops` | ML pipeline management — training, deployment, monitoring, drift detection |
| `data-quality` | Data quality checks, anomaly detection, validation rules |
| `streaming-data` | Real-time data processing — Kafka, event sourcing, CDC |
| `data-governance` | Data catalogs, lineage tracking, access policies |

## 🔄 Workflow Modes (mode-switcher)
| Mode | What it does |
|------|-------------|
| `mode-switcher` | Router skill — switch between 10 workflow modes via `/cc mode <name>` |
| `mode-normal` | Balanced defaults — plan-first, verify-before-done |
| `mode-design` | Visual-first — loads design/animation skills, critique loop |
| `mode-saas` | Full SaaS lifecycle — auth, billing, DB, deploy pipeline |
| `mode-marketing` | Content + CRO focus — SEO, copy, conversion optimization |
| `mode-research` | Deep research — citations, confidence levels, source verification |
| `mode-writing` | Long-form content — blog posts, docs, technical writing |
| `mode-night` | Autonomous overnight — checkpoints, error recovery, notifications |
| `mode-yolo` | Maximum speed — skip confirmations, auto-approve, ship fast |
| `mode-unhinged` | No guardrails — experimental, creative, push boundaries |

## 🤝 Integrations
| Skill | What it does |
|-------|-------------|
| `agency-orchestrator` | Multi-agent orchestration patterns — coordinator, workers, reporting, error recovery |
| `openclaw-patterns` | OpenClaw integration — agent configs, channel routing, session management, tool binding |

## 📝 Prompt Library
> 36+ prompt templates across 6 categories in `prompts/`

| Category | Templates | What they cover |
|----------|-----------|----------------|
| Coding | 8 | Bug fix, code review, architecture review, TDD setup, refactor brief, performance audit, migration plan, API design |
| Planning | 6 | Spec interview, evals-first, decomposition, handoff, sprint planning, project kickoff |
| Design | 5 | Design critique, accessibility audit, animation brief, design system setup, responsive review |
| Marketing | 6 | SEO content brief, cold email sequence, landing page copy, ad creative, social media calendar, competitor teardown |
| DevOps | 5 | CI failure investigation, deploy checklist, incident response, infrastructure review, monitoring setup |
| Meta | 5+ | Subagent dispatch, research, PR description, skill creation, CLAUDE.md generation |

## 🏗 Project Starters
> Ready-to-use project templates in `templates/` + skills that bootstrap full setups.

### Starter Templates (`templates/`)
| Template | Stack | What you get |
|----------|-------|-------------|
| `nextjs-shadcn-starter.md` | Next.js 15 + shadcn/ui + Better Auth + Drizzle + Neon | Full SaaS scaffold: auth, dashboard, DB schema, middleware |
| `turborepo-fullstack-starter.md` | Turborepo + Next.js + Fastify + shared packages | Monorepo: web app, API, shared DB/types/validators |
| `marketing-site-starter.md` | Next.js 15 + MDX + PostHog + Framer Motion | Marketing site: hero, pricing, blog, analytics, OG images |

### Scaffolding Skills
| Skill | What it starts |
|-------|---------------|
| `project-kickoff` | Any project — CLAUDE.md, tasks/, .claude/settings.json, git worktree |
| `nextjs-app-router` ⭐ | Next.js 15+ App Router project with RSC, server actions, streaming |
| `turborepo-monorepo` ⭐ | Turborepo monorepo with pipeline, caching, shared packages |
| `landing-page-builder` | High-converting Next.js landing page |
| `laravel-patterns` | Laravel project with routing, Eloquent, service layers |
| `vue-nuxt` | Vue 3 / Nuxt 4 project with Pinia + TypeScript |

---

## 📖 Reference MCPs (always available)
| MCP | What it provides |
|-----|-----------------|
| `context7` | Up-to-date library docs ("use context7") |
| `playwright` | Browser automation, screenshots, E2E |
| `n8n-mcp` | n8n workflow automation |
| `github` / `github-gn` (example) | GitHub API (primary + optional secondary org) |
| `granola` | Meeting notes / transcripts |
| `claude-peers` | Agent-to-agent communication |

---

## 🚀 Quick Start Bundles

Pick a bundle to load the right skills for your project type:

| Bundle | Skills to Load | For |
|--------|---------------|-----|
| **Web Wizard** | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` + `drizzle-neon` | Full-stack web apps |
| **Security Engineer** | `pci-compliance` + `container-security` + `github-actions-security` + `pentest-checklist` | Security audits & hardening |
| **Content Creator** | `ccc-marketing` + `ccc-seo` + `blog-engine` | Content & SEO campaigns |
| **Full Stack SaaS** | `ccc-saas` + `ccc-devops` + `ccc-testing` | SaaS product from scratch |

---

*⭐ = added in CC Commander v2.3.0 and kept current with each release. Desktop plugin skills (plain `/ccc-*` namespace) added in v3.0.0, updated in v4.0.0-beta.7.*

---

## CCC (Claude Code Commander) Skills

Desktop plugin is the primary surface — adds plain `/ccc-*` skills (see top of file). Interactive CLI project manager is a secondary CLI-only surface that sits above Claude Code sessions.

| Skill | Category | Description |
|-------|----------|-------------|
| `cc-commander` | Commander | Full interactive PM with spec flow, plugin orchestration, knowledge injection |
| `cc-yolo-mode` | Commander | YOLO Mode — 10-question spec → 8hr autonomous build (Opus, $10, 100 turns) |
| `cc-knowledge` | Commander | Search knowledge base for past lessons |
| `cc-plugins` | Commander | Detect installed packages + show orchestration plan |

### Commander Adventures (11 flows)
| Adventure | Choices | Description |
|-----------|---------|-------------|
| main-menu | 12 | Hub: build, content, research, learn, stats, settings, YOLO, theme |
| build-something | 5 | Code: web apps, APIs, CLI tools + 3 sub-adventures |
| create-content | 7 | Marketing: blog, social, email, copy, docs + 5 sub-adventures |
| research | 6 | Analysis: competitive, market, code audit, SEO + 4 sub-adventures |
| CCC domains | 7 | Browse 11 CCC domains (200+ sub-skills) with dispatch |
| night-build | 4 | YOLO Mode + YOLO Loop (3-10 cycles) |
| continue-work | 4 | Resume sessions: exact, summary, fresh start |
| review-work | 4 | Session history, resume, details |
| learn-skill | 5 | Skill browser, CCC domains, cheatsheet, recommendations |
| check-stats | 4 | Dashboard with sparklines, achievements, history |
| settings | 7 | Name, level, cost, theme, animations, reset |
