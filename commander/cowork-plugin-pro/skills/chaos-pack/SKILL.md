---
name: ccc-pro-chaos
description: "[C:pro] — Failure injection patterns and resilience testing for production services · Pro tier only"
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

- Scaffold network partition simulation: DNS failure, TCP timeout, latency injection middleware
- Generate circuit breaker implementation (half-open state, threshold config, per-dependency)
- Add bulkhead pattern: thread-pool isolation per dependency, queue depth limits
- Scaffold retry-with-jitter: exponential backoff + full jitter (AWS best practice)
- Generate chaos test harness: controlled fault injection in test env, assertion on recovery
- Add dependency kill switch: feature-flag-gated dependency disablement for safe drills
- Scaffold graceful degradation paths: cached responses, stale-while-revalidate, stub data
- Generate load shedding middleware: request queuing, priority lanes, shed-at-threshold
- Add database failure simulation: connection pool exhaustion, query timeout, replica lag
- Scaffold external API failure handling: mocked failure responses for Stripe, Twilio, SendGrid
- Generate GameDay runbook templates: scenario → hypothesis → inject → observe → recover
- Add chaos engineering CI gate: resilience regression tests on every deploy
- Scaffold timeout budget propagation: context deadlines through async call chains
- Generate failure mode catalog per service: FMEA (failure mode and effects analysis) template

## Why Pro-only

Chaos engineering patterns require both infrastructure access and deep understanding of failure modes specific to each architectural layer. Naive fault injection can cause cascading failures in test environments. The scaffolding here encodes production-safe patterns used by teams at Netflix, AWS, and Google — not theory.

## Coming in v4.2

This skill is scaffolded. Full implementation ships in v4.2. Sign up at [cc-commander.com/pro](https://cc-commander.com/pro) to get notified and receive early access.

## Tier check

This skill checks `isPro()` from `commander/cowork-plugin/lib/license.js` before running. If your license tier is `starter`, it surfaces an upgrade prompt and exits cleanly — no partial scaffolding, no silent failure.

## Reference

- [Pricing and tiers](https://cc-commander.com/pricing)
- [Free vs Pro comparison](https://cc-commander.com/free-vs-pro)
- [License activation](/plugin/license-activation)
