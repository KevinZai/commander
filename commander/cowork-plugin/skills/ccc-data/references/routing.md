# /ccc-data — sub-skills and routing

Reference for SKILL.md step 2. Sub-skills ship with the Commander CLI toolkit (`skills/ccc-data/<name>/SKILL.md` in the repository). When one is not available in the session, apply the focus in its row.

## Sub-skills

| Sub-skill | Focus |
|---|---|
| `data-pipeline` | ETL/ELT pipelines: Airflow, dbt, Dagster, incremental loads |
| `sql-optimization` | Query analysis, indexes, execution plans for PostgreSQL, MySQL and cloud warehouses |
| `data-visualization` | Charts and dashboards: D3, Chart.js, Tremor, Recharts |
| `machine-learning` | Data preparation, model selection, training, evaluation, deployment: scikit-learn, PyTorch, TensorFlow |
| `data-quality` | Validation, schema enforcement, quality monitoring, anomaly detection |
| `analytics-setup` | Product analytics: PostHog, Mixpanel, GA4 events, funnels, cohorts |
| `reporting` | Automated report generation and scheduling: PDF reports, email digests, chat summaries, exports |
| `vector-search` | Pinecone, pgvector, Qdrant, embedding pipelines, semantic search |

## Intent routing

| Intent | Route to |
|---|---|
| "Data pipeline", "ETL", "ELT" | `data-pipeline` |
| "Slow queries", "SQL optimization" | `sql-optimization` |
| "Charts", "dashboard", "visualization" | `data-visualization` |
| "ML model", "train a model" | `machine-learning` |
| "Data quality", "validation" | `data-quality` |
| "Analytics", "tracking events" | `analytics-setup` |
| "Automated reports" | `reporting` |
| "Semantic search", "vector search", "embeddings" | `vector-search` |

## Campaigns

### Analytics stack setup

1. `analytics-setup` — PostHog, Mixpanel or GA4 event tracking
2. `data-pipeline` — sync analytics data to the warehouse
3. `data-visualization` — dashboards from warehouse data
4. `reporting` — automate periodic reports (cadence via `/schedule` or `/loop`)

### ML feature build

1. `data-quality` — validate and clean training data
2. `sql-optimization` — optimize feature-extraction queries
3. `machine-learning` — model development and evaluation
4. `data-visualization` — model performance charts
5. `vector-search` — when the feature needs semantic similarity

## Examples

| User says | Route |
|---|---|
| "Design an ETL pipeline to sync our Postgres data to a warehouse" | `data-pipeline` (Airflow/dbt/Dagster, incremental loads) |
| "My SQL queries are slow" | `sql-optimization` (plan review, index recommendations) |
| "Add semantic search to our product catalog" | `vector-search` (pgvector/Pinecone/Qdrant with an embedding pipeline) |
