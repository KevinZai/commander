---
name: ccc-start
description: "First-run onboarding for CC Commander. Detects setup, introduces the 22 specialist agent personas, and drafts a personalized start plan. Use when the user types…"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - EnterPlanMode
  - ExitPlanMode
argument-hint: "[new | existing | tour | skip]"
---

# /ccc-start — First-Run Onboarding

This is the welcome mat. User installed CC Commander, and the Desktop app routed them here. Goal: make them feel oriented in under 90 seconds, give them a real artifact (a plan file) to anchor the next session, and never force them to type a number.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. ASCII hero (read banner.txt + interpolate version)

Read `${CLAUDE_PLUGIN_ROOT}/lib/banner.txt` via Read tool. Replace `{{VERSION}}` with the version string from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. Render in a fenced code block.

After the banner, add a single welcome line:
> **Welcome to CC Commander** — let's get you oriented in under 90 seconds.

### 2. Context strip (one paragraph, markdown)

Detect setup with **parallel checks** (one Bash call, chained with `&&`, silent on failure). Never hardcode counts — compute them live, same as the VERSION read:
- `ls ~/.claude/plugins/*/plugin.json 2>/dev/null | wc -l` → other plugins installed
- `ls ~/.claude/plans/ 2>/dev/null | wc -l` → prior plans
- `git rev-parse --show-toplevel 2>/dev/null` → inside a repo?
- `ls ${CLAUDE_PLUGIN_ROOT}/agents/*.md 2>/dev/null | wc -l` → agents available
- `ls -d ${CLAUDE_PLUGIN_ROOT}/skills/*/ 2>/dev/null | wc -l` → plugin skills
- `node -e "console.log(Object.keys(require('${CLAUDE_PLUGIN_ROOT}/.mcp.json').mcpServers||{}).length)" 2>/dev/null` → bundled MCPs

Render a one-line summary:

> 🧭 Setup: `<N>` plugins installed · `<M>` existing plans · repo: `<name or "none">` · agents available: `<computed>` · MCPs: `<computed>` bundled (16 opt-in via /ccc-connect)

If first-time (no plugins, no plans, no repo): "🧭 Fresh install — let's set you up in under 2 minutes."

### 3. The picker — `AskUserQuestion` with 4 intents

**Never render a numbered list. Never tell the user to type a number.** Call `AskUserQuestion` with exactly these four options. Prepend ⭐ to the recommended one based on context (logic below).

```
question: "How do you want to start?"
header: "CC Commander onboarding"
multiSelect: false
options:
  - label: "🚀 Set up a new project"
    description: "Blank canvas — we scaffold a web app, API, CLI, or mobile app and write the first plan file together."
    preview: "Routes to /ccc-build after a 3-question spec interview. ~90 seconds."
  - label: "📦 Import existing project"
    description: "Point us at your repo — we scan, write CLAUDE.md, and recommend the right agents for your stack."
    preview: "Runs stack detection + writes a personalized plan to ~/.claude/plans/."
  - label: "🗺️ Just show me around"
    description: "Quick tour of the specialist agent personas, plugin skills, and bundled MCP servers (use the live counts from the context strip). No commitment."
    preview: "Routes to /ccc-browse — browse agents and skills by category."
  - label: "⏭️ Skip — I know what I'm doing"
    description: "Drop me at the main /ccc hub. No onboarding."
    preview: "Jumps straight to the top-level picker."
```

**Recommendation logic** (⭐ on ONE option):
- Inside a git repo with code files but no `CLAUDE.md` → ⭐ "Import existing project"
- Fresh install, no repo detected → ⭐ "Set up a new project"
- Repo exists AND has CLAUDE.md → ⭐ "Just show me around"
- Argument `skip` passed → skip the picker, route straight to `/ccc`

## Handle the selection

### New project → spec interview → plan file

Cascade via `AskUserQuestion` (3 quick questions, ≤4 options each):

1. "What are you building?" → Web app / API / CLI / Mobile
2. "Who's the audience?" → Solo/team / SMB / Enterprise / Public
3. "What's the first milestone?" → MVP demo / First paying user / Open-source launch / Internal tool

Then write the plan file:
1. Check the system-reminder for a "Plan File Info" block — if present, use that path.
2. If no plan mode is active: call `EnterPlanMode` and use the path it returns.
3. Write the plan to the resolved path containing:
   - Project type, audience, milestone
   - 3 recommended agents from the live roster (see matrix below; count from the context strip)
   - Next 3 concrete steps
   - The `/ccc-build-<type>` command to run next
4. Call `ExitPlanMode` to surface the plan in the Desktop Plan pane.

Finally: invoke `ccc-build` skill to scaffold.

### Import existing → scan + plan

Parallel Bash scan:
- `ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null` → stack
- `git log --oneline | head -5` → activity signal
- `grep -l "CLAUDE.md" . 2>/dev/null` → already configured?

