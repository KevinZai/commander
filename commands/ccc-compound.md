---
name: ccc-compound
description: "Capture the patterns, corrections and decisions from the work just done into tasks/lessons.md, or review and prune existing lessons. Use after finishing a task or when the user says compound, lessons or retro."
usage: /ccc-compound [review|prune]
version: 1.3.0
---

# /ccc-compound — persist what this task taught

**CC Commander** · /ccc-compound · post-task learning capture so the next task starts cheaper. Pattern credit: [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin).

## Arguments

`$ARGUMENTS`:

- empty — capture learnings from the current session (default flow below)
- `review` — show accumulated lessons; change nothing
- `prune` — propose outdated lessons for removal; delete only after confirmation

## If `review`

1. Read `tasks/lessons.md` and list `~/.claude/learned-skills/` (either may be absent; say so).
2. Print:

   ```
   COMPOUND REVIEW
   Lessons:        <n> entries across <m> dates
   Learned skills: <k> files
   <lessons grouped by date, most recent first>
   ```

3. Stop. Do not extract or write anything.

## If `prune`

1. Read `tasks/lessons.md`, the project `CLAUDE.md` and the files each lesson names.
2. For each entry, decide whether it still applies to the current code. List the stale ones with a one-line reason each.
3. Ask with AskUserQuestion (Codex: a plain-text question):
   - 🟢 Remove the listed entries — edits `tasks/lessons.md`
   - Pick entries one by one — confirm each before removing
   - Keep everything — no change
4. After editing, run `git diff --stat -- tasks/lessons.md` and report the removed line count. Stop.

## Default: capture learnings

1. Review what just happened. Run in parallel:

   ```bash
   git log --oneline -10
   git diff --stat HEAD~3
   ```

   If `HEAD~3` does not exist (new repo), use `git diff --stat` against the first commit or the working tree. Then scan the conversation for decisions made, corrections received and patterns discovered.

2. Extract learnings into three groups; skip any group with nothing meaningful:

   - **Patterns:** code patterns that worked (architecture, data flow, API design), tool or library usage worth repeating, efficient workflow sequences.
   - **Corrections:** what went wrong and its root cause, the fix, and how to prevent the class of error.
   - **Decisions:** what was decided and why, alternatives rejected, constraints that drove it.

3. Persist. Append to `tasks/lessons.md` (create it if missing):

   ```
   ## YYYY-MM-DD — <session summary>

   ### Patterns
   - <pattern>

   ### Corrections
   - <mistake> -> <fix> -> <prevention rule>

   ### Decisions
   - <decision>: <rationale>
   ```

   - A broadly reusable pattern: propose the exact line to add to the project `CLAUDE.md`; do not edit it without the user's yes.
   - A correction that exposes a missing rule: propose the specific rule text.
   - Check `~/.claude/learned-skills/` and propose a new learned-skill entry when one fits.

4. Verify the write: `git diff --stat -- tasks/lessons.md` (or `tail -n 20 tasks/lessons.md` when the file is untracked) shows the new entry.

5. Compute the compound score from the files, not from memory:
   - Lessons: count of `- ` items under `### ` headings in `tasks/lessons.md`
   - Learned skills: file count in `~/.claude/learned-skills/`
   - Trend: `New` if the file was created now, `Growing` if entries were added this session, `Stale` if it was last modified more than 7 days ago

6. Output:

   ```
   COMPOUND REPORT
   Session:      <what was built or fixed, one line>
   Patterns:     <items>
   Corrections:  <mistake> -> <fix> -> <prevention rule>
   Decisions:    <decision>: <rationale>
   Persisted to: tasks/lessons.md (<n> new entries)
   Suggestions:  <CLAUDE.md or rule additions, or "None">
   Compound score: <lessons> lessons | <skills> learned skills | <trend>
   ```

Keep the pass short: capture the signal and skip the noise.

## Guardrails

- Write only `tasks/lessons.md`; changes to `CLAUDE.md`, rules or learned skills are proposals until the user approves them.
- `prune` never deletes without the step 3 confirmation.
- Never record secrets, tokens or customer data in a lesson.

## See also

`/ccc-learn` · `/ccc-knowledge` · `/ccc-handoff`
