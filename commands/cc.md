---
name: cc
description: CC Commander — Command Center. Interactive menu for skills, modes, prompts, confidence checks, and more.
triggers:
  - "/cc"
  - "/cc skills"
  - "/cc mega"
  - "/cc settings"
  - "/cc grill"
  - "/cc confidence"
  - "/cc mode"
  - "/cc prompts"
  - "/cc status"
  - "/cc help"
  - "/cc health"
  - "/cc install"
  - "/cc docs"
  - "/cc cheat"
  - "/cc coach"
  - "/cc leaderboard"
  - "/cc celebrate"
  - "/cc beginner"
  - "/cc commander"
---

# /cc — Claude Code Command Center

You are the Claude Code Command Center. When the user invokes `/cc`, display the interactive menu below and respond to their selection. Parse any arguments to route to sub-commands directly.

## Routing

- `/cc` (no args) → Show main menu
- `/cc skills` → Skills browser
- `/cc mega [name]` → Mega-skill drilldown
- `/cc settings` → Settings viewer
- `/cc grill` → Socratic planning probe
- `/cc confidence` → Pre-execution confidence assessment
- `/cc mode <name>` → Switch workflow mode (9 modes available)
- `/cc prompts [category]` → Browse prompt templates (36+)
- `/cc status` → Kit health and version
- `/cc peers` → Claude Peers + spawn manager
- `/cc dashboard` → Real-time agent monitoring dashboard
- `/cc openclaw` → OpenClaw native integration
- `/cc status-updates` → Status update configuration
- `/cc theme [name]` → Switch dashboard/terminal theme (4 themes)
- `/cc help` → Compact reference card
- `/cc health` → System health check
- `/cc install` → Install manager
- `/cc docs [search]` → Docs browser
- `/cc cheat [keyword]` → Quick reference card
- `/cc coach` → Context-aware coaching suggestions
- `/cc leaderboard` → Session stats + achievements
- `/cc celebrate` → ASCII celebration + quip
- `/cc beginner` → Beginner PM mode
- `/cc commander` → Launch Kit Commander (interactive CLI)

## Main Menu

When showing the main menu, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CC COMMANDER  //  COMMAND CENTER         v1.6.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🔧 BUILD                    📋 PLAN
  [1]  Skills Browser          [6]  Grill (Socratic)
  [2]  CCC Domains             [7]  Confidence Check
  [3]  Prompts Library         [8]  Mode Switcher

  ⚙️  CONFIGURE                🤝 COLLABORATE
  [9]  Settings Editor ✨      [13] Peers & Spawn
  [10] Theme Switcher          [14] Dispatch Center
  [11] Install Manager ✨      [15] OpenClaw Bridge
  [12] Health Check ✨         [16] Status Updates

  📚 LEARN                    🎮 FUN
  [17] Docs Browser            [20] Leaderboard
  [18] Quick Reference         [21] Celebrate
  [19] Coach                   [22] Beginner Mode

  🚀 NEW IN v1.5
  [23] Kit Commander ✨        Interactive CLI PM — runs above sessions

  ✨ = New in v1.5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /cc <number> or /cc <name>  │  /cc help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask the user which option they'd like. Wait for their response.

**Mapping old numbers to new layout:**
- Old [1-2] → New [1-2] (Skills, CCC Domains)
- Old [3] Settings → New [9] Settings Editor
- Old [4] Grill → New [6]
- Old [5] Confidence → New [7]
- Old [6] Mode → New [8]
- Old [7] Status → see [12] Health Check
- Old [8] Quick Ref → New [18]
- Old [9] /init → invoke `/init` directly from any menu
- Old [10] Prompts → New [3]
- Old [11] Peers → New [13]
- Old [12] Dashboard → New [14] Dispatch Center
- Old [13] OpenClaw → New [15]
- Old [14] Status Updates → New [16]
- Old [15] Theme → New [10]

## [1] Skills Browser (`/cc skills`)

Read `~/.claude/SKILLS-INDEX.md` and present skills organized by category. Show:
- Category headers with skill counts
- Each skill name + one-line description
- Navigation: "Type a skill name to load it, or 'back' for menu"

## [2] CCC Domains (`/cc mega [name]`)

If no name given, show all 10 CCC domains with their sub-skill counts:

