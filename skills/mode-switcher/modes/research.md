---
name: research-mode
description: Deep analysis with parallel agents, extended thinking, and structured source attribution
tags: [mode]
disable-model-invocation: true
---

# Research Mode

## Overview

Optimizes Claude for deep research and analysis work. Activates extended thinking, parallel agent research patterns, structured findings with source attribution, and thorough comparative analysis. Claude takes time to think deeply, casts a wide net, and produces well-sourced conclusions.

## Skills Loaded

**Primary CCC domain:**
- `ccc-research` — Deep analysis, competitive intelligence, technology evaluation, market research

**Supporting skills suggested as needed:**
- `dialectic-review` — FOR/AGAINST/Referee pattern for evaluating options
- `evals-before-specs` — Define success criteria before committing to an approach
- `brainstorming` — Divergent thinking and idea generation
- `iterative-retrieval` — Multi-round search refinement
- `competitor-alternatives` — Competitive landscape mapping
- `business-analytics` — Data-driven business analysis
- `trading-analysis` — Market and financial analysis (if applicable)

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Deep thinking:** Use extended thinking for all non-trivial analysis. Take time to reason through the problem before responding.
- **Parallel agents:** For comparative analysis, spawn parallel research agents — one per option or perspective. Synthesize findings.
- **Source attribution:** Cite every claim. Link to sources. Distinguish between verified facts, expert opinions, and inference.
- **Structured output:** Produce findings in structured format: executive summary, detailed analysis, recommendations, sources.
- **Dialectic approach:** For important decisions, use the FOR/AGAINST/Referee pattern. Present the strongest case for each side.
- **Exhaustive search:** Don't stop at the first answer. Search broadly, check multiple sources, look for contradicting evidence.
- **Confidence levels:** Rate confidence in conclusions. Distinguish between high-confidence findings and speculative analysis.
- **Bias awareness:** Acknowledge limitations, potential biases, and gaps in available information.
- **Time-bound:** Set clear scope boundaries. Research can expand infinitely — define what "done" looks like before starting.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| context-guard | Elevated | Research accumulates context quickly; monitor closely |
| cost-alert | Elevated | Parallel agents and extended thinking increase token usage |
| session-coach | Elevated | Periodic check-ins prevent rabbit holes |
| confidence-gate | Standard | |
| auto-checkpoint | Standard | |

## Context Strategy

- **Pre-flight check:** Verify context is below 60% before entering — research generates large outputs
- **Compact threshold:** Compact at 65% — save findings to files before compacting
- **Priority in context:** Research question, findings so far, source list, decision criteria
- **Deprioritize:** Implementation code, UI files, configuration
- **Before compacting:** Always save current findings to a file (e.g., `research-{topic}.md`) so nothing is lost

## Pre-flight Checklist

- [ ] Confirm context usage is below 60%
- [ ] Define the research question clearly and specifically
- [ ] Set scope boundaries — what's in and out of scope
- [ ] Define what "done" looks like (deliverable format, depth, time budget)
- [ ] Identify available research tools (web search MCPs, GitHub search, local docs)
- [ ] Check if dialectic review is warranted (evaluating options with high reversal cost)
