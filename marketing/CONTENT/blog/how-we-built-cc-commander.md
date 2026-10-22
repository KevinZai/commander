---
title: "How We Built CC Commander"
status: DRAFT (local file only; not published, scheduled or sent)
ticket: CC-322 (slice 1 of the 20-post "How We Built CC Commander" play)
audience: Claude Code developers who have installed it and are not yet productive with it
sources:
  - 18-master-narrative.md from the April 2026 strategy notes (spine, Kevin's voice; internal, not in this repo)
  - .../00-session-overview.md, 03-pricing-monetization.md, 19-launch-tagline-positioning.md
  - commander/contract.json and package.json (current facts, v8.1.0)
  - CLAUDE.md (current product architecture and revenue model)
---

<!--
EDITOR NOTES (delete before publishing)
The April 2026 narrative predates the current product. Facts below were updated from the repo;
the items in the "Reconcile" list need Kevin's call before this ships.

Reconcile:
1. Counts. April copy said 456 skills / 15 agents / 19 vendors / v4.0. Repo today: 84 plugin skills,
   22 agents, 467 ecosystem skills, 11 domains, 20 vendors, v8.1.0 (commander/contract.json).
2. Pricing. April copy described a 1,000 calls/month cap and a mandatory feedback gate. contract.json
   says "free-forever-with-pro-tier", Pro price TBD, nothing charged. Draft uses the contract wording
   and keeps the $50-to-free pivot as history. Confirm the feedback-gate paragraph is still true; it is
   cut here.
3. Positioning. "1 MCP server, every AI IDE" was the April hook. CLAUDE.md now says the primary product
   is the Desktop plugin, with the CLI and Codex mirror supported. Draft leads with the plugin and
   mentions the hosted MCP as one surface. Confirm.
4. Unverified claims dropped: "21,000+ skills on SkillsMP", "140,000-star" competitor, "23 competitors",
   "85-90% token savings". They are in the April docs but not re-checked; add back only with a source.
5. Names: "Kevin" appears in the April text in third person; converted to first person. ReadyIQ pivot
   kept as one line; confirm the brand separation is still public.
-->

# How We Built CC Commander

Every Claude Code developer I know has the same guilty secret: they've spent more time configuring their AI setup than building with it.

The official getting-started path is short. The community's is not. There are skill libraries, hook recipes, CLAUDE.md templates, and every week a thread explaining why last week's thread was wrong. I was stuck in that loop for months. I collected the best patterns I could find, and I ended up with a personal setup that made me measurably faster.

Then every developer I showed it to asked the same thing: "How do I get this?"

That question became the product.

## The insight: people fail at setup, not at AI

The first version of what became CC Commander was a zip file. I emailed compressed `.claude/` directories to friends with a README that said "unzip this into your home folder." The second version was a 400-line shell script that worked on my machine and occasionally did something catastrophic on yours.

What unlocked the product wasn't technical. Claude Code users aren't failing at AI. They're failing at setup. The distance between "I installed Claude Code" and "I'm using it productively" was 20 to 40 hours of trial and error for most people I watched. That isn't a documentation gap. It's a product gap.

So the pitch became a PM, not a config dump: **a guided AI PM to master Claude Code instantly.** Something that reads your project, tells you the next move, routes to the right skill, and pushes back when you're wrong.

## What it is today

CC Commander is a PM and orchestration layer over Claude's agent capabilities. As of v8.1.0:

- **A Desktop plugin** (the primary product) with 84 `/ccc-*` skills, 22 specialist agents, and 30 lifecycle hook events backed by 51 handlers.
- **A CLI toolkit** with an ecosystem catalog of 467 skills across 11 domains, and a Codex mirror generated from the same source.
- **Two bundled credential-free MCP servers** and 16 opt-in connectors. Nothing that needs your credentials starts until you ask for it.
- **MIT licensed.** Core skills, agents, hooks and workflows are free. A Pro tier is planned but nothing is charged yet, and the contract says so in plain words.

## Six pivots, each with a reason

I wrote these down as they happened, because the reasoning is the useful part.

**1. Scope down and ship the rebrand.** The planning session began with seven uncommitted files and a plugin that rendered as "Ccc" in the marketplace. I had an 11-section audit planned. I shipped the one thing that mattered: renaming the plugin slug from `ccc` to `commander`. Three commits. A clean win beat a stalled comprehensive plan.

**2. Research before build.** I was about to write new agents from memory. The pushback was: agents must ship with the latest patterns, not the ones we already know. The research found our agents used 6 of 16 documented frontmatter fields, that 9+ newer hook events existed that we weren't using, and that a new model with a new effort level had launched that very day. Building first would have shipped agents that were already out of date.

**3. From $50 to free.** My first instinct was premium: $50 a month, unlimited. "Don't race to the bottom." The counterargument was hard to beat. Cursor is $20 with millions of users, and the main open-source competitor was free with an enormous following. You can't cold-start a product at $50. Data comes before the premium. So the core stayed free, and revenue moved to disclosed affiliates, consulting, an optional community and sponsorship.

**4. Plugin to plugin plus MCP server.** A single question changed the vision: "What if Commander shipped as an MCP server too?" That meant it could reach other IDEs, validate things server-side, learn which skills actually get called, and load skill content on demand instead of dumping everything at session start. We locked the decision in that conversation and the hosted MCP is live today.

**5. Keep the brands separate.** Should this live under my consumer-safety company? Different audience, different brand, different eventual buyer. Developer tools and family safety share nothing. Separate from day one, and form an entity when the overhead is cheaper than the risk, not before.

**6. Soft feedback instead of a hard payment gate.** The original beta would have required a credit card. A better idea: ask for feedback instead. Survey answers from a hundred real users are worth more than a handful of early subscriptions that churn when pricing changes. (See the editor note: the exact feedback mechanics need to be re-confirmed against the current product before this paragraph is restored in detail.)

## How it's built

CC Commander is an aggregator with opinions. It pulls in 20 vendor packages, scores them against a capability matrix, and exposes the best of each through one interface. The scoring is out in the open: capability, GitHub stars, recency and user preference, with weights you can tune.

The dispatcher scores task complexity, detects your stack from files like `package.json` and `Dockerfile`, and routes to the right skill with no configuration.

The part I'm proudest of is the voice. Every agent has two layers: a shared PM-consultant base (decisive, structured, anti-sycophantic) and a role layer on top. The security auditor leads with CWE and OWASP references. The debugger follows one law: no fix without a confirmed root cause. The fleet worker reports in a format its parent can parse without interpretation. A reviewer should sound like a reviewer.

## The meta-point

The original v4 plan came out of a single eight-hour strategy session run with Commander's own multi-agent system. Seven subagents ran in parallel: a researcher on competitor pricing, an analyst mapping 14 IDEs, an auditor reviewing 28 lifecycle hooks, a CLAUDE.md refresher against Anthropic's latest docs, and an orchestrator folding it into 13 strategy documents.

The tool planned itself. The competitor analysis behind the pricing decision came from the researcher persona in about 90 minutes. That is what "guided AI PM" looks like in practice: not a blank prompt and not a config file, but a system with opinions and enough discipline to disagree when it should.

## Where it goes from here

The vision is simpler than the implementation: every developer who uses Claude Code should have a guided PM in their corner. The through-line is still the problem that started this. The gap between "I installed Claude Code" and "I'm productive" should be 60 seconds, not 40 hours.

We're working on the 60 seconds.

**Try it:** install the plugin from the `commander-hub` marketplace (see the README for the exact command at your version), run `/ccc`, and tell us what broke.

---

## Series hooks (for the other 19 posts; not part of this post)

Each pivot is a standalone follow-up: the rebrand, research-before-build, the pricing reversal, plugin plus MCP, brand separation, the feedback gate. The 20-title list lives in `17-public-content-strategy.md`; this slice does not cover it.
