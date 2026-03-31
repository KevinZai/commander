---
name: trend-analysis
description: "Analyze trends in technology, markets, or usage patterns using data signals, community sentiment, and trajectory modeling."
version: 1.0.0
category: research
parent: ccc-research
tags: [ccc-research, trends, analysis]
disable-model-invocation: true
---

# Trend Analysis

## What This Does

Identifies and analyzes trends in technology adoption, market movements, community sentiment, or usage patterns. Combines quantitative signals (download counts, star growth, search volume) with qualitative indicators (community discussions, conference talks, job postings) to assess where things are headed.

## Instructions

1. **Define what to analyze.** Clarify with the user:
   - Subject: technology, market, tool, framework, or pattern
   - Time horizon: where is this going in 6 months, 1 year, 3 years?
   - Comparison: is this relative to alternatives, or absolute growth?
   - Decision context: what action depends on this analysis?

2. **Gather quantitative signals.** Look for measurable data:
   - **npm/PyPI downloads:** weekly download trends over 6-12 months
   - **GitHub metrics:** star growth rate, contributor count, issue resolution speed
   - **Search volume:** Google Trends, StackOverflow question frequency
   - **Job market:** job posting frequency mentioning the technology
   - **Funding/revenue:** if applicable, company financials or funding rounds
   - **Usage surveys:** State of JS, StackOverflow Survey, JetBrains Survey

3. **Gather qualitative signals.** Look for sentiment and narrative:
   - Community discussions (Reddit, Discord, X/Twitter)
   - Conference talk topics and trends
   - Blog post frequency and sentiment
   - Migration stories (from X to Y, or from Y to X)
   - Maintainer activity and communications

4. **Identify the trend pattern.** Classify what you're seeing:
   - **Emerging:** early adoption, rapid growth, lots of excitement
   - **Growing:** established, steady adoption increase, maturing ecosystem
   - **Mature:** widespread use, slow growth, focus on stability
   - **Declining:** decreasing adoption, migration away, maintainer fatigue
   - **Cyclical:** periodic interest spikes tied to events or seasons

5. **Assess trajectory.** Based on signals:
   - Current adoption level and growth rate
   - Accelerating, steady, or decelerating?
   - Key catalysts that could change the trajectory
   - Risks that could derail the trend

6. **Deliver the analysis.** Present findings with confidence levels.

## Output Format

```markdown
# Trend Analysis: {Subject}
**Date:** {YYYY-MM-DD}
**Time horizon:** {6mo / 1yr / 3yr}
**Pattern:** {Emerging / Growing / Mature / Declining / Cyclical}

## Summary
{3-5 sentence executive summary of the trend and where it's heading}

## Quantitative Signals

| Signal | Current | 6mo Ago | 12mo Ago | Trend |
|--------|---------|---------|----------|-------|
| npm weekly downloads | {n} | {n} | {n} | {up/down/flat %} |
| GitHub stars | {n} | {n} | {n} | {up/down/flat %} |
| StackOverflow questions/mo | {n} | {n} | {n} | {up/down/flat %} |
| Job postings mentioning X | {n} | {n} | {n} | {up/down/flat %} |

## Qualitative Signals
- **Community sentiment:** {positive/mixed/negative — with evidence}
- **Conference presence:** {increasing/stable/decreasing}
- **Migration direction:** {people moving to X / away from X}
- **Maintainer health:** {active/sustainable/at-risk}

## Trajectory Assessment
- **Current phase:** {Emerging/Growing/Mature/Declining}
- **Growth rate:** {accelerating/steady/decelerating}
- **6-month forecast:** {prediction with confidence}
- **1-year forecast:** {prediction with confidence}

## Catalysts and Risks
| Factor | Type | Likelihood | Impact |
|--------|------|-----------|--------|
| {factor} | Catalyst/Risk | {H/M/L} | {description} |

## Implications
{What this means for the user's decision}

## Confidence
- Data quality: {H/M/L — how reliable are the signals}
- Forecast confidence: {H/M/L — how predictable is this trend}
- Key uncertainty: {the biggest unknown}
```

## Tips

- Quantitative signals without qualitative context can be misleading — npm downloads spike from bots, stars come from hype
- Look at the second derivative: is growth accelerating or decelerating? That matters more than the current number
- Migration stories are the strongest signal — when people invest effort to move, that's real conviction
- Be skeptical of hype cycles — distinguish genuine adoption from conference-driven excitement
- Always note what could change the trajectory (new funding, key maintainer leaving, a competitor launching)
- For technology trends, check if large companies are adopting (lagging indicator, but strong signal)
