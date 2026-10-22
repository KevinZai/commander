---
name: debug-systematic
category: coding
skills: [systematic-debugging, investigate, tdd-workflow]
mode: code
estimated_tokens: 600
---

# Systematic Debugging

## When to Use
Use when a bug's cause is not obvious from the first read. The template enforces one sequence: reproduce, isolate, confirm the root cause, fix with a failing test first, sweep, verify.

## Template

```
Debug this issue in the sequence below. Do not change code until Step 3 has identified the root cause.

**Symptom:**
{{what_is_happening_vs_what_should_happen}}

**Reproduction steps:**
{{steps_to_reproduce_or_say_unknown}}

**Relevant files:**
{{file_paths_or_say_unknown}}

Step 1: Reproduce.
- If the reproduction steps are unknown, use Grep and Glob to find the code involved.
- Read the code paths and trace the data flow.
- Create a minimal reproduction (a test file or script) and run it to confirm the failure.

Step 2: Isolate.
- Narrow the problem by halving the search space: which layer is broken?
- Check inputs and outputs at each boundary (API, service, database).
- Run targeted tests with the project's runner, for example `npx vitest run {{test_file}} --reporter=verbose`.

Step 3: Identify the root cause.
- Name the exact lines where behavior diverges from expectation.
- Explain why they are wrong, not only where they are.

Step 4: Fix.
- Write a test that captures the bug and confirm it fails for that reason.
- Implement the smallest fix; no unrelated refactors.
- Run the test and confirm it passes.

Step 5: Sweep.
- Use Grep to find the same pattern elsewhere in the codebase.
- Fix other instances of the same bug class, or list them if they are out of scope.

Step 6: Verify.
- Run the full test suite, for example `npx vitest run`.
- Run the type check, for example `npx tsc --noEmit`.
- Report the actual results and any regression.
```

## Tips
- Read and trace before editing; most wasted debugging time comes from fixing a guessed cause.
- The `investigate` skill automates Steps 1 and 2 with multi-file tracing; `/ccc-systematic-debugging` runs the full sequence.
- Write the reproduction test before the fix; it is the evidence that the fix works.

## Example

```
Debug this issue in the sequence below. Do not change code until Step 3 has identified the root cause.

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
