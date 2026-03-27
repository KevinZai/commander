# Claude Code Best Practices Bible v2
> Version 2.0 | Updated: 2026-03-27 | Non-coder friendly. Practical examples throughout.
> Sources: ykdojo 45 tips · claude-code-kit v0.5 · hooeem Claude Certified Architect Guide · aiedge_ Skills 2.0 Guide · dr_cintas Cowork Complete Guide · MichLieben Vibe Marketing ($7M B2B) · coreyganim Cowork Plugins Guide · GriffinHilly Weekly Loop/COMP System · bekacru Agent Auth Protocol · chddaniel Mobile Dev · Cloudflare Dynamic Workers · GitHub gitagent · LLM Routing Guide

> **Which document?** **BIBLE.md = learning guide (you are here).** CHEATSHEET.md = daily reference (quick lookup). SKILLS-INDEX.md = skill discovery (search by keyword/category).

---

## Table of Contents

- [Golden Rules](#golden-rules)
- [Stage 1: Starting a New Project](#stage-1-starting-a-new-project)
- [Stage 2: Daily Development Loop](#stage-2-daily-development-loop)
- [Stage 3: Building Features](#stage-3-building-features)
- [Stage 4: Debugging & Fixing](#stage-4-debugging--fixing)
- [Stage 5: Shipping & Production](#stage-5-shipping--production)
- [Stage 6: Long-Running & Autonomous Work](#stage-6-long-running--autonomous-work)
- [CLAUDE.md Templates](#claudemd-templates)
- [Skills Catalog](#skills-catalog)
- [Commands Reference](#commands-reference)
- [Tools Reference](#tools-reference)
- [Prompt Templates](#prompt-templates)
- [The 45 Tips — Quick Reference](#the-45-tips--quick-reference)
- [Power Combos](#power-combos) *(advanced only — full table in CHEATSHEET)*
- [Settings Reference](#settings-reference)
- [Claude Certified Architect — Domain Summary](#claude-certified-architect--domain-summary)

---

## Golden Rules

> For commands, CLI flags, and model tables see **CHEATSHEET.md**.

1. **Plan before coding** — `/plan` every multi-step task
2. **Context is milk** — fresh + condensed = best output
3. **Verify, don't trust** — always `/verify` before done
4. **Subagents = fresh context** — parallel work, no bloat
5. **CLAUDE.md = investment** — your rules compound over time
6. **Boring solutions win** — AI has a bias for complexity; push back
7. **Operationalize fixes** — every bug → test → rule update

---

## Stage 1: Starting a New Project

### Mindset
You're briefing a brilliant contractor who knows nothing about your project yet. The more complete your brief, the less time you waste in corrections. Invest 20 minutes upfront to save 10 hours later.

### Key Commands

```bash
# Step 1: Initialize project context
/init                    # Creates CLAUDE.md with project overview
/plan                    # Spec interview — Claude asks 5–7 questions

# Step 2: Set up the COMP system (4 files every project needs)
```

### The COMP System (from @GriffinHilly)
Every project gets exactly 4 files:

| File | What goes here | Who reads it |
|------|---------------|--------------|
| `CLAUDE.md` | How the AI should behave | Claude every session |
| `ORIENT.md` | What a human needs to know to work here | New team members |
| `MEMORY.md` | Accumulated decisions, gotchas, context | Claude + humans |
| `PLAN.md` | Roadmap, progress, next steps | Claude + humans |

Separate behavioral instructions from orientation from accumulated knowledge from direction. Each has different audience and update frequency.

### CLAUDE.md Quick-Start Template

```markdown
# CLAUDE.md — [Project Name]

## Stack
- Framework: [Next.js 15 / Laravel 11 / Vue 3]
- Language: [TypeScript / PHP]
- Database: [PostgreSQL]
- Testing: [Vitest / PHPUnit]

## Build & Test
- Dev: `npm run dev` | Build: `npm run build` | Test: `npm test`

## Rules
- Never change unrelated code
- Always write tests before implementing
- Commit after each milestone

## Active Tasks
See `tasks/todo.md`
```

### Kickoff Workflow

```
1. /init → generates baseline CLAUDE.md
2. /plan → spec interview → spec saved to tasks/spec-YYYYMMDD.md
3. New session with spec as context
4. Execute against spec
5. /verify after each milestone
```

### CLAUDE.md Gotchas

- **Don't edit mid-session** — invalidates the cache (costs more tokens)
- **Start lean** — add instructions only when you catch yourself repeating them
- **Static content first** — improves cache hit rate
- **Use `#` shortcut** — type `# always use TypeScript strict mode` → adds to CLAUDE.md automatically
- **Progressive Disclosure** — keep CLAUDE.md lean; trigger rules like "when X, read guide Y" (guides load on demand)

### Path-Specific Rules (Power Move)

Instead of one bloated CLAUDE.md, use `.claude/rules/` with YAML frontmatter:

```yaml
# .claude/rules/testing.md
---
paths: ["**/*.test.tsx", "**/*.spec.ts"]
---
# Testing Rules
- Always use describe/it blocks
- Mock external dependencies
- Test edge cases first
```

This loads **only** when editing matching files. Saves tokens. Works across the entire codebase regardless of directory depth.

---

## Stage 2: Daily Development Loop

### Mindset
Structure your day. AI works best in short focused sessions with clear handoffs. Don't let context bloat. Write HANDOFF.md before stopping. Start each session by reading it.

### The Weekly Loop (from @GriffinHilly)

**Weekly cadence:**
1. Download your saved bookmarks/articles
2. Have Claude read and categorize them
3. Identify anything new to add to your workflow
4. Run your Claude through the new patterns
5. Update CLAUDE.md with anything that stuck

```bash
# The bookmark pipeline (from github.com/griffinhilly/claude-code-synthesis)
# Every week: export bookmarks as HAR files → pipeline categorizes/embeds → search semantically
python search.py "agent orchestration pattern" --top-k 5
```

Your bookmarks are a curated signal. The pipeline turns them into a searchable knowledge base that improves your workflow automatically.

### Daily Session Structure

```
Morning:
1. Read tasks/todo.md and tasks/HANDOFF.md (if exists)
2. Load relevant CLAUDE.md context
3. /compact if picking up a long-running session
4. Execute on the top 1–3 tasks

Before stopping:
1. Write tasks/HANDOFF.md (see prompt template in §12)
2. Git commit all progress
3. Update tasks/todo.md
```

### Cowork: Daily Automation Mode

If you have Claude Cowork (desktop app), set up scheduled tasks for daily automation:

```
Setup: Claude Desktop App → Cowork mode → Settings > Cowork > Edit Global Instructions

Write your global instructions once (who you are, your projects, your format preferences).
Every task starts with this context loaded automatically.
```

**Example Global Instructions:**
```
I run a B2B SaaS company. My team uses Google Workspace and Slack.
Reports in Word format unless specified. Default landscape for slides.
My main projects: [list]. Preferred tone: direct, no jargon.
```

**Daily scheduled tasks (type `/schedule`):**

```
Monday 8am: Pull calendar, draft weekly priorities doc, save to Desktop.
Friday 4pm: Scan Downloads folder, sort new files into project folders.
Daily 12pm: Check Gmail for urgent messages, draft responses, save as text file.
```

**Cowork quota management:**
- Cowork tasks use significantly more quota than regular chat (agentic = more compute)
- One file-organization session ≈ dozens of regular messages
- Start with 1–2 scheduled tasks; monitor usage with `/usage`
- Complex multi-step pipelines: batch in one session rather than many small ones
- If quota is tight: use Chat mode for Q&A, Cowork only for execution

### Context Management Daily Rules

1. **Start a new session for each new topic** — don't chain unrelated work
2. **Compact at 40–50 turns** — not after context fills
3. **Static content first in CLAUDE.md** — improves cache hits
4. **Don't edit CLAUDE.md mid-session** — breaks the cache
5. **`/aside` for side questions** — preserves main context budget
6. **Subagents = fresh windows** — use them for parallel work

### Rate Limit Management (Cowork)

- Track usage: `/usage` or check Settings → Usage
- If hitting limits: switch to Haiku for bulk tasks, Sonnet for general work, Opus only for judgment calls
- Rate limits reset: check `/usage` for exact timing
- Max plan ($200/month) has higher Cowork limits than Pro ($20/month)

---

## Stage 3: Building Features

### Mindset
Never start coding without a spec. Claude's first attempt is usually directionally right but has rough edges. Plan, implement in small steps, verify each step, then move forward. For client deliverables, vibe coding is acceptable — but add tests for anything going to production.

### Key Commands

```bash
/plan          # Always first — spec interview before building
/tdd           # Test-driven development mode
/review        # After implementing
/verify        # Before marking done
/pr            # Create PR when ready
```

### Feature Build Workflow

```
1. /plan → spec document saved to tasks/
2. New session: load spec + execute
3. Write tests FIRST (TDD)
4. Implement until tests pass
5. /review → address feedback
6. /verify → confirm it's actually done
7. /checkpoint → git save
8. /pr → create draft PR
```

### For Non-Coders: Breaking Down Problems

**The decomposition rule:** If Claude can't one-shot it, break it smaller.

```
Big task → Sub-task 1 → Sub-task 1a
                      → Sub-task 1b
         → Sub-task 2
```

**Real example:** Building a voice transcription app
1. First: just download a model (nothing else)
2. Then: just record voice (nothing else)
3. Then: just transcribe pre-recorded audio
4. Finally: combine them

### Vibe Marketing / B2B Client Work (from @MichLieben)

For GTM and lead gen work, Claude Code + APIs is a force multiplier:

**The Vibe Marketing Stack:**
- **Conductor** — UI layer for running Claude Code + Codex side-by-side; branches, easy toggles
- **Claude Code** — primary engine for API calls, MCP connections, lead gen workflows
- **Codex** — backup when Claude Code gets stuck on a build

**8 APIs for B2B prospecting (connect via Claude Code):**
| API | Purpose |
|-----|---------|
| Wiza | Email + phone data |
| Apify | Web scraping + automation |
| Prospeo | Email finding + verification |
| Lemlist | Multi-channel outreach at scale |
| Instantly | Automated email sequences |
| OpenMart | Local business leads |
| FullEnrich | Phone numbers + verified emails |
| PredictLeads | Company signals + technographic data |

**Example workflow:**
```
"Use Exa API and Prospeo to build a lead list of [ICP].
For each company, pull their tech stack from PredictLeads.
Build a table with company, contact, email, phone, and top 3 outreach angles."
```

**Mini-tools for lead gen autopilot:**
- Build free tools (email finder, phone finder, signal finder) that live on your site
- Users input info → tool outputs leads → feeds your CRM
- Claude Code builds these in one session with the right API connections

**Conductor UI:** Solves the terminal-feels-clunky problem with Claude Code. Visual interface, branch management, easy Claude/Codex toggle. `conductor.dev`

**Progression:** Lovable (easiest, great for first projects) → Cursor (visual, good UI) → Claude Code (unlimited $200/mo, concurrent agents, best for GTM scale)

### Mobile Development with Claude Code (from @chddaniel)

**Shipper platform** — Claude Opus 4.6 builds complete iOS/Android apps:
- Complete mobile apps from one prompt
- iOS + Android compatibility handled automatically
- App store listing autofill (icon, screenshots, descriptions, keywords, privacy policy)
- Cost: ~$0.17/app
- Publishable from first prompt; built in 5 min, not months

Ask Claude: `"create a mobile app for my business"` or `"create an iOS app for [idea]"` via Shipper.

### Skills for Building Features

| Skill | When to use |
|-------|------------|
| `spec-interviewer` | Starting any feature > 1 day |
| `tdd-workflow` | Write tests first |
| `frontend-design` | Anti-slop design |
| `landing-page-builder` | High-converting pages |
| `laravel-patterns` | Laravel routing, Eloquent |
| `vue-nuxt` | Vue 3, Nuxt 4, Pinia |

### Multi-Agent Feature Building

```
"Spawn two subagents:
 - Agent 1: Build the API endpoint (use Sonnet)
 - Agent 2: Write the test suite (use Haiku)
 Have both report back when done."
```

Each subagent gets a fresh full context window — perfect for parallel work.

---

## Stage 4: Debugging & Fixing

### Mindset
Never fix a bug without finding the root cause first. The investigate-first rule prevents you from solving symptoms while the real problem festers. Every bug is a learning opportunity — operationalize the fix.

### Key Commands

```bash
# Bug workflow
investigate skill → root cause → write test → fix → operationalize
/verify              # Confirm fix works
```

### Bug Fix Workflow

```
1. DO NOT touch code yet
2. Use `investigate` skill — find root cause
3. Write a test that REPRODUCES the bug (watch it fail)
4. Commit the failing test
5. Fix the root cause (not the symptom)
6. Test passes → commit the fix
7. `operationalize-fixes` skill → check for similar bugs, update CLAUDE.md
8. /verify → confirm clean
```

### The Operationalize Rule (from @GriffinHilly)

> Don't just fix the bug. Write tests that catch the whole CLASS of similar bugs. Check for other instances. If it reveals a gap in your instructions, update CLAUDE.md. Every bug is a learning opportunity.

After every fix:
- Write tests that cover the whole pattern, not just this instance
- `grep -r "similar_pattern" ./src` — scan for other occurrences
- Add a rule to CLAUDE.md: "Never do X because it causes Y"

### Test-First Bug Fix (Anti-Sycophancy Rule)

```
"Write a failing test that reproduces this bug BEFORE attempting any fix.
Show me the test running and failing.
Then fix the root cause.
Then show the test passing."
```

This ensures Claude doesn't just patch the symptom and tell you it's fixed.

### Systematic Debugging Skill

```
"Use systematic-debugging skill on this error:
[paste error]

Steps to reproduce:
- [step]
- [step]
Expected: [behavior]
Actual: [behavior]"
```

### CI/CD Failure Investigation

```
"Investigate this CI failure: [paste URL or error]

Use gh CLI:
1. Find the failing step
2. Is it new or flaky? Check last 10 runs.
3. Find the commit that introduced it
4. Root cause (one sentence)
5. Draft fix as a PR"
```

---

## Stage 5: Shipping & Production

### Mindset
Shipping is a systems problem, not a code problem. Every deploy should be repeatable, verifiable, and reversible. Use draft PRs, tests, and staged deploys. Never merge without a review pass.

### Key Commands

```bash
/review          # Final code review
/verify          # Confirm working
/pr              # Create draft PR
/deploy          # Deploy command
/docs            # Generate/update docs
```

### Ship Workflow

```
1. Feature complete → /review
2. Address feedback → /verify
3. /pr → create DRAFT PR (safe — not merged yet)
4. Review diff in GitHub Desktop (visual)
5. CI passes → mark PR ready
6. /deploy
7. Verify in production (smoke test)
```

### Cloudflare Dynamic Workers — AI Agent Sandboxing (from Cloudflare blog)

**Why this matters:** Traditional containers take 100s of milliseconds to boot and 100s of MB of memory. When every user has an agent writing code, containers don't scale.

**Dynamic Workers = V8 isolate-based sandbox:**
- ⚡ **100x faster startup** than containers (few milliseconds vs hundreds)
- 💾 **10–100x less memory** per sandbox
- 🌍 Runs in every Cloudflare PoP worldwide (zero latency)
- 🔐 Battle-hardened security (8+ years of Workers security)
- 📈 Unlimited concurrency (same tech that handles millions of req/sec)
- 💰 Pricing: $0.002/unique Worker/day (waived during beta)

**Use cases:**
- Run AI-generated code safely without containers
- Let agents write and execute JavaScript against your APIs
- Build platforms where users' agents run code (Zite example: millions of executions/day)
- Code Mode: agent writes a single TypeScript function that chains API calls → runs in Worker → returns result (cuts token usage by 81%)

**Quick start:**
```javascript
// Have your LLM generate this code
let agentCode = `
  export default {
    async myAgent(param, env, ctx) {
      // agent does work here
    }
  }
`;

// Load it in a secure sandbox
let worker = env.LOADER.load({
  compatibilityDate: "2026-03-01",
  mainModule: "agent.js",
  modules: { "agent.js": agentCode },
  globalOutbound: null,  // block internet access
});

await worker.getEntrypoint().myAgent(param);
```

**TypeScript APIs > HTTP APIs for agents:**
- TypeScript interface: few tokens to describe, easy for agents to call
- OpenAPI spec: verbose, hard to narrow to exact capabilities
- Use TypeScript RPC for agent-facing APIs (see @cloudflare/codemode npm package)

**Available packages:**
- `@cloudflare/codemode` — DynamicWorkerExecutor, Code Mode SDK
- `@cloudflare/worker-bundler` — bundle npm packages for Dynamic Workers
- `@cloudflare/shell` — virtual filesystem for agents (read/write/search/diff, backed by SQLite + R2)

**Credential injection pattern:**
```javascript
// globalOutbound callback intercepts every HTTP request from the agent
// Inject auth keys → agent never sees the secret → can't leak it
globalOutbound: async (request) => {
  request.headers.set('Authorization', `Bearer ${env.SECRET_KEY}`);
  return fetch(request);
}
```

**Get started:** Workers Paid plan → [developers.cloudflare.com/dynamic-workers](https://developers.cloudflare.com/dynamic-workers)

### Verification Before Shipping

Multiple verification strategies:
1. **Tests** — let Claude write them; verify they don't just return `true`
2. **GitHub Desktop** — visual diff of all changed files
3. **Draft PRs** — review everything before marking ready
4. **Self-check prompt:** `"Double check every claim in your output. Make a table of what you could verify."`
5. **TDD pattern** — write tests first → fail → commit → implement → pass

### The Boring Solution Rule

> AI has a bias for complexity. Constantly push back.

After any implementation:
```
"Is this the simplest possible way to accomplish the goal?
Can this be fewer lines?
Are these abstractions earning their complexity?
What would you remove?"
```

---

## Stage 6: Long-Running & Autonomous Work

### Mindset
Autonomous agents need structure, checkpoints, and security boundaries. Never give an agent more access than it needs for the specific task. Plan for failure — every long-running job should be resumable.

### Overnight / Batch Work

```
"Use overnight-runner skill.

Task: [describe the batch job]
Hours available: 8
Checkpoint every: 30 min (write to tasks/checkpoint-HHMMSS.md)
On completion: notify via [method]
On error: write error details to tasks/errors.md and stop"
```

### Agent Auth Protocol — Production Security (from @bekacru)

**The problem:** Traditional OAuth gives coarse scopes (`mail.write`). Agents are non-deterministic — you don't know what they'll need, so you over-provision. Result: agent has access to everything, can do anything, at any time.

**Agent Auth Protocol** — makes each agent a first-class principal with its own identity:

**Core concepts:**

| Concept | What it means |
|---------|--------------|
| **Host** | The runtime (Claude Desktop, VS Code extension, CI pipeline) — stable identity |
| **Agent** | A specific session/chat — ephemeral, registered under a host |
| **Capability** | What the agent can do, with exact constraints |
| **Discovery** | Agents find services via `/.well-known/agent-configuration` or intent-based directory |

**Granular capabilities vs coarse scopes:**
```
# Bad: OAuth scope
Scope: mail.write   # What does "write" mean? Anything.

# Good: Agent Auth capability
Capability: "send email"
  - to: jane@company.com
  - subject: "Meeting invite: Q3 planning"
  - max_uses: 1
  - expires: 3600s
```

**Approval methods:**
- **Device Authorization** — familiar "visit URL + enter code" flow; universal fallback
- **CIBA** — server pushes notification to user (phone/email/app); approve without navigating anywhere

**Key rules for production:**
1. Every agent action must trace to a specific agent identity
2. Two different chats = two different agents = separate capabilities
3. Revoking one agent doesn't touch others
4. Agents can request new capabilities mid-session (`request_capability` escalation)
5. Works on top of existing OAuth infrastructure — no major app changes

**Quick start:**
```bash
npx auth ai   # Interactive wizard for client + server setup
```

**Public directory:** [agent-auth.directory](https://agent-auth.directory) — searchable index of Agent Auth services

**For production agents:** Never use bare credentials in agent prompts. Use credential injection (Cloudflare Dynamic Workers pattern) or Agent Auth Protocol capability constraints.

### Containers for Risky Tasks

Use containers when:
- Long-running autonomous tasks (`--dangerously-skip-permissions`)
- Experimental work (isolated from your main system)
- Multi-model orchestration

**SafeClaw** — [github.com/ykdojo/safeclaw](https://github.com/ykdojo/safeclaw) — isolated Claude sessions with web terminal dashboard.

### Git Worktrees for Parallel Work

Work on multiple branches simultaneously without conflicts:

```bash
# Claude can do this for you:
git worktree add ../feature-auth feature/auth-system
cd ../feature-auth
claude  # Full clean context window for this branch
```

**Combine with terminal tabs:**
```
Tab 1: Main (always left)
Tab 2: Feature branch A (worktree)
Tab 3: Feature branch B (worktree)
Tab 4: Current focus
```

### GitAgent — Git-Native Agent Standard (from github.com/open-gitagent/gitagent)

**The problem:** Every AI framework has its own agent structure. No portable standard.

**GitAgent:** A framework-agnostic, git-native standard. Clone a repo, get an agent.

**Required files (just 2):**
```
agent.yaml    # Manifest — name, version, model, compliance
SOUL.md       # Identity, personality, values
```

**Full structure:**
```
my-agent/
├── agent.yaml          # Manifest (required)
├── SOUL.md             # Identity (required)
├── RULES.md            # Hard constraints
├── DUTIES.md           # Segregation of duties
├── skills/             # Reusable capability modules
├── tools/              # MCP-compatible tool definitions
├── workflows/          # Multi-step YAML procedures
├── knowledge/          # Reference documents
├── memory/             # Persistent cross-session memory
│   └── runtime/        # Live state (dailylog.md, context.md)
├── hooks/              # Lifecycle handlers (bootstrap.md, teardown.md)
└── agents/             # Sub-agent definitions (recursive)
```

**Key patterns GitAgent supports:**
- **Human-in-the-loop** — agent opens PR for any skill/memory change
- **Segregation of duties** — maker/checker/executor/auditor roles; conflict matrix
- **Agent versioning** — every change is a git commit; rollback bad prompts
- **Branch deployment** — dev → staging → main just like shipping software
- **Knowledge tree** — entity relationships with embeddings for runtime reasoning

**Framework adapters (export to any runtime):**
```bash
gitagent export --format claude-code    # → CLAUDE.md
gitagent export --format openai         # → OpenAI Agents SDK
gitagent export --format crewai         # → CrewAI YAML
gitagent export --format openclaw       # → OpenClaw format
gitagent export --format gemini         # → GEMINI.md + settings.json
gitagent export --format cursor         # → .cursor/rules/*.mdc
```

**Get started:**
```bash
npm install -g gitagent
gitagent init --template standard
gitagent validate
```

### Context Crash Recovery

Each agent writes structured state to a known file:
```
tasks/checkpoint-HHMMSS.md:
- What was done
- What's in progress
- Files modified
- Next steps
- Any errors encountered
```

On resume:
```
"Load tasks/checkpoint-[latest].md and continue from where we left off."
```

---

## CLAUDE.md Templates

### Global CLAUDE.md (~/.claude/CLAUDE.md)

```markdown
# Global CLAUDE.md

## Operating Model
- You do the thinking. I do the doing. I ideate, decide, steer.
  You research, implement, execute.
- When uncertain: surface options with tradeoffs. Don't decide silently.

## Plan-First Protocol
Every task starts with: objective? success criteria? sub-tasks?
Research agents plan. Implementation agents execute. Never both.

## Scope Discipline
Push back on ambitious plans: "This is a 3-session project. Start with X?"
A working smaller thing beats a half-finished grand vision.

## Orchestrator-First
Before any task: handle directly, delegate to subagent, or route to MCP?
This is the single biggest lever for productivity.

## Anti-Sycophancy
If an approach has clear problems, say so. Propose an alternative. Accept override.
Sycophancy is a failure mode.

## Test-First Bug Fixing
When a bug is reported: write a test that reproduces it BEFORE attempting fix.
Watch it fail. Then fix the root cause. Then watch it pass.

## Operationalize Every Fix
Don't just fix the bug. Write tests for the whole class.
Check for similar instances. Update CLAUDE.md if it reveals a gap.

## Evals Before Specs
Define how success will be evaluated BEFORE writing the spec.
Order: evals → spec → plan → implement → verify.

## Prefer the Boring Solution
Can this be fewer lines? Are abstractions earning their complexity?
Don't build 1,000 lines when 100 suffice.

## Structured > Prose
For rules I MUST follow: use XML tags and JSON, not markdown paragraphs.
Tagged content is processed differently.

## Corrective Framing (Anti-Drift)
Instead of "remember to do X", present: "You should be doing X — still doing it?"
Mismatches trigger natural correction.

## Context Rules
- Static content goes first in CLAUDE.md (cache efficiency)
- Don't edit CLAUDE.md mid-session (breaks cache)
- Compact at 40–50 turns, not when context is full
- Use /aside for side questions (preserve main budget)

## Workflow Evolution
When a session reveals a new pattern, encode it here.
Use your tools to improve your tools. It's a flywheel.
```

### Project CLAUDE.md Template

```markdown
# CLAUDE.md — [Project Name]

## Stack
- Framework: [Next.js 15 / Laravel 11 / Vue 3]
- Language: [TypeScript / PHP / Python]
- Database: [PostgreSQL / MySQL]
- Testing: [Vitest / PHPUnit / Pytest]

## Build & Test
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Architecture
[Key decisions, patterns, folder structure]

## Rules
- Never change unrelated code
- Always write tests before implementing
- Commit after each milestone
- Use context7 for library docs (not training data)

## Active Tasks
See `tasks/todo.md`

## Gotchas
[Known pitfalls, things that tripped us up]
```

### ORIENT.md Template (for human readers)

```markdown
# ORIENT.md — [Project Name]

## What this project does
[One paragraph]

## How to run it locally
[Steps]

## Key files and where things live
[Map of important files]

## Who to ask about what
[Contacts or notes]

## Known issues / quirks
[Things that will confuse a new developer]
```

---

## Skills Catalog

### How Skills Work

Skills are reusable instruction sets that load only when needed (token-efficient). Three types:

| Type | Where stored | Scope |
|------|-------------|-------|
| Skills | `~/.claude/skills/` or project `.claude/skills/` | On-demand |
| CLAUDE.md | `~/.claude/CLAUDE.md` or `./CLAUDE.md` | Always loaded |
| Plugins | Installed via Cowork sidebar | Bundle of skills + connectors + commands |

**Invoke any skill:**
```
"Use the spec-interviewer skill"
"Follow the tdd-workflow skill"
"Use my brand-voice skill for this LinkedIn post"
```

### Skills 2.0 — New Features (March 2026, from @aiedge_)

**1. Built-in Evals & Testing**
- Before saving a skill: write realistic test prompts → Claude runs them with AND without the skill → outputs scored + displayed
- You review actual outputs and leave feedback
- Know your skill works before shipping it

**2. A/B Testing**
- Compare two versions of the same skill against identical prompts
- Made a change? Run A/B test to confirm improvement
- Use it: `"A/B test these two versions of my brand-voice skill"`

**3. Trigger Optimization**
- Automatically rewrites and tests your skill's description until it triggers reliably
- Fixes: skill doesn't trigger, skill triggers at wrong times
- Use it: `"Optimize my trigger description for this skill"`

### Building Great Skills (from @aiedge_)

1. **Reverse prompting:** `"I want to build [X] skill — ask me 10–50 questions first"`
2. **Reverse building:** `"Based on everything you know about me, what Skills would help?"`
3. **Context dump:** Paste PDFs, attach docs — more context = better skill
4. **Use existing chats:** `"Use everything from this chat as context for building a [X] skill"` — Claude knows your preferences from the conversation history
5. **Iterate:** First output = rough draft. Read it, list changes, refine. 3 iterations to get it right.
6. **Include a real example:** One strong example inside the Skill file is worth ten bullet points of instruction
7. **QC checklist:** End every skill with 3–5 self-check questions Claude runs before responding
8. **Manual review:** Always read the skill file yourself — painful once, saves time forever

**Build a skill from scratch:**
```
You are building a Claude Skill — a reusable instruction set in markdown format.

My Skill is for: [describe the task]

Context Claude needs:
- My name / brand: [name]
- My audience: [who]
- My tone and voice: [how]
- My standards: [what good looks like]
- What to avoid: [don'ts]

Write a complete SKILL.md that:
1. Opens with one-line description
2. Defines Claude's role when Skill is active
3. Lists exact rules Claude must follow
4. Includes at least one example of great output
5. Ends with a quality checklist Claude runs before responding
```

**Skill resources:**
- SkillsMSP marketplace: [skillsmp.com](https://skillsmp.com) — 500,000+ skills ready to download
- Awesome Claude Skills: [github.com/ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)
- Anthropic Complete Guide: [resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)

### 🎯 Essential Skills by Category

#### Planning & Execution

| Skill | Invoke | Use when |
|-------|--------|---------|
| `spec-interviewer` | "use spec-interviewer skill" | Starting any feature > 1 day |
| `evals-before-specs` | "use evals-before-specs" | Define "done" BEFORE writing specs |
| `writing-plans` | "use writing-plans skill" | Need structured plan |
| `executing-plans` | "use executing-plans skill" | Have a plan, need execution with checkpoints |
| `delegation-templates` | "use delegation-templates" | Dispatching to subagents |
| `dialectic-review` | "use dialectic-review" | Important decision — FOR/AGAINST/Referee |

#### Code Quality & Review

| Skill | Invoke | Use when |
|-------|--------|---------|
| `review` | "use review skill" | Code review |
| `tdd-workflow` | "use tdd-workflow" | Write tests first |
| `systematic-debugging` | "use systematic-debugging" | Broken, need root cause |
| `investigate` | "use investigate skill" | Never fix without root cause |
| `operationalize-fixes` | "use operationalize-fixes" | After fixing: test → sweep → update rules |
| `verification-before-completion` | "use verification-before-completion" | Proof before marking done |

#### DevOps & Infra

| Skill | Invoke | Use when |
|-------|--------|---------|
| `github` | "use github skill" | gh CLI: issues, PRs, CI |
| `gh-issues` | "use gh-issues" | Fetch issues → spawn subagents to fix |
| `docker-development` | "use docker-development" | Docker/container work |
| `senior-devops` | "use senior-devops" | CI/CD, cloud, infrastructure |
| `overnight-runner` | "use overnight-runner" | Unattended batch jobs |

#### Design & Frontend

| Skill | Invoke | Use when |
|-------|--------|---------|
| `frontend-design` | "use frontend-design" | Anti-slop design |
| `landing-page-builder` | "use landing-page-builder" | High-converting landing page |
| `polish` | "use polish skill" | Final quality pass |
| `critique` | "use critique skill" | Evaluate design effectiveness |
| `bolder` | "use bolder skill" | Design is boring, needs amplification |

#### Business & SEO

| Skill | Invoke | Use when |
|-------|--------|---------|
| `saas-metrics-coach` | "use saas-metrics-coach" | ARR, MRR, churn, LTV, CAC |
| `seo-optimizer` | "use seo-optimizer" | Technical SEO audit |
| `ai-seo` | "use ai-seo" | Optimize for AI search |
| `aaio` | "use aaio" | Agentic AI Optimization |
| `cold-email` | "use cold-email skill" | B2B cold outreach |
| `churn-prevention` | "use churn-prevention" | Cancellation flows |

#### Context & Memory

| Skill | Invoke | Use when |
|-------|--------|---------|
| `strategic-compact` | "use strategic-compact" | Manual context compaction |
| `session-startup` | "use session-startup" | Consistent session start |
| `overnight-runner` | "use overnight-runner" | Long autonomous batch jobs |

### Cowork Plugins (from @coreyganim)

Plugins bundle: skills + connectors + slash commands + sub-agents.

**11 Official Anthropic Plugins (shipped Jan 30, 2026 — all free, open source):**

| Plugin | Slash Commands | Purpose |
|--------|---------------|---------|
| Sales | `/sales:call-prep`, `/sales:account-plan`, `/sales:objection-handling` | Prospect research, call briefs |
| Marketing | `/marketing:seo-audit`, `/marketing:email-sequence`, `/marketing:competitive-brief` | Content + SEO |
| Legal | `/legal:contract-review`, `/legal:compliance-check` | Risk analysis |
| Finance | Budget analysis, forecasting | Financial modeling |
| Customer Support | Ticket response, escalation | Support workflows |
| Product Management | `/pm:prd`, `/pm:roadmap` | PRDs, roadmaps |
| Data Analysis | `/data:clean-dataset`, `/data:visualize` | Dashboards, cleaning |
| Enterprise Search | Cross-platform search | Company-wide search |
| Biology Research | Literature review | Experiment design |
| Productivity | Task management, meeting prep | Scheduling |
| Plugin Create | Build custom plugins | Meta-plugin |

**Browse:** `github.com/anthropics/knowledge-work-plugins`

**Install:** Cowork → Customize (sidebar) → Browse Plugins → Add plugin

**Custom plugin structure:**
```
my-plugin/
├── plugin.json           # Manifest
├── commands/
│   └── my-command.md     # Slash command definition
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── .mcp.json             # Connector config
```

**Build a plugin:**
```
"I want to build a plugin for [workflow].
Walk me through creating the structure, skills, and commands.
My workflow: [describe steps].
My tools: [list tools/APIs]."
```

---

## Commands Reference

### 🔥 Daily Slash Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/init` | Create `CLAUDE.md` for the project | First time in new repo |
| `/help` | Show all commands + keyboard shortcuts | When lost |
| `/clear` | Clear conversation, fresh start | New topic, stuck agent, bloated context |
| `/compact` | Smart compress context | Every 40–50 turns |
| `/new` | Start fresh same session | New sub-topic without full reset |
| `/model` | Switch model for session | Need more power mid-task |
| `/think` | Enable extended reasoning | Hard architecture decisions |
| `/plan` | Spec-first planning | Before ANY multi-step task |
| `/review` | Code review pass | After implementing |
| `/verify` | Full verification | Before saying "it's done" |
| `/cost` | Show token usage + cost | Checking spend |
| `/context` | Show what's in current context | When confused |
| `/context-budget` | How much context used vs remaining | Before long tasks |
| `/memory` | View/edit CLAUDE.md files | Updating project rules |
| `/doctor` | Diagnose Claude Code setup | Something broken? |
| `/add` | Add files/dirs to active context | Claude doesn't know about a file |
| `/aside` | Quick side question, keeps main context | Quick question mid-task |
| `/checkpoint` | Git checkpoint | Mid-work safety save |
| `/complete` | Mark task done with verification | Finishing a task |
| `/resume` | Resume a previous session | Continuing yesterday's work |
| `/pr` | Create pull request | Ready to merge |
| `/deploy` | Deploy to production | Shipping |
| `/docs` | Generate/update docs | After building something |
| `/usage` | Check rate limits | Worried about hitting limits |
| `/stats` | Usage stats + activity graph | Curious about usage |
| `/chrome` | Toggle native browser integration | Need logged-in browser state |
| `/mcp` | Manage MCP servers | Adding/checking integrations |
| `/release-notes` | What's new in current version | Staying current |
| `/fork` | Fork current session | Try different approach |
| `/permissions` | Manage approved commands | Security audit |
| `/schedule` | Schedule a Cowork task | Cowork mode autopilot |

### 💻 CLI Entry Points

```bash
claude                               # Start interactive session
claude "fix the TypeScript errors"   # One-shot task
claude -p "explain this" < file.ts   # Print mode (pipe-friendly)
claude -c                            # Continue last conversation
claude --resume abc123               # Resume specific session by ID
claude update                        # Update Claude Code to latest
claude mcp list                      # List MCP servers
claude config list                   # List all config values
```

### 🚀 Key CLI Flags

| Flag | What it does |
|------|-------------|
| `--model <model>` | Set model (overrides config) |
| `--headless` | No interactive UI (CI/CD use) |
| `-p` | Non-interactive print mode (required for CI!) |
| `--output-format json` | JSON output for scripting |
| `--json-schema <schema>` | Structured JSON output with schema |
| `--add-dir <path>` | Add directory to initial context |
| `--max-turns <n>` | Limit agentic loop iterations |
| `--dangerously-skip-permissions` | Skip all permission prompts (containers only) |
| `--verbose` | Show detailed tool call output |
| `--debug` | Enable debug logging |
| `--fork-session` | Fork session on continue |

**CRITICAL for CI:** Always use `-p` flag in CI scripts or the job hangs waiting for interactive input.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current generation |
| `Ctrl+D` | Exit Claude Code |
| `Ctrl+R` | Reverse search history |
| `Shift+Enter` | Insert newline |
| `Tab` | Autocomplete slash commands |
| `Ctrl+B` | Move running bash command to background |
| `Ctrl+V` | Paste image from clipboard |
| `Ctrl+G` | Open prompt in external editor |
| `Cmd+A` / `Ctrl+A` | Select all (paste pages into Claude) |
| `Ctrl+W` | Delete previous word |
| `Ctrl+U` | Delete to start of line |
| `Ctrl+K` | Delete to end of line |
| `↑` / `↓` | Browse input history |

### 🔧 Quick Terminal Aliases

```bash
alias c='claude'
alias ch='claude --chrome'
alias cs='claude --dangerously-skip-permissions'  # containers only

# Fork shortcut
claude() {
  local args=()
  for arg in "$@"; do
    [[ "$arg" == "--fs" ]] && args+=("--fork-session") || args+=("$arg")
  done
  command claude "${args[@]}"
}
# Usage: c -c --fs  (fork the last session)
```

---

## Tools Reference

### Cloudflare Dynamic Workers (NEW — 2026)

**Purpose:** Isolate AI-generated code execution. 100x faster than containers.

**When to use:**
- Running AI-generated code safely
- Code Mode (agent writes TypeScript, runs in sandbox, returns result)
- Building platforms where users' agents execute code
- Any "give the agent compute" scenario

**Get started:** Workers Paid plan required. [developers.cloudflare.com/dynamic-workers](https://developers.cloudflare.com/dynamic-workers)

**Key packages:** `@cloudflare/codemode`, `@cloudflare/worker-bundler`, `@cloudflare/shell`

### v0 by Vercel (UI Mockup Tool)

**Purpose:** Generate React/Tailwind UI components from descriptions or screenshots.

**When to use:**
- Rapid UI prototyping
- "Make it look like [site]"
- Starting point for frontend components

**Access:** [v0.dev](https://v0.dev) | Pricing: [v0.dev/pricing](https://v0.dev/pricing)

**Workflow:** Describe UI → v0 generates component → paste into Claude Code for customization

### agentplace.io (No-Code Agents)

**Purpose:** No-code agent creation and deployment platform.

**When to use:**
- Non-technical users who need an agent without coding
- Rapid agent prototyping
- Business process automation without engineering resources

**Access:** [agentplace.io](https://agentplace.io)

### companies.sh (Company Directory)

**Purpose:** Company directory and data lookup.

**When to use:**
- B2B prospecting research
- Company intelligence gathering
- ICP discovery

**Access:** [companies.sh](https://companies.sh)

### gitagent (Git-Native Agent Framework)

**Purpose:** Framework-agnostic, git-native standard for defining AI agents.

**When to use:**
- You want portable agent definitions that work across Claude Code, OpenAI, LangChain
- You want version control for your agent's prompts and rules
- Building compliant agents (FINRA, SEC, SOD requirements)
- Team needs shared agent definitions

**Get started:**
```bash
npm install -g gitagent
gitagent init --template standard
gitagent validate
gitagent export --format claude-code  # generates CLAUDE.md
```

**Access:** [github.com/open-gitagent/gitagent](https://github.com/open-gitagent/gitagent)

### Anthropic Official Courses

**When to use:** Structured learning path, official best practices.

| Course | URL |
|--------|-----|
| Building with Claude API | anthropic.skilljar.com/claude-with-the-anthropic-api |
| Intro to MCP | anthropic.skilljar.com/introduction-to-model-context-protocol |
| Claude Code in Action | anthropic.skilljar.com/claude-code-in-action |
| Claude 101 | anthropic.skilljar.com/claude-101 |

All at: [anthropic.skilljar.com](https://anthropic.skilljar.com)

### Conductor (UI for Claude Code)

**Purpose:** Visual interface for running Claude Code (and Codex) side-by-side.

**When to use:**
- Claude Code's terminal feels clunky
- Want to run agents concurrently with branch management
- Toggle between Claude and Codex easily

**Access:** `conductor.dev` (requires Claude + OpenAI accounts)

### SocratiCode (Codebase Intelligence)

```
"Use SocratiCode to find all places we handle payment errors"
"Index this codebase and tell me the architecture"
```

### Playwright MCP (Browser Automation)

```
"Screenshot the homepage"
"Run the signup flow and verify it works"
"Use playwright to test the checkout"
```

### Available MCP Servers (Always On)

| MCP | Say this... | For... |
|-----|------------|--------|
| `context7` | "use context7" | Latest library docs |
| `playwright` | "screenshot this" | Browser automation, E2E testing |
| `github` | "check the repo" | Personal GitHub |
| `github-gn` | "check Guest Networks repo" | GN org GitHub |
| `n8n-mcp` | "run the workflow" | n8n automation |
| `granola` | "check my meeting notes" | Meeting transcripts |
| `claude-peers` | "message the agent" | Agent-to-agent comms |

---

## Prompt Templates

### Handoff Prompt (Between Sessions)

```
Before I start a new session, write a HANDOFF.md to tasks/HANDOFF.md.

Include:
- What we were building (one sentence)
- Current state — what's done, what's in progress
- What we tried that didn't work (important!)
- The next 3 specific steps
- Any file paths or context the next agent needs
- Any gotchas or warnings

Be comprehensive. The next agent gets ONLY this file.
```

### Bug Fix Prompt

```
There's a bug: [DESCRIBE THE BUG]

Steps to reproduce:
- [step 1]
- [step 2]
Expected: [what should happen]
Actual: [what happens instead]

Error output: [paste error]

Rules:
- Find root cause BEFORE writing any code (use investigate skill)
- Do not change unrelated code
- Write a test that reproduces the bug FIRST
- Watch it fail. Then fix. Then watch it pass.
- After fixing: run /verify and confirm the test passes
- Then use operationalize-fixes: check for similar bugs, update CLAUDE.md
```

### Code Review Prompt

```
Review the recent changes in this repo (or file: [FILENAME]).

Focus on:
1. Correctness — does it do what was intended?
2. Security — any vulnerabilities or exposure?
3. Performance — any obvious inefficiencies?
4. Maintainability — hard to change in 6 months?
5. Edge cases — what inputs could break this?

Format: severity (critical/major/minor), file+line, issue, suggested fix.
Skip nitpicks. Prioritize critical issues first.
```

### Architecture Review Prompt

```
Review the architecture of [COMPONENT/SYSTEM].

Context: [what it does, who uses it, scale]
Current state: [describe current architecture]

Evaluate:
1. Scalability — will it hold at 10x current load?
2. Reliability — single points of failure?
3. Security — attack surface?
4. Operational complexity — hard to debug?
5. Cost efficiency — unnecessary spend?

Output: verdict (keep/change/rebuild), specific recommendations, priority order.
```

### Research Prompt

```
Research: [TOPIC]

I need to know:
- [specific question 1]
- [specific question 2]
- [specific question 3]

Sources to check: [GitHub repo / Reddit / URLs]

Output:
- Summary (3–5 bullets)
- Key findings table
- Sources cited
- Confidence level per claim (high/medium/low)

Double-check every factual claim.
```

### PR Description Prompt

```
Create a PR description for these changes.

Format:
## Summary
[1–2 sentences: what changed and why]

## Changes
[bullet list]

## Testing
[what was tested, how to test]

## Breaking changes
[yes/no — if yes: what and migration path]

Keep it under 200 words. No filler.
```

### CI Failure Investigation

```
Investigate this CI failure: [URL or paste error]

Steps:
1. Identify the failing test/step
2. Check if new failure or flaky (check last 10 runs via gh CLI)
3. Find the commit that introduced it
4. Identify root cause — be specific
5. Propose a fix

Output: root cause (1 sentence), evidence, proposed fix.
```

### Subagent Dispatch Prompt (from delegation-templates skill)

```
Spawn a [Implementer/Researcher/Reviewer/Batch/Explorer] subagent.

Task: [specific, scoped task]
Context they need: [paste all relevant context — subagents don't share memory]
Model: [Sonnet for execution / Haiku for bulk / Opus for judgment]
Report format:
- What was done
- What files were changed
- Any issues encountered
- Recommended next steps

Return all results to me when complete.
```

### Evals-First Prompt

```
Before we write the spec for [feature], define success.

Write an evals document that describes:
1. What the happy path looks like (with example inputs/outputs)
2. Edge cases that must be handled correctly
3. What failure looks like (should NOT happen)
4. How we'll verify it's working (test strategy)

Save to tasks/evals-[feature].md
Then we'll write the spec.
```

---

> **Troubleshooting?** See CHEATSHEET.md for common issues, fixes, and mistakes.

---

## The 45 Tips — Quick Reference (ykdojo)

| # | Tip | Key Action |
|---|-----|-----------|
| 0 | Customize status line | `scripts/context-bar.sh` — shows model, branch, token usage |
| 1 | Learn essential slash commands | `/usage`, `/chrome`, `/mcp`, `/stats`, `/clear` |
| 2 | Use voice input | SuperWhisper / MacWhisper / built-in voice mode |
| 3 | Break down large problems | Decompose until each piece is solvable |
| 4 | Git and GitHub CLI | Let Claude commit, branch, push, create draft PRs |
| 5 | Context is like milk | Fresh + condensed = best performance |
| 6 | Get output out of terminal | `/copy`, `pbcopy`, write to file → open in VS Code |
| 7 | Terminal aliases | `c='claude'`, `ch='claude --chrome'` |
| 8 | Proactively compact | Write HANDOFF.md, then `/clear` + new session |
| 9 | Write-test cycle | Write code → run → check → repeat |
| 10 | Cmd+A and Ctrl+A | Select-all pages, Reddit posts → paste into Claude |
| 11 | Gemini CLI fallback | For sites Claude can't fetch |
| 12 | Invest in your workflow | CLAUDE.md, aliases, tools are your edge |
| 13 | Search conversation history | `~/.claude/projects/` — JSONL files |
| 14 | Multitask with terminal tabs | Cascade left-to-right, max 3–4 tasks |
| 15 | Slim the system prompt | Patch CLI to save ~10k tokens per session |
| 16 | Git worktrees | Parallel branches in separate directories |
| 17 | Manual exponential backoff | Check CI/Docker with `1min → 2min → 4min` |
| 18 | Writing assistant | Draft → go line by line → refine iteratively |
| 19 | Markdown is the format | Write everything in markdown |
| 20 | Notion preserves links | Slack/web text → Notion → Claude (links survive) |
| 21 | Containers for risky tasks | `--dangerously-skip-permissions` only in containers |
| 22 | Best way to learn: use it | The "billion token rule" |
| 23 | Clone/fork conversations | `/fork`, `--fork-session`, or `/dx:clone` |
| 24 | Use `realpath` | Get absolute paths for files in other folders |
| 25 | CLAUDE.md vs Skills vs Plugins | CLAUDE.md = always; Skills = on-demand; Plugins = bundles |
| 26 | Interactive PR reviews | `gh` to fetch PR → go file by file |
| 27 | Research tool | Google/deep research + GitHub + Reddit + Slack MCP |
| 28 | Verify output | Tests, GitHub Desktop, draft PRs, self-check |
| 29 | DevOps engineer | CI failures → `gh` CLI → root cause → draft PR fix |
| 30 | Keep CLAUDE.md simple | Start empty, add only repeated instructions |
| 31 | Universal interface | Video edit, audio transcription, data analysis |
| 32 | Right level of abstraction | Vibe coding OK sometimes; dig deeper when it matters |
| 33 | Audit approved commands | `npx cc-safe .` — check for risky permissions |
| 34 | Write lots of tests | TDD: tests first → fail → commit → implement → pass |
| 35 | Be brave in the unknown | Iterative problem solving works even in unfamiliar territory |
| 36 | Background commands | `Ctrl+B` moves to background; subagents run in parallel |
| 37 | Era of personalized software | Build custom tools for yourself |
| 38 | Navigate input box | readline shortcuts: `Ctrl+A`, `Ctrl+E`, `Ctrl+W`, `Ctrl+K` |
| 39 | Plan but prototype quickly | Plan early decisions; prototype to validate |
| 40 | Simplify overcomplicated code | Ask "why did you add this?" — AI has bias for more |
| 41 | Automation of automation | Any repeated task → automate it |
| 42 | Share knowledge | Teaching → learning |
| 43 | Keep learning | `/release-notes`, r/ClaudeAI, follow @adocomplete |
| 44 | Install dx plugin | `/dx:gha`, `/dx:handoff`, `/dx:clone`, `/dx:reddit-fetch` |
| 45 | Quick setup script | `bash <(curl -s .../setup.sh)` — sets up all tips |

---

## Power Combos

> Full table in CHEATSHEET.md. These are the advanced/unique combos:

| Goal | Workflow |
|------|---------|
| **AI agent sandbox** | CF Dynamic Workers → generate code → run in isolate → result (100x faster than containers) |
| **Secure agent deploy** | Agent Auth Protocol → register agent → granular capabilities → CIBA approval |
| **Portable agent def** | gitagent init → SOUL.md + agent.yaml → export to any framework |
| **B2B lead gen** | Connect APIs (Wiza/Prospeo/PredictLeads) → describe ICP → Claude builds list |
| **Weekly workflow** | Download bookmarks → Claude reads + categorizes → update CLAUDE.md with new patterns |

---

## Settings Reference

### `.claude/settings.json`

```json
{
  "model": "claude-sonnet-4-6",
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Bash(gh *)",
      "Read(**)",
      "Write(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)"
    ]
  },
  "env": {
    "NODE_ENV": "development",
    "DISABLE_AUTOUPDATER": "1",
    "ENABLE_TOOL_SEARCH": "true"
  },
  "attribution": {
    "commit": "",
    "pr": ""
  }
}
```

### `.mcp.json` (Project MCP Config)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

Note: `${GITHUB_TOKEN}` expands from environment variables — keeps credentials out of version control. Each developer sets their own tokens locally.

### System Prompt Slimming

Claude's default system prompt + tool definitions = ~19k tokens. Patch saves ~10k tokens:

```json
// ~/.claude/settings.json
{
  "env": {
    "DISABLE_AUTOUPDATER": "1",
    "ENABLE_TOOL_SEARCH": "true"
  }
}
```

---

## Claude Certified Architect — Domain Summary

> From @hooeem's teardown of the Anthropic partner exam. Learn these patterns = production-grade Claude applications.

### Domain 1: Agentic Architecture & Orchestration (27%)

**The #1 mistake:** Assuming subagents share context with the coordinator. **They don't.** Every piece of information must be passed explicitly in the prompt.

**Anti-patterns to reject:**
- Parsing natural language to determine loop termination (use `stop_reason` instead)
- Arbitrary iteration caps as primary stopping mechanism
- Checking for assistant text as completion indicator

**Key rules:**
- When stakes are financial or security-critical: enforce programmatically with hooks (not just prompts)
- Hub-and-spoke: coordinator handles task decomp + routing + error handling; subagents never talk to each other
- All communication flows through the coordinator
- Parallel spawning: emit multiple Task tool calls in one coordinator response

**Session management:**
- Resume: prior context still valid
- Fork: explore divergent approaches from shared baseline
- Fresh + injected summary: when context degraded or files changed

### Domain 2: Tool Design & MCP Integration (18%)

**Tool descriptions are the primary mechanism for tool selection** — not few-shot examples, not classifiers. Vague descriptions → misrouting.

**Good tool description includes:**
- What the tool does (primary purpose)
- What inputs it expects (formats, constraints)
- Example queries it handles well
- Explicit boundaries: when to use THIS tool vs similar tools

**Optimal:** 4–5 tools per agent, scoped to its role. 18 tools degrades selection reliability.

**`tool_choice` options:**
- `"auto"` — model may return text or call a tool
- `"any"` — must call a tool, picks which
- `{"type": "tool", "name": "X"}` — must call specific tool (use for mandatory first steps)

**MCP scoping:**
- Project-level (`.mcp.json`): version-controlled, shared
- User-level (`~/.claude.json`): personal, NOT shared

### Domain 3: Claude Code Config & Workflows (20%)

**CLAUDE.md hierarchy:**
- User-level (`~/.claude/CLAUDE.md`): only YOU get this — NOT version-controlled, NOT shared
- Project-level (`.claude/CLAUDE.md`): everyone gets this — version-controlled, shared
- Directory-level: applies to files in that specific directory only

**Path-specific rules (`.claude/rules/`):**
- Use YAML frontmatter glob patterns
- Load only when editing matching files
- Better than directory CLAUDE.md for cross-codebase patterns (e.g., all test files)

**Plan mode vs direct execution:**
- Plan mode: complex multi-file changes, architectural decisions, multiple valid approaches
- Direct execution: single-file bug fix, clear scope, approach already known

**CI/CD:** Always use `-p` flag for non-interactive mode. Without it: job hangs.

**Independent review:** Same session that generated code is less effective at reviewing it. Use separate review instance.

### Domain 4: Prompt Engineering & Structured Output (20%)

**"Be conservative" doesn't work. Be explicit:**
```
Wrong: "Only report high-confidence findings"
Right: "Flag comments only when claimed behaviour contradicts actual code behaviour.
        Report bugs and security vulnerabilities. Skip style preferences."
```

**Few-shot examples = most effective technique** for consistency. 2–4 targeted examples with reasoning for ambiguous cases.

**`tool_use` with JSON schemas** eliminates syntax errors. Does NOT prevent semantic errors.

**Schema design for extractions:**
- Optional/nullable fields when source may not contain info → prevents hallucination
- `"unclear"` enum value for ambiguous cases
- `"other"` + freeform string for extensible categorization

**Batch API (Message Batches):**
- 50% cost savings, up to 24-hour processing
- Use for: overnight reports, weekly audits, latency-tolerant work
- DON'T use for: blocking workflows (pre-merge checks, anything developers wait for)
- Does NOT support multi-turn tool calling within one request

### Domain 5: Context Management & Reliability (15%)

**Progressive summarization trap:** Condensing loses transactional data. Fix: persistent "case facts" block (order numbers, amounts, dates) — never summarize, include in every prompt.

**"Lost in the middle" effect:** Put key summaries at the beginning, not buried in the middle.

**Three valid escalation triggers:**
1. Customer explicitly requests a human (honor immediately, no investigation first)
2. Policy gaps or exceptions
3. Agent cannot make meaningful progress

**Two unreliable triggers (exam will try to trick you):**
- Sentiment analysis (frustration ≠ complexity)
- Self-reported confidence scores (model is often wrong about its own confidence)

**Error propagation:**
- Include: failure type, what was attempted, partial results, alternatives
- Never: silently suppress errors or kill entire pipeline on single failure
- Valid empty result ≠ access failure (don't retry if the answer is "no results")

---

## Appendix: For Non-Coders

### How to Give Instructions That Actually Work

```
Context: [what this is, what it does]
Task: [exactly what you want done]
Constraints: [what NOT to do, tech to use]
Verification: [how you'll know it's done]
```

**Good vs bad:**
- ❌ "Fix the bug" → no context
- ✅ "The login form throws `Error: undefined is not a function` when clicking Submit. Fix it. Don't change the UI. Test with `/verify` when done."

### Voice Input

- Claude Code has built-in voice mode
- SuperWhisper (polished Mac app) — better local accuracy
- Speak as if to a smart colleague on a phone call
- Claude understands mistranscribed words from context
- Works whispered through earphones in public

### Writing with Claude Code

1. Give full context: "I'm writing a LinkedIn post about X for audience Y, tone: Z"
2. Let it draft
3. Go line by line: "I like this, change that, move this paragraph"
4. Save as Markdown → paste into Notion to convert formats

**Markdown tip:** Paste markdown into Notion first, then copy from Notion into Google Docs / LinkedIn. Notion handles conversion cleanly.

---

*Last updated: 2026-03-27*
*Sources: ykdojo/claude-code-tips (45 tips) · claude-code-kit v0.5 (219 skills) · hooeem Claude Certified Architect (5 domains) · aiedge_ Skills 2.0 Guide · dr_cintas Cowork Complete Guide · MichLieben Vibe Marketing · coreyganim Cowork Plugins · GriffinHilly Weekly Loop + COMP System · bekacru Agent Auth Protocol · chddaniel Mobile Dev with CC · Cloudflare Dynamic Workers blog · GitHub open-gitagent/gitagent · LLM Routing Quickref*
*Update this file when you learn something new. That's the point.*
