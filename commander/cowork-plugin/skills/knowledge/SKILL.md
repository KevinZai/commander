---
name: knowledge
description: "Knowledge compounding — search past lessons, view learning history, browse by category. Use when the user says 'what did we learn', 'past lessons', 'knowledge base', 'what went wrong before', 'search knowledge', or 'show recent lessons'. [Commander]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[search <topic> | recent | stats | category <name>]"
---

# /ccc:knowledge

> Placeholders like ~~knowledge base refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Search and surface lessons from the CC Commander knowledge base at `~/.claude/commander/knowledge/`. Lessons are captured by the knowledge-capture hook (file-level edits) and manual entries created via this skill — no manual input required for basic capture.

## Quick Mode (default)

Show the 3 most recent lessons and offer to search or browse:

```bash
ls -t ~/.claude/commander/knowledge/*.json 2>/dev/null | head -3
```

Read each file, display one line per lesson:
```
[2026-04-10] web | success — Build Next.js dashboard with Tremor charts
[2026-04-09] api | error — Stripe webhook signature validation failed
[2026-04-08] cli | success — Build RTK proxy CLI with Rust + clap
```

Then ask via AskUserQuestion:
- "Search by topic"
- "Show all recent lessons (10)"
- "Browse by category"
- "View stats"
- "Back to main menu"

## Power Mode

Full browse, search, and filter. Activate by passing `--power` or `browse` as argument.

### Search by Topic

```bash
grep -rl "KEYWORD" ~/.claude/commander/knowledge/ 2>/dev/null
```

Read matching files. Extract `description`, `outcome`, `successPatterns`, `errorPatterns`. Format:

```
[2026-03-15] web | success
Task: Build Next.js dashboard with auth
Worked: shadcn/ui init before Tremor, use server actions for mutations
Failed: n/a
Stack: Next.js 14, TypeScript, Prisma, NextAuth
```

Example queries: "next.js" → Next.js lessons | "auth" → JWT/OAuth lessons | "timeout" → timeout failures | "postgres" → DB lessons

### Recent Lessons (10)

```bash
ls -t ~/.claude/commander/knowledge/*.json 2>/dev/null | head -10
```

Display: `[timestamp] category | outcome — task description (60 chars max)`

### Stats

```bash
ls ~/.claude/commander/knowledge/*.json 2>/dev/null | wc -l
grep -rl '"outcome":"success"' ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
grep -rl '"outcome":"error"' ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
```

Display:
```
Knowledge Base Stats
────────────────────
Total lessons:    47
  Successful:     38  (81%)
  Errors:          7  (15%)
  Cancelled:       2   (4%)

Top categories: web 18, api 12, cli 8, content 5, research 4
```

### Browse by Category

Ask: web / api / cli / content / social / research / other

```bash
grep -rl '"category":"CATEGORY"' ~/.claude/commander/knowledge/ 2>/dev/null
```

List matching lessons chronologically, most recent first.

## Auto-Captures

The knowledge-capture hook logs Write/Edit file touches to `~/.claude/commander/knowledge/auto-captures.jsonl` automatically. Each line records the file path and timestamp of the edit.

Manual lessons can be created via Quick Mode or Power Mode as structured `.json` files at `~/.claude/commander/knowledge/{timestamp}.json`. A typical manual lesson:

```json
{
  "timestamp": "2026-03-15T14:22:00Z",
  "description": "Build Next.js dashboard with auth",
  "keywords": ["next.js", "auth", "dashboard"],
  "category": "web",
  "outcome": "success"
}
```

If the knowledge base is empty (0 files), say: "No lessons recorded yet. Lessons are extracted automatically after each CC Commander session."

## If Connectors Available

If **~~knowledge base** is connected (e.g., Notion, Confluence):
- Sync lessons to the external knowledge base after extraction
- Pull relevant external docs into context before a build

If **~~files** (Google Drive) is connected:
- Sync lessons to a Drive folder for team visibility
- Pull context from existing runbooks or retrospectives

If **~~project tracker** is connected:
- Link lessons to the issues they were generated from
- Search lessons by issue ID (e.g., "CC-150")

## Tips

1. Pass a search term directly as argument (e.g., `knowledge next.js`) to skip the menu and search immediately.
2. Before any significant build, the `commander` skill auto-surfaces relevant lessons — this skill exposes the full browse UI.
3. Lessons compound over time — the more sessions you run, the more accurate the suggestions become.
