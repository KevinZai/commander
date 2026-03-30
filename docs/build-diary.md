# Kit Commander Build Diary

> Raw notes from building Kit Commander — the first interactive CLI wrapper for AI coding tools. Written as it happens, for future X articles and behind-the-scenes content.
>
> By Kevin Z (@kzic) — kevinz.ai

---

## Day 1 — March 29, 2026: "Nobody Has Built This"

### The Spark

Spent the morning doing competitive research. Scanned 45+ GitHub repos, searched X for "claude code wrapper" and "AI coding CLI". Found plenty of skill packs, prompt collections, hook systems. Found ZERO interactive menu-driven wrappers that sit ABOVE Claude Code sessions.

The gap is real. Everyone builds plugins that run INSIDE AI coding sessions. Nobody has built the layer that MANAGES them.

### The Vision

Inspired by Kiro.dev's spec-driven approach (but open source, and running on top of Claude Code which people already have). The concept: a "choose your own adventure" PM that guides you through multiple-choice menus while dispatching headless Claude Code sessions behind the scenes. Beginners never type a command. Power users get a session dashboard.

Named it **Kit Commander**. The CLI that commands your kit.

### Legal Homework

Checked every competitor's license before writing a line of code. MIT and Elastic 2.0 sources only. Documented what we CAN use (CCPM patterns, Claude MPM session resumption, Mastery Kit wizards) and what we CAN'T (Product-Manager-Skills is CC-BY-NC-SA = no commercial use, Kiro is proprietary).

**Lesson:** Do the legal audit BEFORE you build, not after. One NC-SA dependency could poison the whole thing.

---

## Day 2 — March 29-30, 2026: "The Foundation Sprint"

### Architecture Decision

Built Commander as a standalone Node.js process, not a Claude Code skill. This is the key architectural bet. Skills run inside sessions (limited context, no persistence). Commander runs ABOVE sessions (persistent state, tracks everything across days/weeks).

```
Kit Commander (persistent process)
  |
  +-- dispatches to Claude Code (headless sessions)
  |     via `claude -p "task" --output-format json`
  |
  +-- tracks sessions in ~/.claude/commander/
  +-- adventure engine (JSON decision trees)
  +-- gamification (streaks, achievements)
```

### What Got Built

In one session: engine.js, adventure.js, state.js, dispatcher.js, renderer.js, branding.js, recommendations.js, sync.js, 6 adventure JSONs, skill-browser.js, kit-stats integration, bin/kc.js entry point.

The adventure engine is pure JSON — each screen is a file with choices, conditions, and template variables. Adding a new flow = adding a JSON file. No code changes needed.

### The Progressive Disclosure Model

Three levels that unlock automatically:
- **Guided** (0-4 sessions): Everything is multiple choice. Never see a terminal command.
- **Assisted** (5-19 sessions): Multiple choice + freeform. Start seeing what Claude does.
- **Power** (20+ sessions): Full access. Direct skill invocation. Custom adventures.

The unlock is automatic based on session count. No gates, no paywalls. Just keep using it and it opens up.

---

## Day 3 — March 30, 2026: "Full Feature Integration"

### The Dispatcher Upgrade

Original dispatcher was a thin wrapper: `claude -p "task" --output-format json --max-turns 30`. Six flags total.

Upgraded to use the FULL Claude Code feature set after cataloging every flag from the March 2026 docs. The dispatcher now supports:

