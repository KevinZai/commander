---
name: literature-review
description: "Academic and technical literature review with source evaluation, structured synthesis, and citation management."
version: 1.0.0
category: research
parent: mega-research
tags: [mega-research, academic, literature]
disable-model-invocation: true
---

# Literature Review

## What This Does

Conducts a structured review of academic papers, technical documentation, RFCs, and industry publications on a given topic. Evaluates source quality, identifies key themes and debates, and produces a synthesis document suitable for informing technical decisions or establishing prior art.

## Instructions

1. **Define the review scope.** Clarify with the user:
   - Topic and specific research questions
   - Type of literature: academic papers, RFCs, technical blogs, whitepapers, or all
   - Time range: recent only (last 2 years) or comprehensive
   - Depth: survey (breadth-first) or focused (depth-first on a specific question)

2. **Search for sources.** Use available tools to find relevant literature:
   - Web search for papers, articles, and technical posts
   - GitHub for implementations, benchmarks, and discussions
   - Official documentation and specifications
   - Conference proceedings and talk transcripts

3. **Screen and select sources.** Apply inclusion/exclusion criteria:
   - Relevance to the research question
   - Source credibility (peer review, author expertise, publication venue)
   - Recency and continued relevance
   - Aim for 10-20 sources for a survey, 5-10 for a focused review

4. **Extract key information.** For each source, note:
   - Core claim or contribution
   - Methodology or approach
   - Key findings or recommendations
   - Limitations acknowledged by the authors
   - How it relates to other sources in the review

5. **Identify themes and patterns.** Group findings into:
   - Areas of consensus (what most sources agree on)
   - Active debates (where sources disagree)
   - Emerging trends (recent shifts in thinking)
   - Gaps (questions that lack good coverage)

6. **Synthesize into a review document.** Write a coherent narrative that connects the sources rather than just listing them.

## Output Format

```markdown
# Literature Review: {Topic}
**Date:** {YYYY-MM-DD}
**Scope:** {survey/focused} | {time range} | {source types}
**Sources reviewed:** {count}

## Research Question(s)
1. {Primary question}
2. {Secondary question, if any}

## Summary of Findings
{3-5 sentence synthesis of the most important findings}

## Themes

### {Theme 1: Area of Consensus}
{Narrative synthesis with inline citations [Author, Year]}

### {Theme 2: Active Debate}
{Present competing perspectives with citations}

### {Theme 3: Emerging Trend}
{Describe the trend with evidence}

## Key Sources

| Source | Type | Year | Relevance | Key Contribution |
|--------|------|------|-----------|-----------------|
| {title} | {paper/RFC/blog/doc} | {year} | {H/M} | {one-line summary} |

## Gaps in the Literature
- {Gap 1: question that lacks good coverage}
- {Gap 2: area needing more research}

## Implications for {Project/Decision}
{How these findings should inform the user's work}

## References
1. {Author}. "{Title}." {Venue/URL}, {Year}.
2. ...
```

## Tips

- A literature review synthesizes — it does not just list sources
- Group by theme, not by source. The narrative should flow logically.
- Always note limitations and biases in the sources
- For technology topics, prioritize recent sources — the field moves fast
- If a seminal older paper is foundational, include it regardless of age
- Distinguish between evidence (data, benchmarks) and opinion (blog posts, tweets)
- If you cannot find enough quality sources, say so — a gap finding is still a finding
