# Observability pack: scaffold audit and OpenTelemetry example (CC-761, slice 1)

Scope: read-only audit of `commander/cowork-plugin-pro/skills/observability-pack/SKILL.md`, plus one documented example. No code, auth, billing, integration or install changes.

## Scaffold audit

| # | Check | Result |
|---|-------|--------|
| 1 | Frontmatter (`name`, `description`, `allowed-tools`, `tier`, `status`, `target_release`) | Present. `name: ccc-pro-observability` matches `README.md`. |
| 2 | Body is an outline only | 14 bullets under "What this pack will do"; no procedure, inputs, outputs, verification or stop conditions. Does not meet `docs/PROMPT-STANDARD.md` for an executable skill. |
| 3 | Tier gate | The body says it calls `isPro()` (`commander/cowork-plugin/lib/license.js:151`, async). The skill contains no step that does so. The gate is a claim, not behavior. |
| 4 | Release/date drift | `SKILL.md` says "v4.2"; `README.md` says "v4.2 (target: 2026-Q3)". It is now 2026-10 and the repo is at 8.x. Both targets are stale. |
| 5 | Tool allowlist | `Write`, `Edit` and `Bash` are allowed. Reasonable for scaffolding, but the skill should state it writes only into the user's project and never installs packages without confirmation. |
| 6 | Scope of the 14 bullets | Mixes four separable packs (OTel wiring, vendor exporters, SLO/alerting, LLM cost metering). One shipping skill per row group is more realistic than 1-2 weeks for all of it. |
| 7 | Overlap | `skills/engineering-pack/observability-designer` (free catalog) covers design-level guidance. The Pro pack should differentiate on generated, tested wiring. |
| 8 | Not wired into checks | `cowork-plugin-pro/` is not referenced by `scripts/` or `bin/`, so no validator covers it. |

Suggested split for later slices: (a) OTel Node bootstrap + OTLP exporter config, (b) structured logging + health endpoints, (c) SLO/alert templates, (d) Sentry/Datadog/Honeycomb vendor adapters, (e) LLM cost instrumentation. Each should carry a verification step (e.g. spans visible in a local Collector).

## Example: minimal OpenTelemetry for Node.js (OTLP over HTTP)

This is the shape slice (a) would generate. It is documentation, not an installed dependency of this repo.

Packages (installed by the user in their own project):

```
npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
      @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources \
      @opentelemetry/semantic-conventions
```

`instrumentation.js`, loaded before app code (`node --require ./instrumentation.js app.js`):

```js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': process.env.OTEL_SERVICE_NAME || 'my-service',
    'deployment.environment.name': process.env.NODE_ENV || 'development',
  }),
  // Endpoint and headers come from the standard env vars below, never hard-coded.
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
```

Environment (standard OTel variables; keep any auth headers in a secret store):

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318   # a local or self-hosted Collector
OTEL_SERVICE_NAME=checkout-api
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

Custom span for a business-critical path:

```js
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('checkout');

async function placeOrder(order) {
  return tracer.startActiveSpan('order.place', async (span) => {
    try {
      span.setAttribute('order.item_count', order.items.length);
      return await doPlaceOrder(order);
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

Pitfalls the pack should encode: the instrumentation file must load before any instrumented module; sample before exporting in high-traffic services; do not put PII in span attributes; verify with a local Collector's `debug` exporter before pointing at a vendor. API names above follow the current `@opentelemetry/*` JS SDK; the generated skill should pin and check versions at generation time (the `resourceFromAttributes` helper replaced `new Resource()` in SDK 2.x).
