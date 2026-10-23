---
name: performance-monitoring
description: "Full-stack performance monitoring — Core Web Vitals, APM, RUM, synthetic monitoring, and performance budgets"
version: 1.0.0
category: devops
---

# Performance Monitoring

Set up comprehensive performance monitoring across your entire stack.

## Monitoring Layers

### 1. Core Web Vitals (Frontend)

```typescript
// Track LCP, FID, CLS, INP, TTFB
import { onLCP, onFID, onCLS, onINP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,  // Survives page unload
  });
}

onLCP(sendToAnalytics);   // Largest Contentful Paint (< 2.5s)
onFID(sendToAnalytics);   // First Input Delay (< 100ms)
onCLS(sendToAnalytics);   // Cumulative Layout Shift (< 0.1)
onINP(sendToAnalytics);   // Interaction to Next Paint (< 200ms)
onTTFB(sendToAnalytics);  // Time to First Byte (< 800ms)
```

### 2. Application Performance Monitoring (APM)

```typescript
// Sentry Performance — automatic tracing
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.prismaIntegration(),     // DB query tracing
    Sentry.httpIntegration(),        // HTTP request tracing
  ],
});

// Custom span for business-critical operations
async function processPayment(orderId: string) {
  return Sentry.startSpan(
    { name: 'payment.process', op: 'payment' },
    async (span) => {
      span.setAttribute('order.id', orderId);
      // ... payment logic
    }
  );
}
```

### 3. Real User Monitoring (RUM)

```typescript
// Track real user experience
interface RUMEvent {
  url: string;
  loadTime: number;
  ttfb: number;
  domReady: number;
  userAgent: string;
  connection: string;   // 4g, 3g, slow-2g
  country: string;
}

// Collect from PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      const nav = entry as PerformanceNavigationTiming;
      sendRUM({
        url: window.location.pathname,
        loadTime: nav.loadEventEnd - nav.startTime,
        ttfb: nav.responseStart - nav.requestStart,
        domReady: nav.domContentLoadedEventEnd - nav.startTime,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
        country: '', // Set from server
      });
    }
  }
});
observer.observe({ type: 'navigation', buffered: true });
```

### 4. Database Query Monitoring

```typescript
// Drizzle query logging with slow query detection
import { drizzle } from 'drizzle-orm/neon-http';

const db = drizzle(sql, {
  logger: {
    logQuery(query, params) {
      const start = performance.now();
      return {
        afterExecution() {
          const duration = performance.now() - start;
          if (duration > 100) {  // Slow query threshold: 100ms
            console.warn(`[SLOW QUERY] ${duration.toFixed(0)}ms: ${query}`);
            // Send to monitoring
          }
        },
      };
    },
  },
});
```

### 5. Performance Budgets (CI Enforcement)

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/pricing"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

```yaml
# GitHub Actions — performance budget check
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

### 6. Alerting Rules

```yaml
# Alert on performance degradation
alerts:
  - name: High P95 Latency
    condition: p95_response_time > 500ms for 5 minutes
    severity: warning
    action: Slack notification

  - name: Error Rate Spike
    condition: error_rate > 1% for 2 minutes
    severity: critical
    action: PagerDuty alert

  - name: Core Web Vitals Regression
    condition: LCP > 2.5s OR CLS > 0.1
    severity: warning
    action: Create GitHub issue

  - name: Memory Leak
    condition: heap_used increases monotonically for 1 hour
    severity: critical
    action: Auto-restart + alert
```

## Monitoring Stack Recommendations

| Budget | Stack | Setup Time |
|--------|-------|-----------|
| Free | Sentry (free tier) + web-vitals + Lighthouse CI | 2 hours |
| \$50/mo | Sentry Pro + Vercel Analytics + Checkly | 4 hours |
| \$200/mo | Datadog APM + RUM + Synthetics | 1 day |
| Enterprise | Datadog + PagerDuty + custom dashboards | 1 week |

## Checklist

- [ ] Core Web Vitals tracking in production
- [ ] APM with transaction tracing (Sentry or Datadog)
- [ ] Slow database query detection (>100ms threshold)
- [ ] Performance budgets in CI (Lighthouse CI)
- [ ] Error rate alerting (<1% target)
- [ ] P95 latency alerting (<500ms target)
- [ ] Memory usage monitoring with auto-restart
- [ ] Real User Monitoring for geographic performance
