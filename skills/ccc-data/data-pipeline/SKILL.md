---
name: data-pipeline
description: "Design and implement ETL/ELT data pipelines using Airflow, dbt, Dagster, and modern data stack patterns."
version: 1.0.0
category: data
parent: ccc-data
tags: [ccc-data, etl, pipeline, data-engineering]
disable-model-invocation: true
---

# Data Pipeline

## What This Does

Designs and implements data pipelines for extracting, transforming, and loading data across systems. Covers ETL (transform before load) and ELT (load then transform) patterns using modern tools like dbt, Airflow, Dagster, and cloud-native services. Handles everything from simple data syncs to complex multi-source warehousing pipelines.

## Instructions

1. **Assess the pipeline requirements.** Clarify:
   - **Sources:** Where does data come from? (databases, APIs, files, streams)
   - **Destinations:** Where does data go? (warehouse, lake, application DB, cache)
   - **Volume:** How much data? (MB/GB/TB per run)
   - **Frequency:** Real-time, hourly, daily, or on-demand?
   - **Transformations:** What needs to change? (cleaning, aggregation, joins, enrichment)
   - **SLA:** How fresh does the data need to be?

2. **Choose the pipeline pattern.**

   | Pattern | Best For | Tools |
   |---------|----------|-------|
   | ETL | Small-medium data, complex transforms before load | Airflow, Luigi, custom |
   | ELT | Large data, transforms in the warehouse | dbt + Fivetran/Airbyte |
   | Streaming | Real-time, event-driven | Kafka, Flink, Pub/Sub |
   | Micro-batch | Near-real-time, simpler than streaming | Spark Streaming, scheduled jobs |

3. **Design with dbt (recommended for ELT).**

   ```sql
   -- models/staging/stg_orders.sql
   -- Staging: clean and type-cast raw data
   with source as (
       select * from {{ source('raw', 'orders') }}
   ),

   renamed as (
       select
           id as order_id,
           customer_id,
           cast(order_date as date) as order_date,
           cast(total_amount as decimal(10,2)) as total_amount,
           status,
           _loaded_at as loaded_at
       from source
       where id is not null
   )

   select * from renamed
   ```

   ```sql
   -- models/marts/fct_daily_revenue.sql
   -- Mart: business-ready aggregations
   with orders as (
       select * from {{ ref('stg_orders') }}
       where status = 'completed'
   ),

   daily as (
       select
           order_date,
           count(*) as order_count,
           sum(total_amount) as revenue,
           avg(total_amount) as avg_order_value
       from orders
       group by order_date
   )

   select * from daily
   ```

   ```yaml
   # dbt_project.yml
   name: 'analytics'
   version: '1.0.0'
   profile: 'analytics'

   models:
     analytics:
       staging:
         +materialized: view
         +schema: staging
       marts:
         +materialized: table
         +schema: analytics
   ```

4. **Orchestrate with Airflow or Dagster.**

   ```python
   # Airflow DAG example
   from airflow.decorators import dag, task
   from datetime import datetime

   @dag(
       schedule='0 6 * * *',  # Daily at 6am
       start_date=datetime(2024, 1, 1),
       catchup=False,
       tags=['analytics'],
   )
   def daily_analytics_pipeline():

       @task()
       def extract_orders():
           # Extract from source system
           return extract_from_api('/orders', since='yesterday')

       @task()
       def load_to_warehouse(orders):
           # Load raw data to warehouse
           load_to_bigquery('raw.orders', orders)

       @task()
       def run_dbt_transforms():
           # Run dbt models
           run_dbt('run', select='staging marts')

       @task()
       def run_dbt_tests():
           # Validate data quality
           run_dbt('test')

       orders = extract_orders()
       load = load_to_warehouse(orders)
       transform = run_dbt_transforms()
       test = run_dbt_tests()

       load >> transform >> test

   daily_analytics_pipeline()
   ```

5. **Handle common challenges:**
   - **Idempotency:** Every pipeline run should produce the same result if run twice
   - **Incremental loads:** Process only new/changed data, not full reloads
   - **Schema evolution:** Handle source schema changes gracefully
   - **Error handling:** Retry transient failures, alert on persistent failures
   - **Backfills:** Support reprocessing historical data when logic changes
   - **Monitoring:** Track row counts, freshness, and quality metrics

6. **Implement incremental loading.**
   ```sql
   -- dbt incremental model
   {{
     config(
       materialized='incremental',
       unique_key='order_id',
       incremental_strategy='merge'
     )
   }}

   select * from {{ ref('stg_orders') }}

   {% if is_incremental() %}
     where loaded_at > (select max(loaded_at) from {{ this }})
   {% endif %}
   ```

## Output Format

```markdown
# Data Pipeline Design: {Pipeline Name}

## Architecture
{Diagram showing sources -> extract -> transform -> load -> destinations}

## Pipeline Specification
| Attribute | Value |
|-----------|-------|
| Pattern | {ETL/ELT/Streaming} |
| Orchestrator | {Airflow/Dagster/cron} |
| Transform tool | {dbt/Spark/custom} |
| Schedule | {frequency} |
| SLA | {freshness requirement} |

## Data Sources
| Source | Type | Volume | Extraction Method |
|--------|------|--------|------------------|
| {source} | {DB/API/file} | {size/run} | {full/incremental} |

## Transform Layers
| Layer | Purpose | Models |
|-------|---------|--------|
| Staging | Clean + type-cast | {list} |
| Intermediate | Business logic joins | {list} |
| Marts | Aggregated metrics | {list} |

## Error Handling
{Retry policy, alerting, dead letter handling}

## Monitoring
{Freshness checks, row count validation, quality tests}
```

## Tips

- Start with ELT (load raw, transform in warehouse) unless you have a specific reason for ETL
- dbt is the standard for warehouse transformations — use it unless the project is very small
- Always build idempotent pipelines — you WILL need to rerun them
- Test your pipeline with 2x the expected data volume to catch performance issues early
- Fivetran/Airbyte for extraction, dbt for transformation is the "modern data stack" pattern
- Don't over-engineer: a cron job + SQL script is a valid pipeline for simple use cases
- Monitor freshness, not just success — a pipeline can "succeed" with stale data