- `--bare` — clean scripted calls (no hooks/plugins interfering)
- `--permission-mode plan` — every session starts in plan mode for safety
- `--effort` — auto-set based on user level (guided=medium, power=high)
- `--max-budget-usd` — cost ceiling ($2 for guided, $5 for power)
- `--model opusplan` — Opus plans, Sonnet executes
- `--fallback-model sonnet` — resilience when primary is overloaded
- `--worktree` — isolated execution for parallel work
- `--name` — auto-generated session names for easy resume
- `--json-schema` — validated structured output
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` — auto-compact at 70% context fill

**Key insight:** The dispatcher ISN'T just launching Claude Code. It's CONFIGURING it optimally per task and user level. A guided beginner gets safe defaults ($2 budget, plan mode, medium effort). A power user gets Opus with high effort and $5 ceiling. Same dispatch function, different personality.

### Spec-Driven Build Flow

When a guided user says "build me a website", Commander doesn't just pass that to Claude. It asks 3 clarification questions first:

1. What's the most important outcome? (working e2e / solid foundation / quick prototype)
2. Tech preferences? (pick for me / popular tools / simple as possible / specific)
3. How thorough? (basics / with tests / production-ready)

The answers get assembled into a structured prompt. Power users skip this — they know what they want.

This is the spec-driven approach from the competitive research, but made accessible through multiple choice. The non-coder doesn't need to know about "requirements gathering." They just answer 3 questions.

### Skill Browser

Discovered 217 skills in the installed kit. Built a browser that reads SKILL.md frontmatter, groups by category, shows previews, and offers one-click "try it now" dispatch. The learn-skill adventure is no longer a placeholder.

### Stability Pass

Added SIGINT handling (Ctrl+C saves state gracefully), state corruption recovery (`--repair` backs up corrupt JSON and resets), and expanded the self-test from 7 checks to 15 (validates every module AND every adventure JSON).

### The Numbers

At dogfood-ready state:
- 11 files modified/created in this session
- 15/15 self-test checks pass
- 61/61 existing hook tests still pass
- 217 skills browsable
- 5 CLI modes: interactive, --test, --stats, --repair, --help

---

## Themes for X Content

### Thread Ideas
1. "I built a CLI that nobody has built before" — the competitive gap story
2. "How I audit open source licenses before building" — the legal homework angle
3. "Progressive disclosure in CLI design" — the 3-level unlock system
4. "The spec-driven build flow for non-coders" — 3 questions that replace requirements gathering
5. "One dispatcher, multiple personalities" — auto-configuring AI based on user level
6. "Why I run ABOVE the session, not inside it" — the architectural moat

### Key Quotes (for threads)
- "Everyone builds plugins that run INSIDE AI coding sessions. I built the layer that MANAGES them."
- "A non-coder shouldn't need to know what `--permission-mode plan` means. But they should get its safety benefits."
- "The adventure engine is pure JSON. Adding a new flow = adding a file. Zero code changes."
- "Do the legal audit BEFORE you build, not after. One NC-SA dependency could poison the whole thing."
- "Same dispatch function, different personality. Guided gets safe defaults. Power gets full Opus."

---

## Day 3 (continued) — The Rebrand and TUI Revolution

### The Name Question

Mid-session, Kevin asked the big question: should this be Claude Code-only, or multi-platform? Could it work with Gemini CLI and Codex too?

The answer: build Claude-first, name it so you're not locked in. **CC Commander** — Claude Code Commander. The "CC" works now (Claude Code) and could work later (Code Commander, if we go multi-platform). The dispatcher is the only file that knows about Claude — swapping to Gemini or Codex is a one-line adapter change.

But the bigger insight: **this isn't just for coding**. Kevin realized CC Commander should manage marketing tasks, social media workflows, content creation, research — anything you'd dispatch to Claude Code. The tagline shifted from "Your AI-Powered Project Manager" to **"Mission control for your AI work."**

### The TUI Revolution

Kevin's exact words: "MAKE IT FUCKING SUCK! right now its too turing looking too simple"

So we researched everything. Figlet's 287 ASCII fonts. Raw ANSI escape codes for true-color gradients. Zero-dependency arrow-key navigation using readline keypress events. Block elements, braille patterns, sparkline charts.

Built `commander/tui.js` — a complete terminal UI engine with ONE dependency (figlet for fonts). Everything else is raw ANSI:

- **Gradient engine**: Interpolates between any number of RGB color stops, character by character
- **4 switchable themes**: Cyberpunk (neon pink/cyan), Fire (amber/orange), Graffiti (yellow/pink/blue), Futuristic (soft blue/purple)
- **Arrow-key menus**: Navigate with arrows OR letter shortcuts. Selected item gets a highlighted background and `❯` indicator. Falls back to letter-based input on non-TTY.
- **Figlet logo**: Big ASCII art rendered in the active theme's gradient
- **Themed boxes**: Rounded, heavy, single, or double borders — chosen per theme
- **Spinners, typewriter, progress bars, sparklines, celebrations** — all themed

The cyberpunk logo rendering `CC COMMANDER` in gradient ANSI Shadow text with pink-to-cyan gradient... that's the kind of thing that makes people screenshot their terminal and post it.

### The Strategic Insight

Every terminal tool looks the same: monochrome text, basic borders, functional but forgettable. By making CC Commander visually stunning — the kind of thing that makes you want to show someone — we turn the UI itself into a marketing asset. Screenshots become content. The gradient logo becomes the brand.

### Key Quote
"The UI IS the marketing. Make it screenshot-worthy and users will do your distribution for you."

---

## Thread Ideas (Updated)

7. "I made my CLI so pretty people screenshot it for fun" — the visual design story
8. "Why I built a 4-theme system in a terminal app" — cyberpunk to futuristic
9. "Zero-dependency terminal gradients in Node.js" — technical how-to with code
10. "Claude Code isn't just for coding" — using AI mission control for marketing, content, social
11. "CC Commander: the tool that manages your AI tools" — product launch angle

---

*This diary will be updated as development continues. Each entry = potential X content.*

## Day 3 (late night) — The Full Build Sprint

### What Got Built

The gloves came off. Kevin said "BUILD IT ALL" and meant it. In one continuous session:

**TUI Engine (commander/tui.js)**
- figlet logos with true-color gradients across every line
- 4 switchable themes: Cyberpunk (neon pink/cyan), Fire (amber), Graffiti (yellow/pink/blue), Futuristic (soft blue/purple)
- Arrow-key menus (zero dependencies — raw readline keypress events)
- Animated wipe transitions between screens
- Responsive layout: full figlet at 60+ cols, gradient text for narrow terminals
- Rich dashboard with sparklines, activity heatmap, streak fire display, level progress bar
- Welcome mini-dashboard on main menu: live stats, last session, top recommendation

**9 Adventure Flows**
- main-menu (10 choices — build, content, research, learn, stats, settings, theme, quit)
- build-something (web, API, CLI, freeform + 3 sub-adventures)
- create-content (blog, social, email, marketing, docs + 5 sub-adventures)
- research (competitive, market, code audit, SEO + 4 sub-adventures)
- continue-work, review-work, learn-skill, check-stats
- settings (name, level, cost ceiling, theme, animations, reset)

**Full Dispatcher Integration**
- 10 CLI flags including --bare, --permission-mode plan, --max-budget-usd, --effort, --model opusplan
- Auto-compact at 70% context
- Plan-mode-first on every dispatch
- Level-based defaults (guided=$2/medium/sonnet, power=$5/high/opusplan)

**The Rebrand**
- Kit Commander → CC Commander (Claude Code Commander)
- Tagline: "280+ skills. One command. Your AI work, managed by AI."

### The Numbers
- 18/18 self-test checks
- 61/61 hook tests
- 9 adventure files
- 217 browsable skills
- 4 themes
- 10 main menu choices
- 12 settings/action handlers
- 3 commits this session

### Key Insight
The TUI IS the product differentiator. Every other Claude Code tool is text-only. CC Commander is the first one that looks like a real application — gradient logos, themed menus, animated transitions. People will screenshot this. Screenshots become tweets. Tweets become users.

### Quote
"BUILD IT ALL. Go up to the point where you have built everything that is stable — then verify everything." — Kevin, 1am, triggering a 3-commit sprint

## Day 4 — March 30, 2026 (3am): The Intelligence Layer

### The Honest Assessment

Kevin shared a viral thread analyzing 3 Claude Code packages (gstack 54.6K stars, Superpowers 121K, Compound Engineering 11.5K). Asked point-blank: "are we stupid?"

Honest answer: no, but we were incomplete. CC Commander had a beautiful front door but a basic kitchen. The 3 packages each nail a layer we were missing:
- gstack: decision gates (should we build this?)
- CE: knowledge compounding (learn from every session)
- Superpowers: structured workflow (brainstorm → plan → execute → review)

CC Commander's real value: it's the ORCHESTRATION layer that sits above all of them. Nobody else sequences these tools together.

### What Got Built

**Knowledge Compounding Engine** (commander/knowledge.js)
- After every session, auto-extracts: what worked, what failed, tech stack, error patterns, success patterns
- Stored in ~/.claude/commander/knowledge/ as structured JSON
- Before dispatch, searches knowledge base for relevant past lessons
- Injects top 3 matches into system prompt: "We hit this before, solution's here"
- Keywords extraction, task categorization, relevance scoring

**Plugin Manager** (commander/plugins.js)
- Detects installed packages: gstack, CE, Superpowers, ECC, Simone
- Maps skills to 8 build phases: clarify → decide → plan → execute → review → test → learn → ship
- Auto-selects best tool per phase (CE for review, gstack for QA, etc.)
- Falls back gracefully if package not installed
- Attribution built in: credits every package author

**Night Mode** (8-hour autonomous build)
- 10 detailed spec questions: what, who, critical feature, tech stack, done criteria, broken criteria, edge cases, testing, deployment, extras
- Dispatches with: max effort, $10 budget, 100 turns, Opus model
- Full knowledge injection before dispatch
- Self-testing instruction in system prompt

**Cross-Session Learning**
- Every executeBuild now extracts lessons on completion
- Every dispatch checks knowledge base first
- Project context + knowledge context both injected

### The Numbers
- 21/21 self-test (up from 18)
- 61/61 hook tests
- 9 adventure files + night-build = 10
- 12 main menu choices
- 5 known plugin packages detected
- 282 skills found on this machine
- 8-step orchestrated build pipeline
- Knowledge base: auto-growing with every session

### Key Insight
"CC Commander doesn't compete with gstack or CE. It USES them. It's the orchestration layer that knows WHEN to use WHAT tool and WHY. That's what Opus does — it reads the installed plugins and builds the dispatch plan dynamically."

### Thread Ideas
12. "Your AI tool learns from every session" — the knowledge compounding story
13. "I built a plugin manager that auto-detects gstack, CE, and Superpowers" — the orchestration angle
14. "Night Mode: 10 questions, 8 hours, wake up to shipped code" — the autonomous build story
15. "The honest assessment: is another AI tool stupid?" — the self-aware positioning thread
