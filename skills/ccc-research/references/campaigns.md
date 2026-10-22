# ccc-research campaigns

Multi-step sequences. Run one sub-skill at a time; each step's output feeds the next. Sub-skill files live beside the router at `../<sub-skill>/SKILL.md`.

## New project research

1. `spec-interview` — gather requirements through structured questions.
2. `competitive-analysis` — evaluate existing solutions in the space.
3. `deep-research` — fill knowledge gaps found during the spec and analysis.
4. `literature-review` — academic or technical foundations, when applicable.

Deliverable: a spec document with the competitive landscape and cited research behind it.

## Technology evaluation

1. `deep-research` — map the technology landscape.
2. `competitive-analysis` — compare the specific tools, libraries or frameworks.
3. `trend-analysis` — adoption trajectory and community momentum.
4. `cross-model-review` — challenge the conclusion with a second model before it is final.

Deliverable: an evaluation report with a recommendation, the evidence for it, and the risks.

## Large codebase understanding

1. `data-ingestion` — ingest and summarize the codebase structure.
2. `large-context` — when the material exceeds one context window: the native 1M window first, then reduce, then chunk-and-synthesize, then hand execution to the Codex CLI.
3. `deep-research` — research unfamiliar patterns or libraries found along the way.

Deliverable: an architecture summary with key patterns and dependencies, each tied to file paths.
