---
name: cc-knowledge
description: "CC Commander Knowledge Base — search past lessons, view learning history. Use when the user says 'what did we learn', 'past lessons', 'knowledge base', 'what went wrong before', or 'search knowledge'."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Knowledge Base

Search and display the CC Commander knowledge base at `~/.claude/commander/knowledge/`.

## Step 1 — Check Knowledge Base Exists

```bash
ls ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
```

If 0 files: "No lessons recorded yet. Lessons are extracted automatically after each completed CC Commander session."

## Step 2 — Present Menu

Use AskUserQuestion:
- "Search by topic" — find lessons matching a keyword
- "Show recent lessons" — list the 10 most recent
- "Show stats" — summary counts by category and outcome
- "Browse by category" — filter by web / api / cli / content / research
- "Back to main menu"

## Search by Topic

```bash
grep -rl "KEYWORD" ~/.claude/commander/knowledge/ 2>/dev/null
```

Read each matching file and extract `description`, `outcome`, `successPatterns`, and `errorPatterns`. Present as:

```
[2026-03-15] web | success
Task: Build Next.js dashboard with Tremor charts
Worked: Use shadcn/ui + Tremor together, run `npx shadcn@latest init` first
Failed: n/a
Stack: Next.js, TypeScript, Tremor, shadcn/ui
```

Example queries:
- "next.js" → all Next.js lessons
- "auth" → JWT, OAuth, session lessons
- "timeout" → lessons where timeouts caused problems
- "postgres" → database-related lessons

## Show Recent Lessons

```bash
ls -t ~/.claude/commander/knowledge/*.json 2>/dev/null | head -10
```

Display one line per lesson: `[timestamp] category | outcome — task description (60 chars max)`

## Show Stats

```bash
ls ~/.claude/commander/knowledge/*.json 2>/dev/null | wc -l
grep -rl '"outcome":"success"' ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
grep -rl '"outcome":"error"' ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
grep -rl '"outcome":"cancelled"' ~/.claude/commander/knowledge/ 2>/dev/null | wc -l
```

Display as:
```
Knowledge Base Stats
────────────────────
Total lessons:    47
  Successful:     38  (81%)
  Errors:          7  (15%)
  Cancelled:       2   (4%)

Top categories: web 18, api 12, cli 8, content 5, research 4
```

## Browse by Category

Ask the user to pick: web / api / cli / content / social / research / other

```bash
grep -rl '"category":"CATEGORY"' ~/.claude/commander/knowledge/ 2>/dev/null
```

List matching lessons chronologically, most recent first.

## Lesson JSON Format

Each lesson at `~/.claude/commander/knowledge/{timestamp}.json`:

```json
{
  "timestamp": "2026-03-15T14:22:00Z",
  "description": "Build Next.js dashboard with auth",
  "keywords": ["next.js", "auth", "dashboard", "typescript"],
  "category": "web",
  "outcome": "success",
  "techStack": ["Next.js 14", "TypeScript", "Prisma", "NextAuth"],
  "errorPatterns": [],
  "successPatterns": ["shadcn/ui init before Tremor", "use server actions for mutations"],
  "result": "Shipped working dashboard with Google OAuth in 4 hours"
}
```

## Auto-Extraction

Lessons are written automatically by `commander/knowledge.js` at the end of every session. No manual action required. File: `~/.claude/commander/knowledge/{Date.now()}.json`.
