---
name: KZ Mega-Data
description: "Complete data ecosystem — 8 skills in one. Data pipelines, SQL optimization, visualization, machine learning, data quality, analytics, reporting, and vector search."
version: 1.0.0
category: mega-skill
brand: Kevin Z's Claude Code Kit
tags: [mega-skill, data, analytics, ml]
---

# KZ Mega-Data

> Load ONE skill. Get the entire data domain. From pipeline design to ML models to dashboards and vector search.

## Sub-Skills

| # | Skill | Command | Description |
|---|-------|---------|-------------|
| 1 | data-pipeline | `/data-pipeline` | Design ETL/ELT pipelines with Airflow, dbt, Dagster |
| 2 | sql-optimization | `/sql-optimization` | Optimize SQL queries, indexes, and execution plans |
| 3 | data-visualization | `/data-visualization` | Create charts and dashboards with D3, Chart.js, Tremor, Recharts |
| 4 | machine-learning | `/machine-learning` | ML model development with scikit-learn, PyTorch, TensorFlow |
| 5 | data-quality | `/data-quality` | Data validation, schema enforcement, quality monitoring |
| 6 | analytics-setup | `/analytics-setup` | Analytics implementation with PostHog, Mixpanel, GA4 |
| 7 | reporting | `/reporting` | Automated report generation and scheduling |
| 8 | vector-search | `/vector-search` | Vector database setup and semantic search with Pinecone, pgvector, Qdrant |

## How To Use

**Step 1:** Tell me what data problem you're solving — pipeline, query, visualization, ML, or analytics.

**Step 2:** I'll confirm your data stack, volume expectations, and output requirements before routing.

**Step 3:** The specialist skill handles the work. You get full data engineering and science coverage without loading 8 separate skills.

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Build an ETL pipeline" / "Move data from A to B" / "dbt" | `data-pipeline` | `data-quality` (validation, not movement) |
| "This query is slow" / "Optimize my SQL" / "Add indexes" | `sql-optimization` | `data-pipeline` (data movement, not query tuning) |
| "Build a dashboard" / "Chart this data" / "D3 visualization" | `data-visualization` | `reporting` (scheduled docs, not interactive charts) |
| "Train a model" / "ML prediction" / "Classification" | `machine-learning` | `analytics-setup` (tracking, not prediction) |
| "Validate my data" / "Schema enforcement" / "Data freshness" | `data-quality` | `data-pipeline` (movement, not validation) |
| "Set up PostHog" / "Track user events" / "GA4" | `analytics-setup` | `data-visualization` (display, not collection) |
| "Weekly report" / "Automated PDF report" / "Scheduled digest" | `reporting` | `data-visualization` (interactive, not scheduled) |
| "Semantic search" / "Vector embeddings" / "pgvector" | `vector-search` | `machine-learning` (broader ML, not search-specific) |

## Campaign Templates

### Analytics Platform
1. `analytics-setup` -> implement event tracking (PostHog, Mixpanel, or GA4)
2. `data-pipeline` -> set up ETL to move analytics data to warehouse
3. `data-quality` -> validate incoming event data and enforce schemas
4. `data-visualization` -> build dashboards for key metrics
5. `reporting` -> schedule automated weekly/monthly reports
6. Deliver: complete analytics platform from event capture to automated reporting

### Data Warehouse Build
1. `data-pipeline` -> design ETL/ELT pipelines with dbt transformations
2. `sql-optimization` -> optimize warehouse queries and materialized views
3. `data-quality` -> implement data contracts and quality monitoring
4. `data-visualization` -> build executive dashboards
5. `reporting` -> automate stakeholder reports
6. Deliver: production data warehouse with optimized queries, quality gates, and dashboards

### ML Feature Pipeline
1. `data-pipeline` -> build feature engineering pipeline
2. `data-quality` -> validate feature data integrity and distributions
3. `machine-learning` -> train and evaluate models
4. `sql-optimization` -> optimize feature store queries
5. `vector-search` -> set up embedding storage if using embeddings
6. Deliver: ML pipeline from raw data to trained model with quality gates

### Semantic Search System
1. `vector-search` -> set up vector database (Pinecone, pgvector, or Qdrant)
2. `data-pipeline` -> build embedding generation and indexing pipeline
3. `data-quality` -> monitor embedding quality and index freshness
4. `sql-optimization` -> optimize hybrid search queries (vector + SQL filters)
5. Deliver: production semantic search with automated indexing and quality monitoring

## Data Stack Selection

```
What's your data stack?
|
+-- Need a data warehouse?
|   +-- Already on Postgres? -> pgvector + dbt
|   +-- Enterprise scale? -> Snowflake/BigQuery + dbt
|   +-- Cost-sensitive? -> DuckDB + dbt
|
+-- Need analytics?
|   +-- Open source + self-hosted? -> PostHog
|   +-- Product analytics focus? -> Mixpanel
|   +-- Marketing analytics? -> GA4
|
+-- Need ML?
|   +-- Tabular data? -> scikit-learn
|   +-- Deep learning? -> PyTorch
|   +-- Production ML? -> PyTorch + ONNX
|
+-- Need vector search?
    +-- Already on Postgres? -> pgvector
    +-- Managed service? -> Pinecone
    +-- Self-hosted + performant? -> Qdrant
```

## Context Strategy

This mega-skill uses on-demand loading. Sub-skills have `disable-model-invocation: true` so they only load when explicitly invoked, keeping your context lean.
