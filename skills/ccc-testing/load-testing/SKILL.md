---
name: Load Testing
description: "Load testing with k6 and Artillery — scripts, scenarios, thresholds, CI integration, bottleneck analysis."
version: 1.0.0
category: testing
parent: ccc-testing
---

# Load Testing

> Verify your system handles expected (and unexpected) traffic. Write load test scripts, define performance budgets, and catch bottlenecks before users do.

## When to Use

- Before launching a new API or service
- After significant architecture changes
- Setting performance baselines for SLAs
- Capacity planning (how many users can we handle?)
- Validating autoscaling configurations

## k6 Fundamentals

k6 is the recommended tool — scriptable in JavaScript, lightweight, excellent CI integration.

### Installation

```bash
# macOS
brew install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js
```

### Basic Script Structure

```javascript
// tests/load/api-health.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m',  target: 20 },   // Stay at 20 for 1 minute
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failure rate
    http_reqs: ['rate>100'],            // At least 100 req/s throughput
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'body contains status': (r) => r.json().status === 'ok',
  });

  sleep(1);
}
```

### Scenario Types

#### Ramp-Up (Normal Traffic Growth)
```javascript
export const options = {
  stages: [
    { duration: '2m',  target: 50 },   // Gradually increase
    { duration: '5m',  target: 50 },   // Sustain peak
    { duration: '2m',  target: 0 },    // Cool down
  ],
};
```

#### Spike Test (Sudden Traffic Burst)
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Baseline
    { duration: '1m',  target: 10 },   // Normal traffic
    { duration: '10s', target: 200 },  // Spike!
    { duration: '3m',  target: 200 },  // Hold spike
    { duration: '10s', target: 10 },   // Back to normal
    { duration: '1m',  target: 10 },   // Recovery
    { duration: '10s', target: 0 },    // Done
  ],
};
```

#### Stress Test (Find Breaking Point)
```javascript
export const options = {
  stages: [
    { duration: '2m',  target: 100 },
    { duration: '5m',  target: 100 },
    { duration: '2m',  target: 200 },
    { duration: '5m',  target: 200 },
    { duration: '2m',  target: 300 },
    { duration: '5m',  target: 300 },  // Keep pushing
    { duration: '2m',  target: 400 },
    { duration: '5m',  target: 400 },
    { duration: '10m', target: 0 },    // Recovery period
  ],
};
```

#### Soak Test (Sustained Load Over Time)
```javascript
export const options = {
  stages: [
    { duration: '5m',  target: 50 },   // Ramp up
    { duration: '4h',  target: 50 },   // Sustain for hours
    { duration: '5m',  target: 0 },    // Cool down
  ],
};
```

### Testing API Endpoints

```javascript
// tests/load/api-crud.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const createDuration = new Trend('create_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 30,
      duration: '2m',
      exec: 'readFlow',
    },
    write_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      exec: 'writeFlow',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    errors: ['rate<0.05'],
    create_duration: ['p(95)<400'],
  },
};

export function readFlow() {
  group('List items', () => {
    const res = http.get(`${BASE_URL}/api/items?limit=20`);
    check(res, {
      'list status 200': (r) => r.status === 200,
      'list has items': (r) => r.json().length > 0,
    }) || errorRate.add(1);
  });

  group('Get single item', () => {
    const res = http.get(`${BASE_URL}/api/items/1`);
    check(res, {
      'get status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);
}

export function writeFlow() {
  group('Create item', () => {
    const payload = JSON.stringify({
      name: `Load Test Item ${Date.now()}`,
      value: Math.random(),
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(`${BASE_URL}/api/items`, payload, params);
    createDuration.add(res.timings.duration);

    check(res, {
      'create status 201': (r) => r.status === 201,
      'create returns id': (r) => r.json().id !== undefined,
    }) || errorRate.add(1);
  });

  sleep(2);
}
```

### Authenticated Requests

```javascript
import http from 'k6/http';
import { check } from 'k6';

export function setup() {
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'loadtest@example.com',
    password: __ENV.TEST_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  const token = loginRes.json().token;
  return { token };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:3000/api/protected', params);
  check(res, { 'status 200': (r) => r.status === 200 });
}
```

## Artillery (Alternative)

Artillery uses YAML config and is good for quick tests without custom logic.

```yaml
# tests/load/artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "API browsing"
    weight: 70
    flow:
      - get:
          url: "/api/items"
          expect:
            - statusCode: 200
      - think: 1
      - get:
          url: "/api/items/{{ $randomNumber(1, 100) }}"

  - name: "Create and read"
    weight: 30
    flow:
      - post:
          url: "/api/items"
          json:
            name: "Artillery Test {{ $timestamp }}"
          capture:
            - json: "$.id"
              as: "itemId"
      - get:
          url: "/api/items/{{ itemId }}"
```

```bash
npx artillery run tests/load/artillery.yml
npx artillery run --output report.json tests/load/artillery.yml
npx artillery report report.json  # Generate HTML report
```

## CI Integration (GitHub Actions)

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  pull_request:
    paths: ['src/api/**', 'src/server/**']

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: grafana/setup-k6-action@v1

      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: npx wait-on http://localhost:3000/api/health

      - name: Run load tests
        run: k6 run tests/load/api-health.js --summary-export=results.json

      - name: Check thresholds
        run: |
          node -e "
            const r = require('./results.json');
            const failed = Object.entries(r.metrics)
              .filter(([k,v]) => v.thresholds && Object.values(v.thresholds).some(t => !t.ok));
            if (failed.length) {
              console.error('Failed thresholds:', failed.map(([k]) => k));
              process.exit(1);
            }
          "
```

## Analyzing Results

### Key Metrics to Watch

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| p50 response time | < 100ms | 100-300ms | > 300ms |
| p95 response time | < 200ms | 200-500ms | > 500ms |
| p99 response time | < 500ms | 500ms-1s | > 1s |
| Error rate | < 0.1% | 0.1-1% | > 1% |
| Throughput | Meets SLA | 80% of SLA | < 80% SLA |

### Common Bottlenecks

1. **Database queries** — Missing indexes, N+1 queries, connection pool exhaustion
2. **Memory leaks** — Response times degrade over soak tests
3. **CPU saturation** — Look for increased p99 while p50 stays flat
4. **Connection limits** — Errors spike at specific concurrency levels
5. **External service calls** — Downstream timeouts cascade upward

### Baseline Workflow

1. Run load test against current production baseline
2. Save results as the performance contract
3. Run same test after changes
4. Compare p95, p99, error rate, throughput
5. Fail the build if any metric regrades beyond threshold
