---
name: KZ Mega-Research
description: "Complete research ecosystem — 8 skills in one. Deep research, spec interviews, cross-model review, literature review, competitive analysis, data ingestion, trend analysis, and Gemini fallback."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
tags: [CCC domain, research, analysis]
---

# KZ Mega-Research

> Load ONE skill. Get the entire research domain. From multi-source deep dives to spec interviews to cross-model validation.

## Sub-Skills

| # | Skill | Command | Description |
|---|-------|---------|-------------|
| 1 | deep-research | `/deep-research` | Multi-source deep research with parallel agents, citation tracking, and synthesis |
| 2 | spec-interview | `/spec-interview` | 5-7 question interview to create detailed specifications before coding |
| 3 | cross-model-review | `/cross-model-review` | Review code/decisions using multiple AI models for diverse perspectives |
| 4 | literature-review | `/literature-review` | Academic/technical literature review with source evaluation |
| 5 | competitive-analysis | `/competitive-analysis` | Analyze competing products/tools/libraries for feature comparison |
| 6 | data-ingestion | `/data-ingestion` | Ingest and summarize large documents, codebases, or datasets |
| 7 | trend-analysis | `/trend-analysis` | Analyze trends in technology, markets, or usage patterns |
| 8 | gemini-fallback | `/gemini-fallback` | Use Gemini's 1M context window for tasks that exceed Claude's context |

## How To Use

**Step 1:** Tell me what you need to research. I'll route to the right specialist.

**Step 2:** If the task involves multiple sources or models, I'll confirm scope, depth, and output format before proceeding.

**Step 3:** The specialist skill handles the work. You get structured research output without loading 8 separate skills.

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Research this topic deeply" / "Find everything about X" | `deep-research` | `literature-review` (academic focus, not general) |
| "Interview me to write a spec" / "Help me define requirements" | `spec-interview` | `deep-research` (research, not requirements gathering) |
| "Get a second opinion from another model" / "Cross-validate" | `cross-model-review` | `deep-research` (source diversity, not model diversity) |
| "Review the academic literature on X" / "What does the research say?" | `literature-review` | `deep-research` (broader scope, less rigorous sourcing) |
| "Compare these tools" / "What's the competition doing?" | `competitive-analysis` | `trend-analysis` (temporal patterns, not feature comparison) |
| "Summarize this codebase" / "Ingest this dataset" | `data-ingestion` | `deep-research` (research synthesizes, ingestion summarizes) |
| "What's trending in X?" / "How is Y changing over time?" | `trend-analysis` | `competitive-analysis` (snapshots, not trajectories) |
| "This is too big for Claude's context" / "Need Gemini for this" | `gemini-fallback` | `data-ingestion` (processing strategy, not model switching) |

## Campaign Templates

### New Project Research
1. `spec-interview` -> gather requirements through structured questions
2. `competitive-analysis` -> evaluate existing solutions in the space
3. `deep-research` -> fill knowledge gaps identified during spec and analysis
4. `literature-review` -> find academic/technical foundations if applicable
5. Deliver: comprehensive spec document with competitive landscape and research backing

### Technology Evaluation
1. `deep-research` -> understand the technology landscape
2. `competitive-analysis` -> compare specific tools/libraries/frameworks
3. `trend-analysis` -> identify adoption trajectories and community momentum
4. `cross-model-review` -> validate conclusions against multiple AI perspectives
5. Deliver: technology evaluation report with recommendation and risk assessment

### Large Codebase Understanding
1. `data-ingestion` -> ingest and summarize the codebase structure
2. `gemini-fallback` -> use 1M context for full-codebase analysis if needed
3. `deep-research` -> research unfamiliar patterns or libraries found
4. Deliver: codebase architecture summary with key patterns and dependencies

## Context Strategy

This CCC domain uses on-demand loading. Sub-skills have `disable-model-invocation: true` so they only load when explicitly invoked, keeping your context lean.
