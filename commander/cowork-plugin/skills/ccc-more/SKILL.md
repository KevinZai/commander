---
name: ccc-more
description: "CC Commander second-page menu — click-first access to plan, x-ray, Linear, fleet, connect, and catalog browse. Use when the user types /ccc-more, picks 'More tools' from /ccc, or says 'show me the rest', 'more options', 'what else can this do', 'plan a feature', 'run x-ray', 'open Linear', 'fleet', 'connect apps'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[intent: plan | xray | linear | fleet | connect | browse]"
---

# /ccc-more — Second-page tools menu

Click-first picker for the CC Commander surface area that's NOT build/review/ship/design/learn. Plan, x-ray, Linear, fleet, connect, browse — one click each, cascade for the long tail.

## Response shape (EVERY time)

### 1. Brand header (one line)

```
**CC Commander · More** · 7 tools · [all commands](https://cc-commander.com/commands)
```

### 2. Context strip (one line)

Parallel Bash probe (silent on failure):
- `test -f tasks/todo.md && wc -l tasks/todo.md` — open tasks
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` — branch
- `claude mcp list 2>/dev/null | grep -c '^  '` — connected MCPs
- `test -f .linear/config.json && echo linear-ok` — Linear wired

Render:
> 🧭 Branch `<name>` · <N> open tasks · <M> MCPs connected · Linear: `<connected | not set up>`

If barely any context: "🧭 Empty-ish project — Plan a feature or run X-ray to get signal."

### 3. The picker — `AskUserQuestion` page 1

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-more.json` once. Use its `choices`. **Max 4 options** — 3 headline tools + "Even more…".

```
question: "Which tool?"
header: "CC Commander · More"
multiSelect: false
options:
  - label: "📋 Plan a feature"
    description: "Spec interview → implementation plan file → review checkpoint."
    preview: "Invokes ccc-plan. Asks 5-7 targeted questions, writes tasks/spec-<date>.md."
  - label: "🩻 Project x-ray"
    description: "Scorecard across code, docs, tests, deps, CI — actionable findings."
    preview: "Invokes ccc-xray. Reads repo, returns report card + remediation steps."
  - label: "📊 Linear board"
    description: "View, pick, or create issues without leaving Claude."
    preview: "Invokes ccc-linear. Requires Linear MCP; will prompt /ccc-connect if missing."
  - label: "⋯ Even more…"
    description: "Fleet, connect apps, browse catalog."
    preview: "3 more tools — click to cascade."
```

**Recommendation logic** (prepend ⭐ to ONE option):
- No `tasks/` dir and no `CLAUDE.md` → ⭐ "Plan a feature"
- Repo >500 files or messy tests → ⭐ "Project x-ray"
- Linear MCP connected + current branch matches `cc-<num>-*` → ⭐ "Linear board"
- Nothing special → ⭐ "Plan a feature"

### 4. Handle the selection (page 1)

Dispatch immediately — no re-prompting:

- **Plan a feature** → invoke `ccc-plan` skill.
- **Project x-ray** → invoke `ccc-xray` skill.
- **Linear board** → check MCP list for `linear`. If missing, suggest `/ccc-connect linear` first. If present, invoke `ccc-linear`.
- **Even more…** → cascade to page 2 below.

### 5. Second AUQ (only if "Even more…" picked)

```
question: "The rest."
header: "CC Commander · More · Page 2"
multiSelect: false
options:
  - label: "🚁 Fleet (parallel agents)"
    description: "Run multiple Sonnet agents in parallel worktrees — watch the progress cards."
    preview: "Invokes ccc-fleet. Spawns worktree per agent, non-overlapping file domains."
  - label: "🔌 Connect apps"
    description: "Enable Notion, Zapier, Supabase, Slack, Google Drive, and more MCPs."
    preview: "Invokes ccc-connect. Browses connector categories + runs OAuth."
  - label: "🔎 Browse catalog"
    description: "Searchable grid of every /ccc-* command and every installed skill."
    preview: "Invokes ccc-browse. Filters by domain, status, recency."
  - label: "🏠 Back to main"
    description: "Return to /ccc."
    preview: "Invokes ccc skill (root picker)."
```

### 6. Handle the selection (page 2)

- **Fleet** → invoke `ccc-fleet` skill.
- **Connect apps** → invoke `ccc-connect` skill.
- **Browse catalog** → invoke `ccc-browse` skill.
- **Back to main** → invoke `ccc` skill.

### 7. Argument handling

If the user passed an argument (`/ccc-more fleet`), skip both AUQs and invoke directly. Accept: `plan` / `xray` / `linear` / `fleet` / `connect` / `browse`.

## Anti-patterns — DO NOT

- ❌ Render all 7 options in one AUQ (max 4)
- ❌ Show a numbered list and ask the user to type a number
- ❌ Invoke Linear without checking MCP presence — prompts fail silently
- ❌ Skip the cascade — page 2 is how the long tail surfaces
- ❌ Redundantly re-introduce CC Commander — the user already clicked through from /ccc

## When to invoke this skill

- user: what else can CCC do?
- assistant: Loads ccc-more, renders the 4-option picker with ⭐ on the contextual best pick.

- user: plan out this feature before I build it
- assistant: Loads ccc-more with `plan` argument, skips picker, invokes ccc-plan directly.

- user: I need parallel agents for this refactor
- assistant: Loads ccc-more with `fleet` argument, skips both AUQs, invokes ccc-fleet directly.

---

**Bottom line:** 4 options on page 1, cascade to 3 more on page 2. Arguments bypass everything. Every pick dispatches inline to the named skill — no intermediate text menus.
