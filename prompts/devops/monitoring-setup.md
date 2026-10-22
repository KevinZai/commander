---
name: monitoring-setup
category: devops
skills: [metrics-dashboard, grafana-dashboards, promql-alerting]
mode: code
estimated_tokens: 600
---

# Monitoring and Alerting Setup

## When to use

Use it to set up observability for a production service: metrics, logs, traces and alerts. Run it before the first outage, not after. The output is instrumentation code, alert rules, dashboards and a runbook entry per alert.

## Template

````
Set up monitoring and alerting for this service. Cover the four pillars: metrics, logs, traces and alerts.

**Service:**
{{what_the_service_does}}

**Infrastructure:**
{{where_it_runs — AWS, GCP, Vercel, self-hosted}}

**Current observability:**
{{none|basic logging|partial monitoring — describe what exists}}

**Monitoring stack:**
{{Datadog|Grafana+Prometheus|New Relic|CloudWatch|other — or say "recommend one"}}

**Step 1: Define SLIs and SLOs**
Propose targets for this service; the values below are starting points to adjust, not defaults to copy.

| Service Level Indicator | Target SLO | Measurement |
|---|---|---|
| Availability | 99.9% (about 8.7h downtime/year) | Successful responses / total requests |
| Latency (p50) | < 100ms | Histogram of response times |
| Latency (p99) | < 500ms | Histogram of response times |
| Error rate | < 0.1% | 5xx responses / total responses |
| Throughput | > X req/sec | Requests per second |

**Step 2: Metrics instrumentation**
Add instrumentation for:

Application metrics:
- Request count (by endpoint, method, status code)
- Request duration (histogram, by endpoint)
- Active connections and concurrent requests
- Queue depth (if async processing)
- Cache hit/miss ratio
- Business metrics (signups, conversions, revenue events)

Infrastructure metrics:
- CPU utilization
- Memory usage
- Disk I/O and space
- Network throughput
- Container restarts

Database metrics:
- Query duration (by query type)
- Connection pool utilization
- Slow query count
- Replication lag

**Step 3: Logging and tracing**
- Emit structured JSON logs, not plain text.
- Use these levels: ERROR (pages someone), WARN (investigate soon), INFO (audit trail), DEBUG (local only).
- Include in every log line: timestamp, level, service, request_id, a pseudonymous user id when authenticated, message. Never log secrets, tokens or raw personal data.
- Propagate request_id as a trace id across service calls (OpenTelemetry or the stack's tracer).
- Ship logs to the centralized system.
- Set a retention policy (for example 30 days hot, 90 days cold).

**Step 4: Alerting rules**
| Alert | Condition | Severity | Action |
|---|---|---|---|
| Service down | 0 successful health checks for 2m | Critical | Page on-call |
| High error rate | > 1% 5xx for 5m | High | Page on-call |
| High latency | p99 > 2s for 10m | High | Notify channel |
| High CPU | > 80% for 15m | Medium | Notify channel |
| High memory | > 85% for 10m | Medium | Notify channel |
| Disk space | > 90% used | High | Notify channel |
| TLS certificate expiry | < 14 days | Medium | Notify channel |

**Step 5: Dashboards**
Create these dashboards:
1. Overview — golden signals (latency, traffic, errors, saturation)
2. API endpoints — per-endpoint latency and error rates
3. Infrastructure — CPU, memory, disk, network per instance
4. Business — signups, active users, revenue (if applicable)

**Step 6: Verify**
Ask before firing a test alert that pages people or posts to a shared channel. Then:
- Trigger each alert type intentionally and confirm it fires and resolves.
- Confirm every dashboard shows real data, not empty panels.
- Confirm logs and traces from a test request appear in the aggregation system, matched by request_id.
- Write a runbook entry per alert: what it means, how to investigate, how to fix.
Report each check with the evidence (alert id, dashboard link or log query).
````

## Tips

- Start with the golden signals (latency, traffic, errors, saturation) before adding custom metrics.
- The `grafana-dashboards` skill generates Grafana dashboards; `promql-alerting` writes PromQL alert rules.
- Pair each alert with the `devops/incident-response.md` playbook so a page always has a next step.

## Example

````
Set up monitoring and alerting for this service.

**Service:** SaaS API (Node.js/Express) + PostgreSQL + Redis
**Infrastructure:** AWS ECS (Fargate) + RDS + ElastiCache
**Current observability:** CloudWatch basic metrics + console.log in the app
**Monitoring stack:** Grafana Cloud (Prometheus + Loki)
````
