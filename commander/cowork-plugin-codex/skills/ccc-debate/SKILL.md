---
name: ccc-debate
description: "Adversarial multi-agent debate: lens agents (security, performance, architecture, product, contrarian) argue and cross-examine one design, plan or diff, then a judge rules ship, revise or block. Use when a decision is costly to reverse, a diff touches auth or billing, or the user types $ccc-debate."
allowed-tools:
  - Read
  - Bash
  - Workflow
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[path to design doc or plan | diff | \"question in quotes\"]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-debate — stress-test before reality does

**CC Commander** · $ccc-debate · surviving objections and a 🟢 ship / 🟡 revise / 🔴 block verdict on one design, plan or diff, without the transcript in your context.

Lens agents argue; the judge rules; the user decides. This is the dialectic form of `rules/workflow-first.md`: delegate the arguing, keep the ruling.

## When to use / when not to

- Use for expensive-to-reverse design or architecture calls, diffs where a silent flaw is costly (auth, billing, migrations), plans worth testing from for/against angles before locking, and "am I missing something?" checks on a spec.
- Skip for routine edits, single-file fixes, obvious answers, or work where speed beats rigor. Without a concrete target (a doc, a plan, a diff) there is nothing to argue.
- Token spend is lenses × rounds. Scope to one target; default to 3 lenses and 2 rounds.

## What happens

### 1. Resolve the target

- A path argument: confirm it exists with `test -f <path>` and read it.
- `diff`, or no argument inside a repo with changes: run `git diff --stat HEAD` and use the uncommitted diff as the target.
- A quoted question: use it, and ask in one plain sentence for the doc or diff it refers to if none is obvious.
- Nothing resolvable: say so and stop; never debate the whole repository.

Write the target as one sentence for the workflow, for example `the uncommitted diff in this repository (git diff HEAD), focusing on src/auth/` or `the design doc at docs/billing-v2.md`.

### 2. Pick lenses and intensity

Ask the two pickers under Decision points. The contrarian lens is always included. Lens names passed on: `security`, `performance`, `architecture`, `product`, `contrarian`.

### 3. Run the debate

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-fleet-run.workflow.js",
  args: {
    mode: "debate",
    task: "Adversarially debate <target sentence from step 1>.",
    lenses: ["security", "performance", "contrarian"],
    rounds: 2
  }
})
```

`mode: "debate"` is the only mode with custom lenses and cross-examination: round 1 has each lens argue blind; rounds 2 and later have each lens cross-examine the others' prior positions (concede, sharpen or withdraw); the judge rules only on objections that survived. `rounds` is clamped to 1 to 3. `mode: "judge"` is a different thing (independent attempts with fixed angles, no cross-examination); do not substitute it.

Post the progress card and do not block on the run:

```
🔄 Debate running — <N> lenses × <M> rounds. Agents argue and cross-examine in the workflow.
Only surviving objections and a verdict come back here.
⚠️ Token spend scales with lenses × rounds.
```

### 4. Fallback when the Workflow tool is not exposed

1. Round 1: one `Agent` call per lens in a single message (`subagent_type: "general-purpose"`, `effort: "medium"`), each told its lens and the target, blind to the others.
2. Rounds 2 to M: one `Agent` call per lens with all prior positions, told to concede, sharpen or withdraw.
3. Judge: one `Agent` call (`effort: "high"`) that lists surviving blocking objections, accepted tradeoffs, and ship / revise / block with a one-line rationale, discarding anything conceded or withdrawn.

Keep the lens transcripts out of the main thread; relay only the judge's output. For a single for/against/referee pass instead, invoke the `dialectic-review` skill with `Skill` when it is installed (it ships with the CLI toolkit, not the plugin). On Codex: ask the pickers in plain text and run each lens as a `codex exec` call, then a judge call.

### 5. Report the ruling

The workflow returns `{ mode, lenses, rounds, judged }`, where `judged` has `verdict` (`ship` | `revise` | `block`), `blocking[]`, `tradeoffs[]` and `rationale`. Relay:

- 🔴 **Blocking issues** — each surviving objection, with `path:line` where given
- 🟡 **Accepted tradeoffs** — costs the design takes on deliberately
- **Verdict** — 🟢 ship / 🟡 revise / 🔴 block, with the one-line rationale

Then ask with the follow-up picker.

## Decision points

Lens picker (step 2, `multiSelect: true`). Put the lenses that match the target first and mark them 🟢: auth, billing or data in the diff → security; scale or latency claims → performance; expensive-to-reverse structure → architecture; feature or spec debates → product. Recommend two.

```
question: "Which lenses should argue this? The contrarian lens is always added."
header: "Lenses"
multiSelect: true
options:
  - label: "🔐 Security"
    description: "Assumes hostile input; hunts auth gaps, injection, trust-boundary breaks."
  - label: "📊 Performance"
    description: "Attacks hot paths, N+1 queries, tail latency and scale assumptions."
  - label: "🏗️ Architecture"
    description: "Challenges boundaries, coupling, reversibility and needless abstraction."
  - label: "🎯 Product"
    description: "Questions the user value, the success metric and scope creep."
```

Intensity picker (step 2):

```
question: "How hard should this debate push?"
header: "Intensity"
multiSelect: false
options:
  - label: "🟢 Quick — 2 rounds"
    description: "The default for most diffs and plans."
  - label: "Deep — 3 rounds"
    description: "Full stress-test for high-stakes, hard-to-reverse decisions. Noticeably more tokens."
```

Follow-up picker (step 5): 🟢 Fix the blocking issues now (for revise or block) / Re-debate after changes / Accept the ruling and continue / Show one lens's final position.

## Done when

- The workflow (or the fallback judge) returned a verdict of `ship`, `revise` or `block`. If `judged` is `null` or missing, report that the judge did not return and offer to re-run; never invent a verdict.
- The report lists every `blocking` item, the `tradeoffs`, and the verdict with its rationale.

## Guardrails

- Never run without a concrete target, and never on the whole repository.
- Never paste the lens transcripts into the main thread; relay the ruling only.
- Never drop the contrarian lens; without it this is not a stress-test.
- Never invent a Workflow API; call `Workflow({ scriptPath, args })` exactly as above.
- Never edit files from this skill; fixes happen after the user picks them in the follow-up.
- Workflow agents use their default model unless `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` is set; the user's selected session model is preserved.

## See also

- `$ccc-fleet` — fan-out, pipeline and judge-panel modes of the same workflow
- `$ccc-review` — standard code review of a diff
- `$ccc-brainstorm` — generate options before debating one
- `$ccc-plan` — write the plan worth debating

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)

> (The Workflow(...) tool is not available on Codex — run the steps sequentially.)
