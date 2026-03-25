# Skills Index — Quick Reference
> Search: `grep -i "keyword" SKILLS-INDEX.md`
> Last verified: 2026-03-25 (219 skill directories, 214 with SKILL.md, 3 starter templates)

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
| `brainstorming` | Pre-creative-work ideation (use before creative work) |
| `playground` | HTML playgrounds for visual/interactive problems |
| `freeze` | Restrict file edits to a specific directory for the session |
| `unfreeze` | Clear freeze boundary, allowing edits to all directories again |
| `project-kickoff` | Initialize new project with CLAUDE.md, tasks/, .claude/settings.json, git worktree setup |

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
| `github` / `github-gn` | GitHub API (personal + Guest Networks) |
| `granola` | Meeting notes / transcripts |
| `claude-peers` | Agent-to-agent communication |

---

*⭐ = new in v0.4*
