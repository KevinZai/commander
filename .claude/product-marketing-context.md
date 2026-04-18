# CC Commander — Product Marketing Context

This file is the canonical reference for all ccc-marketing skills. Read this before generating any marketing content, copy, or messaging for CC Commander.

---

## Product Identity

**Name:** CC Commander (CCC)
**Version:** 2.2.0 "The Context Budget Release"
**Author:** Kevin Zicherman
**Social:** @kzic on X | kevinz.ai
**Repo:** github.com/KevinZai/commander
**Landing page:** KevinZai.github.io/cc-commander
**License:** MIT (free forever)
**Install:**
```
curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
```

**One-line description:** A comprehensive Claude Code configuration toolkit + interactive CLI project manager.

**Tagline:** "Every Claude Code tool. One install. Your AI work, managed by AI."

---

## What It Is

CC Commander is built from scanning 200+ articles from the Claude Code community and distilling them into a single install. It adds structure, memory, skills, and efficiency to stock Claude Code without replacing it.

Key components:
- 455 skills organized into 11 CCC domains
- Interactive CLI (`ccc`) with arrow-key menus, 10 themes, figlet branding
- Intelligence Layer — auto-scores task complexity, detects project stack, recommends skills
- Knowledge Compounding — sessions build on sessions via fuzzy matching + time decay
- 5-Layer Token Optimization Stack (see below)
- 17 vendor packages aggregated from the Claude Code ecosystem, auto-updated weekly
- 83 commands, 28 hooks (37 with ECC integration), tiered skill loading

---

## Key Stats (use these in copy — verified figures)

| Metric | Value |
|--------|-------|
| Skills | 455 |
| CCC domains | 11 |
| Commands | 83 |
| Hooks (kit-native) | 28 (37 with ECC) |
| Vendor packages | 17 |
| Themes | 10 |
| Token optimization layers | 5 |
| Context savings (context-mode) | 98% (315KB → 5.4KB) |
| Community articles synthesized | 200+ |

---

## Key Differentiators vs Stock Claude Code

1. **98% context savings** — context-mode sandboxes all tool output into SQLite + FTS5. Benchmark: 315KB → 5.4KB. No other Claude Code toolkit has this.
2. **455 skills in 11 domains** — one install covers design, testing, DevOps, marketing, SaaS, security, SEO, data, mobile, research, and makeover.
3. **Intelligence Layer** — auto-scores task complexity (0–100), detects project stack from package.json/Dockerfile, recommends the right skill automatically.
4. **Knowledge Compounding** — every session feeds the next via fuzzy matching and time decay. Stock Claude Code starts from zero.
5. **5-Layer Token Optimization Stack** — context-mode (98%) + RTK (99.5%) + tiered skills (~10K tokens loaded) + ClaudeSwap (rate rotation) + prompt caching (90% discount).
6. **17 vendor packages** — aggregates ECC, gstack, Superpowers, oh-my-claudecode, Compound Engineering, and 12 others. Scored and auto-updated weekly.
7. **Tiered skill loading** — essential (37), recommended (100), full (455). Install only what you need.
8. **Live rate meters** — ClaudeSwap failover shows real-time 5h/7d usage with heat-map coloring.

---

## 5-Layer Token Optimization Stack

| Layer | Tool | Savings |
|-------|------|---------|
| 1 | context-mode (SQLite/FTS5 sandboxing) | 98% per tool output |
| 2 | RTK (Rust Token Killer) | 99.5% on shell/git ops |
| 3 | Tiered skill loading | ~10K tokens per session |
| 4 | ClaudeSwap rate rotation | Zero rate-limit downtime |
| 5 | Prompt caching | 90% discount on repeated context |

No other toolkit stacks all five layers.

---

## ICP — Ideal Customer Profile

**Primary (highest intent):** Developers already using Claude Code who are hitting context limits, rate limits, or frustrated by starting from zero every session. Power users who want workflow structure, persistent memory, and efficiency without rebuilding from scratch.

**Secondary:** AI-assisted development enthusiasts building multi-agent systems. Teams standardizing Claude Code patterns across multiple developers.

**Tertiary:** Coding educators, team leads, and agency developers who need repeatable AI workflows at scale.

**Psychographic signals:**
- Has used Claude Code for more than 2 weeks
- Has hit the 200K context limit at least once
- Has manually written CLAUDE.md or custom hooks
- Follows Claude Code / Anthropic on X or GitHub
- Uses GitHub Copilot or Cursor as a reference point (but chose Claude Code for power)

---

## Competitive Landscape

