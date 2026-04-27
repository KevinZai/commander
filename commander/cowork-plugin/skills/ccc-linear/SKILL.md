---
name: ccc-linear
description: "Linear board integration — view open issues, pick one to work on, or create new tickets without leaving Claude. Use when the user types /ccc-linear, /ccc linear, says 'open Linear', 'show my tickets', 'what's in my queue', 'create an issue', or wants to go from idea → branch → work in one click. [Commander]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - AskUserQuestion
argument-hint: "[view | pick | create | board]"
---

# /ccc-linear — Linear Board

View your board, pick an issue, or create a new one — all click-first.

Promoted from `commands/ccc-linear.md` (legacy slash command).

## Response shape (EVERY time)

### 1. Brand header

```
**CC Commander** · Linear Integration · [Docs](https://cc-commander.com)
```

### 2. Context strip

Detect in parallel via a single Bash call:
- Check CLAUDE.md for a Linear team reference (grep "team" or "CC-")
- Check for `.linear/` config file in repo root
- `env | grep -c LINEAR_API_KEY` → is the key set?
- Check if any `mcp__linear__*` tool is available (Linear MCP connected?)

Render:
> 🎟️ Team: `<detected team or 'unknown'>` · MCP: <connected | not connected> · key: <set | missing>

If MCP not connected AND no API key: add line — "→ Run `/ccc-connect` to wire Linear first."

### 3. Action picker — `AskUserQuestion`

```
question: "What do you want to do?"
header: "Linear"
multiSelect: false
options:
  - label: "📋 View my open issues"
    description: "Top 10 issues assigned to you, grouped by status."
    preview: "(per-context: 'You have N in progress, M in todo')"
  - label: "🎯 Pick one to work on"
    description: "Grab the top issue, create a branch, start."
    preview: "Recommended — goes from ticket → branch in one click."
  - label: "✨ Create a new issue"
    description: "Quick title + description, auto-add to project."
    preview: "For ideas that shouldn't live in your head."
  - label: "🗺️ Board overview"
    description: "Columns: In Progress / Todo / Backlog / Done. Progress bar."
    preview: "Best for standups and status updates."
```

Prepend ⭐ to "Pick one to work on" unless user has zero open issues — then default to "Create a new issue".

## Handle the selection

### View my open issues

Use `mcp__linear__list_issues` (via `mcp__83782f74-...__list_issues` naming in tool ids). Filter by assignee=me, state.type in ("started", "unstarted").

Render:
```
### 🎟️ My open issues

**🔄 In Progress (2)**
- CC-61 · Remotion hero video
- CC-62 · README overhaul

**📋 Todo (3)**
- CC-48 · Foundation + submodules
- CC-49 · Vendor scanner
- CC-50 · Showstopper CLI UI
```

Append a second `AskUserQuestion` picker: "Pick one to work on?" with up to 4 issues.

### Pick one to work on

1. List top 4 issues (In Progress first, then Todo) via Linear MCP
2. Second `AskUserQuestion` with those 4 as options
3. On pick:
   - Move issue to "In Progress" via `mcp__linear__save_issue`
   - Create branch: `git checkout -b cc-<number>-<slug>`
   - Echo plan: "Branch `cc-<number>-<slug>` created. I'll work from the issue description — confirm scope?"

### Create a new issue

First `AskUserQuestion`: "What kind?"
- 🐛 Bug — pre-fills type="Bug"
- ✨ Feature — pre-fills type="Feature"
- 🧹 Chore — pre-fills type="Chore"
- 📝 Spike / investigation — pre-fills type="Spike"

Then ask for title via a SECOND AUQ (since we can't take free-text in AUQ, prompt the user to reply with the title in chat). After title received, create via `mcp__linear__save_issue` and echo the issue URL.

### Board overview

Fetch all issues for the team, group by state.type, render:
```
### 🗺️ Board — <team-name>

████████████████░░░░░░ 18/24 done (75%)

**🔄 In Progress (2)** · **📋 Todo (3)** · **📦 Backlog (1)** · **✅ Done (18)**
```

## Graceful fallback — Linear MCP not connected

If no `mcp__linear__*` tools available AND no `LINEAR_API_KEY` env var:

Render:
```
### ⚠️ Linear not connected

Two setup paths:
1. **Recommended:** run `/ccc-connect` → pick Productivity → pick Linear (one-click OAuth)
2. **Manual:** `export LINEAR_API_KEY_PERSONAL=lin_api_xxxxx` then retry

Get a key at https://linear.app/settings/api.
```

Offer one `AskUserQuestion`:
- "🔌 Run /ccc-connect now"
- "📖 Show manual setup"
- "⏭️ Skip for now"

## Session integration (when picking an issue to work on)

After branch creation, echo these as a footer:
> 📌 Linked to <ISSUE-ID> · branch `cc-<number>-<slug>` · progress will auto-post via Stop hook

This matches CC Commander branch convention (`cc-{number}-{slug}`) from project CLAUDE.md.

## Argument handling

- `/ccc-linear view` → skip picker, run "View my open issues"
- `/ccc-linear pick` → skip picker, run "Pick one to work on"
- `/ccc-linear create` → skip picker, run "Create a new issue"
- `/ccc-linear board` → skip picker, run "Board overview"
- `/ccc-linear` bare → show the picker

## Anti-patterns — DO NOT

- ❌ Render a numbered list and ask user to type a number — click-first only
- ❌ Proceed if MCP isn't connected AND no API key — always offer `/ccc-connect` fallback
- ❌ Create a branch WITHOUT moving the issue to In Progress first (state stays inconsistent)
- ❌ Fetch more than 10 issues per `list_issues` call — pagination exists for a reason
- ❌ Output the full issue description — show title + ID only, user can click through
- ❌ Create issues without a team ID — always pass `teamId` explicitly

## Brand rules

- Emoji-forward Linear cue: 🎟️ for issues, 🔄 In Progress, 📋 Todo, ✅ Done
- ⭐ marks the recommended option in every picker
- PM Consultant voice: "my call: work on CC-62 first — it's blocking release"
- Match CCC branch naming: `cc-{number}-{slug}` always

## Tips for the agent executing this skill

1. Whole flow is ≤3 turns: header+picker → user clicks → MCP fetch → render + sub-picker if needed.
2. Cache team ID from first fetch — don't re-list teams every call.
3. If MCP returns 0 issues: skip straight to "Create a new issue" and offer it.
4. Never hardcode team slugs — read from `mcp__linear__list_teams` on first use.

---

**Bottom line:** context → pick intent → MCP call → render → optional sub-pick. User clicks. Branch created. Work starts.
