---
name: compound
description: "Post-task learning capture — extract patterns, corrections, and decisions to compound productivity"
usage: /compound [review|prune]
version: 1.3.0
---

# Compound — Post-Task Learning Capture
> Inspired by [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) by Every.to

Each unit of work makes the next one slightly cheaper. Extract the signal, persist it, move on.

**Argument:** `{{input}}`

- No argument = capture learnings from the current session
- `review` = display all accumulated lessons without adding new ones
- `prune` = review lessons and remove outdated or irrelevant entries

---

## If `review`

Read `tasks/lessons.md` and `~/.claude/learned-skills/` contents. Display a summary:

```
COMPOUND REVIEW

Lessons: X entries across Y categories
Learned Skills: Z entries

[grouped list of lessons by date, most recent first]
```

Stop here. Do not extract or persist anything.

## If `prune`

Read `tasks/lessons.md`. For each entry, evaluate whether it is still relevant given the current codebase and project CLAUDE.md. Present entries to remove with rationale, then ask for confirmation before deleting.

Stop here after pruning.

---

## Default: Capture Learnings

### 1. Review What Just Happened

Run in parallel:
- `git log --oneline -10` — recent commits
- `git diff --stat HEAD~3` — recent file changes

Then review the conversation context for decisions made, corrections received, and patterns discovered.

### 2. Extract Learnings

Organize into three categories:

**Patterns Discovered:**
- Code patterns that worked well (architecture, data flow, API design)
- Effective tool or library usage worth repeating
- Workflow sequences that were efficient

**Mistakes & Corrections:**
- What went wrong and the root cause
- What the fix was
- How to prevent this class of error in the future

**Decisions & Rationale:**
- Key decisions made and WHY (not just what)
- Alternatives considered and rejected
- Constraints that drove the decision

Skip any category with nothing meaningful to report.

### 3. Persist

- Append actionable entries to `tasks/lessons.md` (create the file if it does not exist). Use the format:
  ```
  ## YYYY-MM-DD — [session summary]

  ### Patterns
  - [pattern]

  ### Corrections
  - [mistake] -> [fix] -> [prevention rule]

  ### Decisions
  - [decision]: [rationale]
  ```
- If a pattern is broadly reusable, suggest adding it to the project CLAUDE.md.
- If a correction reveals a gap in existing rules, suggest a specific new rule.
- Check `~/.claude/learned-skills/` and suggest new learned skill entries if appropriate.

### 4. Compound Score

Calculate:
- **Lessons:** count entries in `tasks/lessons.md` (count `### ` headings or `-` items under them)
- **Learned Skills:** count files in `~/.claude/learned-skills/`
- **Trend:** "Growing" if new entries were added this session, "Stale" if `tasks/lessons.md` was last modified >7 days ago, "New" if the file was just created

### 5. Output

```
COMPOUND REPORT

Session: [what was built/fixed, one line]

Patterns:
- [pattern 1]
- [pattern 2]

Corrections:
- [mistake] -> [fix] -> [prevention rule]

Decisions:
- [decision]: [rationale]

Persisted to: tasks/lessons.md (X new entries)
Suggestions: [any CLAUDE.md or rule additions, or "None"]
Compound Score: X lessons | Y learned skills | Trend
```

Keep this fast. Capture the signal, skip the noise. 30 seconds, not 10 minutes.
