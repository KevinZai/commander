---
name: ccc-data
context: fork
description: CCC domain — complete data ecosystem — 8 skills in one. Data pipelines, SQL optimization, visualization, machine learning, data quality, analytics, reporting, and vector search. [Commander]
allowed-tools:
  - Read
---

# ccc-data

> Load ONE skill. Get the entire data domain. 8 skills in one.

## Sub-Skills

| # | Skill | Focus |
|---|-------|-------|
| 1 | data-pipeline | ETL/ELT pipelines — Airflow, dbt, Dagster, incremental loads |
| 2 | sql-optimization | SQL optimization — query analysis, indexes, execution plans |
| 3 | data-visualization | Charts and dashboards — D3, Chart.js, Tremor, Recharts |
| 4 | machine-learning | ML model development — scikit-learn, PyTorch, TensorFlow |
| 5 | data-quality | Data validation, schema enforcement, quality monitoring |
| 6 | analytics-setup | Analytics implementation — PostHog, Mixpanel, GA4 |
| 7 | reporting | Automated report generation and scheduling |
| 8 | vector-search | Vector database — Pinecone, pgvector, Qdrant with semantic search |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Data pipeline" / "ETL" / "ELT" | `data-pipeline` |
| "Slow queries" / "SQL optimization" | `sql-optimization` |
| "Charts" / "Dashboard" / "Visualization" | `data-visualization` |
| "ML model" / "Train a model" | `machine-learning` |
| "Data quality" / "Validation" | `data-quality` |
| "Analytics" / "Tracking events" | `analytics-setup` |
| "Automated reports" | `reporting` |
| "Semantic search" / "Vector search" / "Embeddings" | `vector-search` |

## Files API Integration

For large datasets and data files, the Files API can ingest CSVs, JSON, Parquet, and other formats directly — avoiding token limits for bulk data analysis. Use `data-ingestion` from `ccc-research` for document-scale inputs.

## Campaign Templates

### Analytics Stack Setup
1. `analytics-setup` → PostHog/Mixpanel/GA4 event tracking
2. `data-pipeline` → sync analytics data to warehouse
3. `data-visualization` → build dashboards from warehouse data
4. `reporting` → automate periodic reports

### ML Feature Build
1. `data-quality` → validate and clean training data
2. `sql-optimization` → optimize feature extraction queries
3. `machine-learning` → model development + evaluation
4. `data-visualization` → model performance charts
5. `vector-search` → if feature requires semantic similarity

## When to invoke this skill

**Example 1**
- user: design an ETL pipeline to sync our Postgres data to a data warehouse
- assistant: Loads ccc-data and routes to data-pipeline for Airflow/dbt/Dagster pipeline design with incremental loads.

**Example 2**
- user: my SQL queries are slow — optimize them
- assistant: Loads ccc-data and routes to sql-optimization for query analysis, index recommendations, and execution plan review.

**Example 3**
- user: add semantic search to our product catalog
- assistant: Loads ccc-data and routes to vector-search for pgvector/Pinecone/Qdrant setup with embedding pipeline.
