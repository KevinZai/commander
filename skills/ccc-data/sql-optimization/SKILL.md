---
name: sql-optimization
description: "Optimize SQL queries, indexes, and execution plans for PostgreSQL, MySQL, and cloud data warehouses."
version: 1.0.0
category: data
parent: ccc-data
tags: [ccc-data, sql, performance, optimization]
disable-model-invocation: true
---

# SQL Optimization

## What This Does

Analyzes and optimizes slow SQL queries by examining execution plans, recommending indexes, rewriting queries for better performance, and configuring database settings. Covers PostgreSQL, MySQL, and cloud warehouses (BigQuery, Snowflake, Redshift) with specific optimization techniques for each.

## Instructions

1. **Identify the slow queries.** Gather:
   - The SQL query text
   - Current execution time
   - Expected execution time / SLA
   - Table sizes (row counts)
   - Existing indexes
   - Database engine and version
   - How often the query runs (once, hourly, per-request)

2. **Get the execution plan.**
   ```sql
   -- PostgreSQL
   EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;

   -- MySQL
   EXPLAIN ANALYZE SELECT ...;

   -- Look for:
   -- Seq Scan (PostgreSQL) / Full Table Scan (MySQL) on large tables
   -- Nested Loop joins on large datasets
   -- Sort operations without index support
   -- High row estimates vs actual rows (statistics issue)
   ```

3. **Common optimization techniques (ordered by impact):**

   **A. Add missing indexes.**
   ```sql
   -- Index for WHERE clause columns
   CREATE INDEX idx_orders_customer_id ON orders (customer_id);

   -- Composite index for multi-column queries (order matters)
   CREATE INDEX idx_orders_status_date ON orders (status, order_date);

   -- Covering index (includes all needed columns, avoids table lookup)
   CREATE INDEX idx_orders_covering ON orders (customer_id)
     INCLUDE (order_date, total_amount, status);

   -- Partial index (smaller, faster — only index what you query)
   CREATE INDEX idx_active_orders ON orders (customer_id)
     WHERE status = 'active';

   -- PostgreSQL: always CONCURRENTLY for production tables
   CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
   ```

   **B. Rewrite the query.**
   ```sql
   -- BAD: Subquery in WHERE (executes per row)
   SELECT * FROM orders
   WHERE customer_id IN (SELECT id FROM customers WHERE region = 'US');

   -- BETTER: JOIN (optimizer can choose best strategy)
   SELECT o.* FROM orders o
   JOIN customers c ON o.customer_id = c.id
   WHERE c.region = 'US';

   -- BAD: SELECT * (reads all columns from disk)
   SELECT * FROM orders WHERE status = 'active';

   -- BETTER: Select only needed columns
   SELECT id, customer_id, total_amount FROM orders WHERE status = 'active';

   -- BAD: OR conditions (often prevents index use)
   SELECT * FROM orders WHERE status = 'active' OR status = 'pending';

   -- BETTER: IN list (optimizer can use index)
   SELECT * FROM orders WHERE status IN ('active', 'pending');

   -- BAD: Function on indexed column (prevents index use)
   SELECT * FROM orders WHERE YEAR(order_date) = 2024;

   -- BETTER: Range comparison (uses index)
   SELECT * FROM orders
   WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
   ```

   **C. Fix N+1 queries (application level).**
   ```sql
   -- BAD: N+1 — one query per order to get items
   -- Application: for each order, SELECT * FROM order_items WHERE order_id = ?

   -- BETTER: Batch load
   SELECT * FROM order_items WHERE order_id = ANY($1);
   -- Or use JOIN in the original query
   ```

   **D. Optimize JOINs.**
   ```sql
   -- Ensure join columns are indexed on both sides
   -- Put the most selective filter first (reduces intermediate result set)
   -- Use INNER JOIN instead of LEFT JOIN when nulls aren't needed
   -- For very large joins, consider partitioning
   ```

   **E. Use materialized views for expensive aggregations.**
   ```sql
   -- PostgreSQL
   CREATE MATERIALIZED VIEW mv_daily_revenue AS
   SELECT
     date_trunc('day', order_date) as day,
     count(*) as order_count,
     sum(total_amount) as revenue
   FROM orders
   WHERE status = 'completed'
   GROUP BY 1;

   -- Refresh on schedule
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
   ```

4. **Database-specific optimizations.**

   **PostgreSQL:**
   - Run `ANALYZE` after large data changes (updates statistics)
   - Use `pg_stat_statements` to find slow queries automatically
   - Tune `work_mem` for sort/hash operations
   - Use `EXPLAIN (BUFFERS)` to see I/O patterns

   **MySQL:**
   - Check `slow_query_log` for queries exceeding threshold
   - Use `FORCE INDEX` sparingly and only after verifying
   - InnoDB buffer pool sizing is critical for read performance
   - Use `covering indexes` to avoid random I/O on secondary indexes

   **BigQuery/Snowflake:**
   - Partition tables by date for time-series queries
   - Cluster tables by frequently filtered columns
   - Avoid `SELECT *` — column-store billing charges per column scanned
   - Use approximate functions (`APPROX_COUNT_DISTINCT`) when exact isn't needed

5. **Verify the improvement.** After optimization:
   - Re-run EXPLAIN ANALYZE and compare
   - Measure wall-clock time on production-like data
   - Check that the optimization doesn't slow down other queries (index maintenance cost)
   - Monitor for regression over time as data grows

## Output Format

```markdown
# SQL Optimization Report

## Query
```sql
{The original query}
```

## Current Performance
- Execution time: {ms}
- Rows scanned: {count}
- Index usage: {which indexes used, or seq scan}

## Optimizations Applied

### 1. {Optimization name}
- **Before:** {explain plan excerpt}
- **After:** {explain plan excerpt}
- **Impact:** {X}x improvement

### 2. {Optimization name}
...

## Indexes Created
| Index | Table | Columns | Type | Size Impact |
|-------|-------|---------|------|-------------|
| {name} | {table} | {columns} | {btree/gin/gist} | {estimated} |

## Result
- Before: {time}ms
- After: {time}ms
- Improvement: {X}x faster
```

## Tips

- Always EXPLAIN ANALYZE first — don't guess where the bottleneck is
- The most common issue is a missing index — check for sequential scans on large tables
- Index order matters in composite indexes — put equality conditions first, range conditions last
- Too many indexes slow down writes — only index columns you actually query
- If a query is too complex to optimize, consider breaking it into CTEs or temp tables
- Statistics being outdated is a common hidden cause — run ANALYZE after bulk inserts
- For PostgreSQL, `pg_stat_statements` is the single most useful extension for finding slow queries
