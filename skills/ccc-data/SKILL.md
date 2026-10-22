---
name: ccc-data
description: "Route data work to the right sub-skill: ETL/ELT pipelines, SQL tuning, charts and dashboards, machine learning, data quality, product analytics, scheduled reports or vector search. Use when the user is building, querying, validating, modeling or visualizing data."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[pipeline | sql | viz | ml | quality | analytics | reporting | vector]"
model: inherit
effort: medium
---

# /ccc-data — data work, routed

**CC Commander** · ccc-data · one router that loads the single data sub-skill the job needs.

Each sub-skill lives in its own directory beside this file and sets `disable-model-invocation: true`, so it loads only when this router reads it. Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (on Codex, the same path relative to this file) and follow it. The user's selected model is preserved.

Codex: ask each picker as a plain-text question with the same options.

## Sub-skills

| Sub-skill | Use for |
|---|---|
| `data-pipeline` | ETL/ELT pipelines with Airflow, dbt, Dagster |
| `sql-optimization` | Query plans, indexes and rewrites for PostgreSQL, MySQL and cloud warehouses |
| `data-visualization` | Charts and dashboards with D3, Chart.js, Tremor, Recharts |
| `machine-learning` | Data prep, model selection, training, evaluation and deployment (scikit-learn, PyTorch, TensorFlow) |
| `data-quality` | Validation, schema enforcement, freshness and anomaly monitoring |
| `analytics-setup` | Product analytics with PostHog, Mixpanel or GA4: events, funnels, cohorts |
| `reporting` | Scheduled reports: PDF, email digests, Slack summaries, exports |
| `vector-search` | Vector databases and semantic search with Pinecone, pgvector, Qdrant |

Intent signals, "don't confuse with" pairs, multi-step campaigns and the stack-selection tree: [references/routing.md](references/routing.md).

## When to use / when not to

- Use for pipelines, warehouse and query work, dashboards, ML models, data validation, analytics instrumentation, recurring reports and embeddings.
- Use `ccc-saas` for application schema design, `ccc-research` for summarizing large documents, `ccc-testing` for test strategy beyond data checks.

## What happens

1. **Detect the stack.** Run in one Bash call, silent on failure:

   ```bash
   ls dbt_project.yml dags airflow.cfg dagster.yaml requirements.txt pyproject.toml 2>/dev/null
   test -f package.json && grep -oE '"(posthog-js|mixpanel-browser|recharts|chart\.js|d3|@tremor/react|@pinecone-database/pinecone|@qdrant/js-client-rest|pg|prisma|drizzle-orm)"' package.json | sort -u
   grep -lE 'pgvector|scikit-learn|torch|tensorflow|pandas|polars' requirements.txt pyproject.toml 2>/dev/null
   ```

   Report one line: `📊 Stack: <tools detected | none detected>`.

2. **Route.** An argument or a clear intent picks the sub-skill from the table above. A request that spans several sub-skills follows the matching campaign in [references/routing.md](references/routing.md), one sub-skill per step. Otherwise ask with AskUserQuestion (header "Data"), recommended first:

   - 🟢 Build or fix a pipeline — `data-pipeline`
   - Speed up queries — `sql-optimization`
   - Chart or dashboard — `data-visualization`
   - Something else — a follow-up picker with the four closest of ML, data quality, analytics, reporting and vector search

3. **Confirm the constraints.** Before work starts, confirm the data stack, expected volume and the output format (code, SQL, file, dashboard). Ask only for what step 1 did not answer.

4. **Look before changing.** Sample large files instead of reading them whole (`head -n 50 <file>`). For query work, capture the current plan first (`EXPLAIN (ANALYZE, BUFFERS)` on PostgreSQL, `EXPLAIN ANALYZE` on MySQL) against a non-production database and keep it for the comparison.

5. **Load and run the sub-skill.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` and follow it.

6. **Verify.** When code or SQL changed, run the project's check (`dbt build --select <model>`, `pytest`, or `npm test`), re-run the captured plan for query work, then `git status --short`. On failure, report the output and fix before continuing.

## Done when

- Routing only: the sub-skill file was read in this turn and the user knows which one ran.
- Code or SQL changed: the check command exited 0 in this turn and its output is reported; query work reports the before/after plan cost or timing.
- A file output (dashboard, report): `test -s <file> && echo ok` printed `ok`.

## Guardrails

- Never run `DROP`, `TRUNCATE`, `DELETE` without `WHERE`, a backfill or a migration against a production database; propose it and let the user run it.
- Never create indexes on a production table without the user's OK at that moment.
- Never write warehouse credentials, API keys or connection strings into the repo or a report.
- Never send a report, publish a dashboard or create a schedule without authorization in this conversation; ask with a picker at that step.

## See also

- `ccc-saas` — application schema and SaaS analytics
- `ccc-research` — large documents and comparative research
- `ccc-testing` — regression tests for pipelines and queries
