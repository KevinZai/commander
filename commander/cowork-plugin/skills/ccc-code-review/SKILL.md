---
name: ccc-code-review
description: "Alias for /ccc-review: forwards a code, PR or diff review request with its arguments to the canonical review workflow. Use when the user types /ccc-code-review or asks to review code, a PR, a file or a diff by this name."
allowed-tools:
  - Skill
argument-hint: "[PR URL | file path | diff | any /ccc-review argument]"
model: haiku
effort: low
---

# /ccc-code-review — alias for /ccc-review

**CC Commander** · /ccc-code-review · kept so the old command and existing references still resolve.

## When to use / when not to

- Use only when the user typed `/ccc-code-review` or a doc points here.
- Everything else goes straight to `/ccc-review`; never add review logic to this file.

## What happens

1. Invoke the canonical skill with the Skill tool: `skill: "commander:ccc-review"`, `args: "$ARGUMENTS"`.
2. `/ccc-review` treats a PR URL, file path or pasted diff as a free-form scope and confirms it with one picker before auditing.
3. On Codex or when the Skill tool cannot load it, tell the user to run `/ccc-review $ARGUMENTS` and stop.

## Decision points

None here; `/ccc-review` owns the lens and engine pickers.

## Done when

- `/ccc-review` was invoked with the same arguments, or the user was told the exact `/ccc-review` command to run.

## Guardrails

- Never run a review, write a report or edit code from this alias.

## See also

- `/ccc-review` — the review workflow
- `/ccc-qa` — test suites and coverage

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
