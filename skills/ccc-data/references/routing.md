# ccc-data — routing reference

Loaded by [../SKILL.md](../SKILL.md) when intent is ambiguous or spans several sub-skills. Not shown to the user as a menu.

## Routing matrix

| Intent | Route to | Don't confuse with |
|---|---|---|
| "Build an ETL pipeline" / "move data from A to B" / "dbt" | `data-pipeline` | `data-quality` (validation, not movement) |
| "This query is slow" / "optimize my SQL" / "add indexes" | `sql-optimization` | `data-pipeline` (movement, not query tuning) |
| "Build a dashboard" / "chart this data" / "D3 visualization" | `data-visualization` | `reporting` (scheduled documents, not interactive charts) |
| "Train a model" / "ML prediction" / "classification" | `machine-learning` | `analytics-setup` (tracking, not prediction) |
| "Validate my data" / "schema enforcement" / "data freshness" | `data-quality` | `data-pipeline` (movement, not validation) |
| "Set up PostHog" / "track user events" / "GA4" | `analytics-setup` | `data-visualization` (display, not collection) |
| "Weekly report" / "automated PDF report" / "scheduled digest" | `reporting` | `data-visualization` (interactive, not scheduled) |
| "Semantic search" / "vector embeddings" / "pgvector" | `vector-search` | `machine-learning` (broader ML, not search) |

## Campaigns

Run one sub-skill per step; verify each step before the next.

**Analytics platform**

1. `analytics-setup` — event tracking (PostHog, Mixpanel or GA4)
2. `data-pipeline` — move analytics data to the warehouse
3. `data-quality` — validate incoming events and enforce schemas
4. `data-visualization` — dashboards for key metrics
5. `reporting` — scheduled weekly or monthly reports

**Data warehouse build**

1. `data-pipeline` — ETL/ELT with dbt transformations
2. `sql-optimization` — warehouse queries and materialized views
3. `data-quality` — data contracts and quality monitoring
4. `data-visualization` — executive dashboards
5. `reporting` — stakeholder reports

**ML feature pipeline**

1. `data-pipeline` — feature engineering pipeline
2. `data-quality` — feature integrity and distributions
3. `machine-learning` — train and evaluate models
4. `sql-optimization` — feature store queries
5. `vector-search` — embedding storage, when the model uses embeddings

**Semantic search system**

1. `vector-search` — vector database (Pinecone, pgvector or Qdrant)
2. `data-pipeline` — embedding generation and indexing
3. `data-quality` — embedding quality and index freshness
4. `sql-optimization` — hybrid queries (vector plus SQL filters)

## Stack selection

| Need | Situation | Default |
|---|---|---|
| Warehouse | Already on Postgres | Postgres + dbt (pgvector for embeddings) |
| Warehouse | Enterprise scale | Snowflake or BigQuery + dbt |
| Warehouse | Cost-sensitive | DuckDB + dbt |
| Analytics | Open source, self-hosted | PostHog |
| Analytics | Product analytics focus | Mixpanel |
| Analytics | Marketing analytics | GA4 |
| ML | Tabular data | scikit-learn |
| ML | Deep learning | PyTorch |
| ML | Production inference | PyTorch + ONNX |
| Vector search | Already on Postgres | pgvector |
| Vector search | Managed service | Pinecone |
| Vector search | Self-hosted, performance-sensitive | Qdrant |

Present a stack choice as an AskUserQuestion picker (2–4 options, recommended first with 🟢), never as a typed menu.
