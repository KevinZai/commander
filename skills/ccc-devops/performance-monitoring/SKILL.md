---
name: Performance Monitoring
description: "Full-stack performance monitoring — APM, RUM, Core Web Vitals, error tracking, profiling, and performance budgets."
version: 1.0.0
category: monitoring
parent: ccc-devops
---

# Performance Monitoring

> Measure everything that matters. APM, Real User Monitoring, Core Web Vitals, error tracking, and performance budgets — from browser to database.

## Use this skill when

- Setting up application performance monitoring (APM)
- Tracking Core Web Vitals and real user experience
- Configuring error tracking and alerting
- Implementing performance budgets in CI
- Profiling CPU, memory, and database queries
- Setting up synthetic monitoring

## Do not use this skill when

- Configuring Prometheus scrape targets (use `prometheus-configuration`)
- Building Grafana dashboards for infrastructure metrics (use `grafana-dashboards`)
- Writing PromQL alert rules (use `promql-alerting`)
- Those skills handle infrastructure-level metrics. This skill handles application-level performance.

---

## Core Web Vitals

The three metrics Google uses for page experience ranking.

| Metric | Good | Needs Work | Poor | What It Measures |
|--------|------|------------|------|------------------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4.0s | > 4.0s | Loading performance |
| INP (Interaction to Next Paint) | < 200ms | 200-500ms | > 500ms | Interactivity responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 | Visual stability |

### Tracking with web-vitals library

```typescript
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: { name: string; value: number; id: string; delta: number }) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    page: window.location.pathname,
    connection: (navigator as any).connection?.effectiveType ?? 'unknown',
    deviceMemory: (navigator as any).deviceMemory ?? 'unknown',
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliability (survives page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body);
  } else {
    fetch('/api/vitals', { body, method: 'POST', keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Next.js built-in reporting

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}

// Custom reporting to your own endpoint
// next.config.ts
export function reportWebVitals(metric: {
  id: string;
  name: string;
  startTime: number;
  value: number;
  label: 'web-vital' | 'custom';
}) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## APM Setup

### Sentry Performance

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,           // 20% of transactions in production
  profilesSampleRate: 0.1,         // 10% of transactions profiled
  replaysSessionSampleRate: 0.01,  // 1% of sessions recorded
  replaysOnErrorSampleRate: 1.0,   // 100% of error sessions recorded

  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: ['api.example.com'],
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,

  integrations: [
    Sentry.prismaIntegration(),     // track database queries
    Sentry.httpIntegration(),       // track outgoing HTTP
    Sentry.expressIntegration(),    // track Express middleware
  ],
});
```

### Datadog APM

```typescript
// tracing.ts — must be imported before all other modules
import tracer from 'dd-trace';

tracer.init({
  service: 'my-app',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
  appsec: true,

  // Trace specific operations
  plugins: true,  // auto-instrument supported libraries
});

// Custom span for business-critical operations
export function traceOperation<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return tracer.trace(name, async (span) => {
    try {
      const result = await fn();
      span?.setTag('status', 'success');
      return result;
    } catch (error) {
      span?.setTag('error', true);
      span?.setTag('error.message', (error as Error).message);
      throw error;
    }
  });
}
```

---

## Real User Monitoring (RUM)

### Custom RUM collector

