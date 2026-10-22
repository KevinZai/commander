---
name: ccc-data
description: "Route data work to the right method: ETL/ELT pipelines, SQL optimization, charts and dashboards, machine learning, data quality, product analytics, scheduled reports, or vector search. Use when the user is building, querying, validating or visualizing data, or types /ccc-data."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - Artifact
  - AskUserQuestion
argument-hint: "[pipeline | sql | viz | ml | quality | analytics | reporting | vector]"
model: inherit
effort: medium
---

# /ccc-data — data work, routed

**CC Commander** · /ccc-data · the right data method for the job, applied to your stack.

Data sub-skills (`data-pipeline`, `sql-optimization`, `data-visualization`, `machine-learning`, `data-quality`, `analytics-setup`, `reporting`, `vector-search`) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply the focus in [references/routing.md](references/routing.md). The user's selected model is preserved.

Codex: ask pickers as plain-text questions; write dashboards to a local HTML file instead of publishing.

## When to use / when not to

- Use for pipelines, warehouse and query work, dashboards, ML models, data validation, analytics instrumentation, recurring reports and embeddings.
- Use `/ccc-research` (`data-ingestion`) to summarize a large document, `/ccc-saas` (`database-designer`) to design an application schema, `/ccc-smb-ops` for owner-level cash and expense numbers.

## What happens

### 1. Detect the stack

Run in one Bash call, silent on failure:

```bash
ls dbt_project.yml dags airflow.cfg dagster.yaml workspace.yaml requirements.txt pyproject.toml 2>/dev/null
test -f package.json && grep -oE '"(posthog-js|mixpanel-browser|recharts|chart\.js|d3|@tremor/react|@pinecone-database/pinecone|@qdrant/js-client-rest|pg|drizzle-orm|prisma)"' package.json | sort -u
grep -lE 'pgvector|scikit-learn|torch|tensorflow|pandas|polars' requirements.txt pyproject.toml 2>/dev/null
```

Render one line:

> 📊 Stack: `<tools detected | none detected>`

### 2. Route by intent, or ask

An argument or a clear intent routes straight to the sub-skill in [references/routing.md](references/routing.md). A request that spans several (an analytics stack, an ML feature) follows the matching campaign in that file, one sub-skill per step.

Otherwise ask with AskUserQuestion (header "Data"), recommended first:

- 🟢 Build or fix a pipeline — `data-pipeline` (Airflow, dbt, Dagster, incremental loads)
- Speed up queries — `sql-optimization` (plans, indexes, rewrites)
- Chart or dashboard — `data-visualization`
- More — ML, data quality, analytics, reports or vector search (a follow-up picker with the four best matches)

### 3. Look at the data before changing it

- Large files: read a sample, never the whole file — `head -n 50 <file>` for CSV/JSON lines, `python3 -c "import pyarrow.parquet as p; print(p.read_schema('<file>'))"` for Parquet. For document-scale inputs use `data-ingestion` from `/ccc-research`.
- Queries: capture the current plan first (`EXPLAIN (ANALYZE, BUFFERS)` on PostgreSQL, `EXPLAIN ANALYZE` on MySQL) against a non-production database, and keep it for the before/after comparison.
- On the Claude API, the Files API can ingest CSV, JSON and Parquet without spending context; mention it when the user is building an API integration.

### 4. Do the work

Follow the routed sub-skill. Then:

- Code or SQL changed: run the project's test or check command (`dbt build --select <model>`, `pytest`, `npm test`), re-run the captured plan for query work, and `git status --short`.
- Dashboard wanted as a shareable page: write a self-contained HTML file, then offer with AskUserQuestion: 🟢 Keep it local · Publish as a private claude.ai page. Publish only on an explicit yes, with the Artifact tool (`icon: "chart"`). Without the Artifact tool, give the file path.
- Recurring report: build and run it once by hand, then offer `/schedule` (Routines) or `/loop` for the cadence.

## Done when

- Routing only: the sub-skill was invoked or its guidance applied, and the user knows which one.
- Code or SQL changed: the check command exited 0 in this turn and its output is reported; query work reports the before/after plan cost or timing.
- Dashboard or report: the file exists (`test -s <file> && echo ok` printed `ok`), and a published page has a URL from the Artifact tool.

## Guardrails

- Never run `DROP`, `TRUNCATE`, `DELETE` without `WHERE`, a backfill, or a migration against a production database; propose it and let the user run it.
- Never create indexes on a production table without the user's OK at that moment (they can lock writes).
- Never write warehouse credentials, API keys or connection strings into the repo or a report; use the project's secret store or environment variables.
- Never publish a dashboard, send a report, or create a schedule without explicit authorization in this conversation. Never publish data containing personal information.

## See also

- `/ccc-research` — large documents and comparative research
- `/ccc-saas` — application schema, analytics in a SaaS product
- `/ccc-testing` — data-pipeline and query regression tests
- `/ccc-loop` — recurring jobs and gated loops

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
