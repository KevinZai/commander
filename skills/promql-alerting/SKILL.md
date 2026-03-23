---
name: promql-alerting
description: "PromQL & alerting — query patterns, aggregations, recording rules, alert design, SLO-based alerting, and Grafana dashboard queries."
risk: low
source: custom
date_added: '2026-03-20'
---

# PromQL & Alerting

Expert guide to PromQL queries, alert rules, and Grafana dashboard design.

## Use this skill when

- Writing PromQL queries for dashboards and alerts
- Designing alert rules with proper thresholds and severity
- Implementing SLO-based monitoring and error budgets
- Building Grafana dashboards with effective visualizations

## Do not use this skill when

- Setting up Prometheus infrastructure (see prometheus-configuration)
- Working with non-Prometheus monitoring systems

---

## PromQL Fundamentals

### Selectors and Matchers

```promql
# Exact match
http_requests_total{method="GET", status="200"}

# Regex match
http_requests_total{method=~"GET|POST"}

# Negative match
http_requests_total{status!="200"}

# Negative regex
http_requests_total{status!~"2.."}
```

### Rate and Increase

```promql
# Per-second rate over 5 minutes (for counters)
rate(http_requests_total[5m])

# Increase over time period (total count increase)
increase(http_requests_total[1h])

# Use irate for high-resolution, volatile metrics
irate(http_requests_total[5m])
```

### Aggregations

```promql
# Sum across all instances
sum(rate(http_requests_total[5m]))

# Sum by specific labels
sum by (method, status) (rate(http_requests_total[5m]))

# Average, min, max
avg by (instance) (node_cpu_seconds_total{mode="idle"})
max by (job) (up)

# Top 5 by request rate
topk(5, sum by (handler) (rate(http_requests_total[5m])))

# Count of series
count by (status) (http_requests_total)
```

## Common Dashboard Queries

### Request Rate

```promql
# Total request rate
sum(rate(http_requests_total[5m]))

# Request rate by endpoint
sum by (handler) (rate(http_requests_total[5m]))

# Request rate by status code class
sum by (status_class) (
  label_replace(
    rate(http_requests_total[5m]),
    "status_class", "${1}xx", "status", "(.).*"
  )
)
```

### Error Rate

```promql
# Error percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100

# Error rate by service
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
/
sum by (service) (rate(http_requests_total[5m]))
* 100
```

### Latency (Histograms)

```promql
# P50 latency
histogram_quantile(0.50,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
)

# P95 latency
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
)

# P99 latency by endpoint
histogram_quantile(0.99,
  sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m]))
)

# Average latency
sum(rate(http_request_duration_seconds_sum[5m]))
/
sum(rate(http_request_duration_seconds_count[5m]))
```

### Resource Utilization

```promql
# CPU utilization percentage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory utilization percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk utilization percentage
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100

# Network throughput
rate(node_network_receive_bytes_total{device="eth0"}[5m]) * 8  # bits/sec
```

### Container Metrics

```promql
# Container CPU usage (percentage of requested)
sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))
/
sum by (pod) (kube_pod_container_resource_requests{resource="cpu"})
* 100

# Container memory usage
sum by (pod) (container_memory_working_set_bytes)
/
sum by (pod) (kube_pod_container_resource_limits{resource="memory"})
* 100

# Container restart count
sum by (pod) (increase(kube_pod_container_status_restarts_total[1h]))
```

## Alert Rules

### Availability Alerts

```yaml
groups:
  - name: availability
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.job }} on {{ $labels.instance }} is down"

      - alert: HighErrorRate
        expr: |
          sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (service) (rate(http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.service }} error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95,
            sum by (le, service) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.service }} P95 latency is {{ $value | humanizeDuration }}"
```

### Resource Alerts

```yaml
  - name: resources
    rules:
      - alert: HighCPU
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[10m])) * 100) > 85
        for: 10m
        labels:
          severity: warning

      - alert: HighMemory
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: critical

      - alert: DiskWillFillIn24h
        expr: |
          predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24*3600) < 0
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Disk on {{ $labels.instance }} predicted to fill within 24 hours"

      - alert: HighDiskUsage
        expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 90
        for: 5m
        labels:
          severity: critical
```

## SLO-Based Alerting

```yaml
# Multi-window multi-burn-rate alerting
# Based on Google SRE practices

  - name: slo
    rules:
      # SLO: 99.9% availability (error budget: 0.1%)
      # Fast burn (2% of budget in 1 hour)
      - alert: SLOErrorBudgetFastBurn
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > (14.4 * 0.001)
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning fast — 2% consumed in 1h at current rate"

      # Slow burn (5% of budget in 6 hours)
      - alert: SLOErrorBudgetSlowBurn
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[6h]))
            /
            sum(rate(http_requests_total[6h]))
          ) > (6 * 0.001)
          and
          (
            sum(rate(http_requests_total{status=~"5.."}[30m]))
            /
            sum(rate(http_requests_total[30m]))
          ) > (6 * 0.001)
        for: 15m
        labels:
          severity: warning
```

## Recording Rules (Pre-Compute Expensive Queries)

```yaml
groups:
  - name: request_metrics
    interval: 15s
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      - record: job:http_errors:rate5m
        expr: sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))

      - record: job:http_error_ratio:rate5m
        expr: job:http_errors:rate5m / job:http_requests:rate5m

      - record: job:http_latency:p95
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          )

      - record: job:http_latency:p99
        expr: |
          histogram_quantile(0.99,
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          )
```

## Alert Design Best Practices

1. **Page on symptoms, not causes** — Alert on "error rate > 5%" not "CPU > 80%".
2. **Use `for` duration** — Avoid flapping. `for: 5m` means condition must hold for 5 minutes.
3. **Set meaningful severity** — `critical` = pages someone, `warning` = investigate next business day.
4. **Include runbook links** — Add `runbook_url` annotation with troubleshooting steps.
5. **Use recording rules** — Pre-compute expensive queries to reduce Prometheus load.
6. **Test alert rules** — Use `promtool test rules` with unit tests for alerts.

## Common Pitfalls

1. **Using `irate` for alerting** — `irate` is too volatile. Use `rate` for stable alerting.
2. **Missing label in `by` clause** — Forgetting `le` label in histogram aggregation breaks quantile calculation.
3. **Alerting on individual instances** — Alert on service-level aggregates, not individual containers.
4. **No `for` duration** — Without it, brief spikes trigger alerts.
5. **Too many alerts** — Alert fatigue leads to ignored alerts. Each alert should be actionable.
6. **Fixed thresholds** — Use `predict_linear()` for capacity planning alerts instead of fixed percentages.