```typescript
interface RUMEvent {
  type: 'navigation' | 'resource' | 'error' | 'interaction';
  timestamp: number;
  page: string;
  sessionId: string;
  data: Record<string, unknown>;
}

class RUMCollector {
  private buffer: RUMEvent[] = [];
  private sessionId = crypto.randomUUID();
  private flushInterval = 10_000; // 10 seconds

  constructor() {
    this.observeNavigation();
    this.observeResources();
    this.observeErrors();
    this.observeInteractions();
    setInterval(() => this.flush(), this.flushInterval);
  }

  private observeNavigation() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming;
        this.record({
          type: 'navigation',
          data: {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            ttfb: nav.responseStart - nav.requestStart,
            download: nav.responseEnd - nav.responseStart,
            domReady: nav.domContentLoadedEventEnd - nav.startTime,
            load: nav.loadEventEnd - nav.startTime,
            transferSize: nav.transferSize,
          },
        });
      }
    });
    observer.observe({ type: 'navigation', buffered: true });
  }

  private observeResources() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const res = entry as PerformanceResourceTiming;
        if (res.duration > 1000) { // only slow resources
          this.record({
            type: 'resource',
            data: {
              name: res.name,
              duration: res.duration,
              transferSize: res.transferSize,
              initiatorType: res.initiatorType,
            },
          });
        }
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  }

  private observeErrors() {
    window.addEventListener('error', (event) => {
      this.record({
        type: 'error',
        data: {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          col: event.colno,
          stack: event.error?.stack?.slice(0, 1000),
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.record({
        type: 'error',
        data: {
          message: String(event.reason),
          stack: event.reason?.stack?.slice(0, 1000),
        },
      });
    });
  }

  private observeInteractions() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.record({
          type: 'interaction',
          data: {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          },
        });
      }
    });
    observer.observe({ type: 'event', buffered: true });
  }

  private record(event: Omit<RUMEvent, 'timestamp' | 'page' | 'sessionId'>) {
    this.buffer.push({
      ...event,
      timestamp: Date.now(),
      page: window.location.pathname,
      sessionId: this.sessionId,
    });
  }

  private flush() {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];
    navigator.sendBeacon('/api/rum', JSON.stringify(events));
  }
}

// Initialize once
new RUMCollector();
```

---

## Synthetic Monitoring

Proactive checks that run on a schedule to detect issues before users do.

```typescript
// synthetic-checks.ts — run via cron or monitoring service
interface SyntheticCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  expectedStatus: number;
  maxLatencyMs: number;
  body?: string;
  headers?: Record<string, string>;
}

const checks: SyntheticCheck[] = [
  {
    name: 'Homepage loads',
    url: 'https://app.example.com',
    method: 'GET',
    expectedStatus: 200,
    maxLatencyMs: 3000,
  },
  {
    name: 'API health check',
    url: 'https://api.example.com/health',
    method: 'GET',
    expectedStatus: 200,
    maxLatencyMs: 500,
  },
  {
    name: 'Login endpoint responds',
    url: 'https://api.example.com/auth/login',
    method: 'POST',
    expectedStatus: 401, // unauthorized without credentials = endpoint is alive
    maxLatencyMs: 1000,
    body: JSON.stringify({ email: 'probe@test.com', password: 'probe' }),
    headers: { 'Content-Type': 'application/json' },
  },
];

async function runChecks() {
  const results = await Promise.allSettled(
    checks.map(async (check) => {
      const start = performance.now();
      const response = await fetch(check.url, {
        method: check.method,
        body: check.body,
        headers: check.headers,
        signal: AbortSignal.timeout(check.maxLatencyMs * 2),
      });
      const latency = performance.now() - start;

      return {
        name: check.name,
        status: response.status === check.expectedStatus ? 'pass' : 'fail',
        latency: Math.round(latency),
        maxLatency: check.maxLatencyMs,
        latencyExceeded: latency > check.maxLatencyMs,
        httpStatus: response.status,
        expectedStatus: check.expectedStatus,
      };
    })
  );

  const failures = results.filter(
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'fail')
  );

  if (failures.length > 0) {
    await alertOnFailure(failures);
  }
}
```

---

## Error Tracking and Alerting

### Structured error context

```typescript
// error-context.ts — enrich errors with operational context
interface ErrorContext {
  userId?: string;
  requestId: string;
  route: string;
  method: string;
  statusCode: number;
  duration: number;
  tags: Record<string, string>;
}

function captureError(error: Error, context: ErrorContext) {
  // Sentry example
  Sentry.withScope((scope) => {
    scope.setUser({ id: context.userId });
    scope.setTag('route', context.route);
    scope.setTag('method', context.method);
    scope.setTag('status_code', String(context.statusCode));
    scope.setContext('request', {
      requestId: context.requestId,
      duration: context.duration,
      ...context.tags,
    });
    Sentry.captureException(error);
  });
}
```

### Alert thresholds

