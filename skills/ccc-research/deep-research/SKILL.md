---
name: deep-research
description: "Multi-source deep research with parallel agents, citation tracking, and synthesis into structured deliverables."
version: 1.0.0
category: research
parent: ccc-research
tags: [ccc-research, research, analysis]
disable-model-invocation: true
---

# Deep Research

## What This Does

Conducts comprehensive research on any topic by gathering information from multiple sources in parallel, tracking citations, evaluating source quality, and synthesizing findings into a structured research document. Designed for questions that need more than a quick answer — when you need thorough, well-sourced analysis.

## Instructions

1. **Clarify the research question.** Ask the user to define:
   - The core question or topic
   - Desired depth (overview, detailed, exhaustive)
   - Any specific sources to include or exclude
   - Output format preference (summary, report, brief)

2. **Plan the research strategy.** Break the question into 3-5 sub-questions that can be researched in parallel. Identify:
   - Primary sources (official docs, papers, repos)
   - Secondary sources (blogs, tutorials, discussions)
   - Data sources (benchmarks, statistics, surveys)

3. **Execute parallel research.** For each sub-question, use available tools:
   - Web search for current information
   - GitHub search for code examples and implementations
   - Documentation lookups for technical accuracy
   - Track every source URL and date accessed

4. **Evaluate source quality.** Rate each source:
   - **Authority:** Who wrote it? What are their credentials?
   - **Currency:** When was it published/updated?
   - **Relevance:** How directly does it address the question?
   - **Corroboration:** Do other sources confirm this?

5. **Synthesize findings.** Combine information from all sub-questions into a coherent narrative:
   - Lead with the answer/conclusion
   - Support with evidence from multiple sources
   - Note contradictions or areas of disagreement
   - Identify gaps in available information

6. **Deliver the research document.** Include:
   - Executive summary (2-3 sentences)
   - Key findings (bulleted)
   - Detailed analysis (organized by sub-question)
   - Source list with quality ratings
   - Confidence assessment (high/medium/low per finding)

## Output Format

```markdown
# Research: {Topic}

## Executive Summary
{2-3 sentence overview of key findings}

## Key Findings
- {Finding 1} [confidence: high/medium/low]
- {Finding 2} [confidence: high/medium/low]
- ...

## Detailed Analysis

### {Sub-question 1}
{Analysis with inline citations [1], [2]}

### {Sub-question 2}
{Analysis with inline citations [3], [4]}

...

## Sources
| # | Source | Authority | Currency | Relevance |
|---|--------|-----------|----------|-----------|
| 1 | {URL} | {rating} | {date} | {rating} |
| 2 | {URL} | {rating} | {date} | {rating} |

## Confidence Assessment
- Overall confidence: {high/medium/low}
- Key uncertainties: {list}
- Recommended follow-up: {list}
```

## Tips

- Use parallel subagents for independent sub-questions to speed up research
- Always cross-reference claims across at least 2 independent sources
- Flag anything that comes from a single source as lower confidence
- Prefer primary sources (official docs, papers) over secondary (blog posts)
- Note the date of every source — technology information can become stale quickly
- If the research reveals the question itself is wrong, say so
