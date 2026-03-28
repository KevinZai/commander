---
name: monitoring-setup
category: devops
skills: [metrics-dashboard, grafana-dashboards, promql-alerting]
mode: code
estimated_tokens: 600
---

# Monitoring and Alerting Setup

## When to Use
When setting up observability for a production service — metrics, logging, tracing, and alerting. Use this before you need it (not after the first outage).

## Template

```
Set up monitoring and alerting for this service. Cover the four pillars: metrics, logs, traces, and alerts.

**Service:**
{{what_the_service_does}}

**Infrastructure:**
{{where_it_runs — AWS, GCP, Vercel, self-hosted}}

**Current observability:**
{{none|basic logging|partial monitoring — describe what exists}}

**Monitoring stack:**
{{Datadog|Grafana+Prometheus|New Relic|CloudWatch|other — or say "recommend one"}}

**Step 1: Define SLIs and SLOs**
| Service Level Indicator | Target SLO | Measurement |
|---|---|---|
| Availability | 99.9% (8.7h downtime/year) | Successful responses / total requests |
| Latency (p50) | < 100ms | Histogram of response times |
| Latency (p99) | < 500ms | Histogram of response times |
| Error rate | < 0.1% | 5xx responses / total responses |
| Throughput | > X req/sec | Requests per second |

**Step 2: Metrics instrumentation**
Add instrumentation for:

**Application metrics:**
- Request count (by endpoint, method, status code)
- Request duration (histogram, by endpoint)
- Active connections / concurrent requests
- Queue depth (if async processing)
- Cache hit/miss ratio
- Business metrics (signups, conversions, revenue events)

**Infrastructure metrics:**
- CPU utilization
- Memory usage
- Disk I/O and space
- Network throughput
- Container restarts

**Database metrics:**
- Query duration (by query type)
- Connection pool utilization
- Slow query count
- Replication lag

**Step 3: Logging setup**
- Structured JSON logging (not plain text)
- Log levels: ERROR (pages someone), WARN (investigate soon), INFO (audit trail), DEBUG (local only)
- Required fields per log: timestamp, level, service, request_id, user_id (if auth'd), message
- Log aggregation to centralized system
- Log retention policy (30 days hot, 90 days cold)

**Step 4: Alerting rules**
| Alert | Condition | Severity | Action |
|---|---|---|---|
| Service down | 0 successful health checks for 2m | CRITICAL | Page on-call |
| High error rate | > 1% 5xx for 5m | HIGH | Page on-call |
| High latency | p99 > 2s for 10m | HIGH | Notify channel |
| High CPU | > 80% for 15m | MEDIUM | Notify channel |
| High memory | > 85% for 10m | MEDIUM | Notify channel |
| Disk space | > 90% used | HIGH | Notify channel |
| SSL expiry | < 14 days | MEDIUM | Notify channel |

**Step 5: Dashboards**
Create dashboards for:
1. **Overview** — Golden signals (latency, traffic, errors, saturation)
2. **API endpoints** — per-endpoint latency and error rates
3. **Infrastructure** — CPU, memory, disk, network per instance
4. **Business** — signups, active users, revenue (if applicable)

**Step 6: Verify**
- Trigger each alert type intentionally and verify it fires
- Verify dashboards show real data
- Test that logs appear in the aggregation system
- Document runbook for each alert: what it means, how to investigate, how to fix
```

## Tips
- Use the `grafana-dashboards` skill for automated Grafana dashboard generation
- The `promql-alerting` skill writes PromQL alert rules
- Start with the golden signals (latency, traffic, errors, saturation) before adding custom metrics

## Example

```
Set up monitoring and alerting for this service.

**Service:** SaaS API (Node.js/Express) + PostgreSQL + Redis
**Infrastructure:** AWS ECS (Fargate) + RDS + ElastiCache
**Current observability:** CloudWatch basic metrics + console.log in the app
**Monitoring stack:** Grafana Cloud (Prometheus + Loki)
```