Then route through the `/ccc-adopt` skill — it already does the safe CLAUDE.md flow (diff preview → AskUserQuestion approval → backup → delimited write). Never freeform-write CLAUDE.md from an architect brief here; adopt owns that surface. After adopt completes, write the start plan (recommended agents + next 3 steps) via EnterPlanMode → write → ExitPlanMode.

Return: one-line summary + path to the plan.

### Show around → browse

Invoke `ccc-browse` skill inline. User picks a category, we cascade.

### Skip → main hub

Invoke `ccc` skill inline. No wrapping text — the next picker does the work.

## The 22 agents (for reference when recommending)

Read `${CLAUDE_PLUGIN_ROOT}/agents/` if you need the live frontmatter. Baseline matrix:

| Persona | Best for |
|---------|---------|
| 🏗️ architect | System design, tech selection, refactoring strategy |
| 🔨 builder | TDD implementation, feature work, bug fixes |
| 🐛 debugger | Root-cause investigation, Iron Law enforced |
| 🔍 reviewer | PR review, severity-rated findings |
| 🧪 qa-engineer | Test suites, coverage, edge cases |
| 🔐 security-auditor | OWASP audits, CVE mapping, remediation |
| ⚡ performance-engineer | Hot-path profiling, N+1, bundle size |
| 🎨 designer | UI/UX, frontend implementation, anti-slop |
| 🚀 devops-engineer | CI/CD, deploys, infra, monitoring |
| 🎯 product-manager | PRDs, user stories, Linear issues |
| 📝 technical-writer | Docs, READMEs, API reference |
| 🔬 researcher | Competitive, market, lit review |
| 📊 data-analyst | Cohort analysis, insights, viz specs |
| ✍️ content-strategist | Editorial calendars, content pillars |
| ⚙️ fleet-worker | Parallel batch work (migrations, sweeps) |
| 🔷 typescript-reviewer | TypeScript-specific code review, type safety |
| 🐍 python-reviewer | Python-specific code review, idioms, packaging |
| 🐹 go-reviewer | Go-specific code review, concurrency, error handling |
| 🦀 rust-reviewer | Rust-specific code review, ownership, unsafe audit |
| ☕ java-reviewer | Java-specific code review, JVM patterns, Spring |
| 🟣 kotlin-reviewer | Kotlin-specific code review, coroutines, Android |
| 🟦 csharp-reviewer | C#-specific code review, .NET patterns, async |

Pick **3** based on context signal (e.g. Next.js repo → designer + builder + qa-engineer).

## Anti-patterns — DO NOT do these

- ❌ Render a numbered list "1. New project, 2. Existing, ..." — always use AskUserQuestion
- ❌ Dump HTML fenced blocks expecting artifact rendering — Cowork Desktop shows them as code
- ❌ Tell the user to "type the number" — pickers only
- ❌ Reference the legacy CLI (`ccc` npm binary) — this is the Desktop plugin audience
- ❌ Hardcode VERSION — always read from plugin.json
- ❌ Hardcode agent/skill/MCP counts — compute them live from the plugin directory (context strip checks)

## Brand rules

- **Always read `VERSION` from plugin.json** — the marketplace sometimes caches; if plugin.json has `<installed-version>` and GitHub has newer, surface that in the context strip.
- **Emoji-forward, concise** — PM Consultant voice, decision up front.
- **The plan file is the artifact** — every onboarding flow ends with a real file the user can open.
- **Never mention legacy CLI modes** — `ccc --interactive`, `ccc --split`, etc. are out of scope here.

## Plan file template

When writing the plan file (path from `EnterPlanMode` or existing session plan path):

```markdown
# CC Commander Start Plan — <date>

**User path:** <new | existing | tour | skip>
**Project:** <name or "unnamed">
**Stack detected:** <list or "none">
**Recommended agents:** <3 agents with one-line why each>

## Next 3 steps

1. [ ] <concrete action with /ccc-<command>>
2. [ ] <concrete action>
3. [ ] <concrete action>

## Quick links

- `/ccc` — main hub
- `/ccc-browse` — browse all skills + agents
- `/ccc-plan` — write a feature plan
- [CC Commander docs](https://commanderplugin.com)

---

Written by `/ccc-start` on <timestamp>.
```

## L. Optional: Answer-first output mode

After the plan file is written, offer a one-time optional output-style toggle. NON-BLOCKING — user can skip. Recommend it (⭐) when the user's path was "new" or "existing" (beginners benefit most); no star needed on "tour"/"skip".

