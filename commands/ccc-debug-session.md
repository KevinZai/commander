---
name: ccc-debug-session
description: "Start a structured debug session with hypothesis tracking and resolution documentation"
usage: /debug-session [issue description]
version: 1.3.0
---

# Debug Session — Structured Investigation

Starting debug session for: **{{input}}**

## Phase 1: Gather Context

1. **Recent changes**: Run `git log --oneline -10` and `git diff HEAD~3` to see what changed recently
2. **Error reproduction**: Identify the exact error message, stack trace, or unexpected behavior
3. **Related files**: Search for files related to the issue description
4. **Previous fixes**: Check `tasks/lessons.md` for related past fixes
5. **Git blame**: Identify when the relevant code was last changed

## Phase 2: Hypothesis Generation

Generate 3-5 candidate root causes, ranked by likelihood:

```
HYPOTHESIS 1 (most likely): [description]
  Evidence for: [what supports this]
  Evidence against: [what contradicts this]
  Test: [how to verify]

HYPOTHESIS 2: [description]
  Evidence for: ...
  Evidence against: ...
  Test: ...
```

## Phase 3: Systematic Investigation

For each hypothesis (starting with most likely):
1. Design a minimal test to confirm or eliminate
2. Run the test
3. Document the result
4. If confirmed → proceed to fix. If eliminated → next hypothesis.

**IMPORTANT**: Do not change code to "try things." Test hypotheses with reads, greps, and targeted experiments first.

## Phase 4: Resolution

When root cause is identified:
1. Write a reproduction test FIRST (RED)
2. Implement the minimal fix (GREEN)
3. Verify the fix resolves the original issue
4. Run full test suite to check for regressions
5. Document in `tasks/lessons.md`:

```markdown
## [Date] — {{input}}
**Root cause:** [what actually caused it]
**Fix:** [what was changed]
**Lesson:** [what to watch for in the future]
**Prevention:** [rule or test that prevents recurrence]
```

## Output Format

```
DEBUG SESSION: {{input}}
Status: [INVESTIGATING / ROOT CAUSE FOUND / FIXED / UNRESOLVED]

Hypotheses tested: X/Y
Root cause: [description or "still investigating"]
Fix applied: [yes/no — description]
Tests added: [yes/no — count]
Lessons captured: [yes/no]
```
