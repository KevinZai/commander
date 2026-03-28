---
name: parallel-research
category: meta
skills: [delegation-templates, dispatching-parallel-agents, dialectic-review]
mode: plan
estimated_tokens: 500
---

# Parallel Research

## When to Use
When you need to research a broad topic quickly by dispatching multiple subagents to investigate different angles simultaneously. Use this for technology evaluations, vendor comparisons, or any research that can be parallelized.

## Template

```
Research the following topic using parallel subagents. Each agent investigates one angle independently, then results are synthesized.

**Research question:**
{{the_question_to_answer}}

**Context:**
{{why_this_research_matters, what_decision_it_will_inform}}

**Step 1: Define research angles**
Break the question into 3-5 independent research threads:

| Agent | Angle | Key questions | Sources to check |
|---|---|---|---|
| Agent 1 | {{angle_1}} | {{questions}} | {{where_to_look}} |
| Agent 2 | {{angle_2}} | {{questions}} | {{where_to_look}} |
| Agent 3 | {{angle_3}} | {{questions}} | {{where_to_look}} |
| Agent 4 | {{angle_4}} | {{questions}} | {{where_to_look}} |

**Step 2: Dispatch subagents**
For each research angle, spawn a subagent with this brief:

```
You are researching: {{angle}}

Questions to answer:
1. {{specific_question_1}}
2. {{specific_question_2}}
3. {{specific_question_3}}

Use these tools:
- Grep/Glob to search the codebase for existing patterns
- Read to examine relevant files
- Bash to run investigative commands (package versions, dependency trees, etc.)

Output format:
## Findings
- Key finding 1 (with evidence)
- Key finding 2 (with evidence)

## Recommendation
One paragraph with your recommendation based on findings.

## Confidence
HIGH / MEDIUM / LOW — and why.
```

**Step 3: Synthesize results**
After all agents report back:
- Identify areas of agreement across agents
- Flag contradictions or conflicting findings
- Weight findings by confidence level
- Produce a single recommendation with supporting evidence

**Step 4: Output**
Write a research summary with:
1. **Executive summary:** 2-3 sentences
2. **Findings by angle:** one section per research thread
3. **Synthesis:** where agents agreed and disagreed
4. **Recommendation:** the final answer with confidence level
5. **Open questions:** what still needs investigation
```

## Tips
- Use the `dispatching-parallel-agents` skill for structured subagent dispatch
- The `dialectic-review` skill is ideal for binary decisions (spawn FOR + AGAINST agents)
- Keep each subagent's scope narrow — broad scopes produce shallow results

## Example

```
Research the following topic using parallel subagents.

**Research question:**
Which headless CMS should we use for our marketing site? We need MDX support, API access, good DX, and reasonable pricing for a small team.

**Context:**
We're rebuilding our marketing site in Next.js. Currently using hardcoded MDX files in the repo, but the marketing team needs to edit content without developer involvement.

Agents:
1. Sanity.io evaluation
2. Contentlayer / local MDX evaluation
3. Payload CMS (self-hosted) evaluation
4. Keystatic evaluation
```