```
question: "Want answer-first output? (optional — skip if you prefer)"
header: "CC Commander — Output style"
multiSelect: false
options:
  - label: "⚡ Answer-first output"
    description: "Great for beginners — the fix is always the first line. Command and file:line follow, context last."
    preview: "Based on ayghri/i-have-adhd (MIT). Writes {\"adhd\": true} to ~/.claude/commander/output-mode.json. Toggle anytime with /ccc-adhd off."
  - label: "📝 Keep the normal style"
    description: "Standard CCC voice — context and reasoning woven in, not just answer-first."
    preview: "No change — default behavior."
  - label: "⚡ + 🗿 Answer-first, compressed too"
    description: "Answer-first ordering AND ~75% fewer output tokens (stacks with caveman mode)."
    preview: "Writes {\"adhd\": true, \"stackCaveman\": true}."
  - label: "⏭️ Decide later"
    description: "Skip for now — run /ccc-adhd anytime to turn it on."
    preview: "No change."
```

If the user picks either answer-first option, run the write from `ccc-adhd/SKILL.md`'s "State persistence" section (set `stackCaveman: true` only for the third option), then confirm in one line: "Answer-first mode on — the fix leads from here." Otherwise, no write, no comment needed beyond moving on.

## M. Optional: Connect your stack (affiliate-supported)

After the plan file is written, offer a one-time optional "stack connection" step. This is NON-BLOCKING — user can skip.

Render:

```
question: "Want to connect your stack? (optional — skip if you prefer)"
header: "CC Commander — Connect your tools"
multiSelect: true
options:
  - label: "💾 Supabase — managed Postgres + auth"
    description: "Database-as-a-service with built-in authentication and real-time."
    preview: "[Sign up free](https://supabase.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=supabase-auth)"
  - label: "🌐 Vercel — deployment + serverless"
    description: "Deploy your app with one click. Perfect for Next.js + Node."
    preview: "[Sign up free](https://vercel.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=vercel-deploy)"
  - label: "🔗 Cloudflare — edge network + workers"
    description: "Fast global CDN, edge functions, and real-time messaging."
    preview: "[Sign up free](https://www.cloudflare.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=cloudflare-edge)"
```

If the user selects any, render a brief confirmation:

> ✨ Great! Click those links to sign up. We'll remember you chose these partners.

Then move on to the "Mark onboarding complete" step.

If the user skips this step, render:

> No problem — you can connect tools anytime via `/ccc-connect`.

Then move on to the "Mark onboarding complete" step.

## N. Mark onboarding complete (MANDATORY last step)

After the tour concludes (user has answered all questions, plan file written), run this bash command to flip the onboarding flag. This ensures the user is never shown `/ccc-start` again unless they reset state.

```bash
node -e "
  const fs=require('fs'); const os=require('os');
  const p=os.homedir()+'/.claude/commander/state.json';
  let s={}; try{s=JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){}
  s.onboardingCompleted=true;
  s.completedAt=new Date().toISOString();
  fs.mkdirSync(os.homedir()+'/.claude/commander',{recursive:true});
  fs.writeFileSync(p,JSON.stringify(s,null,2));
  console.log('onboarding marked complete');
"
```

Reply to the user with a one-line confirmation:
> ✅ Onboarding complete. Next time you run `/ccc`, you go straight to the main menu.

## Session Persistence

**Tip:** Run `/ccc-save-session` before closing a working session to capture state. Then `/ccc-resume-session` at the start of your next one to pick up instantly. Both are built into CC Commander — no extra install needed.

## How CC Commander is sustained (mention near the end of the tour)

CC Commander's core is **free forever** — all skills, all agents, all hooks, all bundled MCP servers. No feature gating, no paywalls, no license checks. The MIT-licensed plugin code stays open-source. A hosted-infrastructure Pro tier is planned later (hosted MCP only) — all content stays free forever. The project is sustained by four transparent levers:

| Lever | What it is | Where |
|-------|-----------|-------|
| **Affiliate links** | Transparent partner links in /ccc-connect and scaffolds (Supabase, Vercel, Neon, …) | `/ccc-connect` |
| **Hire Kevin** | Teams shipping AI features who need senior help | kevinz.ai/consulting |
| **Pro community (optional)** | $49/mo Discord — community, not features; the plugin stays fully free | commanderplugin.com |
| **GitHub Sponsors + star** | Fund or boost the project directly | github.com/sponsors/KevinZai · github.com/KevinZai/commander |

Mention this **once** during the tour close — never as a paywall, never blocking flow. There is no paid feature tier: every user gets everything.

## Tips for the agent executing this skill

1. Whole flow is ≤6 turns: header+context+picker → user clicks → cascade questions → write plan → dispatch. Don't overthink.
2. If the user passes `skip` as argument, bypass the picker entirely and invoke `ccc`.
3. If the user passes `new` / `existing` / `tour`, skip the picker and route to the matching branch.
4. Parallelize all Bash context detection into a single call — saves ~3 turns.
5. If `~/.claude/plans/` doesn't exist, create it with `mkdir -p` before Write.
6. Always run step N (mark onboarding complete) as the final action — even if the user picks "Skip". The gate in `/ccc` checks this flag.

---

**Bottom line:** header → context → 4-option picker → cascade → plan file → mark complete. The plan file is proof the onboarding landed. User never types a number.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
