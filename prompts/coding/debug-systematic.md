---
name: debug-systematic
category: coding
skills: [systematic-debugging, investigate, tdd-workflow]
mode: code
estimated_tokens: 600
---

# Systematic Debugging

## When to Use
When you hit a bug that isn't immediately obvious. This template enforces a structured approach: reproduce, isolate, identify root cause, fix, and verify.

## Template

```
Debug this issue systematically. Do NOT guess-and-check. Follow this exact sequence:

**Symptom:**
{{what_is_happening_vs_what_should_happen}}

**Reproduction steps:**
{{steps_to_reproduce_or_say_unknown}}

**Relevant files:**
{{file_paths_or_say_unknown}}

**Step 1: Reproduce**
- If reproduction steps are unknown, use Grep and Glob to find relevant code
- Read the code paths involved and trace the data flow
- Create a minimal reproduction (test file or script)

**Step 2: Isolate**
- Binary search the problem space: which layer is broken?
- Check inputs/outputs at each boundary (API → service → DB)
- Use Bash to run targeted tests: `npx vitest run {{test_file}} --reporter=verbose`

**Step 3: Root cause**
- Identify the EXACT line(s) where behavior diverges from expectation
- Explain WHY it's broken, not just WHERE

**Step 4: Fix**
- Write a failing test FIRST that captures the bug
- Implement the minimal fix (no drive-by refactors)
- Run the test — confirm it passes

**Step 5: Sweep**
- Use Grep to find similar patterns elsewhere in the codebase
- If the same bug class exists elsewhere, fix those too

**Step 6: Verify**
- Run the full test suite: `npx vitest run`
- Run type check: `npx tsc --noEmit`
- Confirm no regressions
```

## Tips
- Resist the urge to start editing immediately — reading and tracing comes first
- The `investigate` skill automates step 1-2 with multi-file tracing
- Always write the reproduction test before the fix — it proves the fix works

## Example

```
Debug this issue systematically. Do NOT guess-and-check. Follow this exact sequence:

**Symptom:**
Users see a 401 error after exactly 1 hour, even though refresh tokens should extend the session. Expected: seamless token refresh. Actual: hard logout at the 1-hour mark.

**Reproduction steps:**
1. Log in with valid credentials
2. Wait 60+ minutes without activity
3. Make any API request
4. Observe 401 instead of transparent refresh

**Relevant files:**
src/middleware/auth.ts, src/services/token.ts
```
