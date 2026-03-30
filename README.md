<div align="center">

```
 _____ _____    _____                           _
|     |     |  |     |___ _____ _____ ___ ___ _| |___ ___
|   --|   --|  |   --| . |     |     | .'|   | . | -_|  _|
|_____|_____|  |_____|___|_|_|_|_|_|_|__,|_|_|___|___|_|
```

### 280+ skills. One command. Your AI work, managed by AI.

The most comprehensive Claude Code setup in existence.
<br>**Not a skill pack. An AI project manager.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Skills](https://img.shields.io/badge/Skills-280+-4F46E5)](./SKILLS-INDEX.md)
[![Tests](https://img.shields.io/badge/Tests-103_passing-4F46E5)](./commander/tests/)
[![v1.6.0](https://img.shields.io/badge/v1.6.0-D97706)](./CHANGELOG.md)

**by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic))** · Built from 200+ community sources

</div>

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```

One command. Under 60 seconds.

```bash
git clone https://github.com/KevinZai/cc-commander.git
cd cc-commander && ./install.sh
```

<details>
<summary>Installation modes</summary>

```
./install.sh                    # Interactive
./install.sh --mode=full        # Everything
./install.sh --mode=essentials  # Skills + hooks
./install.sh --mode=config      # Just CLAUDE.md
```
</details>

---

## CC Commander

> The interactive CLI that manages your Claude Code.

```bash
node bin/kc.js        # Launch
npx kit-commander     # Via npm
```

```
╭──────────────────────────────────────────╮
│  CC COMMANDER v1.6.0                     │
│  280+ skills. Your AI work, managed.     │
│                                          │
│  Welcome back, Kevin!                    │
│  main · 3 files modified · 42 sessions   │
│                                          │
│  What would you like to do?              │
│                                          │
│  ❯ Build something new                   │
│    Create content                        │
│    Research & analyze                    │
│    YOLO Mode (autonomous build)          │
│    Learn a new skill (280+)              │
│    Check my stats                        │
│    Settings                              │
│    Change theme                          │
╰──────────────────────────────────────────╯
```

Navigate with **arrow keys** or letter shortcuts. Every session starts in **plan mode**.

### Not just coding

```
BUILD       Web apps, APIs, CLI tools
CONTENT     Blog, social, email, marketing, docs
RESEARCH    Competitive, market, code audit, SEO
```

### 4 Themes

```
CYBERPUNK    ████████████  neon pink → cyan
FIRE         ████████████  amber → deep orange
GRAFFITI     ████████████  yellow → pink → blue
FUTURISTIC   ████████████  soft blue → purple
```

### Progressive Disclosure

```
GUIDED      Everything is multiple choice
  ↓ 5 sessions
ASSISTED    Multiple choice + freeform
  ↓ 20 sessions
POWER       Full access, skip spec flow
```

### Stats Dashboard

```
╭──────────────────────────────────────╮
│  Sessions: 42        Streak: 7 days  │
│  Badges:   12        Cost:   $8.50   │
╰──────────────────────────────────────╯
  Cost: ▁▄▂█▅ ▃  Activity: ▒▒▓▓██░░▓▓
  🔥🔥🔥🔥🔥🔥🔥 7-day streak!
  Level: POWER ▌██████████████████▐
```

### CLI Flags

```bash
node bin/kc.js --stats    # Quick stats
node bin/kc.js --test     # 24-point self-test
node bin/kc.js --repair   # Fix corrupt state
node bin/kc.js --help     # Full usage
```

### Backwards Compatible

```
Commander READS  → CLAUDE.md, .claude/
Commander WRITES → ~/.claude/commander/ (separate)
Your setup       → Unchanged
```

---

## Linear Integration

CC Commander is a **Linear agent** with its own identity.

```
╭──────────────────────────────────────╮
│  LINEAR: CC Commander                │
│  29 issues · 27 done · 82%          │
│  ▌██████████████████████░░░░▐        │
│                                      │
│  Agent: "CC Commander" (OAuth app)   │
│  Not your personal account.          │
╰──────────────────────────────────────╯
```

Setup (2 minutes):
1. Linear Settings → API → OAuth Applications → New
2. Name: `CC Commander`, Client credentials: **On**
3. Add to env: `LINEAR_CC_CLIENT_ID` + `LINEAR_CC_CLIENT_SECRET`

---

## The Intelligence Layer

### Plugin Orchestration

Commander detects installed packages and uses them:

```
PACKAGE                  STARS   PHASE
─────────────────────────────────────────
gstack (Garry Tan)       54.6K  Decisions + QA
Compound Engineering     11.5K  Knowledge + Review
Superpowers (obra)       121K   Workflow
Everything Claude Code   100K   Hooks + Profiles
```

### 8-Step Build Pipeline

```
PHASE      TOOL                 FALLBACK
─────────────────────────────────────────────
Clarify    /office-hours        Spec flow
Decide     /plan-ceo-review     Plan mode
Plan       /ce:plan             Claude plan
Execute    /ce:work             Headless dispatch
Review     /ce:review (6+)      /simplify
Test       /qa (real browser)   /verify
Learn      Knowledge engine     Always active
Ship       /ship                git commit
```

### Knowledge Compounding

```
Session 1:  Fix auth bug → 3 hours
            ↓ lessons extracted automatically
Session 47: Similar issue
            ↓ "We hit this before"
            ↓ Fixed in 10 minutes
```

---

## YOLO Mode

10 questions. Then autonomous.

```
╭──────────────────────────────────────╮
│  YOLO MODE                           │
│                                      │
│  1.  What are you building?          │
│  2.  Who is it for?                  │
│  3.  Most critical feature?          │
│  4.  Tech stack?                     │
│  5.  What does DONE look like?       │
│  6.  What does BROKEN look like?     │
│  7.  Edge cases?                     │
│  8.  Testing requirements?           │
│  9.  Deployment target?              │
│  10. Anything else?                  │
│                                      │
│  Then: Opus · max effort · $10       │
│        100 turns · self-testing      │
│                                      │
│  YOLO Loop: 3-10 improvement cycles  │
╰──────────────────────────────────────╯
```

---

## Skills

280+ skills. 10 mega-skills routing to 190 sub-skills.

```
MEGA-SKILL        SUBS  DOMAIN
───────────────────────────────────────
mega-design        39   UI/UX, animation, polish
mega-marketing     45   CRO, email, ads, SEO
mega-saas          20   Auth, billing, API
mega-testing       15   Unit, E2E, TDD
mega-devops        20   CI/CD, Docker, AWS
mega-seo           19   Schema, SERP, vitals
mega-security       8   OWASP, pentest
mega-research       8   Competitive, market
mega-mobile         8   React Native, Flutter
mega-data           8   SQL, ETL, dashboards
───────────────────────────────────────
TOTAL             190   10 domain routers
```

### Commands (88+)

```bash
/plan "Build a REST API"    # Spec-first planning
/cc                          # Command center
/verify                      # Verification loop
/tdd                         # Test-driven dev
/batch "Update all tests"   # Parallel changes
/yolo                        # YOLO Mode
```

### Hooks (37)

```
SessionStart → Load context, detect tools
PreToolUse   → Block rm -rf, confidence gate
PostToolUse  → Auto-checkpoint, cost alert
Stop         → Console.log audit, session save
```

---

## Stock Claude Code vs CC Commander

```
FEATURE              STOCK    CC COMMANDER
──────────────────────────────────────────
Skills                 0      280+
Commands            built-in  88+ custom
Hooks                  0      37
Modes                  1      9
Themes              default   4
Session tracking    none      Persistent
Cost control        none      Auto-budget
Knowledge           none      Compounds
Plugin orchestration none     8-step pipeline
Non-coder support   none      Guided mode
Linear integration  none      Agent identity
```

---

## Cowork Plugin (Claude Desktop)

```bash
/plugin marketplace add KevinZai/cc-commander
```

4 skills: commander, yolo-mode, knowledge, plugins.

---

## The Kevin Z Method

```
╭──────────────────────────────────────╮
│  1. Plan before coding               │
│  2. Context is milk (keep it fresh)  │
│  3. Verify, don't trust              │
│  4. Subagents = fresh context        │
│  5. CLAUDE.md is an investment       │
│  6. Boring solutions win             │
│  7. Operationalize every fix         │
╰──────────────────────────────────────╯
```

Full methodology: [BIBLE.md](BIBLE.md)

---

## Contributing

```
skills/your-skill/SKILL.md     # New skill
commands/your-command.md        # Slash command
hooks/your-hook.js              # Lifecycle hook
commander/adventures/X.json     # Adventure flow
```

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">

**CC Commander v1.6.0** — by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic))

*Not a researcher. Not a pundit. An operator who ships.*

</div>