```yaml
# Alert rules for application performance
alerts:
  - name: High Error Rate
    condition: error_rate > 1%
    window: 5m
    severity: critical
    action: page-on-call

  - name: Slow API Responses
    condition: p95_latency > 2000ms
    window: 10m
    severity: warning
    action: slack-notification

  - name: Core Web Vitals Regression
    condition: LCP_p75 > 2500ms OR CLS_p75 > 0.1 OR INP_p75 > 200ms
    window: 1h
    severity: warning
    action: slack-notification

  - name: Memory Leak Detected
    condition: heap_used_mb > 1500 AND trending_up_over_1h
    severity: warning
    action: slack-notification + heap-dump

  - name: Database Query Slowdown
    condition: db_query_p95 > 500ms
    window: 5m
    severity: warning
    action: slack-notification + log-slow-queries
```

---

## Performance Budgets (CI Enforcement)

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: pull_request

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run build

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: .lighthouserc.json
          uploadArtifacts: true
```

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["error", { "maxNumericValue": 3800 }],
        "total-byte-weight": ["warning", { "maxNumericValue": 500000 }]
      }
    },
    "collect": {
      "startServerCommand": "npm run start",
      "url": ["http://localhost:3000", "http://localhost:3000/dashboard"]
    }
  }
}
```

### Bundle size budget

```json
// package.json
{
  "bundlesize": [
    { "path": ".next/static/chunks/*.js", "maxSize": "200 kB" },
    { "path": ".next/static/css/*.css", "maxSize": "50 kB" },
    { "path": "public/images/*", "maxSize": "500 kB" }
  ]
}
```

```yaml
# In CI pipeline
- name: Check bundle size
  run: npx bundlesize
```

---

## Database Query Monitoring

### Slow query logging — PostgreSQL

```sql
-- postgresql.conf
ALTER SYSTEM SET log_min_duration_statement = 200;  -- log queries > 200ms
ALTER SYSTEM SET log_statement = 'ddl';             -- log schema changes
ALTER SYSTEM SET auto_explain.log_min_duration = 500; -- explain plans > 500ms
ALTER SYSTEM SET auto_explain.log_analyze = true;
SELECT pg_reload_conf();
```

### Prisma query logging

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 200) { // log slow queries
    console.warn(`Slow query (${e.duration}ms): ${e.query}`);
    Sentry.addBreadcrumb({
      category: 'db',
      message: `Slow query: ${e.duration}ms`,
      data: { query: e.query, params: e.params },
      level: 'warning',
    });
  }
});
```

---

## Memory and CPU Profiling

### Node.js heap snapshot

```typescript
import v8 from 'node:v8';
import fs from 'node:fs';

// Trigger heap dump on high memory
function monitorMemory() {
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapMB = usage.heapUsed / 1024 / 1024;

    if (heapMB > 1500) {
      const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
      const stream = fs.createWriteStream(filename);
      v8.writeHeapSnapshot(filename);
      console.error(`Heap dump written: ${filename} (${heapMB.toFixed(0)}MB)`);
    }
  }, 30_000);
}

// Expose profiling endpoint (behind auth)
app.get('/debug/profile', authMiddleware, async (req, res) => {
  const duration = parseInt(req.query.duration as string) || 10;
  const { Session } = await import('node:inspector/promises');
  const session = new Session();
  session.connect();

  await session.post('Profiler.enable');
  await session.post('Profiler.start');

  await new Promise((resolve) => setTimeout(resolve, duration * 1000));

  const { profile } = await session.post('Profiler.stop');
  await session.post('Profiler.disable');

  res.json(profile); // load in Chrome DevTools
});
```

---

## Monitoring Setup Checklist

- [ ] Core Web Vitals tracked via `web-vitals` library or Vercel Speed Insights
- [ ] APM configured (Sentry Performance or Datadog APM)
- [ ] Error tracking with structured context (user, request, route)
- [ ] RUM collecting navigation timing, slow resources, and errors
- [ ] Synthetic monitoring running health checks on a schedule
- [ ] Performance budgets enforced in CI (Lighthouse CI, bundlesize)
- [ ] Database slow query logging enabled (> 200ms threshold)
- [ ] Alert thresholds defined for error rate, latency, and CWV regressions
- [ ] Memory monitoring with heap dump capability
- [ ] Deployment annotations in APM (correlate deploys with performance changes)