| CCC Domain | Skills | Domain |
|------------|--------|--------|
| `ccc-seo` | 19 | SEO, AI search, content, analytics |
| `ccc-design` | 35+ | Animations, effects, design systems, polish |
| `ccc-testing` | 15 | TDD, E2E, verification, QA, regression |
| `ccc-marketing` | 46 | Content, CRO, channels, growth, sales |
| `ccc-saas` | 20 | Auth, billing, DB, API, frontend, metrics |
| `ccc-devops` | 20 | CI/CD, Docker, AWS, monitoring, Terraform |
| `ccc-research` | 8 | Deep research, spec interviews, competitive analysis |
| `ccc-mobile` | 8 | React Native, Flutter, SwiftUI, Jetpack Compose |
| `ccc-security` | 8 | Security audits, OWASP, dependency scanning |
| `ccc-data` | 8 | Data pipelines, SQL, ML, vector search |

If name given (e.g., `/cc mega seo`), read the CCC domain's SKILL.md and list all sub-skills with descriptions.

## [3] Settings (`/cc settings`)

Read `~/.claude/settings.json` and display:
- Current model (if set)
- Permission allow list (summarized)
- Permission deny list
- MCP servers (name + status)
- Hooks (count by lifecycle event)
- Environment variables

Present as a clean formatted table. Do NOT modify any settings — view only.

## [4] Grill Me (`/cc grill`)

**IMPORTANT: Do NOT enter plan mode. This is a conversational probe only.**

Ask the user these 7 Socratic questions, one at a time. Wait for each answer before asking the next:

1. What problem are you solving?
2. Who is this for?
3. What does success look like?
4. What's the riskiest assumption?
5. What would you cut if you had half the time?
6. What's the simplest version that delivers value?
7. What existing solutions have you evaluated?

After all 7 answers, provide a brief synthesis:
- Problem clarity score (1-5)
- Scope assessment (too big / right-sized / too small)
- Recommended build type (QUICK / DEEP / SAAS / OVERNIGHT)
- Suggested next step: `/init` to start, or `/plan` to spec it out, or "keep thinking"

Do NOT auto-enter plan mode. Do NOT start writing specs. Just summarize and suggest.

## [5] Confidence Check (`/cc confidence`)

Assess your current confidence level for the active task:

1. Rate confidence 0-100% across 4 dimensions:
   - **Requirements clarity** — Do I fully understand what's being asked?
   - **Technical approach** — Do I know how to implement this?
   - **Edge cases** — Have I considered failure modes?
   - **Verification** — Can I prove it works?

2. Calculate overall confidence (average of 4 dimensions).

3. Based on score:
   - **90-100%**: "High confidence. Proceeding." → Execute the plan
   - **70-89%**: "Moderate confidence." → Present alternatives, ask 2-3 clarifying questions before proceeding
   - **Below 70%**: "Low confidence. Need more context." → List what's unclear, ask focused questions, do NOT proceed until confidence rises

4. After implementation, run the **Four-Question Validation**:
   1. All tests passing?
   2. All requirements met?
   3. No assumptions without verification?
   4. Evidence for each claim?

Display results as a scorecard.

## [6] Mode Switcher (`/cc mode <name>`)

Switch between 9 optimized workflow modes. Each mode configures which skills to suggest, behavioral approach, and permission level.

| Mode | Permission | Loads | Key Behavior |
|------|-----------|-------|-------------|
| `normal` | acceptEdits | — | Default balanced workflow |
| `design` | acceptEdits | ccc-design | Visual-first, animations, Impeccable suite |
| `saas` | acceptEdits | ccc-saas + ccc-devops | Full-stack: auth, billing, DB, CI/CD |
| `marketing` | acceptEdits | ccc-marketing + ccc-seo | Content, SEO, CRO, copywriting |
| `research` | acceptEdits | ccc-research | Parallel agents, extended thinking, citations |
| `writing` | acceptEdits | — | Prose-focused, minimal tech noise |
| `night` | autoAccept | all relevant | Autonomous: auto-checkpoints, self-verify, /save-session before compact |
| `yolo` | autoAccept | user's choice | Max speed, skip confirmations, hooks as safety net |
| `unhinged` | autoAccept | all CCC domains | YOLO + max creativity, aggressive testing, bold moves |

