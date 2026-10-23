---
name: ccc-research
description: "Research before you build: cited multi-source research, spec interviews, cross-model review, literature reviews, competitive and trend analysis, and large-document or large-codebase ingestion. Use when the user wants options compared, prior art found, a spec defined, or something too big summarized."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[deep | spec | review | literature | compare | ingest | trends | large]"
model: inherit
effort: high
---

# /ccc-research — research, routed

**CC Commander** · /ccc-research · a cited answer, a comparison or a spec before any code is written.

Research sub-skills (`deep-research`, `spec-interview`, `cross-model-review`, `literature-review`, `competitive-analysis`, `data-ingestion`, `trend-analysis`, `large-context`) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply the method in [references/routing.md](references/routing.md). The user's selected model is preserved.

Codex: ask pickers as plain-text questions, run parallel lanes as separate `codex exec` calls, and write the report to a file.

## When to use / when not to

- Use before a non-trivial build, for "which library/tool/vendor", "what are the trends in X", "interview me for a spec", "review this decision from several angles", or an input too large to read in one pass.
- Use `/ccc-brainstorm` for open-ended ideation, `/ccc-debate` for a structured for/against verdict on one decision, `/ccc-plan` once the spec exists, `/ccc-data` for data pipelines and analytics.

## What happens

### 1. Route by intent, or ask

An argument or a clear intent routes straight to the sub-skill in [references/routing.md](references/routing.md). "Research X before building" runs the research-before-build sequence in step 4.

Otherwise ask with AskUserQuestion (header "Research"), recommended first:

- 🟢 Deep research — parallel sources, citations, a synthesized report
- Compare options — `competitive-analysis` feature and trade-off table
- Spec interview — 5 to 7 questions, then a written spec
- More — cross-model review, literature review, trends, or ingest something large (a follow-up picker)

### 2. Fix the question

Restate the question in one sentence, the depth (overview, detailed, exhaustive), sources to include or exclude, and the output (brief, report, table). Ask only for what changes the result.

### 3. Gather and synthesize

- **Deep research**: when `/deep-research` is listed in this session, invoke it with the Skill tool (`/deep-research <question>`); it fans out search, fact-checks and returns a cited report. Otherwise split the question into 3 to 5 independent sub-questions and run them as parallel Agent calls (each returns findings with source URLs and dates, never raw page dumps), using WebSearch and WebFetch. Synthesize in the lead context.
- **Cross-model review**: Claude and the Codex CLI only. Run an independent Claude reviewer through the Agent tool, and Codex when installed:

  ```bash
  codex review --uncommitted                                   # code changes in the working tree
  codex exec --json -m gpt-6-astra --sandbox read-only "$(cat review-prompt.md)" < /dev/null   # a document or decision
  ```

  Reviewers never see each other's output. Report agreements, single-reviewer findings and contradictions separately.
- **Large inputs** (`data-ingestion`, `large-context`): measure first, since current Claude models have a 1M-token window:

  ```bash
  find "<path>" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -exec cat {} + | wc -c | awk '{print int(\$1/4)" est. tokens"}'
  ```

  Under roughly 800K estimated tokens, read it directly. Above that, reduce (filter with `rg -l`, drop generated and vendored files), then chunk on semantic boundaries with one subagent per chunk returning conclusions only. Mechanical work over a large surface goes to `codex exec -m gpt-6.1-sol` inside an isolated worktree, with the diff reviewed before merge. State what was dropped.
- **Other surfaces**: connected channels (opt-in connectors such as Discord or Telegram) for community sentiment, and user-uploaded files, only when the user points to them. They are absent by default.

### 4. Research before build (non-trivial features)

1. `deep-research` — existing solutions, prior art, practice
2. `competitive-analysis` — evaluate the options
3. `spec-interview` — requirements before code
4. Hand off to `/ccc-plan` or `/ccc-build` with the report path as context

### 5. Write the deliverable

Write the report or spec to a file the user chooses (default `./research/<slug>-<YYYY-MM-DD>.md`) with Write. Every factual claim carries a source link and access date; every comparison states its criteria.

## Done when

- The deliverable exists (`test -s <file> && echo ok` printed `ok`) and its path is reported.
- Every load-bearing claim has a source URL, and at least the top recommendation was checked against a second independent source or a fresh-context verifier (Agent) asked to refute it.
- Cross-model review: each reviewer's output was received in this turn, or the user is told which reviewer could not run (for example, Codex not installed).

## Guardrails

- Route models to Anthropic and the Codex CLI only; never to a local or other third-party model.
- Never present an unsourced claim as fact; label inference and gaps.
- Never post, message, or publish research output; it stays a local file unless the user authorizes sharing in this conversation.
- Never send the user's private code or documents to an external service other than the Codex CLI they already use, and only after they choose cross-model review.
- Subagents return conclusions, not raw content.

## See also

- `/ccc-debate` — structured verdict on one decision
- `/ccc-brainstorm` — divergent ideation
- `/ccc-plan` — turn the spec into an implementation plan
- `/ccc-orchestrate` — plan on Claude, execute on Codex, verify on Claude

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
