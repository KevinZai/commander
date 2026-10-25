---
name: ccc-systematic-debugging
description: "Root-cause debugging: reproduce, hypothesize, then fix once with a failing test first. Use for a bug, a failing or flaky test, or an unknown error."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
argument-hint: "[symptom, error message or failing test]"
model: opus
effort: high
---

# $ccc-systematic-debugging — root cause before fix

**CC Commander** · $ccc-systematic-debugging · a four-phase process that finds the cause, proves it, and fixes it once.

```
NO FIX WITHOUT CONFIRMED ROOT CAUSE
```

Guess-and-check fixes waste time and create new bugs; quick patches mask the real issue. Complete each phase before starting the next.

## When to use / when not to

- Use for any bug, failing or flaky test, crash, wrong output, or error whose cause is not yet proven.
- Use even when the issue looks simple; the process is fast for simple bugs.
- Do not use for a known, already-diagnosed change (a typo the user pointed at, a requested refactor). Make that edit directly.
- For investigations expected to run past ~20 turns, span several systems, or need hypothesis state held across cycles, delegate (see "Decision points").

## What happens

Start from `$ARGUMENTS` (the symptom, error text or failing test). Keep a short hypothesis log in the conversation: hypothesis, evidence, result, per cycle.

### Phase 1 — Root-cause investigation (before any fix)

1. **Read the error completely:** full stack trace, line numbers, error codes. Do not skim.
2. **Reproduce it.** Run the exact failing command and capture the output, for example the single test: `npx vitest run path/to/file.test.ts -t "<name>"`, `pytest path/to/test_x.py::test_name -x`, or `node --test path/to/file.test.js`. If it does not reproduce reliably, gather more data before going on; for flaky failures, run it in a loop (`for i in $(seq 1 20); do <cmd> || break; done`) and record the failure rate.
3. **Check recent changes:** `git log --oneline -15`, `git diff`, `git diff HEAD~5 --stat`, new dependencies (`git diff HEAD~5 -- package.json package-lock.json pyproject.toml`), config changes. When a known-good commit exists, `git bisect` with the reproduction command finds the change.
4. **Instrument component boundaries** in multi-component systems: log what enters and exits each boundary and confirm config propagates. Run once to find where it breaks before reasoning about why.
5. **Trace the bad value backward** through the call stack to where it originates. The fix belongs at the source, not at the symptom.

Exit when you can state what is happening and where.

### Phase 2 — Pattern analysis

1. **Find working code** in the same codebase that does something similar (`Grep` for the same API, call or config key).
2. **Read the reference implementation completely.**
3. **List every difference** between working and broken, however small.
4. **List the assumptions** the broken code makes about config, environment and state, and check each one.

Exit when you can name the difference that matters.

### Phase 3 — Hypothesis and test

1. **Write one hypothesis:** "X is the root cause because Y."
2. **Test it with the smallest possible change**, one variable at a time, ideally a probe (log line, assertion, isolated input) rather than a fix.
3. **Confirmed** → Phase 4. **Ruled out** → revert the probe, form a new hypothesis. Never stack changes.
4. **When you do not know, say so** and gather more evidence instead of guessing.

### Phase 4 — Implementation

1. **Write the failing test first:** the simplest automated reproduction. Run it and confirm it fails for the hypothesized reason.
2. **Make one fix** at the root cause. No "while I'm here" changes.
3. **Verify:** the new test passes, the surrounding suite passes (the project's test command from `package.json`, `pyproject.toml` or the README), and the original reproduction from Phase 1 no longer fails.
4. **Sweep siblings:** `Grep` for the same pattern elsewhere and report other instances; fix them only if they are in scope.
5. **Count attempts.** After three failed fixes, stop (see "Decision points").

## Decision points

**Three or more fixes have failed.** Each fix revealing a new problem somewhere else signals an architectural issue, not a bug. Stop and ask with AskUserQuestion (Codex: ask the same question in plain text):

```
question: "Three fixes failed. How should we proceed?"
header: "Debugging"
multiSelect: false
options:
  - label: "🟢 Step back and review the design"
    description: "Stop fixing; write up what the failures reveal about the architecture and decide the change together."
  - label: "Delegate to the debugger agent"
    description: "A fresh-context agent re-runs the investigation from Phase 1 with the hypothesis log so far."
  - label: "One more hypothesis, with new evidence"
    description: "Only if a new observation (not a new guess) has appeared; name it first."
```

**Long or multi-system investigation.** Offer delegation to the `debugger` agent through the Agent tool. The brief includes: the symptom, the exact reproduction command, the hypothesis log, files in scope, and the return format (root cause with `path:line`, evidence, proposed single fix, regression test). Re-run the agent's reproduction and test yourself before reporting; its report is a claim until checked. Codex: run the same brief with `codex exec`.

## Red flags — return to Phase 1

- "Quick fix for now, investigate later."
- "Just try changing X and see."
- "Make several changes, then run the tests."
- "It's probably X; let me fix that."
- "I don't fully understand, but this might work."
- "One more fix attempt" after two have already failed.

| Excuse | Reality |
|---|---|
| "Too simple to need the process" | Simple bugs have root causes too; the process is fast for them. |
| "Emergency, no time" | Systematic work is faster than thrashing. |
| "I can see the problem" | Seeing the symptom is not understanding the cause. |
| "Several fixes at once saves time" | You cannot tell which one worked, and you add new bugs. |

## Quick reference

| Phase | Question | Exit condition |
|---|---|---|
| 1. Root cause | What is happening, and where? | Reproduced, location known |
| 2. Pattern | Why here and not in working code? | The material difference is named |
| 3. Hypothesis | Is the theory right? | Confirmed or ruled out by a minimal probe |
| 4. Implementation | Did the fix work? | Failing test now passes, suite green, reproduction gone |

## Done when

- The root cause is stated with `path:line` and the evidence that confirmed it.
- The regression test failed before the fix and passes after it; report both runs' actual output lines.
- The project's test suite (or the relevant subset, named) passes; report the command and result.
- `git diff --stat` shows only the fix and its test.

## Guardrails

- No fix before Phase 1 and Phase 3 are complete.
- One change at a time; revert probes that did not confirm the hypothesis.
- Never weaken, skip or delete a test to make it pass.
- Never commit, push or deploy as part of this skill; hand off to `$ccc-ship` or the user.
- Never report "fixed" from a self-report or a delegated agent's claim without re-running the reproduction.

## See also

- `$ccc-triage` — sort and prioritize several issues before debugging one.
- `$ccc-testing` — strengthen the suite around the fix.
- `$ccc-review` — independent review of the fix.
- `$ccc-xray` — map an unfamiliar codebase before tracing.

Adapted from [obra/superpowers](https://github.com/obra/superpowers) `systematic-debugging` (MIT); the original is vendored at `vendor/superpowers/skills/systematic-debugging/`.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
