---
name: ccc-memory
description: "Keep durable project memory in two tiers: CLAUDE.md for always-loaded facts and a memory/ directory of dated notes, decisions, gotchas and preferences loaded on demand. Use when recording a decision, root cause, correction or preference future sessions must keep."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - AskUserQuestion
argument-hint: "[read | add | correct | consolidate]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-memory — Two-tier persistent memory

**CC Commander** · $ccc-memory · important facts survive the end of a session without bloating every turn's context.

On Codex, AskUserQuestion becomes a plain-text question and `AGENTS.md` plays the role of `CLAUDE.md`.

## When to use / when not to

- Use after resolving a tricky bug (save the root cause), after an architectural decision (record the reasoning), when a project outgrows one CLAUDE.md section, or before a `/clear` that would lose a specific insight.
- Not for session-scoped state that ends with this session: use `$ccc-save-session`.
- Not for searching past knowledge: use `$ccc-recall`.
- Not for per-skill notes: put those in the skill's own body.

## The two tiers

**Tier 1 — `CLAUDE.md` (always loaded).** Project type and stack, key paths and conventions, daily commands, cross-cutting style rules. Everything here costs context on every turn, so keep it tight. Use `$ccc-claudemd` to audit or restructure it.

**Tier 2 — `memory/` (on demand).** Read only the file a task needs:

| Path | Holds |
|---|---|
| `memory/YYYY-MM-DD-<slug>.md` | Dated learnings, decisions, corrections |
| `memory/decisions/<slug>.md` | One file per significant call and why it was made |
| `memory/gotchas/<slug>.md` | Known footguns, such as a renamed API or changed syntax |
| `memory/preferences.md` | Curated long-term preferences that did not fit CLAUDE.md |

If the project already uses `tasks/memory/`, use that root instead of `memory/`.

## What happens

1. **Locate the memory root.**

   ```bash
   ls -d memory tasks/memory 2>/dev/null; ls memory tasks/memory 2>/dev/null | head -40
   ```

   No output → there is no memory root yet; `add` and `correct` create `memory/` with `mkdir -p memory` (and the needed subdirectory) before writing.

2. **Route by `$ARGUMENTS`.** No argument → ask the first decision below.

   - `read` (start of a session): skim the filenames from step 1, then Read only the few that match today's task. Report which files were read.
   - `add`: ask the second decision below for the kind, then write the note with the template in step 3.
   - `correct`: append a dated entry to `memory/preferences.md` in corrective framing ("Do X instead of Y — check: …"), with the source of the correction.
   - `consolidate` (weekly, or before big work): list notes referenced repeatedly and propose moving them into CLAUDE.md; list stale dated notes and propose moving them to `memory/archive/`. Show the proposed CLAUDE.md diff and the move list, and apply nothing until the user approves with the third decision below.

3. **Note template** for `add`:

   ```markdown
   ## <one-line title>

   Date: YYYY-MM-DD
   Source: <user correction | bug fix | review | decision meeting>

   <What is true now, in two to four sentences.>
   Why: <the reason or root cause>.
   Check: <a command that proves it still holds, such as a grep or a test name>.
   ```

   Example — after the user says skill names use a dash, not a colon:

   ```markdown
   ## Correction: $ccc- not /ccc:

   Date: 2026-04-23
   Source: user correction

   All skill names use the dash form $ccc-* not the colon form /ccc:*. The colon form is stale.
   Check: grep -rn "/ccc:" should return zero results outside CHANGELOG.
   ```

4. **Verify.** After any write, run `ls -l <file> && head -20 <file>`; after `consolidate`, run `git diff --stat -- CLAUDE.md memory/ tasks/memory/` (or list the moved files when the project is not a git repository). Report the actual output.

## Decision points

No argument:

```yaml
question: "What do you want to do with project memory?"
header: "Memory"
multiSelect: false
options:
  - label: "🟢 Add a note"
    description: "Record a decision, root cause, gotcha or preference in memory/."
  - label: "Read what is relevant"
    description: "Skim memory/ and load only the notes for today's task."
  - label: "Record a correction"
    description: "Append a dated corrective entry to memory/preferences.md."
  - label: "Consolidate"
    description: "Propose promotions to CLAUDE.md and archive stale notes, then ask."
```

Kind of note for `add`:

```yaml
question: "What kind of note is this?"
header: "Memory note"
multiSelect: false
options:
  - label: "🟢 Dated learning"
    description: "memory/YYYY-MM-DD-<slug>.md — a fact or root cause from today."
  - label: "Decision"
    description: "memory/decisions/<slug>.md — one significant call and its reasoning."
  - label: "Gotcha"
    description: "memory/gotchas/<slug>.md — a footgun with the check that catches it."
```

Before applying a consolidation:

```yaml
question: "Apply this consolidation?"
header: "Consolidate"
multiSelect: false
options:
  - label: "🟢 Apply as shown"
    description: "Edit CLAUDE.md and move stale notes to memory/archive/."
  - label: "Promotions only"
    description: "Edit CLAUDE.md; leave every note in place."
  - label: "Cancel"
    description: "Change nothing."
```

## Done when

- The note or edit exists and step 4 printed it, or the user cancelled and nothing changed.
- For `read`, the files actually read are named.

## Guardrails

- Never delete a memory note; archive it to `memory/archive/` after approval.
- Never edit CLAUDE.md without showing the diff and getting approval first.
- Never write secrets, tokens, credential values or personal data into memory; name the variable or secret reference instead.
- Writes only inside the project's `memory/` (or `tasks/memory/`) and CLAUDE.md. It does not commit, push, post, or update trackers.

## See also

- `$ccc-recall` — search memory notes and past sessions
- `$ccc-save-session` — session-scoped snapshot
- `$ccc-claudemd` — audit and restructure CLAUDE.md
- `$ccc-knowledge` — browse and search past lessons by category

---

Adapted from `knowledge-work-plugins/productivity/memory-management` under Apache-2.0 license. Fitted to CC Commander's save-session / resume-session pattern.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