| Competitor | Stars | CCC's edge |
|-----------|-------|------------|
| Stock Claude Code | N/A | Zero skills, zero memory, wastes 98% of context |
| Everything Claude Code (ECC) | 120K | Skills-only, no Intelligence Layer, no context-mode |
| gstack | 58K | Rules-focused, no interactive CLI, no domain routing |
| Superpowers | 29K | Commands-only, no skill system |
| oh-my-claudecode | 17K | Lightweight, minimal skills |
| Claude Code Best Practice | 26K | Reference docs, not executable tooling |

**CCC's moat:** The only toolkit with a 5-layer token optimization stack, Intelligence Layer auto-scoring, and domain routing. CCC also aggregates all competitors — ECC, gstack, and Superpowers are included as vendor packages.

---

## Messaging Pillars

Use these as the foundation for any headline, tweet, ad, or email:

1. **Context is precious** — "Your Claude Code wastes 98% of its context window. We fixed that."
2. **Skills replace amnesia** — "Stock Claude Code starts from zero every session. CCC remembers everything."
3. **Intelligence, not just tools** — "CCC doesn't just give you tools. It scores complexity, detects your stack, and recommends the right skill."
4. **One install, everything** — "455 skills, 17 vendors, 11 domains. One command."
5. **Open source, community-built** — "Built from 200+ community articles. MIT licensed. Free forever."

---

## Brand Voice

- Technical but accessible — write like a senior developer explaining to a smart colleague, not a marketer selling to a prospect.
- Confident, not arrogant — let numbers do the talking (98%, 455, 5 layers). Avoid superlatives.
- Kevin Z's personal voice — direct, no fluff. "Here's what I built and why." First-person works well for X/threads.
- Anti-marketing-speak — never use "revolutionary," "game-changing," "paradigm shift," or "unlock your potential." Use specific metrics instead.
- Short sentences. Active voice. Problem → solution → proof.
- It's OK to be opinionated: "Stock Claude Code is powerful but unfinished. CCC finishes it."

---

## Content Themes

Use these for ongoing content calendars, threads, and blog posts:

1. **Context Budget** — how to maximize your AI context window; the 98% stat; what context-mode actually does
2. **AI Workflow Automation** — hooks, modes (9 workflow modes), overnight YOLO builds, the daemon loop
3. **The Intelligence Layer** — complexity scoring 0–100, stack detection, skill recommendations; why "more tools" isn't the answer
4. **Community Aggregator** — how CCC distills 200+ articles and 17 vendor packages; the weekly auto-update pipeline
5. **Kevin Z's Build Diary** — personal stories from building a 38-agent AI system on a Mac Mini M4; what broke, what worked

---

## CCC Domains (the 11 skill domains)

| Domain | Sub-skills | Focus area |
|--------|-----------|------------|
| ccc-design | 39 | UI/UX, animation, responsive, component design |
| ccc-marketing | 45 | CRO, email, ads, social, content |
| ccc-saas | 20 | Auth, billing, API, multi-tenant |
| ccc-devops | 20 | CI/CD, Docker, AWS, monitoring |
| ccc-seo | 19 | Schema, SERP, Core Web Vitals |
| ccc-testing | 15 | TDD, E2E, coverage, regression |
| ccc-data | 8 | SQL, ETL, analytics, visualization |
| ccc-security | 8 | OWASP, secrets, hardening, pen-test |
| ccc-research | 8 | Competitive analysis, market research |
| ccc-mobile | 8 | React Native, Expo |
| ccc-makeover | 3 | /xray audit + /makeover swarm |

---

## Product Vocabulary (use these terms consistently)

- **CCC** or **CC Commander** — both acceptable shortforms; never "CCCommander" (no space looks odd)
- **skill** — a reusable behavior module (SKILL.md file); not "plugin" or "extension"
- **domain** — a group of skills covering a vertical (design, devops, etc.); not "category"
- **context-mode** — the SQLite/FTS5 sandboxing system; always hyphenated
- **Intelligence Layer** — always title-cased; the complexity scoring + stack detection + skill recommendation system
- **Knowledge Compounding** — always title-cased; session-to-session learning
- **tiered skill loading** — essential / recommended / full; always lowercase
- **hooks** — automated behaviors that run at lifecycle events (PreToolUse, PostToolUse, Stop, etc.)
- **vendor packages** — the 17 aggregated external repos; not "dependencies"
- **the aggregator** — informal name for the vendor aggregation system

---

## What to Avoid in Copy

- Claiming CCC "replaces" Claude Code — it extends it
- Overstating AI autonomy — it's tooling, not an agent that works independently
- Star counts that may be stale — only use stats from this file or verified at time of writing
- Calling it a "framework" — it's a toolkit and CLI
- Saying it works with "any AI" — it's Claude Code specific

---

## Author Bio (for bylines and about sections)

Kevin Zicherman (@kzic) built CC Commander while running a 38-agent AI system on a Mac Mini M4. He's a developer, product builder, and founder of MyWiFi Networks. He shares Claude Code workflow patterns at kevinz.ai and on X at @kzic.
