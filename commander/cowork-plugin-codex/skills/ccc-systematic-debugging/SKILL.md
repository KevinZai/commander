---
name: ccc-systematic-debugging
description: Root-cause debugging via the Iron Law: no fix without confirmed root cause. Reproduce → hypothesize → verify → fix. Use when investigating bugs, test failures, or unexpected behavior. Triggers: 'debug this', 'why is X failing', 'root cause', 'investigate'. [Commander]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - TodoWrite
---

# CCC Systematic Debugging

## The Iron Law

```
NO FIX WITHOUT CONFIRMED ROOT CAUSE
```

Random fixes waste time and create new bugs. Quick patches mask underlying issues. This skill enforces a four-phase process: **Reproduce → Hypothesize → Verify → Fix.**

For deep dives requiring extended investigation, delegate to the `debugger` persona.

## The Four Phases

You MUST complete each phase before the next.

### Phase 1: Root Cause Investigation

**Before attempting ANY fix:**

1. **Read error messages completely** — stack traces, line numbers, error codes. Don't skim.
2. **Reproduce consistently** — Can you trigger it reliably? If not reproducible, gather more data first.
3. **Check recent changes** — `git diff`, recent commits, new dependencies, config changes.
4. **Gather evidence in multi-component systems** — For each component boundary: log what enters, log what exits, verify config propagation. Run once to gather evidence showing WHERE it breaks before analyzing WHY.
5. **Trace data flow** — Where does the bad value originate? Trace backward through the call stack to the source. Fix at source, not symptom.

### Phase 2: Pattern Analysis

1. **Find working examples** — Locate similar working code in the same codebase.
2. **Compare against references** — Read reference implementations completely. Don't skim.
3. **Identify differences** — List every difference, however small.
4. **Understand dependencies** — What config, environment, state does the broken code assume?

### Phase 3: Hypothesis and Testing

1. **Form a single hypothesis** — "I think X is the root cause because Y." Write it down.
2. **Test minimally** — The SMALLEST possible change to test the hypothesis. One variable at a time.
3. **Verify before continuing** — Worked? → Phase 4. Didn't work? Form new hypothesis. Don't stack fixes.
4. **When you don't know** — Say so explicitly. Don't pretend. Research more.

### Phase 4: Implementation

1. **Create a failing test case first** — Simplest possible reproduction. Automated if possible.
2. **Implement single fix** — Address the root cause. ONE change. No "while I'm here" additions.
3. **Verify fix** — Test passes? Other tests still passing? Issue actually resolved?
4. **If fix doesn't work** — Count your attempts. If ≥ 3 failed: STOP, question the architecture.

### When 3+ Fixes Fail: Question the Architecture

Each fix revealing a new problem in a different place = architectural issue, not a bug.

**STOP and discuss with your human partner before attempting more fixes.**

## Red Flags — Stop and Return to Phase 1

If you catch yourself thinking any of these, return to Phase 1 immediately:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue seems simple, don't need process" | Simple bugs have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check thrashing. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Creates new bugs. |
| "One more fix attempt" (after 2+ failed) | 3+ failures = architectural problem. |

## Quick Reference

| Phase | Key Question | Must Answer Before Next Phase |
|-------|-------------|-------------------------------|
| 1. Root Cause | What is happening and where? | Understand WHAT and WHERE |
| 2. Pattern | Why is it happening? | Identify the difference from working code |
| 3. Hypothesis | Is my theory correct? | Hypothesis confirmed or ruled out |
| 4. Implementation | Did the fix work? | Bug resolved, tests pass |

## Delegation

For extended, multi-hour investigations requiring deep context tracking:

```
Delegate to: debugger persona
When: Investigation spans >20 turns, involves multiple systems,
      or requires holding complex state across hypothesis cycles
```

The `debugger` persona applies the Iron Law automatically and maintains a bug journal with timestamp + hypothesis + evidence + lesson per cycle.

---

_Adapted from [superpowers/systematic-debugging](https://github.com/nicholasgasior/superpowers) — MIT licensed._