If no mode specified, show all 9 and ask which they want.

**Behavior when a mode is selected:**
1. Read the mode file from `~/.claude/skills/mode-switcher/modes/{name}.md`
2. Explain what the mode activates (skills, behavior, hooks, permissions)
3. Check context usage — if above 60%, suggest `/save-session` then `/compact` before switching
4. Suggest relevant skills from the mode's loaded mega-packs
5. Do NOT auto-modify settings — explain the implied changes and let the user decide

**Night/Yolo/Unhinged warning:** These modes use `autoAccept` permissions. Explain that hooks still run as safety nets (careful-guard blocks destructive commands, auto-checkpoint creates recovery points).

## [10] Prompt Library (`/cc prompts [category]`)

Browse 36+ battle-tested prompt templates designed for Claude Code workflows.

If no category given, show the category overview:

| Category | Count | Description |
|----------|-------|-------------|
| `coding` | 10 | Code review, debugging, refactoring, testing, optimization |
| `planning` | 5 | Spec interviews, ADRs, feature plans, migrations |
| `design` | 5 | Landing pages, components, animations, design systems |
| `marketing` | 5 | SEO content, competitor analysis, email, social, ads |
| `devops` | 5 | CI/CD, Docker, deployment, monitoring, incidents |
| `meta` | 5 | Overnight runs, parallel research, session handoff, cost optimization |

If category given (e.g., `/cc prompts coding`), read `~/.claude/prompts/PROMPTS.md` and list all templates in that category with:
- Template name
- One-line description
- Suggested mode
- Estimated tokens

Then ask: "Type a template name to load it, or 'back' for menu."

When loading a template, read the template file and present the prompt with `{{placeholders}}` highlighted for the user to fill in.

## [7] Status (`/cc status`)

Display:
- **Version**: v1.4
- **Skills**: Count directories in `~/.claude/skills/`
- **Commands**: Count .md files in `~/.claude/commands/`
- **Hooks**: Check `~/.claude/hooks/hooks.json` exists
- **CLAUDE.md**: Check `~/.claude/CLAUDE.md` exists + line count
- **settings.json**: Check valid JSON
- **MCP servers**: List configured servers from settings.json
- **BIBLE.md**: Check exists
- **CHEATSHEET.md**: Check exists
- **SKILLS-INDEX.md**: Check exists

Format as a health dashboard with checkmarks.

## [8] Quick Reference

Show a compact version of the most-used commands:

| Command | What it does |
|---------|-------------|
| `/init` | Initialize project with CLAUDE.md |
| `/plan` | Spec-first planning interview |
| `/verify` | Verification loop before done |
| `/tdd` | Test-driven development workflow |
| `/code-review` | Multi-agent code review |
| `/cc` | This menu |
| `/cc grill` | Socratic planning probe |
| `/cc confidence` | Pre-execution confidence check |
| `/cc mode <name>` | Switch workflow mode (9 modes) |
| `/cc prompts [cat]` | Browse 36+ prompt templates |
| `/cc mega [name]` | Explore 10 CCC domain packs |
| `/spawn` | Spawn multiple Claude Code peers |
| `/peers` | Discover and message other instances |

Plus: "See CHEATSHEET.md for the full reference."

## [9] /init

Tell the user: "Launching the project wizard..." then invoke the `/init` command.

## [11] Claude Peers (`/cc peers`)

Show the Claude Peers capabilities:

1. **Discover Peers**: Call `list_peers` MCP tool to show active Claude Code instances
2. **Spawn Manager**: Offer to launch multiple peers for parallel work:
   - Quick Spawn: `/spawn quick <task>` — single peer, fire-and-forget
   - Team Spawn: `/spawn team <n>` — N peers with assigned roles
   - Swarm Spawn: `/spawn swarm <goal>` — auto-determine peer count
   - Expert Spawn: `/spawn expert <domain>` — domain specialist
3. **Communication**: Send messages between instances, broadcast to all
4. **Coordination Patterns**: Explain the 5 patterns:
   - Coordinator: One manages, others execute
   - Swarm: Equal peers collaborate
   - Expert: Specialized instances for domains
   - Review: One writes, another reviews
   - Research: Multiple search, one synthesizes

Reference the `claude-peers-bible` and `spawn-manager` skills for full documentation.

## [12] Dashboard (`/cc dashboard`)

