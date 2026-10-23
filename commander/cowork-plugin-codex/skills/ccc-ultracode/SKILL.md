---
name: ccc-ultracode
description: "Run deep, multi-agent work as adversarially verified workflows: repo audits, branch reviews, migrations, fleets. Explains the /effort ultracode toggle and launches the bundled Commander workflows. Use when the user types $ccc-ultracode or wants depth over speed on repo-wide work."
allowed-tools:
  - Read
  - Bash
  - Workflow
  - Skill
  - AskUserQuestion
argument-hint: "[audit | review | migrate | fleet | prompt-audit | release-audit]"
model: inherit
effort: high
---

# $ccc-ultracode — depth over speed

**CC Commander** · $ccc-ultracode · substantial tasks run as multi-agent workflows whose findings are cross-checked before they reach you.

The strongest form of `rules/workflow-first.md`: delegate the doing, keep the deciding. Orchestration is the platform's Workflow tool; Commander supplies the scripts and the pickers.

## Two separate dials

| Dial | Command | Effect |
|---|---|---|
| Ultracode | `/effort ultracode on` · `/effort ultracode off` | Claude plans a dynamic workflow (fan out, verify adversarially, synthesize) for each substantial task instead of a single-agent pass. Its own toggle since Claude Code 2.1.284; it does not change the reasoning level. |
| Reasoning effort | `/effort xhigh` (or `high`, `max`) | How long the model thinks per turn. `max` lasts only for the current session. |

Both are typed by the user; this skill cannot flip them. Treat ultracode as a per-session choice and turn it off with `/effort ultracode off` when the deep work is done. Check the current state with `/effort`.

**One task without the toggle:** include the word `workflow` in the prompt ("audit the auth module as a workflow") or let this skill launch a bundled workflow directly.

## When to use / when not to

- Use for migrations across many files, audits where false positives waste time, repo-wide cleanups, design stress-tests, and plans worth checking from several angles.
- Skip for routine edits, single-file fixes, quick questions, and anything where speed matters more than depth.
- Token cost: a workflow spawns many agents; a full-repo audit can cost ten to fifty times a single pass. Scope to a path first.

## What happens

### 1. Read the scope

```bash
git rev-parse --abbrev-ref HEAD; git diff --stat main...HEAD 2>/dev/null | tail -1; git status --porcelain | wc -l
```

A branch diff with no path in the request points to a review; "migrate", "rename" or "rewrite" to a migration; "audit", "health" or "scan" to an audit; "research", "compare" or "options" to `/deep-research`.

### 2. Pick the run

An argument skips this picker. Otherwise call AskUserQuestion (Codex: the same question in plain text), best match first with 🟢:

```
question: "What should run as a verified workflow?"
header: "Ultracode"
multiSelect: false
options:
  - label: "🟢 🔬 Deep repo audit"
    description: "One finder per dimension, every finding verified, scorecard returned. Scope a path first."
  - label: "📝 Deep branch review"
    description: "Four weighted dimensions over the branch diff; findings confirmed or refuted before reporting."
  - label: "🔄 Codebase migration"
    description: "Find every matching site, transform each in its own worktree, verify each change."
  - label: "🚀 Multi-agent fleet"
    description: "Fan-out, pipeline, judge or debate pattern for general parallel work."
```

Research questions do not use this picker: invoke `/deep-research <question>` with the Skill tool (fan-out search, fact-checking, cited report).

### 3. Fill missing args

Ask only for what has no safe default: an audit target path on a large repo, `pattern` and `transform` for a migration, the slices or task for a fleet. Defaults: `target: "."` only on a small repo, `base: "main"`.

### 4. Launch

```js
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/<name>.workflow.js", args: { … } })
```

Each also runs from the prompt as `/commander:<name>`.

| Workflow | Args | Notes |
|---|---|---|
| `ccc-audit` | `{ target, dimensions, maxPerDimension }` | Dimensions: quality, security, performance, deps, tests, docs, ci. Read-only. |
| `ccc-deep-review` | `{ base, maxPerDimension }` | Security 35, correctness 25, performance 25, maintainability 15. Read-only. |
| `ccc-migrate` | `{ pattern, transform, verify, maxSites }` | Each site in its own worktree with an independent verifier. Writes files. |
| `ccc-fleet-run` | `{ mode: "fanout" \| "pipeline" \| "judge" \| "debate", tasks \| task, attempts, lenses, rounds }` | See `$ccc-fleet` for pattern choice. |
| `ccc-prompt-audit` | `{ root, standard, paths, maxFiles }` | Prompt-standard check of plugin skills and agents. Commander repository only. Read-only. |
| `ccc-release-audit` | `{ version, skipTests, postRelease }` | Release gates and doc/count/manifest agreement. Commander repository only. Does not commit, tag, push or publish. |

Do not invent other Workflow parameters. To pin every workflow agent to one model, the user sets `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` before the session starts (see `$ccc-fleet`).

Report one line, then let the run continue in the background:

> 🔬 Workflow `<name>` running on `<scope>`. Findings are verified before they reach you; inspect progress with `/workflows`. ⚠️ Token use is well above a single pass.

### 5. Report the result

Relay the workflow's verdict: verified findings as `path:line`, severity and fix; unverified findings labelled as such; any dimension or slice that failed, by name. For `ccc-migrate` and `ccc-fleet` fan-out, also run `git status --porcelain | grep -v '^??'` on the main checkout and confirm it prints nothing.

## Fallback

Without the Workflow tool (older client, tool not allowed, usage limit), keep the shape and swap the engine: `$ccc-fleet` with Agent-tool dispatch, or `codex exec --json` workers via `$ccc-orchestrate`. Codex has no `/effort ultracode`; its nearest equivalent is `model_reasoning_effort = "ultra"` where the model supports it (Ultra uses subagents).

## Done when

- The workflow returned and its verdict is reported, with verified and unverified findings separated and failed parts named.
- For writing workflows, the main-checkout integrity check printed nothing.
- The user knows whether ultracode is still on and how to turn it off.

## Guardrails

- Never run `ccc-audit` on a large repo's root without first offering to scope a path.
- Never invent a Workflow API; use `Workflow({ scriptPath, args })` exactly.
- Never block the user while a workflow runs.
- Never claim to have toggled `/effort ultracode` or `/effort`; the user types them.
- Workflows here do not push, publish or deploy; any such step afterwards needs the user's authorization in this conversation.

## See also

- `$ccc-fleet` — manual-dispatch patterns and pinned fleets.
- `$ccc-review` — branch review without the full workflow.
- `$ccc-xray` — repo health scorecard.
- `/commander:ccc-migrate` — the migration workflow, run directly.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)

> (The Workflow(...) tool is not available on Codex — run the steps sequentially.)
