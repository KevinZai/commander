---
name: ccc-research
context: fork
description: |
  CCC domain — complete research ecosystem — 8 skills in one. Deep multi-source research, spec interviews, cross-model review, competitive analysis, trend analysis, and large document ingestion.

  <example>
  user: research the best auth libraries for Next.js before I start building
  assistant: Loads ccc-research and routes to deep-research + competitive-analysis for multi-source comparison with citation tracking.
  </example>

  <example>
  user: help me define the spec for this feature before coding
  assistant: Loads ccc-research and routes to spec-interview — 5-7 structured questions to generate a complete spec before implementation.
  </example>

  <example>
  user: analyze this 500-page PDF of technical documentation
  assistant: Loads ccc-research and routes to data-ingestion for large document summarization and key insight extraction.
  </example>
version: 1.0.0
category: CCC domain
---

# ccc-research

> Load ONE skill. Get the entire research domain. 8 skills in one.

## Sub-Skills

| # | Skill | Focus |
|---|-------|-------|
| 1 | deep-research | Multi-source research with parallel agents, citation tracking, synthesis |
| 2 | spec-interview | 5-7 structured questions to produce a complete spec before coding |
| 3 | cross-model-review | Code/decision review using multiple AI models for diverse perspectives |
| 4 | literature-review | Academic/technical literature review with source evaluation |
| 5 | competitive-analysis | Competing products/tools/libraries feature comparison |
| 6 | data-ingestion | Ingest and summarize large documents, codebases, or datasets |
| 7 | trend-analysis | Technology, market, or usage pattern trend analysis |
| 8 | gemini-fallback | Gemini 1M context for tasks exceeding standard context limits |

## Research Surfaces

In addition to web search, research can use connected channels as surfaces:
- **Telegram/Discord channels** — community sentiment, ecosystem news, real-time signals
- **Files API** — ingest uploaded documents, codebases, or data files directly
- **Cross-model review** — route to multiple models for independent perspectives

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Research X before building" | `deep-research` + `competitive-analysis` |
| "Define spec first" / "Interview me" | `spec-interview` |
| "Review this from multiple angles" | `cross-model-review` |
| "Literature review" / "Academic sources" | `literature-review` |
| "Compare these tools/libraries" | `competitive-analysis` |
| "Summarize this large document" | `data-ingestion` |
| "What are the trends in X?" | `trend-analysis` |
| "File too large for context" | `gemini-fallback` |

## Protocol: Research Before Build

The recommended sequence for any non-trivial feature:
1. `deep-research` → find existing solutions, prior art, best practices
2. `competitive-analysis` → evaluate options
3. `spec-interview` → define requirements before writing code
4. Hand off to implementation skills with research context
