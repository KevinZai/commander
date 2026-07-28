---
name: ccc-ultracode
description: "Ultracode mode: xhigh reasoning + automatic dynamic-workflow orchestration for migrations, deep audits, and repo-wide work. Requires Claude Code v2.1.154+."
allowed-tools:
  - Read
  - Bash
  - Workflow
  - AskUserQuestion
---

# /ccc-ultracode — Ultracode Mode

Ultracode flips two dials at once: **xhigh reasoning** (Opus 5 extended thinking) and **automatic dynamic-workflow orchestration** (Claude plans a multi-agent Workflow per substantial task instead of solving it in a single agent pass). The result is adversarially verified, multi-perspective output — at the cost of meaningfully more tokens.

**CC Commander** · Ultracode Mode · [Docs](https://commanderplugin.com)

> Ultracode is the strongest expression of the canonical workflow-first doctrine (`commander/cowork-plugin/rules/workflow-first.md`): **delegate the doing, keep the deciding.**
>
> **Rides Anthropic's native primitive:** orchestration here is Claude Code's built-in `Workflow` tool (trigger word `workflow`), not a CC Commander re-implementation. We supply scripts + picker UX on top; the fan-out/verify/synthesize engine is Anthropic's.

---

## What ultracode is

`/effort ultracode` = two things working together:

1. **xhigh reasoning** — Opus 5 extended thinking budget. Claude thinks longer before answering. Catches edge cases, cross-checks assumptions, surfaces risks.
2. **Dynamic-workflow orchestration** — for any substantial task, Claude plans a Workflow that fans out specialized subagents, verifies their findings adversarially, then synthesizes a single result. You get a multi-angle, cross-checked output instead of a single-pass answer.

Drop back any time: `/effort high` (or just start a new session — ultracode does not persist).

---

## When to use ultracode

**Use for:**
- Migrations across many files (API renames, framework bumps, import rewrites)
- Deep audits where false positives waste engineering time
- Repo-wide cleanups that touch 20+ files
- Design stress-tests where you want FOR/AGAINST/Referee reasoning
- Hard plans worth reasoning from multiple angles before committing

**Skip for:**
- Routine edits, single-file fixes, quick questions
- Anything where speed matters more than depth
- Tasks where you already know the answer

**Token caution:** Workflows spawn many subagents. A full repo audit can consume 10-50x tokens vs a single-agent pass. **Scope to a path first** (`target: 'src/auth/'`) rather than the whole repo. Watch your rate limits.

---

## One-off without flipping the session

Include the word **`workflow`** anywhere in your prompt and CC Commander will run that single task as a workflow without activating ultracode mode session-wide.

Examples:
- "Audit the auth module as a workflow"
- "workflow: review this PR diff across all 4 dimensions"
- "Run a migration workflow for all `fetch()` calls to use our `apiFetch()` wrapper"

---

## Requires CC v2.1.154+

The Workflow tool is available in Claude Code v2.1.154 and later. On older clients, this skill gracefully falls back — use `/ccc-fleet` for multi-agent orchestration instead (same patterns, manual dispatch).

Check your version: `claude --version` in the terminal.

---

## Bundled CC Commander workflows

Four production-ready workflows live at `${CLAUDE_PLUGIN_ROOT}/workflows/`. Invoke them via:

```js
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/<name>.workflow.js", args: { ... } })
```

| Workflow | scriptPath | What it does | Example args |
|----------|-----------|--------------|--------------|
| **ccc-audit** | `ccc-audit.workflow.js` | Repo-wide health audit — one agent per dimension (quality/security/perf/deps/tests/docs/CI), adversarially verifies every finding, returns scorecard | `{ target: 'src/', dimensions: ['security','tests'] }` |
| **ccc-deep-review** | `ccc-deep-review.workflow.js` | Branch diff review — 4 weighted dimensions (security 35%, perf 25%, correctness 25%, maintainability 15%), findings cross-checked before reporting | `{ base: 'main' }` |
| **ccc-migrate** | `ccc-migrate.workflow.js` | Codebase migration — discovers every matching site, transforms each in an isolated worktree, verifies before reporting | `{ pattern: 'fetch(', transform: 'use apiFetch()', verify: 'tests pass' }` |
| **ccc-fleet** | `ccc-fleet.workflow.js` | General multi-agent orchestration — fanout (parallel slices), pipeline (sequential stages), or judge (N independent attempts scored by a referee) | `{ mode: 'fanout', tasks: ['slice A', 'slice B'] }` |

**Also available:** `/deep-research` — multi-source web research with adversarial verification and cited synthesis. Not a Workflow scriptPath — invoke as a skill: `/deep-research <question>`.

---

## Mode picker

Call `AskUserQuestion` to help the user choose:

```
question: "What should I run in ultracode mode?"
header: "Ultracode"
multiSelect: false
options:
  - label: "🔬 Deep repo audit (ccc-audit)"
    description: "Health scorecard across 7 dimensions. Adversarially verified findings only."
    preview: "Scope a path first to contain token spend. Args: { target, dimensions }."
  - label: "🔍 Deep branch review (ccc-deep-review)"
    description: "PR-quality review with cross-checked findings. 4 weighted dimensions."
    preview: "Compares current branch vs main. Args: { base: 'main' }."
  - label: "🔄 Codebase migration (ccc-migrate)"
    description: "Discover every site, transform each in isolation, verify before reporting."
    preview: "Args: { pattern, transform, verify }."
  - label: "🚀 Multi-agent fleet (ccc-fleet)"
    description: "Fanout, pipeline, or judge pattern. General parallel orchestration."
    preview: "Args: { mode, tasks|task }."
  - label: "🌐 Deep research (/deep-research)"
    description: "Web research — fan-out searches, adversarial fact-checking, cited report."
    preview: "Invoke as a skill: /deep-research <question>."
```

Prepend ⭐ to the best match:
- Diff present + no path specified → ⭐ Deep branch review
- "migrate" / "rename" / "rewrite" keywords → ⭐ Codebase migration
- "audit" / "health" / "scan" keywords → ⭐ Deep repo audit
- "research" / "compare" / "options" → ⭐ Deep research

---

## After user picks

Dispatch the workflow immediately with the matching `scriptPath` and `args`. No additional prompting needed — if args are missing, use sensible defaults (`base: 'main'`, `target: '.'`).

Report back:
> 🔬 **Ultracode workflow running** — `<workflow-name>`, ETA varies by repo size.
> Findings will be adversarially verified before they reach you — expect ~2-5min for a scoped audit.
> ⚠️ Token spend is meaningfully higher than a standard pass. Monitor your usage.

---

## Anti-patterns — DO NOT

- ❌ Activate ultracode for routine single-file edits — wastes tokens and rate limits
- ❌ Run ccc-audit on `.` (whole repo) without scoping to a path first
- ❌ Invent a Workflow API — always use `Workflow({ scriptPath, args })` exactly
- ❌ Block the user while the workflow runs — emit the progress card and let the workflow run async
- ❌ Persist ultracode mode across sessions — it resets on session start

---

**Bottom line:** ultracode = xhigh reasoning × dynamic workflows × adversarial verification. Use when depth beats speed. Scope first, then run.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
