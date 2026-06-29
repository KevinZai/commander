---
name: ccc-code-review
description: "Review code changes for security, performance, correctness, and maintainability. Use when: 'review code', 'PR review', 'check changes', 'review my diff', 'is this…"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<PR URL, file path, or diff>"
---


# /ccc-code-review — alias → /ccc-review

> **Deduplicated (v6.1).** This skill is now an alias for **/ccc-review** — the canonical review workflow — branch audit, security/perf/correctness, and specialist-agent dispatch (covers diff review).
>
> Invoke /ccc-review instead. This stub is kept so the `/ccc-code-review` command still resolves and prior references do not break.