Explain the real-time agent monitoring dashboard:

1. **What it shows**: Active agents, spawn tree (who spawned whom), cost tracker, live log stream
2. **How to launch**: `cd dashboard && npm install && npm run dev` — opens at http://localhost:3847
3. **No database**: Reads live from agent output files and claude-peers MCP
4. **Features**:
   - Agent cards with status animations (pulse when working, glow when complete, flash when failed)
   - Spawn tree visualization showing parent-child relationships
   - Cost tracker with per-agent breakdown and budget gauge
   - Build progress DAG with phase highlighting
   - Live log stream with auto-scroll
5. **Theme system**: 4 switchable themes (Claude Anthropic, OLED Black, Matrix, Surprise Me). Dark background, green text, monospace, animated borders

## [13] OpenClaw (`/cc openclaw`)

Show OpenClaw native integration capabilities:

1. **Auto-Detection**: Check if OpenClaw is running on the local machine (port 18789)
2. **Skill Sync**: Synchronize CC Commander skills with OpenClaw agent skill registries
3. **Event Forwarding**: Bidirectional event forwarding between CC Commander hooks and OpenClaw webhooks
4. **Agent Profiles**: Generate OpenClaw agent profiles from CC Commander skill configurations
5. **Memory Sync**: Synchronize learned patterns between CC Commander sessions and OpenClaw memory

Reference the `openclaw-native` skill for full documentation. Use `/openclaw` command for quick access.

## [14] Status Updates (`/cc status-updates`)

Configure progress report delivery during long sessions:

1. **Channels**: Slack, Discord, email — configure which channels receive updates
2. **Intervals**: Set how often updates are sent (every N minutes, or on milestones)
3. **Content**: What to include — task progress, cost, context usage, files changed
4. **Triggers**: Automatic updates on significant events (PR created, tests passing, deploy)

Reference the `status-updates` skill for full documentation. Use `/status-updates` command for quick access.

## [15] Theme (`/cc theme [name]`)

Switch the visual theme for dashboard and terminal output. 4 themes available:

| Theme | Description |
|-------|-------------|
| `anthropic` | Claude Anthropic palette — amber/indigo/deep navy (default) |
| `oled` | OLED Black — pure black background, high contrast |
| `matrix` | Matrix — enhanced green-on-black with CRT overlay effect |
| `surprise` | Surprise Me — random selection from 5 curated palettes |

If no theme specified, show all 4 and ask which they want.

**Behavior when a theme is selected:**
1. Update `lib/themes.js` and `lib/themes.sh` configuration
2. Apply to dashboard if running
3. Update terminal color suggestions
4. Persist selection to `bible-config.json`

## [11] Install Manager (`/cc install`)

Check installed status of each Kit component:

1. Read installed files vs repo manifest
2. Show status table:
   - Hooks: ✓/✗ (count matching hooks.json)
   - Skills: ✓/✗ (count dirs in ~/.claude/skills/)
   - Themes: ✓/✗ (themes.sh + themes.js present)
   - Dashboard: ✓/✗ (dashboard/ dir exists)
   - Statusline: ✓/✗ (lib/statusline.sh in ~/.claude/lib/)
   - CLAUDE.md: ✓/✗ (file exists)
   - settings.json: ✓/✗ (valid JSON)

3. Show what's outdated (compare VERSION in install.sh vs installed)
4. Offer: "Pick a component to install/update, or 'all' for everything"
5. Delegate to `install.sh --mode=<component>` for actual installation

## [12] Health Check (`/cc health`)

Run 10 system checks with pass/fail indicators:

1. CLAUDE.md exists and has content ✓/✗
2. settings.json is valid JSON ✓/✗
3. bible-config.json valid (if exists) ✓/✗
4. Hooks installed (count matching hooks.json entries) ✓/✗
5. Skills directory populated (count > 0) ✓/✗
6. Dashboard directory exists ✓/✗
7. Statusline configured (lib/statusline.sh) ✓/✗
8. Git repo clean (no uncommitted CLAUDE.md changes) ✓/✗
9. Node.js version >= 18 ✓/✗
10. jq available ✓/✗

Show summary bar: `[████████░░] 8/10 passed`

If any checks fail, suggest the fix command for each.

## [17] Docs Browser (`/cc docs [search]`)

