---
name: large-context
description: "Strategy for work that exceeds a single context window — use Opus 5's native 1M window first, then reduce, then chunk-and-synthesize, then hand execution to the Codex CLI."
version: 2.0.0
category: research
parent: ccc-research
tags: [ccc-research, large-context, opus-5, codex]
disable-model-invocation: true
---

# Large Context

## What This Does

Handles work whose input is too big to reason about in one pass — whole codebases, large document sets, long transcripts.

**This replaced `gemini-fallback` in v7.3.2.** That skill existed to escape "Claude's 200K limit" by routing to a third-party 1M-context model. Both halves of that premise are gone: **Claude Opus 5 has a 1M-token context window by default** (it is the default *and* the maximum — no `[1m]` suffix needed), and CC Commander routes to Anthropic models and the Codex CLI only. There is no Gemini path and no local-LLM path.

## Instructions

Work down this ladder. Stop at the first rung that fits — each costs more than the one above it.

### 1. Just use the window (default)

Opus 5 gives you 1M tokens. Most "too big" tasks are not actually too big anymore. Measure before engineering around it:

```bash
# rough estimate — chars/4 is close enough to decide
find <path> -type f -name '*.ts' -exec cat {} + | wc -c | awk '{print int($1/4)" est. tokens"}'
```

Under ~800K estimated tokens: read it directly. Don't build a pipeline for a problem you don't have.

### 2. Reduce before you chunk

If it genuinely exceeds the window, shrink the input before splitting it:

- Filter to the files that matter (`rg -l '<symbol>'` beats reading the tree).
- Strip generated output, lockfiles, `node_modules`, build artifacts, vendored code.
- Summarize per-file, then reason over the summaries.

A 3M-token repo is usually a 200K-token repo plus noise.

### 3. Chunk and synthesize

Still too big — split on a natural boundary (module, chapter, date range), process each chunk in its own subagent, and have each return **conclusions only**, never raw content. Synthesize the returned findings in the lead context.

Per the Opus 5 delegation rules: fan out only when chunks are genuinely independent, and keep spawn counts low. Three sequential passes beat thirty parallel agents returning file dumps.

### 4. Hand execution to the Codex CLI

When the job is *mechanical* over a large surface (repo-wide rename, codemod, bulk migration), plan with Claude and let the Codex CLI execute against the plan:

```bash
codex exec -m gpt-5.6-sol -c reasoning_effort=high "$(cat plan.md)" < /dev/null
```

Codex runs read-only by default; pass `-s workspace-write` to let it write, and only inside an isolated git worktree on its own branch. Review the diff before merging — the same gate any subagent's work gets.

## Guardrails

- **Never route to a local LLM or a third-party model.** Anthropic + Codex CLI only. This is a deliberate product constraint, not an oversight — it keeps behaviour predictable and every documented workflow reproducible on a stock install.
- **Chunk boundaries must be semantic.** Splitting mid-function or mid-argument produces confidently wrong summaries.
- **Subagents return conclusions, not content.** Pulling raw chunks back into the lead context re-creates the problem you were solving.
- **State the reduction.** If you filtered 3M tokens down to 200K, say what you dropped — a synthesis over a silently truncated corpus reads as complete when it isn't.

## Related

- `ccc-research/deep-research` — multi-source research synthesis
- `ccc-research/cross-model-review` — second-opinion review via the Codex CLI
- `/ccc-orchestrate` — plan on Claude, execute on Codex, verify on Claude
