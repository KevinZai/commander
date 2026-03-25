---
name: operationalize-fixes
description: "After fixing a bug, don't stop — write tests, check for similar issues, update instructions. Every bug is a learning opportunity. Use when: bug fix complete, post-fix review, 'what else could break?', preventing regressions."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted from @doodlestein)"
---

# Operationalize Every Fix

When a bug is found and fixed, don't stop at the fix. Extract the full learning:

## The Protocol

### 1. Test-First (Before Fixing)
Write a reproduction test FIRST:
```
Bug reported → Write failing test → Confirm test fails → Fix bug → Confirm test passes
```
The test proves the bug exists. The fix proves the test works. Don't reverse this.

### 2. Expand Test Coverage
After fixing, ask:
- What's the **class** of this bug? (off-by-one, null handling, async race, etc.)
- Write tests for the whole class, not just this instance
- Edge cases: empty input, max values, concurrent access, unicode, timezone

### 3. Sweep for Siblings
Check: does the same mistake exist elsewhere in the codebase?
```bash
# Example: if the bug was unchecked null access
grep -rn "\.property" src/ | grep -v "?." | grep -v "!= null"
```
Fix all siblings. Each one is a future bug prevented.

### 4. Update Instructions
If the bug reveals a gap in your workflow:
- **CLAUDE.md** — add a rule that would have caught it
- **tasks/lessons.md** — document the pattern
- **Use corrective framing:** "API responses must be null-checked before property access — verify this is happening in new code"

### 5. Root Cause Chain
Ask "why?" until you hit process:
```
Bug: user.name crashes on null user
→ Why? API returns null when user deleted
→ Why wasn't this handled? No null checks on API responses
→ Why? No rule about defensive API handling
→ Fix: Add rule to CLAUDE.md + tests for all API response handlers
```

## Checklist (Post-Fix)
- [ ] Reproduction test written and passing
- [ ] Class-level tests added (not just this instance)
- [ ] Codebase swept for sibling instances
- [ ] Instructions updated if gap identified
- [ ] Root cause documented in tasks/lessons.md
