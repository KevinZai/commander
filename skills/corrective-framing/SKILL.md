---
name: corrective-framing
description: "Prompt engineering technique: present possibly-wrong claims to trigger correction instead of 'remember to X' reminders. Use when: writing CLAUDE.md rules, agent instructions, system prompts, or when agents keep forgetting instructions."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted from @yishan)"
---

# Corrective Framing

When an agent keeps forgetting to do something, don't add another "remember to X" instruction. Instead, present a specific, possibly-wrong claim that triggers corrective behavior.

## Why It Works

"Remember to run tests" → agent processes as low-priority reminder, often skipped.
"You should be running tests after every change — are you still doing it?" → mismatch between stated expectation and actual behavior creates a natural correction event.

## The Pattern

### ❌ Reminder (weak)
```
Remember to check for TypeScript errors before committing.
```

### ✅ Corrective frame (strong)
```
You should be running `npx tsc --noEmit` before every commit — verify this is happening.
```

### ❌ Reminder (weak)
```
Don't forget to update the tests when you change the API.
```

### ✅ Corrective frame (strong)
```
API changes without corresponding test updates are the #1 source of regressions in this codebase. If you changed an API, the tests should already be updated — confirm.
```

## When to Use

1. **CLAUDE.md rules that get ignored** — rewrite as corrective assertions
2. **Recurring mistakes** — frame as "this pattern causes X, you should be avoiding it"
3. **Quality gates** — "you should have already done X before reaching this point"
4. **Agent instructions** — present expectations as verifiable claims

## Key Principles

- **Specific > generic.** "Tests should pass" < "The API route tests in `__tests__/api/` should pass after your schema change"
- **Consequence > instruction.** Name what breaks, not just what to do
- **Verifiable > aspirational.** Agent should be able to check whether the claim is true
- **Sparingly.** 3 corrective frames in CLAUDE.md > 15 reminders. Overuse dilutes the signal.

## Anti-Patterns
- Don't use for genuinely new information (agent can't "correct" what it doesn't know)
- Don't stack multiple corrective frames in sequence (reads as nagging)
- Don't use passive-aggressive framing ("you probably forgot to...")
