# Skills Index — Quick Reference
> Search: `grep -i "keyword" SKILLS-INDEX.md`
> Last verified: 2026-10-13 (202 top-level directories, 195 top-level SKILL.md, 467 total SKILL.md, 3 starter templates)

> **Which document?** BIBLE.md = learning guide (read once). CHEATSHEET.md = daily reference (quick lookup). **SKILLS-INDEX.md = skill discovery (you are here).** This page indexes the ecosystem catalog (`skills/`) — for the 93 Desktop plugin skills (the `/ccc-*` front door, incl. `ccc-usage`, `ccc-safety`, and `ccc-update` below), see [The 93 plugin skills](#the-93-plugin-skills) below or `/plugin/skills` in the Mintlify docs.

---

## The 93 plugin skills

Claude sees 32 of them (model-visible: the 12 core skills plus the skills their menus open); the other 61 load on demand: their descriptions stay out of Claude's context and you open them by typing the command. Generated from each skill's frontmatter by `node scripts/render-skill-table.js --write SKILLS-INDEX.md`; `npm test` fails when it is stale.

<!-- skill-table:start -->
| Skill | What it does | Claude sees it |
|---|---|---|
| `/ccc` | Commander home: reads project context, then routes to build, review, ship or the More menu in one or two clicks. | visible |
| `/ccc-adhd` | Answer-first output: the fix, then command, then file:line, context last. | on demand |
| `/ccc-adopt` | Merge Commander conventions and a stack-tailored skill and agent list into an existing CLAUDE.md, with backup and diff approval first. | visible |
| `/ccc-agent-writing` | Draft a spec, PRD, PR description, README section, runbook or technical doc that a reader can act on without a follow-up question: named reader, answer first,… | on demand |
| `/ccc-babysit-pr` | Monitor a pull request through review and CI with a read-only watcher, handle bot and reviewer feedback, and report when it is ready. | on demand |
| `/ccc-brainstorm` | Design-first ideation gate: three parallel agents propose a simple, a scalable and a user-delight approach, rendered as a tradeoff matrix, then you pick a… | on demand |
| `/ccc-broadcast` | Relay build, deploy, CI, task and cost outcomes as short scrubbed summaries to a connected team chat or email, so non-developers see what shipped. | on demand |
| `/ccc-browse` | Browse every Commander skill, agent and domain: a searchable catalog or pickers four at a time, then launch one. | visible |
| `/ccc-build` | Scaffold a new web app, API or CLI from a three-question spec, built by a background agent and verified. | visible |
| `/ccc-changelog` | Summarize what changed in the latest CC Commander release, or a named version, from CHANGELOG.md in a short scan-friendly digest. | on demand |
| `/ccc-cheatsheet` | Live map of the installed Commander: skills, workflows, menus, agents, hooks and MCP servers as a Mermaid flow with a picker. | visible |
| `/ccc-ci` | Diagnose CI and deploy failures: pull the failing run's log, classify the cause, propose a fix, and follow runs with /loop or a Routine; optional… | on demand |
| `/ccc-claudemd` | Audit a project CLAUDE.md against the real codebase for stale paths, dead commands, missing context and token waste, then apply fixes only after picker… | on demand |
| `/ccc-code-review` | Alias for /ccc-review: forwards a code, PR or diff review request with its arguments to the canonical review workflow. | on demand |
| `/ccc-codex` | Manage the OpenAI Codex CLI: doctor, models, plugins, MCP servers, custom agents, cloud tasks, remote control, reviews, updates, import and config, backing up… | on demand |
| `/ccc-connect` | Opt-in connector wizard with affiliate disclosure: pick a service (Supabase, Linear, Vercel, Sentry, Notion, Slack, Stripe, research tools and more) and wire… | on demand |
| `/ccc-console` | Open the Commander Console inline (agents, usage, safety, memory, history, launch chips, prompt bar) or publish one tab as a private snapshot page after… | on demand |
| `/ccc-content` | Draft blog posts, social threads, email campaigns, landing-page copy and docs in three questions, with an optional brief, review and scheduling pipeline. | on demand |
| `/ccc-council` | Get a read-only review or feedback from delegates on three providers, with scores per round and honest reporting when one is missing. | on demand |
| `/ccc-data` | Data router: ETL pipelines, SQL optimization, dashboards, ML, data quality, analytics, reports, vector search. | visible |
| `/ccc-debate` | Adversarial multi-agent debate: lens agents (security, performance, architecture, product, contrarian) argue and cross-examine one design, plan or diff, then… | on demand |
| `/ccc-deploy` | Deploy the current build to Vercel, Fly.io, Cloudflare, GitHub Pages, npm, or a package deploy script, verify the live URL, and draft post-deploy notes. | on demand |
| `/ccc-deploy-check` | Pre-deploy readiness gate: tests, build, debug logs, secrets, TODOs, lockfile and destructive-migration checks with a GO, CAUTION or NO-GO verdict, plus risk… | on demand |
| `/ccc-design` | UI design: landing pages, component systems, polish passes, Figma to code, screenshot to UI. | visible |
| `/ccc-devops` | DevOps router: CI/CD, zero-downtime deploys, Docker, AWS, Terraform, monitoring, networking, runbooks. | visible |
| `/ccc-doc-sync` | Sync skill, agent and hook-handler counts and the version string across Commander docs from contract.json and package.json, with a --check drift gate for CI. | on demand |
| `/ccc-doctor` | Paste-ready Commander health report: install mode, versions, cache, settings, MCP servers, plugin validation. | visible |
| `/ccc-domains` | Alias for /ccc-learn: opens the domain picker to browse and load a skill domain such as design, marketing, SaaS, testing, DevOps or security. | on demand |
| `/ccc-e2e` | Pre-release assessment that fans out via /ccc-fleet into up to three isolated workers (QA audit, unit tests, Playwright E2E) running /ccc-testing lanes, then… | on demand |
| `/ccc-ecc` | Selective ECC loader: pick one Everything Claude Code skill, agent or hook from the vendored checkout and symlink or copy only that component into ~/.claude,… | on demand |
| `/ccc-fable` | Arm, check, audit or disarm the Commander Method: the PM loop, 12 checkable gates, workflow-first posture and verifier separation, persisted in Commander state. | on demand |
| `/ccc-file-pr` | File a concise draft pull request with a clear title, a problem-first description, and the local test results. | on demand |
| `/ccc-fleet` | Run parallel agents on one task: worktree fan-out, pipeline, review panel, background run or team, then verify. | visible |
| `/ccc-fleet-viz` | Show a /ccc-fleet run as a live tree of workers with status, branches and a Mermaid diagram until all finish. | visible |
| `/ccc-full-send` | Take a change from its current state to a merged PR unattended: prove it, get independent review, file a draft PR, babysit it, and merge through the full… | on demand |
| `/ccc-full-stop` | Do the full-send work (prove, review, draft PR, babysit), then stop with the PR ready for the user to merge, never merging. | on demand |
| `/ccc-handoff` | Write a dense handoff file and tell the user to resume in a new chat before a long context degrades output quality. | on demand |
| `/ccc-harden` | Pre-launch production hardening audit across hosting, GitHub, error tracking, analytics, payments, secrets/PII headers and Cloudflare. | on demand |
| `/ccc-hermes` | Optional bridge between Claude Code and a local Hermes agent gateway: chat channels can wake a Claude Code session, and Claude Code can post progress or… | on demand |
| `/ccc-infra` | Dev services status: probes the local services you declare in an optional services.json, plus Claude MCP connections and Codex CLI health, and recommends the… | on demand |
| `/ccc-knowledge` | Search, browse and add lessons in the local CC Commander knowledge base: recent lessons, topic search, category view, stats and file-edit captures. | on demand |
| `/ccc-learn` | Pick a Commander skill domain (design, marketing, SaaS, DevOps, SEO, testing, security, data) and hand off to its router. | visible |
| `/ccc-linear` | View your open Linear issues, pick one to work on (moves it to In Progress and creates a branch), create a new issue, or see a board overview, all from pickers. | on demand |
| `/ccc-linear-board` | Publish a team's Linear issues as a private Kanban page whose cards update in place from a shared data store, or ask the user to type /ccc-linear to view,… | on demand |
| `/ccc-loop` | Pick the right loop primitive (turn, /goal, /loop interval or self-paced, ScheduleWakeup, Routines via /schedule), gate it, give it an independent verifier… | on demand |
| `/ccc-makeover` | Score project health with /ccc-xray, apply the top fixes one at a time with your OK, and show a before/after report card. | visible |
| `/ccc-marketing` | Marketing router: brand context, content, CRO, email and ads, growth experiments, competitor intel, pricing, launches. | visible |
| `/ccc-memory` | Keep durable project memory in two tiers: CLAUDE.md for always-loaded facts and a memory/ directory of dated notes, decisions, gotchas and preferences loaded… | on demand |
| `/ccc-mission-control` | Agent mission control: who is working on what, as a local live dashboard, a plain-English status, suggestion triage, or a private snapshot page whose task… | on demand |
| `/ccc-mobile` | Mobile router: React Native/Expo, Flutter, SwiftUI or Compose builds, mobile testing, ASO, push and deep links. | visible |
| `/ccc-modernize` | Bring an old PR up to date by merging its base into it, and judge honestly whether the idea still belongs: MODERNIZE, REWORK or CLOSE. | on demand |
| `/ccc-more` | Commander's second-page menu: plan, x-ray, Codex, fleet, Linear, connectors, tune-up, catalog and audit workflows. | visible |
| `/ccc-night-mode` | Spec-first autonomous build that runs overnight or immediately in multi-cycle build and independent-review loops, checkpointing status each cycle and stopping… | on demand |
| `/ccc-nightwatch` | Remote permission relay for unattended runs: risk-classify each tool call, auto-allow reads, send risky calls to your phone via Telegram or Discord for a tap,… | on demand |
| `/ccc-onboard` | Contributor first-hour plan for the current repository: reads CLAUDE.md, BIBLE.md and package.json, checks required tools, asks the contributor's role, and… | on demand |
| `/ccc-orchestrate` | Write a goal file, run it on a separate executor (Codex GPT-6 or a Sonnet subagent) in an isolated worktree, then verify every acceptance criterion. | on demand |
| `/ccc-plan` | Turn an idea, bug, refactor or Linear issue into a reviewed plan file with evals before coding. | visible |
| `/ccc-plan-exec` | Plan cheap, execute capable: a fast model drafts the loop (steps, per-step body, verify condition), a capable model runs each step in an isolated worktree… | on demand |
| `/ccc-pr-comments` | Format agent-authored GitHub comments with a model attribution note and a direct style. | on demand |
| `/ccc-prompt-fix` | Diagnose a prompt against the six prompt-quality patterns and return a tighter rewrite with the reason for each change, a 0-6 score, or the best matching… | on demand |
| `/ccc-qa` | Pre-ship QA pass: runs unit, integration and E2E suites, coverage delta and a flaky-test audit. | visible |
| `/ccc-recall` | Search past saved sessions and curated memory notes for an earlier fix, decision or file, and answer with the source file and date cited. | on demand |
| `/ccc-relay` | Chain independent loop sessions (spec, build, review, then a human-gated merge) that hand off through a durable state file, tracker status or reaction, each… | on demand |
| `/ccc-research` | Cited multi-source research before building: compare options, find prior art, define a spec, or summarize large docs or codebases. | visible |
| `/ccc-resume-session` | Resume a saved session file: read it fully, then brief state, blockers and next step before any work. | visible |
| `/ccc-review` | Code review of the current branch or PR, or a security, performance or whole-project audit, with a severity-rated report. | visible |
| `/ccc-rollback` | Roll production back by picking a known-good commit or tag, creating atomic git revert commits, pushing them, redeploying through the /ccc-deploy runners, and… | on demand |
| `/ccc-saas` | SaaS router: scaffold, auth, database, API, frontend, Stripe billing, webhooks, multi-tenancy, feature flags, metrics. | visible |
| `/ccc-safety` | Safety deck: dangerous actions Commander's hooks blocked, auto-fixes applied, and the tools that fail most, narrated here or published as a private snapshot… | on demand |
| `/ccc-save-session` | Save the session to a reloadable file: decisions, files, failures and why, exact next step. | visible |
| `/ccc-security` | Security audit: OWASP Top 10, secrets, dependency CVEs, prompt-injection defense, CodeQL, incident response. | visible |
| `/ccc-seo` | SEO router: technical audit and fixes, AI search optimization, content clusters, analytics, programmatic pages, backlinks. | visible |
| `/ccc-session` | Alias that routes session work to the canonical skills: save the current session with /ccc-save-session, or reload a saved one with /ccc-resume-session. | on demand |
| `/ccc-settings` | Settings hub: Commander preferences (name, level, cost ceiling, auto-routing, theme, animations, launch mode, Linear, reset) plus Claude Code permission mode,… | on demand |
| `/ccc-ship` | Ship menu: run a parallel pre-flight matrix with a GO, CAUTION or NO-GO scorecard, cut a tagged release with changelog, deploy to a platform, or roll back the… | on demand |
| `/ccc-smb-ops` | Small-business back office from a bank CSV or a typed list: 13-week cash-flow forecast, invoicing and AR chasing, payroll planning, CRM cleanup, expense… | on demand |
| `/ccc-sol-loop` | Review a change in a bounded loop with an OpenAI reviewer through the Codex CLI, answer each finding with the smallest fix, and stop at agreement or budget. | on demand |
| `/ccc-spawn` | Spin self-contained work off on demand: a background subagent, a separate session (Cowork spawn_task chip or CLI /spawn peer), or an independent expert pass;… | on demand |
| `/ccc-standup` | Write a yesterday / today / blockers standup from your commits, PRs, tracker issues and Commander session notes, or from rough notes you type. | on demand |
| `/ccc-start` | First-run Commander onboarding: detects the setup, offers new project, import, tour or skip, writes a start plan. | visible |
| `/ccc-suggest` | Recommends the one next /ccc-* skill or workflow from project state, with reasons and alternatives. | visible |
| `/ccc-systematic-debugging` | Root-cause debugging: reproduce, hypothesize, then fix once with a failing test first. | visible |
| `/ccc-takeover` | Take over an existing PR, branch or agent thread and finish its original goal while preserving contributor credit. | on demand |
| `/ccc-tasks` | Track work in one markdown file, tasks/todo.md, with checkboxes, P0-P3 priorities and status marks; no database, service or sync. | on demand |
| `/ccc-testing` | Write or plan tests: TDD, E2E, visual, load, regression, evals and verification, in an isolated worktree. | visible |
| `/ccc-triage` | Triage a GitHub repo's open issues and PRs with the gh CLI: flag stale, unlabeled and CI-failing items, propose labels and next actions, apply labels one… | on demand |
| `/ccc-tuneup` | Audit and safely optimize the local Commander setup: versions, junk, count drift, hooks, settings, MCP, cost. | visible |
| `/ccc-ultracode` | Run deep, multi-agent work as adversarially verified workflows: repo audits, branch reviews, migrations, fleets. | on demand |
| `/ccc-update` | Update the installed Commander plugin: detect install mode and versions, give the exact update commands, verify after restart. | visible |
| `/ccc-upgrade` | Maintainer-only vendor submodule updater: audits every submodule under vendor/ against upstream, shows commits and files behind, then updates the picked ones… | on demand |
| `/ccc-usage` | Usage and cost deck: estimated savings from routing to cheaper models, cost per day and cost by app, narrated here or published as a private snapshot page… | on demand |
| `/ccc-xray` | Project health scorecard: quality, docs, tests, deps, security, performance, CI and context cost, scored 0-100. | visible |
| `/ccc-yolo-setup` | Cut approval prompts safely: keep auto permission mode, add a vetted read-only allowlist plus secret deny rules, back up settings, and set bypassPermissions… | on demand |
<!-- skill-table:end -->

---

## Ecosystem Skills (alphabetical)

| Skill | Description |
|-------|-------------|
| `ab-test-setup` | Structured guide for setting up A/B tests with mandatory gates for hypothesis, metrics, and execution readiness. |
| `accessibility-compliance-accessibility-audit` | You are an accessibility expert specializing in WCAG compliance, inclusive design, and assistive technology compatibi... |
| `acpx-patterns` | Pre-built acpx usage patterns for background, parallel, and crash-resilient sessions |
| `acpx` | Use acpx as a headless ACP CLI for agent-to-agent communication, including prompt/exec/sessions workflows, session sc... |
| `ad-creative` | When the user wants to generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad ... |
| `advisor` | Anthropic Advisor Tool — pair a cheaper executor model with Opus for guidance. TRIGGER when: user asks about adviso... |
| `agency-orchestrator` | Integrate with Agency Orchestrator for multi-agent DAG workflows — parallel research, code review pipelines, deploy... |
| `ao` | Composio AO — spawn parallel agents with worktree isolation |
| `api-first-workflow` | API-first development — OpenAPI spec authoring, contract-first dev, SDK generation, mock servers, and API documenta... |
| `architecture-auditor` | Review cross-module boundaries, dependency direction, and architectural patterns. Use when 'audit architecture', 'che... |
| `auto-loop-patterns` | Pre-built /loop recipes with safety guards for autonomous recurring tasks. 10+ |
| `batch-migration` | /batch recipes for large-scale code changes across many files. Patterns for |
| `beginner-pm` | Beginner-friendly project manager mode. Translates plain English requests into Claude Code |
| `benchmark` | Detect performance regressions with browse daemon. Baselines page load, Core Web Vitals, and bundle sizes; compares b... |
| `bible-guide` | Interactive onboarding guide for the CC Commander — skill discovery, progressive disclosure, capability overview fo... |
| `brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifyi... |
| `brand-guidelines` | Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthrop... |
| `browse` | Fast headless browser for QA testing and site dogfooding. Navigate any URL, interact with |
| `business-analytics` | Master modern business analysis with AI-powered analytics, real-time dashboards, and data-driven insights. Build comp... |
| `c-level-advisor` | Complete virtual board of directors — 28 skills covering 10 C-level roles, orchestration, cross-cutting capabilitie... |
| `cache-monitor` | Analyze Claude Code and OpenClaw session costs and cache efficiency. |
| `canary` | Post-deploy canary monitoring. Watches the live app for console errors, |
| `caveman` | Ultra-compressed communication mode. Cuts ~75% of output tokens by speaking like caveman |
| `cc-plugin-registry` | Reports all installed plugins, vendor packages, phase coverage, conflicts, and scoring |
| `ccc-data` | Route data work to the right sub-skill: ETL/ELT pipelines, SQL tuning, charts and dashboards, machine learning, data ... |
| `ccc-design` | Route design and animation work to the right sub-skill: landing pages, design systems, motion, visual effects, named ... |
| `ccc-devops` | Route DevOps work to the right sub-skill: CI/CD pipelines, zero-downtime deploys, containers, AWS, Terraform, monitor... |
| `ccc-makeover` | Score project health with an X-Ray scan, apply the top recommendations one at a time with the user's OK, and show a b... |
| `ccc-marketing` | Route marketing work to the right sub-skill: content, SEO and AI search, conversion optimization, email and paid chan... |
| `ccc-mobile` | Route mobile work to one specialist sub-skill: React Native, Flutter, SwiftUI, Jetpack Compose, mobile testing, store... |
| `ccc-openclaw-coordination` | Hand tasks from a Claude Code session to agents on an OpenClaw gateway, get their replies inline, and confirm deliver... |
| `ccc-research` | Route research work to one specialist sub-skill: deep research, spec interviews, cross-model review, literature revie... |
| `ccc-saas` | Route SaaS work to the right specialist sub-skill: scaffolding, auth, database, API, frontend, Stripe billing, webhoo... |
| `ccc-safety` | Plugin skill (Commander deck) — Safety deck: blocked/auto-fixed/approved action outcomes + redacted tool-failure hot... |
| `ccc-security` | Route application security work to one specialist sub-skill: security audit, prompt-injection defense, dependency aud... |
| `ccc-seo` | SEO domain router: technical SEO, AI search optimization, content strategy and briefs, rankings, backlinks, site stru... |
| `ccc-smb-ops` | Small-business back office from a bank CSV or a typed list: 13-week cash-flow forecast, invoicing and AR chasing, pay... |
| `ccc-testing` | Testing domain router: picks the lane for TDD, E2E, visual regression, load testing, QA, regression checks, evals, Py... |
| `ccc-update` | Plugin skill — click-first update walkthrough: detect installed vs. latest, run marketplace + plugin update, restar... |
| `ccc-usage` | Plugin skill (Commander deck) — Usage & Cost deck: burn, estimated savings vs. an all-Opus baseline, saved/day + cos... |
| `chat-widget` | Build a real-time support chat system with a floating widget for users and an admin dashboard for support staff. Use ... |
| `churn-prevention` | When the user wants to reduce churn, build cancellation flows, set up save offers, recover failed payments, or implem... |
| `claude-api` | Build apps with the Claude API or Anthropic SDK. TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_a... |
| `claude-code-library` | The Claude Code prompt library (52 copy-paste prompts by SDLC phase) + a 7-module Claude Code Best Practices course. ... |
| `claude-md-refresh` | Analyze and refresh CLAUDE.md files against the latest CC Commander template |
| `claude-mem` | Persistent AI memory across Claude Code sessions — semantic search, auto-capture, knowledge compounding. Use when t... |
| `claude-peers-bible` | Master guide to Claude Peers — the built-in MCP server for multi-instance communication, coordination, and parallel... |
| `claudemd-auditor` | Audit your CLAUDE.md against the actual codebase — find stale instructions, missing context, and optimization oppor... |
| `clickhouse-io` | ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance... |
| `cloudcli` | CloudCLI — bridge to web-based Claude Code sessions for mobile access |
| `codex` | OpenAI Codex CLI wrapper — three modes. Code review: independent diff review via |
| `coding-standards` | Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, and Node.js development. |
| `cold-email` | Write B2B cold emails and follow-up sequences that get replies. Use when the user wants to write cold outreach emails... |
| `compass-bridge` | Shared state bridge between Claude Chat, Cowork, and Code. Uses markdown files at |
| `competitor-alternatives` | When the user wants to create competitor comparison or alternative pages for SEO and sales enablement. Also use when ... |
| `confidence-check` | Pre-execution confidence assessment. Rate confidence 0-100% across 4 dimensions |
| `configure-ecc` | Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules t... |
| `context-budget` | Visual context window budget analyzer — shows usage gauge, identifies bloat sources, recommends when to save sessio... |
| `context-hub` | Fetch curated API documentation using the chub CLI before writing code. Use when calling external APIs (OpenAI, Strip... |
| `context-mode` | Tool output sandboxing — 98% context reduction via FTS5 |
| `contextual-assist` | Proactive contextual suggestion system with 5 configurable levels. |
| `continuous-improvement` | Daily scan for new Claude Code techniques and best practices. Multi-agent approval pipeline routes GitHub/npm finding... |
| `continuous-learning-v2` | Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, an... |
| `corrective-framing` | Prompt engineering technique: present possibly-wrong claims to trigger correction instead of 'remember to X' reminder... |
| `cost-tracker` | Real-time cost tracking across all agent sessions with budget alerts |
| `cowork-bible` | Claude Desktop Cowork integration guide for CC Commander users. Cowork is Claude Desktop's |
| `cowork-plugin-builder` | Guide for building custom Cowork plugins that leverage CC Commander skills. Covers plugin |
| `database-migrations` | Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments acros... |
| `delegation-templates` | Structured subagent delegation with 7 agent types, report format enforcement, and model selection. Use when delegatin... |
| `design-review` | Designer's eye QA: finds visual inconsistency, spacing issues, hierarchy problems, |
| `desktop-preview-loop` | Server-browser-test-iterate development cycle using Claude Desktop's preview |
| `developer-icons` | Curated SVG tech stack icons for React/Next.js. TypeScript-first, SVGO-optimized, with light/dark/wordmark variants. ... |
| `dialectic-review` | Multi-agent opposing review for important decisions. Spawns FOR agent + AGAINST agent + Referee for synthesized analy... |
| `dispatch-bible` | Dispatch is Claude's background task execution system. Bible-optimized patterns for |
| `dispatch-templates` | Pre-built Dispatch task templates for common background workflows. 8 ready-to-use |
| `dispatching-parallel-agents` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| `dmux-workflows` | Multi-agent orchestration using dmux (tmux pane manager for AI agents). Patterns for parallel agent workflows across ... |
| `doc-coauthoring` | Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation,... |
| `document-release` | Post-ship documentation update. Reads all project docs, cross-references the |
| `email-capture` | Build email capture and newsletter signup components for Next.js + shadcn/ui projects. Signup forms, lead magnets, po... |
| `email-systems` | You are an email systems engineer who has maintained 99.9% deliverability across millions of emails. You've debugged ... |
| `evals-before-specs` | Define success criteria before writing specs. Progression: evals → spec → plan → implement → verify. Use when... |
| `executing-plans` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| `experiment-designer` | Use when planning product experiments, writing testable hypotheses, estimating sample size, prioritizing tests, or in... |
| `finishing-a-development-branch` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides comple... |
| `firecrawl-scraper` | Deep web scraping, screenshots, PDF parsing, and website crawling using Firecrawl API |
| `fleet` | Fleet Commander — launch, monitor, and manage parallel CC agent teams |
| `four-question-validation` | Post-implementation hallucination detection. Four questions to verify work |
| `free-tool-strategy` | You are an expert in engineering-as-marketing strategy. Your goal is to help plan and evaluate free tools that genera... |
| `freeze` | Restrict file edits to a specific directory for the session. Blocks Edit and |
| `frontend-patterns` | Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices. |
| `gdpr-data-handling` | Practical implementation guide for GDPR-compliant data processing, consent management, and privacy controls. |
| `gh-issues` | Fetch GitHub issues, spawn sub-agents to implement fixes and open PRs, then monitor and address PR review comments. U... |
| `github` | GitHub operations via `gh` CLI: issues, PRs, CI runs, code review, API queries. Use when: (1) checking PR status or C... |
| `graphify` | Build a knowledge graph from your codebase for 71.5x token reduction per query |
| `gstack-upgrade` | Upgrade gstack to the latest version. Detects global vs vendored install, |
| `guard` | Full safety mode: destructive command warnings + directory-scoped edits. |
| `health` | Run when Claude feels off, ignores rules, or hooks/MCP need auditing. |
| `i18n-localization` | Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL... |
| `init-decision-tree` | Interactive project initialization — questionnaire-driven setup that determines build type, selects skills, and gen... |
| `intercom-automation` | Automate Intercom tasks via Rube MCP (Composio): conversations, contacts, companies, segments, admins. Always search ... |
| `internal-comms` | A set of resources to help me write all kinds of internal communications, using the formats that my company likes to ... |
| `investigate` | Systematic debugging with root cause investigation. Four phases: investigate, |
| `iterative-retrieval` | Pattern for progressively refining context retrieval to solve the subagent context problem |
| `jpa-patterns` | JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagina... |
| `land-and-deploy` | Land and deploy workflow. Merges the PR, waits for CI and deploy, |
| `laravel-patterns` | Laravel architecture patterns, routing/controllers, Eloquent ORM, service layers, queues, events, caching, and API re... |
| `laravel-tdd` | Test-driven development for Laravel with PHPUnit and Pest, factories, database testing, fakes, and coverage targets. |
| `laravel-verification` | Verification loop for Laravel projects: env checks, linting, static analysis, tests with coverage, security scans, an... |
| `mcp-server-patterns` | Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod validation, stdio vs Streamable HTTP. U... |
| `metrics-dashboard` | Define and design a product metrics dashboard with key metrics, data sources, visualization types, and alert threshol... |
| `mintlify` | Build and maintain documentation sites with Mintlify. Use when |
| `mode-switcher` | Switch between optimized workflow modes — design, saas, marketing, research, writing, night, yolo, unhinged, cavema... |
| `monetization-strategy` | Brainstorm 3-5 monetization strategies with audience fit, risks, and validation experiments. Use when exploring reven... |
| `multi-agent-swarm` | Advanced multi-agent orchestration — swarm patterns, agent specialization, shared state, consensus, and supervision... |
| `multi-repo-orchestrate` | Cross-repo changes using Claude Code's --add-dir flag. Orchestrate changes across |
| `mywifi-platform` | MyWiFi Networks / Guest Networks platform patterns. Multi-tenant WiFi management, location provisioning, splash page ... |
| `n8n-mcp-setup` | Setup guide for n8n-MCP server — connect Claude Code to 400+ n8n integrations |
| `office-hours` | YC Office Hours — two modes. Startup mode: six forcing questions that expose |
| `openclaw-agent-scaffolder` | Scaffold a new OpenClaw agent from scratch. Interviews for requirements, then generates |
| `openclaw-bridge` | Bridge CC Commander skills and hooks to OpenClaw agent orchestration platform |
| `openclaw-ccc-bridge` | OpenClaw ↔ CCC Bridge — lets OpenClaw agents dispatch CCC tasks, browse skills, and manage sessions via the agent... |
| `openclaw-health-check` | Full OpenClaw system health audit. Checks all agents, gateway status, costs, memory, |
| `openclaw-management` | Complete OpenClaw management suite for Claude Code. Combines self-healing, |
| `openclaw-native` | Native integration with OpenClaw platform — auto-detection, skill sync, bidirectional hooks, agent profiles, memory... |
| `openclaw-patterns` | Production patterns from a 38-agent orchestration system — COMP protocol, atomic messaging, cost-aware routing, esc... |
| `operationalize-fixes` | After fixing a bug, don't stop — write tests, check for similar issues, update instructions. Every bug is a learnin... |
| `overnight-runner` | Run autonomous batch jobs overnight or during long unattended periods. Patterns for usage limit retries, batch checkp... |
| `paperclip-bridge` | Integration with Paperclip task management API for tracking CC Commander workflows |
| `paperclip-create-agent` | Create new agents in Paperclip with governance-aware hiring. Use when you need |
| `paperclip-create-plugin` | Create new Paperclip plugins with the current alpha SDK/runtime. Use when |
| `paperclip` | Interact with the Paperclip control plane API to manage tasks, coordinate with |
| `para-memory-files` | File-based memory system using Tiago Forte's PARA method. Use this skill whenever |
| `partner-logo-standard` | Standards and process for creating, cleaning, and maintaining vendor/partner SVG logos across GuestNetworks projects |
| `pci-compliance` | Master PCI DSS (Payment Card Industry Data Security Standard) compliance for secure payment processing and handling o... |
| `pentest-checklist` | This skill should be used when the user asks to \plan a penetration test\, \create a security assessment checklist\, ... |
| `performance-monitoring` | Full-stack performance monitoring — Core Web Vitals, APM, RUM, synthetic monitoring, and performance budgets |
| `plan-ceo-review` | CEO/founder-mode plan review. Rethink the problem, find the 10-star product, |
| `plan-design-review` | Review a UI/UX plan with a designer's eye. Rates each design dimension 0-10, explains what makes it a 10, then fixes ... |
| `plan-eng-review` | Eng manager-mode plan review. Lock in the execution plan — architecture, |
| `playground` | Connect to The Playground — a virtual social space where AI agents can meet, chat, and explore together. Use when t... |
| `postgres-patterns` | PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best pr... |
| `posthog-automation` | Automate PostHog tasks via Rube MCP (Composio): events, feature flags, projects, user profiles, annotations. Always s... |
| `project-guidelines-example` | Example project-specific skill template based on a real production application. |
| `project-kickoff` | Initialize a new project with full Claude Code + OpenClaw integration. |
| `python-patterns` | Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Pyt... |
| `realtime-architecture` | Real-time application architecture — WebSocket, SSE, pub/sub, presence, and collaborative editing patterns |
| `receiving-code-review` | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or tec... |
| `redis-patterns` | Redis patterns — data structures, caching strategies, pub/sub, rate limiting, session management, and operational b... |
| `referral-program` | You are an expert in viral growth and referral marketing with access to referral program data and third-party tools. ... |
| `remotion-best-practices` | Best practices for Remotion - Video creation in React |
| `remotion` | Generate walkthrough videos from Stitch projects using Remotion with smooth transitions, zooming, and text overlays |
| `requesting-code-review` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| `retro` | Weekly engineering retrospective. Analyzes commit history, work patterns, |
| `review` | Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM trust |
| `revops` | When the user wants help with revenue operations, lead lifecycle management, or marketing-to-sales handoff processes.... |
| `safeclaw-integration` | Docker-based isolated sessions for YOLO mode with resource limits |
| `sales-enablement` | When the user wants to create sales collateral, pitch decks, one-pagers, objection handling docs, or demo scripts. Al... |
| `self-healing` | Self-healing system patterns — circuit breakers, auto-restart, error budgets, graceful degradation, and auto-recovery |
| `sendgrid-automation` | Automate SendGrid email operations including sending emails, managing contacts/lists, sender identities, templates, a... |
| `senior-backend` | Designs and implements backend systems including REST APIs, microservices, database architectures, authentication flo... |
| `sentry-automation` | Automate Sentry tasks via Rube MCP (Composio): manage issues/events, configure alerts, track releases, monitor projec... |
| `session-compress` | Compress the current session into a dense, reloadable summary. Extracts key decisions, |
| `session-startup` | Auto-run at the start of every Claude Code session. Loads project context, |
| `setup-browser-cookies` | Import cookies from your real browser (Comet, Chrome, Arc, Brave, Edge) into the |
| `setup-deploy` | Configure deployment settings for /land-and-deploy. Detects your deploy |
| `ship` | Ship workflow: detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, crea... |
| `skill-evolution` | Self-evolving skills — analyzes session corrections, error patterns, and successful approaches to automatically pro... |
| `skill-stocktake` | Use when auditing Claude skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktak... |
| `slack-gif-creator` | Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and a... |
| `spawn-manager` | Spawn and manage multiple Claude Code peers for parallel development |
| `spec-interviewer` | Structured spec interview for new features and projects. Asks 5-7 targeted questions |
| `status-updates` | Send progress updates to Discord, Slack, or email at configurable intervals during long-running sessions |
| `strategic-compact` | Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary... |
| `subagent-driven-development` | Use when executing implementation plans with independent tasks in the current session |
| `supabase-cli` | Supabase CLI workflows — local dev, migrations, Edge Functions, type generation |
| `synapse` | Synapse — real-time agent observability and session analytics |
| `systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| `task-commander` | Multi-agent orchestration — Claude manages ACP agents (Codex, OpenCode, Kimi, Pi) for complex tasks |
| `taskmaster` | TaskMaster — structured PRD→task decomposition, complexity analysis, and implementation pipeline |
| `teach-impeccable` | One-time setup that gathers design context for your project and saves it to your AI config file. Run once to establis... |
| `trading-analysis` | Market data analysis for Kevin's trading workspace. Fetches quotes via yf, |
| `turborepo-monorepo` | (no description) |
| `twilio-communications` | Build communication features with Twilio: SMS messaging, voice calls, WhatsApp Business API, and user verification (2... |
| `ui-ux-pro-max` | AI-powered design intelligence — 161 reasoning rules, 67 UI styles, 57 font pairings |
| `unfreeze` | Clear the freeze boundary set by /freeze, allowing edits to all directories |
| `using-git-worktrees` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans -... |
| `using-superpowers` | Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before A... |
| `video-gallery` | Build video gallery and player components for Next.js + shadcn/ui projects. YouTube, Vimeo, and self-hosted video emb... |
| `visual-verify` | Chrome extension screenshot verification loop. Write UI code, open Chrome, |
| `voice-workflow` | Voice-optimized command flows for /voice coding sessions. Short voice aliases |
| `voicemode-setup` | Setup guide for VoiceMode — natural voice conversations with Claude Code via Whisper + Kokoro |
| `vscode-bible` | VS Code integration guide — rich buttons, keyboard shortcuts, walkthrough, snippets, and extension configuration fo... |
| `vue-nuxt` | (no description) |
| `web-scraper` | Web scraping inteligente multi-estrategia. Extrai dados estruturados de paginas web (tabelas, listas, precos). Pagina... |
| `whatsapp-automation` | Automate WhatsApp Business tasks via Rube MCP (Composio): send messages, manage templates, upload media, and handle c... |
| `whatsapp-cloud-api` | Integracao com WhatsApp Business Cloud API (Meta). Mensagens, templates, webhooks HMAC-SHA256, automacao de atendimen... |
| `wifi-captive-portal` | WiFi captive portal development patterns for guest WiFi networks. Splash pages, authentication flows, data capture, R... |
| `writing-plans` | Use when you have a spec or requirements for a multi-step task, before touching code |

---

## ⚠️ Directories without SKILL.md

- `business-pack`
- `engineering-pack`
- `finance-pack`
- `product-pack`

---

## 🏗 Starter Templates

| Template | Stack |
|----------|-------|
| `nextjs-shadcn-starter` | Next.js 15 + shadcn/ui + Drizzle + Better Auth |
| `turborepo-fullstack-starter` | Turborepo + pnpm + Fastify backend |
| `marketing-site-starter` | Next.js 15 + Tailwind v4 + Framer Motion |

---

*Skills live in `~/.claude/skills/` — load any with: "use the `skill-name` skill"*
*Templates live in `~/.claude/templates/`*
