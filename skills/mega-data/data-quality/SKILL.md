---
name: data-quality
description: "Data validation, schema enforcement, quality monitoring, and anomaly detection for data pipelines and warehouses."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, data-quality, validation, monitoring]
disable-model-invocation: true
---

# Data Quality

## What This Does

Implements data quality checks, schema validation, and monitoring for data pipelines and warehouses. Catches data issues before they propagate — missing values, schema drift, distribution shifts, freshness violations, and uniqueness constraints. Covers dbt tests, Great Expectations, Soda, and custom validation patterns.

## Instructions

1. **Define quality dimensions.** For each dataset, establish expectations:

   | Dimension | Question | Example Check |
   |-----------|----------|---------------|
   | Completeness | Are required fields populated? | `NOT NULL` on critical columns |
   | Uniqueness | Are IDs truly unique? | No duplicates in primary key |
   | Validity | Are values within acceptable ranges? | Status in ('active', 'inactive', 'pending') |
   | Consistency | Do related values agree? | Order total = sum of line items |
   | Freshness | Is data up to date? | Last record within 24 hours |
   | Volume | Is the expected amount of data present? | Row count within 20% of previous run |
   | Accuracy | Does the data match reality? | Spot-check against source systems |

2. **Implement with dbt tests (recommended for warehouse data).**

   ```yaml
   # models/staging/stg_orders.yml
   version: 2

   models:
     - name: stg_orders
       description: Cleaned orders from raw source
       columns:
         - name: order_id
           description: Unique order identifier
           tests:
             - unique
             - not_null

         - name: customer_id
           description: Foreign key to customers
           tests:
             - not_null
             - relationships:
                 to: ref('stg_customers')
                 field: customer_id

         - name: status
           description: Order status
           tests:
             - accepted_values:
                 values: ['pending', 'active', 'completed', 'cancelled']

         - name: total_amount
           description: Order total in cents
           tests:
             - not_null
             - dbt_utils.expression_is_true:
                 expression: ">= 0"
   ```

   ```sql
   -- tests/assert_orders_freshness.sql
   -- Custom test: fail if no orders in the last 24 hours
   select count(*) as failures
   from {{ ref('stg_orders') }}
   having max(created_at) < current_timestamp - interval '24 hours'
   ```

   ```sql
   -- tests/assert_revenue_not_anomalous.sql
   -- Custom test: fail if daily revenue deviates > 50% from 7-day average
   with daily as (
       select
           date_trunc('day', order_date) as day,
           sum(total_amount) as revenue
       from {{ ref('stg_orders') }}
       where order_date >= current_date - interval '8 days'
       group by 1
   ),
   stats as (
       select
           avg(revenue) as avg_revenue,
           stddev(revenue) as std_revenue
       from daily
       where day < current_date
   )
   select count(*) as failures
   from daily, stats
   where daily.day = current_date
     and abs(daily.revenue - stats.avg_revenue) > stats.avg_revenue * 0.5
   ```

3. **Implement with Great Expectations (for Python pipelines).**

   ```python
   import great_expectations as gx

   context = gx.get_context()

   # Define expectations
   suite = context.add_expectation_suite("orders_quality")

   validator = context.get_validator(
       batch_request=batch_request,
       expectation_suite_name="orders_quality"
   )

   # Column-level expectations
   validator.expect_column_values_to_not_be_null("order_id")
   validator.expect_column_values_to_be_unique("order_id")
   validator.expect_column_values_to_be_in_set(
       "status", ["pending", "active", "completed", "cancelled"]
   )
   validator.expect_column_values_to_be_between(
       "total_amount", min_value=0, max_value=1000000
   )

   # Table-level expectations
   validator.expect_table_row_count_to_be_between(
       min_value=1000, max_value=100000
   )

   # Run validation
   results = validator.validate()
   ```

4. **Schema enforcement.** Catch schema drift before it breaks pipelines:
   ```yaml
   # dbt source freshness + schema tests
   sources:
     - name: raw
       database: raw_db
       freshness:
         warn_after: {count: 12, period: hour}
         error_after: {count: 24, period: hour}
       loaded_at_field: _loaded_at
       tables:
         - name: orders
           columns:
             - name: id
               tests:
                 - not_null
                 - unique
   ```

5. **Data quality monitoring dashboard.** Track over time:
   - Test pass/fail rates per model
   - Freshness SLA adherence
   - Row count anomalies
   - Null rate trends per column
   - Schema change events

6. **Set up alerting.** When quality checks fail:
   - Critical failures (uniqueness, freshness): block pipeline, alert immediately
   - Warning failures (volume anomalies): alert but continue
   - Info failures (minor validation): log for review
   - Route alerts to Slack/PagerDuty based on severity

## Output Format

```markdown
# Data Quality Setup: {Dataset/Pipeline}

## Quality Rules
| Rule | Dimension | Severity | Column/Table |
|------|-----------|----------|-------------|
| {description} | {completeness/uniqueness/etc.} | {critical/warning/info} | {target} |

## dbt Tests
{YAML configuration for model tests}

## Custom Tests
{SQL or Python test definitions}

## Freshness SLAs
| Source | Warn After | Error After |
|--------|-----------|-------------|
| {source} | {duration} | {duration} |

## Monitoring
{Dashboard queries and alerting configuration}

## Incident Response
{What to do when quality checks fail}
```

## Tips

- Start with the basics: not_null, unique, and accepted_values catch most real-world issues
- dbt tests run as SQL queries — they're fast and integrate naturally with warehouse workflows
- Freshness checks are the highest-ROI quality check — stale data causes the most business impact
- Volume anomaly detection (row count vs expected) catches upstream failures that freshness misses
- Don't block pipelines on warnings — alert and continue. Block only on critical failures.
- Schema contracts (dbt contracts) enforce column types and prevent schema drift in production
- Great Expectations generates data documentation automatically — useful for data governance
