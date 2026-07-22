---
name: ccc-session
description: "Session management — resume work, review what was built, browse session history. Use when the user says 'resume session', 'review work', 'continue where I left…"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
argument-hint: "[resume | review | history | export]"
---


# /ccc-session — alias → /ccc-save-session and /ccc-resume-session

> **Deduplicated (v6.1).** This skill is now an alias for **/ccc-save-session and /ccc-resume-session** — the canonical session skills — save compresses the session, resume reloads it with full context.
>
> Invoke /ccc-save-session and /ccc-resume-session instead. This stub is kept so the `$ccc-session` command still resolves and prior references do not break.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
