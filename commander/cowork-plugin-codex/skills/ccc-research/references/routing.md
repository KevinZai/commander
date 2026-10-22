# /ccc-research — sub-skills and routing

Reference for SKILL.md step 1. Sub-skills ship with the Commander CLI toolkit (`skills/ccc-research/<name>/SKILL.md` in the repository). When one is not available in the session, apply the focus in its row.

## Sub-skills

| Sub-skill | Focus |
|---|---|
| `deep-research` | Multi-source research with parallel agents, citation tracking, source-quality rating, synthesis |
| `spec-interview` | 5 to 7 structured questions that produce a complete spec before coding |
| `cross-model-review` | Independent reviews from Claude and the Codex CLI; consensus, unique findings, contradictions |
| `literature-review` | Academic and technical literature with source evaluation and citation management |
| `competitive-analysis` | Feature comparison of competing products, tools or libraries; SWOT; recommendation |
| `data-ingestion` | Ingest and summarize large documents, codebases or datasets into structured summaries |
| `trend-analysis` | Technology, market or usage trends from data signals, community sentiment and trajectory |
| `large-context` | Use the native 1M window first, then reduce, then chunk-and-synthesize, then hand mechanical execution to the Codex CLI |

## Intent routing

| Intent | Route to |
|---|---|
| "Research X before building" | `deep-research` + `competitive-analysis` |
| "Define the spec first", "interview me" | `spec-interview` |
| "Review this from multiple angles" | `cross-model-review` |
| "Literature review", "academic sources" | `literature-review` |
| "Compare these tools/libraries" | `competitive-analysis` |
| "Summarize this large document" | `data-ingestion` |
| "What are the trends in X?" | `trend-analysis` |
| "File too large for context" | `large-context` |

## Source-quality rubric (deep-research, literature-review)

| Dimension | Question |
|---|---|
| Authority | Who wrote it, and what is their standing on this topic? |
| Currency | When was it published or last updated? |
| Relevance | How directly does it answer the question? |
| Corroboration | Does an independent source confirm it? |

## Examples

| User says | Route |
|---|---|
| "Research the best auth libraries for Next.js before I start" | `deep-research` + `competitive-analysis` with citations |
| "Help me define the spec for this feature before coding" | `spec-interview` — 5 to 7 questions, then a spec |
| "Analyze this 500-page PDF of technical documentation" | `data-ingestion` — summary and key insights |
