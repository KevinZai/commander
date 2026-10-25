---
name: ccc-agent-writing
description: "Draft a spec, PRD, PR description, README section, runbook or technical doc that a reader can act on without a follow-up question: named reader, answer first, typed structure, self-test. Use when the user says write a spec, draft a PRD, write the PR description, or document this."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
  - Edit
  - AskUserQuestion
argument-hint: "[spec | prd | pr | readme | runbook | doc] [topic or path]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-agent-writing — docs a reader can act on

**CC Commander** · $ccc-agent-writing · a technical document with one named reader, one outcome, and a passed self-test.

Writing is testable: if the reader (a junior developer, a reviewer, an agent) cannot act on it without asking a follow-up question, it is broken.

## When to use / when not to

- Use for technical writing: specs, PRDs, PR descriptions, README sections, runbooks, technical docs.
- Hand marketing copy, landing pages, brand voice, headline or CTA variants, and long-form editorial to `$ccc-content` or the plugin's `content-strategist` agent. This skill handles technical writing only.
- Use `$ccc-plan` when the document is an implementation plan with evals; use `$ccc-changelog` for release notes.

## What happens

### 1. Pick the document type

Take the type from the first argument (`spec`, `prd`, `pr`, `readme`, `runbook`, `doc`). Otherwise infer it from the request; if still unclear, ask the type picker.

### 2. Name the reader and the outcome

Before writing a word, state both in one line: `🎯 Reader: <who> · Outcome: <what they do after reading>`. Readers: junior developer, senior reviewer, product stakeholder, operator on call, future maintainer. Outcomes: approve, implement, review, install, operate. If neither the request nor the context implies them, ask the reader picker.

### 3. Gather the facts

Read the sources instead of describing from memory.

PR description: run these against the base branch (default `main`; use the branch the user names), then Read the changed files that carry the behavior change and find the test command in `package.json` (or the project's equivalent) for the test plan. On "unknown revision", ask which base branch to use.

```bash
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD
git diff --stat main...HEAD
```

Other types:

- Spec or PRD: Read the issue text, linked files and prior decisions the user points to; Grep the codebase for the feature's current behavior.
- README, runbook or doc: Read the code, commands and config being documented; run read-only commands (`--help`, `--version`) to confirm exact syntax.

Mark anything you could not verify as `[unverified]` in the draft rather than guessing.

### 4. Draft from the template

Use the structure and template for the type from [references/templates.md](references/templates.md). Apply these rules from [references/style.md](references/style.md):

1. The first sentence answers "what is this and why do I care?"
2. Section headers are complete thoughts; lists of three or more are bullets; comparisons are tables.
3. Every term is defined on first use; voice is active.
4. Specs and PRDs carry Given/When/Then acceptance criteria and an explicit out-of-scope list. Add the AIDA persuasion pass only when the document needs stakeholder buy-in, with numbers sourced from the user's data.
5. PR descriptions explain why, not only what; the test plan lists the exact commands.

### 5. Self-test

Check the draft against every item and fix each failure before showing it:

- [ ] The reader can act on it without asking a follow-up question.
- [ ] The first sentence says what this is.
- [ ] Every term is defined on first use.
- [ ] Edge cases and out-of-scope items are explicit.
- [ ] A new team member would understand it in six months.
- [ ] No "simply", "just" or "obviously"; no invented metric, quote or link.

### 6. Deliver

Ask the delivery picker. Write the file only to the path the user picked, then run the Done-when check. A PR description is returned as text for the user to paste or pass to `$ccc-ship`; this skill never opens or edits a PR.

## Decision points

Type (step 1):

```
question: "What are we writing?"
header: "Writing"
multiSelect: false
options:
  - label: "🟢 📝 Spec or PRD"
    description: "Problem, requirements, Given/When/Then acceptance criteria, out of scope."
  - label: "PR description"
    description: "Summary, changes, test plan built from the actual diff."
  - label: "README section or technical doc"
    description: "What, why, how, with a runnable example."
  - label: "Runbook"
    description: "Trigger, exact steps, expected result, rollback."
```

Put the type the request implies first and mark it 🟢.

Reader (step 2): 🟢 the reader the context implies · senior reviewer · product stakeholder · operator on call. Each description names the outcome expected from that reader.

Delivery (step 6):

- 🟢 Show it here — the draft in chat, no files written.
- Write to a file — the path the user names, or `docs/<slug>.md` for specs and docs.
- Revise first — name what to change; repeat steps 4 and 5.

## Done when

- The reply states the reader and outcome, and every self-test item passed (list any `[unverified]` markers that remain).
- If a file was written: `test -s "<path>" && head -3 "<path>"` prints the document's first lines, and the reply names the path.

## Guardrails

- Never write outside the path the user picked, and never overwrite an existing file without showing the diff and asking.
- Never invent metrics, benchmarks, quotes, issue numbers or links; mark gaps `[unverified]`.
- Never push, open a PR, post, or write to a tracker from this skill; those go through `$ccc-ship` or `$ccc-linear`, which ask at that moment.
- Codex: ask each picker as a plain-text question with the same options.

## See also

- `$ccc-content` — marketing and editorial writing
- `$ccc-plan` — implementation plans with evals
- `$ccc-changelog` — release notes from `CHANGELOG.md`
- `$ccc-prompt-fix` — sharpen a prompt instead of a document

---

_Adapted from [superpowers/writing-skills](https://github.com/nicholasgasior/superpowers) — MIT licensed._

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