Browse Kit documentation interactively:

1. List available docs: BIBLE.md, CHEATSHEET.md, SKILLS-INDEX.md, FEATURE-OVERVIEW.md, REFERENCE-GUIDE.md
2. User picks a doc → extract `##` headings as table of contents
3. User picks a section → display that section's content
4. Search mode: `/cc docs search <term>` — grep across all docs and show matching sections

Navigation: "Type a section number, 'search <term>', or 'back' for menu."

## [18] Quick Reference (`/cc cheat [keyword]`)

Compact one-screen reference card:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOP COMMANDS          MEGA-SKILLS
  /plan  — plan first   ccc-seo (19)
  /verify — check work  ccc-design (35+)
  /tdd   — TDD flow     ccc-testing (15)
  /cc    — this menu    ccc-marketing (46)
  /init  — project wiz  ccc-saas (20)
  /checkpoint — save    ccc-devops (20)

  MODES                 PROMPT CATEGORIES
  normal design saas    coding (10)
  marketing research    planning (5)
  writing night yolo    design (5)
  unhinged              marketing (5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If keyword given (e.g., `/cc cheat testing`), search CHEATSHEET.md for that term and show relevant sections.

## [19] Coach (`/cc coach`)

Context-aware suggestion engine. Check these signals and present top 3 actionable suggestions:

1. **git status** — uncommitted changes? → "Consider `/checkpoint` to save progress"
2. **tasks/todo.md** — overdue or stuck items? → "You have N open tasks. Try `/project:todo`"
3. **Context window** — above 60%? → "Context at X%. Consider `/save-session` then `/compact`"
4. **Time since last /verify** — over 30 min? → "Haven't verified in a while. Try `/verify`"
5. **Cost** — session over $1? → "Session cost is $X. Consider wrapping up or spawning a subagent"
6. **Files modified** — many unstaged? → "N files modified. Consider committing"

Present as:
```
  🧭 COACH SUGGESTS:
  1. ✅ Run /verify — haven't checked work in 45 min
  2. 💾 Run /checkpoint — 8 unstaged files
  3. 🧹 Context at 72% — /compact soon

  "Ship it before it ships you."
```

End with a random quip from `cc_random_quip()`.

## [20] Leaderboard (`/cc leaderboard`)

Display session stats and gamification data from `~/.claude/kit-stats.json`:

1. **Session stats**: tool calls, files modified, lines +/-, cost, duration
2. **Daily streak**: read from kit-stats.json, display with `cc_streak_display()`
3. **Achievements**: show unlocked badges with descriptions, locked ones as ???
   - Possible badges: First Commit, First Verify, 10/50/100 Tool Calls, CCC Domain User, Night Mode Survivor, 3/7/30 Day Streak, Celebration King, Budget Master
4. **Progress**: show progress toward next achievement
5. **Fun rank title**: based on total sessions — "Terminal Apprentice" → "Code Wrangler" → "CLI Wizard" → "Context Sovereign"

## [21] Celebrate (`/cc celebrate`)

Trigger a celebration:

1. Pick a random celebration style (confetti/fireworks/victory/rocket) using `cc_celebrate()`
2. Show a random quip using `cc_random_quip()`
3. If session stats available from kit-stats.json, show a "Today's score" mini-card using `cc_mini_dashboard()`

## [22] Beginner Mode (`/cc beginner`)

**THE UNIQUE DIFFERENTIATOR** — A PM-style coordinator for users who don't know Claude Code.

When activated:
1. Greet the user warmly: "Welcome! I'm your project manager. Tell me what you want to build — in plain English. No technical jargon needed."
2. Take their request and break it into 3-5 simple tasks
3. Show tasks as a visual checklist using `cc_progress_checklist()`
4. For each task, explain in simple terms what will happen
5. Execute tasks one at a time, showing progress updates with celebrations after each
6. Use the `beginner-pm` skill for the full PM persona and conversation style
7. Use the `compass-bridge` skill for cross-surface state sync (saves state to `~/.claude/compass/`)

**Key behaviors in Beginner Mode:**
- Never use technical jargon without explaining it
- Always show progress visually (checklists, celebrations)
- Proactively explain what happened and what's next
- Use encouraging language and celebrate small wins
- If something fails, explain in simple terms and offer to try again
