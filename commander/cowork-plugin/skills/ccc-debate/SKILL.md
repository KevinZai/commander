---
name: ccc-debate
description: "Adversarial multi-agent debate (antfooding): fan out N agents that argue and critique a design or diff from distinct lenses until issues resolve, then synthesize a verdict."
allowed-tools:
  - Read
  - Bash
  - Workflow
  - AskUserQuestion
---

# /ccc-debate — Adversarial Multi-Agent Debate (Antfooding)

Debate mode pits **N agents against each other** on a single design, plan, or diff. Each argues from a distinct lens (security, performance, maintainability, product, contrarian), critiques the others' positions, and the strongest objections survive. A judge synthesizes a single ruled verdict. This is **antfooding** — you stress-test your own work by adversarially eating it before reality does.

**CC Commander** · Debate Mode · [Docs](https://commanderplugin.com)

> Debate is the dialectic expression of the canonical workflow-first doctrine (`commander/cowork-plugin/rules/workflow-first.md`): **delegate the arguing, keep the ruling.** Built on the Workflow tool + `dialectic-review` + `/ccc-fleet` judge mode.

---

## What debate is

`/ccc-debate` runs a structured adversarial loop:

1. **Fan out lenses** — Claude spawns one agent per lens via the Workflow tool. Each independently reads the target and produces its strongest argument + objections.
2. **Cross-examine** — agents critique each other's positions. Weak claims get torn down; survivors are the real issues. (Adversarial verification per workflow-first §1.)
3. **Iterate until resolved** — rounds repeat until no new material objection survives, or a round cap is hit.
4. **Synthesize** — a judge agent rules: blocking issues, accepted tradeoffs, and a 🟢/🟡/🔴 verdict — conclusions only, no raw transcript dumped into your context.

You keep the deciding. The agents do the arguing.

---

## When to use debate

**Use for:**
- Expensive-to-reverse design or architecture decisions
- A diff or PR where silent flaws would be costly (auth, billing, migrations)
- Plans worth stress-testing from FOR / AGAINST / Referee angles before committing
- "Am I missing something?" gut-checks on a spec you're about to lock

**Skip for:**
- Routine edits, single-file fixes, or anything with an obvious answer
- Work where speed beats rigor — debate spends multiple agent passes
- Cases where you have no clear target (no design doc, no diff) to argue about

**Token caution:** N lenses × M rounds multiplies token spend fast. **Scope tight** — debate a single design doc or one diff, not the whole repo. Default to 3 lenses, 2 rounds.

---

## One-off without flipping the session

Include the word **`workflow`** in your prompt to run a single debate without changing session mode. Examples:
- "Debate this auth design as a workflow"
- "workflow: have agents argue both sides of this migration plan"
- "Run an adversarial debate workflow on the current diff"

---

## Requires CC v2.1.154+

The Workflow tool ships in Claude Code v2.1.154 and later. On older clients, fall back to `/ccc-fleet` judge mode for the same fan-out/synthesize shape (manual dispatch), or the `dialectic-review` skill for a single FOR/AGAINST/Referee pass. Check: `claude --version`.

---

## Lens picker

Call `AskUserQuestion` to let the user choose the debate's lenses (multiSelect):

```
question: "Which lenses should argue this?"
header: "Debate"
multiSelect: true
options:
  - label: "🔐 Security adversary"
    description: "Assumes hostile input. Hunts auth gaps, injection, trust-boundary breaks."
    preview: "Maps to the security-auditor persona. Best for diffs touching auth/data."
  - label: "⚡ Performance adversary"
    description: "Attacks hot paths, N+1s, tail latency, and scale assumptions."
    preview: "Maps to performance-engineer. Best when the design makes scale claims."
  - label: "🏗️ Architecture adversary"
    description: "Challenges boundaries, coupling, reversibility, and YAGNI violations."
    preview: "Maps to architect. Best for expensive-to-reverse design calls."
  - label: "🎯 Product adversary"
    description: "Questions the user value, the metric, and scope creep."
    preview: "Maps to product-manager. Best for feature/spec debates."
  - label: "🐉 Contrarian (devil's advocate)"
    description: "Pure FOR/AGAINST devil's advocate — argues the unpopular side hard."
    preview: "Maps to dialectic-review. Always include for a real stress-test."
```

Then ask scope + rounds via a second `AskUserQuestion`:

```
question: "How hard should I push this debate?"
header: "Intensity"
multiSelect: false
options:
  - label: "🥊 Quick (3 lenses, 2 rounds)"
    description: "Fast adversarial pass. Default — good for most diffs and plans."
  - label: "🥋 Deep (5 lenses, 3 rounds)"
    description: "Full antfooding. For high-stakes, hard-to-reverse decisions only."
    preview: "Meaningfully higher token spend. Scope to one target first."
```

Prepend ⭐ to the best match:
- Diff touches auth/billing/data → ⭐ Security adversary
- Design makes scale/latency claims → ⭐ Performance adversary
- Expensive-to-reverse architecture call → ⭐ Architecture adversary
- Always recommend including 🐉 Contrarian

---

## After the user picks

Dispatch the debate as a workflow. Reuse the bundled fleet/judge machinery rather than inventing an API:

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/ccc-fleet.workflow.js",
  args: {
    mode: "judge",
    task: "Adversarially debate <target>. Each agent argues one lens, cross-examines the others, and the judge rules a verdict.",
    lenses: ["security", "performance", "contrarian"],
    rounds: 2
  }
})
```

If `ccc-fleet.workflow.js` is unavailable, fall back to the `dialectic-review` skill for a single FOR/AGAINST/Referee round.

Report back with a progress card — do not block while the debate runs:
> 🥊 **Debate running** — `<N> lenses × <M> rounds`. Agents argue and cross-examine async.
> Only surviving objections + a 🟢/🟡/🔴 verdict reach you — the transcript stays out of your context.
> ⚠️ Token spend scales with lenses × rounds. Scope kept tight.

---

## What you get back

A synthesized ruling — conclusions only:
- 🔴 **Blocking issues** — objections that survived cross-examination, with `path:line` citations
- 🟡 **Accepted tradeoffs** — known costs the design deliberately takes
- 🟢/🟡/🔴 **Verdict** — ship / revise / block, with one-line rationale

Act on the ruling. The agents' raw back-and-forth never lands in your lead context (workflow-first §2).

---

## Anti-patterns — DO NOT

- ❌ Run debate without a concrete target (a design doc, plan, or diff) — there's nothing to argue
- ❌ Dump the full agent transcript into lead context — relay only the synthesized verdict
- ❌ Spawn 5 lenses × 3 rounds on a trivial change — match intensity to stakes
- ❌ Debate the whole repo — scope to one design or one diff first
- ❌ Invent a Workflow API — always use `Workflow({ scriptPath, args })` exactly
- ❌ Block the user while the debate runs — emit the progress card and let it run async
- ❌ Skip the contrarian lens — without a devil's advocate it's not a real stress-test

---

**Bottom line:** debate = N adversarial lenses × cross-examination × a judged verdict. Antfood your design before reality does. Scope tight, push hard, keep the ruling.
