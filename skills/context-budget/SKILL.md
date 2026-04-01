---
name: context-budget
description: "Visual context window budget analyzer — shows usage gauge, identifies bloat sources, recommends when to save session and compact"
version: 1.0.0
category: core-workflow
triggers:
  - /context-budget
  - context usage
  - running out of context
  - how much context left
---

# Context Budget Analyzer

> Visual context window usage analysis with actionable recommendations and session-save nudges.

## When to Use

- When you suspect context is getting large
- Before starting a complex multi-file task
- When Claude's responses start feeling slower or less coherent
- Proactively every 30-60 minutes in long sessions

## How This Works

You are a context window analyst. When invoked, you estimate the current context usage, display a visual gauge, identify the biggest consumers, and recommend actions — including when to `/save-session` and start fresh.

---

## Phase 1: Inventory

Scan and estimate token counts for everything loaded into the current context:

### System Context (always loaded)
| Source | How to Estimate |
|--------|----------------|
| `~/.claude/CLAUDE.md` | Read file, count chars ÷ 4 |
| Project `CLAUDE.md` | Read file, count chars ÷ 4 |
| `~/.claude/rules/**/*.md` | Glob + read all, count chars ÷ 4 |
| `settings.json` | Read file, count chars ÷ 4 |
| `hooks.json` | Read file, count chars ÷ 4 |
| Active skills (SKILL.md files) | Check recently loaded skills |
| MCP server schemas | Estimate ~500 tokens per MCP server |

### Conversation Context (accumulated)
| Source | How to Estimate |
|--------|----------------|
| Tool call history | Count tool calls in session × ~200 tokens avg |
| File reads | Count files read × avg file size |
| User messages | Estimate from conversation length |
| Assistant responses | Estimate from conversation length |

### Passive Overhead
| Source | Estimate |
|--------|----------|
| System prompt | ~8,000 tokens |
| Tool definitions | ~4,000 tokens |
| Safety/instruction layers | ~2,000 tokens |

**Estimation formula:** `chars ÷ 4 ≈ tokens` (rough but sufficient for budgeting)

---

## Phase 2: Classify

Categorize each source into:
- **Fixed** — always loaded, can't reduce mid-session (system prompt, CLAUDE.md, rules)
- **Accumulated** — grows over the session (conversation, tool calls, file reads)
- **Reducible** — can be reduced now (unused MCP schemas, large skills not being used)
- **Compactable** — will shrink on `/compact` (conversation history)

---

## Phase 3: Visual Report

Display the full report using this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KZ CONTEXT BUDGET                          v2.1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CONTEXT WINDOW: 200K tokens (Claude Sonnet)

  ▐████████████████░░░░░░░░░░░░░░▌  54%  ~108K used

  ┌─────────────────────────────────────────────┐
  │  BREAKDOWN                                  │
  │                                             │
  │  System prompt + tools      14K  ███░░  7%  │
  │  CLAUDE.md (global)          3K  █░░░░  2%  │
  │  CLAUDE.md (project)         2K  █░░░░  1%  │
  │  Rules (8 files)             4K  █░░░░  2%  │
  │  Hooks config                2K  █░░░░  1%  │
  │  MCP schemas (6 servers)     3K  █░░░░  2%  │
  │  ─────────────────────────────────────────  │
  │  Conversation history       62K  ████████ 31%│
  │  File reads (14 files)      12K  ██░░░  6%  │
  │  Tool call overhead          6K  █░░░░  3%  │
  │                                             │
  │  TOTAL                    ~108K     54%      │
  │  REMAINING                ~92K     46%      │
  └─────────────────────────────────────────────┘
```

### Zone Indicators

Add a status line based on usage percentage:

| Usage | Status | Action |
|-------|--------|--------|
| 0-50% | `🟢 GREEN — Plenty of room` | Continue normally |
| 50-70% | `🟡 YELLOW — Monitor usage` | Consider compacting soon |
| 70-80% | `🟠 ORANGE — Getting tight` | `/save-session` now, compact, or start fresh |
| 80-90% | `🔴 RED — Critical` | `/save-session` immediately, then `/compact` or new session |
| 90%+ | `⚫ DANGER — Context exhaustion imminent` | STOP. `/save-session` NOW. Start new session. |

Display the appropriate zone:

```
  STATUS: 🟡 YELLOW — Monitor usage (54%)

  ⏱  Estimated remaining capacity: ~25-35 more tool calls
  💡 Tip: Run /compact to reclaim ~40-60% of conversation history
```

---

## Phase 4: Recommendations

Based on the analysis, provide specific recommendations:

### Always Show
```
  RECOMMENDATIONS
  ───────────────────────────────────────────────

  [1] Conversation history is your biggest consumer (62K).
      → Run /compact to reclaim ~30-40K tokens.
      → Or /save-session + start fresh for full 200K.
```

### Show If Applicable
```
  [2] 6 MCP servers loaded but only 2 used this session.
      → Unused: todoist, raindrop, granola, kevin-vault
      → Can't unload mid-session, but consider for next session.

  [3] Large files read but not referenced recently:
      → BIBLE.md (1,749 lines / ~7K tokens) — read early, not used since
      → These will be reclaimed on /compact.

  [4] You've been in this session for ~90 minutes.
      → Sessions over 60 min typically benefit from a save + fresh start.
      → Run: /save-session → then start a new claude session.
```

### Session Save Nudge (70%+ usage)
```
  ⚠️  SESSION SAVE RECOMMENDED
  ─────────────────────────────
  Your context is at {X}%. Quality degrades above 80%.

  Run /save-session now to capture:
  • What worked and what didn't
  • Current file states
  • Exact next step

  Then start a fresh session with /resume-session.
  You'll get full 200K context with zero lost knowledge.
```

---

## Phase 5: Quick Actions

End with actionable one-liners:

```
  QUICK ACTIONS
  ─────────────
  /compact          — Reclaim ~40-60% of conversation tokens
  /save-session     — Save state, start fresh with full context
  /resume-session   — Load last saved session in new context
  /context-budget   — Run this analysis again
```

---

## Verbose Mode (--verbose)

When `--verbose` flag is passed, additionally show:
- Individual file sizes for every file read this session
- Per-MCP-server token estimate
- Per-rule-file token count
- Conversation message count and avg tokens per message
- Estimated tokens per tool call type (Read, Edit, Bash, etc.)

---

## Integration Notes

- This skill is invoked by the `/context-budget` command
- The `suggest-compact` hook (ECC) provides automatic interval-based nudges
- The `PreCompact` hook auto-saves state before compaction
- Session files are stored in `~/.claude/sessions/` (managed by `/save-session`)
- Token counts are estimates (chars ÷ 4) — actual tokenization varies by content
