---
name: ccc-pro-observability
description: "[C:pro] — OpenTelemetry, Honeycomb, Datadog, and structured logging wiring · Pro tier only"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
tier: pro
status: scaffolded
target_release: v4.2
---

## What this pack will do

- Wire OpenTelemetry SDK (Node.js / Python / Go) with auto-instrumentation bootstrap
- Generate OTLP exporter config: Honeycomb, Datadog, Grafana Tempo, Jaeger, self-hosted Collector
- Scaffold custom span instrumentation for business-critical paths (checkout, auth, job queues)
- Add structured logging pipeline: JSON log schema, correlation IDs, request/response logging middleware
- Generate Datadog APM integration: tracer init, service map tagging, rum config
- Generate Honeycomb integration: dataset config, derived columns, SLO alert setup
- Scaffold error tracking: Sentry wiring with source maps, release tracking, alert rules
- Add health check endpoints: `/health` (liveness) + `/ready` (readiness) with dependency checks
- Generate SLI/SLO definitions: latency p50/p95/p99 targets, error rate, availability
- Scaffold alerting runbooks: PagerDuty + Slack + Discord webhook templates per alert tier
- Add distributed trace propagation through queues (SQS, Kafka, BullMQ, Inngest)
- Generate dashboard-as-code: Grafana JSON model for key service dashboards
- Scaffold canary analysis: metrics comparison before/after deploy
- Add cost instrumentation: per-request LLM cost tracking, token counting, budget alerts

## Why Pro-only

Observability wiring is fiddly — every combination of exporter, framework, and cloud provider requires different SDK versions, init order, and sampling config. Wrong setup means missing traces in production when you need them most. Correct setup takes a senior engineer 1–2 days per service. This pack collapses that to minutes.

## Coming in v4.2

This skill is scaffolded. Full implementation ships in v4.2. Sign up at [commanderplugin.com/pro](https://commanderplugin.com/pro) to get notified and receive early access.

## Tier check

This skill checks `isPro()` from `commander/cowork-plugin/lib/license.js` before running. If your license tier is `starter`, it surfaces an upgrade prompt and exits cleanly — no partial scaffolding, no silent failure.

## Reference

- [Pricing and tiers](https://commanderplugin.com/pricing)
- [Free vs Pro comparison](https://commanderplugin.com/free-vs-pro)
- [License activation](/plugin/license-activation)
