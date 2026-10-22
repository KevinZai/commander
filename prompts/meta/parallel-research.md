---
name: parallel-research
category: meta
skills: [ccc-research, dispatching-parallel-agents, delegation-templates, dialectic-review]
mode: plan
estimated_tokens: 500
---

# Parallel Research

## When to Use
Use to research a broad topic quickly by sending several subagents after different angles at once: technology evaluations, vendor comparisons, or any research that splits into independent threads.

## Template

````
Research the topic below with parallel subagents. Each subagent investigates one angle independently; then synthesize the results.

**Research question:**
{{the_question_to_answer}}

**Context:**
{{why_this_research_matters, what_decision_it_will_inform}}

Step 1: Define research angles. Split the question into 3-5 independent threads:

| Agent | Angle | Key questions | Sources to check |
|---|---|---|---|
| Agent 1 | {{angle_1}} | {{questions}} | {{where_to_look}} |
| Agent 2 | {{angle_2}} | {{questions}} | {{where_to_look}} |
| Agent 3 | {{angle_3}} | {{questions}} | {{where_to_look}} |
| Agent 4 | {{angle_4}} | {{questions}} | {{where_to_look}} |

Step 2: Dispatch the subagents in one message with the Agent tool so they run in parallel (or one Workflow tool run that fans out). Research is read-only, so no worktree isolation is needed. Keep my selected model unless I choose otherwise; a `sonnet` subagent at medium effort suits most single-angle research. Give each subagent this brief:

```
Research this angle: {{angle}}

Answer these questions:
1. {{specific_question_1}}
2. {{specific_question_2}}
3. {{specific_question_3}}

Use these tools:
- Grep and Glob to find existing patterns in the codebase.
- Read to examine relevant files.
- Bash for investigative commands (package versions, dependency trees).
- WebSearch and WebFetch for external sources; cite every URL you rely on.

Return exactly this shape:
## Findings
- Finding 1, with evidence (path:line or URL)
- Finding 2, with evidence

## Recommendation
One paragraph, based only on the findings above.

## Confidence
High, Medium or Low, and why.
```

Step 3: Synthesize after every subagent reports:
- Identify where the agents agree.
- Flag contradictions and conflicting findings.
- Weight findings by confidence and by the quality of their evidence.
- Spot-check the evidence behind any finding the recommendation depends on.
- Produce one recommendation with its supporting evidence.

Step 4: Write a research summary with:
1. Executive summary: 2-3 sentences.
2. Findings by angle: one section per thread.
3. Synthesis: where agents agreed and disagreed.
4. Recommendation: the answer, with a confidence level.
5. Open questions: what still needs investigation.
````

## Tips
- `/ccc-research` runs cited multi-source research end to end; the `dispatching-parallel-agents` skill covers the dispatch pattern.
- For a binary decision, use the `dialectic-review` skill (one agent for, one against) or `/ccc-debate`.
- Keep each subagent's scope narrow; broad scopes produce shallow results.

## Example

```
Research the topic below with parallel subagents.

**Research question:**
Which headless CMS should we use for our marketing site? We need MDX support, API access, good DX and reasonable pricing for a small team.

**Context:**
We are rebuilding the marketing site in Next.js. Content lives in hardcoded MDX files in the repo, but the marketing team needs to edit content without developer involvement.

Agents:
1. Sanity.io evaluation
2. Contentlayer / local MDX evaluation
3. Payload CMS (self-hosted) evaluation
4. Keystatic evaluation
```
