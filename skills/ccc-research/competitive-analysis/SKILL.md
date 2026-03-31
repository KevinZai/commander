---
name: competitive-analysis
description: "Analyze competing products, tools, or libraries with feature comparison, SWOT analysis, and strategic recommendations."
version: 1.0.0
category: research
parent: ccc-research
tags: [ccc-research, competitive, comparison]
disable-model-invocation: true
---

# Competitive Analysis

## What This Does

Performs structured competitive analysis of products, tools, frameworks, or libraries. Compares features, pricing, community health, and strategic positioning. Produces an actionable report with clear recommendations for decision-making.

## Instructions

1. **Define the competitive set.** Clarify with the user:
   - What are we evaluating? (product category, specific tools, frameworks)
   - Who are the 3-7 competitors to include?
   - What criteria matter most? (features, pricing, performance, DX, community)
   - What is the decision being made? (adopt, build vs buy, switch from X to Y)

2. **Research each competitor.** For each product/tool, gather:
   - Core features and capabilities
   - Pricing model and tiers
   - Technology stack and architecture
   - Community size and health (GitHub stars, npm downloads, Discord/Slack activity)
   - Documentation quality
   - Release frequency and maintenance status
   - Known limitations and pain points
   - Notable customers or case studies

3. **Build the comparison matrix.** Create a feature-by-feature comparison:
   - Must-have features (deal breakers if missing)
   - Nice-to-have features (differentiators)
   - Performance benchmarks (if available)
   - Integration capabilities

4. **Perform SWOT analysis.** For the top 2-3 contenders:
   - Strengths (what they do best)
   - Weaknesses (known pain points)
   - Opportunities (emerging capabilities, roadmap)
   - Threats (risks of adopting — vendor lock-in, abandonment)

5. **Score and rank.** Apply weighted scoring based on the user's priorities:
   - Weight each criterion by importance (the user decides weights)
   - Score each competitor (1-5) per criterion
   - Calculate weighted totals
   - Identify the clear winner or explain why it's a close call

6. **Deliver recommendation.** Make a clear, defensible recommendation with reasoning.

## Output Format

```markdown
# Competitive Analysis: {Category}
**Date:** {YYYY-MM-DD}
**Decision:** {What we're deciding}
**Competitors evaluated:** {count}

## Executive Summary
{3-5 sentences: the recommendation and why}

## Comparison Matrix

| Criterion | Weight | {Competitor A} | {Competitor B} | {Competitor C} |
|-----------|--------|---------------|---------------|---------------|
| {Feature 1} | {1-5} | {score}/5 | {score}/5 | {score}/5 |
| {Feature 2} | {1-5} | {score}/5 | {score}/5 | {score}/5 |
| Pricing | {1-5} | {score}/5 | {score}/5 | {score}/5 |
| Community | {1-5} | {score}/5 | {score}/5 | {score}/5 |
| DX | {1-5} | {score}/5 | {score}/5 | {score}/5 |
| **Weighted Total** | | **{total}** | **{total}** | **{total}** |

## SWOT: {Top Contender}
| Strengths | Weaknesses |
|-----------|------------|
| {list} | {list} |

| Opportunities | Threats |
|--------------|---------|
| {list} | {list} |

## Detailed Analysis

### {Competitor A}
{2-3 paragraphs covering strengths, weaknesses, and fit for the user's needs}

### {Competitor B}
{same}

## Recommendation
**Pick: {Winner}**
{Why this is the best choice, what trade-offs you're accepting, and migration/adoption plan}

## Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| {risk} | {H/M/L} | {H/M/L} | {strategy} |
```

## Tips

- Always ask what criteria matter most — don't assume equal weighting
- Include at least one "underdog" or lesser-known competitor — they sometimes win
- Check GitHub issues and community forums for real-world pain points, not just marketing
- npm download trends, GitHub star history, and StackOverflow question volume are good health signals
- Pricing comparison should include hidden costs (egress, support tiers, enterprise features)
- If the user's decision is "build vs buy," treat their custom solution as a competitor
- A clear recommendation is more valuable than a balanced "it depends" — take a position
