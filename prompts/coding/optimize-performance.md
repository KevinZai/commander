---
name: optimize-performance
category: coding
skills: [optimize, benchmark, systematic-debugging]
mode: plan
estimated_tokens: 700
---

# Performance Optimization

## When to Use
Use when there is measured evidence of a performance problem: slow page loads, high memory use, laggy interactions, or slow API responses. Do not use it for speculative optimization.

## Template

```
Analyze and optimize the performance of the code below. Measure every optimization; make no change whose effect you have not measured.

**Problem area:**
{{file_paths_or_description}}

**Symptom:**
{{what_is_slow — e.g., API response takes 3s, page load is 8s, memory grows to 2GB}}

**Target:**
{{desired_performance — e.g., API response under 200ms, page load under 2s}}

Phase 1: Profile.
- Read the relevant code paths with the Read tool.
- Identify the hot path: the code that runs on every request, render, or operation.
- Use Grep to look for these patterns:
  - N+1 queries: loops that contain database or API calls.
  - Repeated computation: missing memoization.
  - Large payloads: over-fetching data.
  - Synchronous blocking: heavy computation on the main thread.
  - Memory leaks: growing arrays, unremoved listeners, retained references.

Phase 2: Measure the baseline.
- Backend: add timing instrumentation, or use `console.time` / `console.timeEnd`.
- Frontend: check bundle size with the project's build, for example `npx next build`.
- Database: run `EXPLAIN ANALYZE` on the slow queries.
- Record exact numbers; these are the baseline.

Phase 3: Rank the top three bottlenecks.
- Order them by expected time saved.
- For each, explain why it is slow and what the fix is.
- Estimate the improvement for each fix.

Phase 4: Optimize one change at a time.
- Implement fix 1, measure, record the result.
- Implement fix 2, measure, record the result.
- Implement fix 3, measure, record the result.
- After each fix, run the test suite and stop if anything regresses.

Phase 5: Report.
Present a table with measured numbers only:
| Optimization | Before | After | Improvement |
|---|---|---|---|
| Fix 1 | Xms | Yms | Z% |
| Fix 2 | Xms | Yms | Z% |
| Fix 3 | Xms | Yms | Z% |
| **Total** | **Xms** | **Yms** | **Z%** |
```

## Tips
- The `benchmark` skill sets up repeatable performance measurement.
- The `optimize` skill covers common frontend patterns: loading, rendering, images, and bundle size.
- Profile before optimizing; intuition about where time goes is often wrong.

## Example

```
Analyze and optimize the performance of the code below. Measure every optimization; make no change whose effect you have not measured.

**Problem area:**
src/api/routes/dashboard.ts — the /api/dashboard endpoint

**Symptom:**
Dashboard API takes 4.2 seconds on average. Users see a loading spinner for too long.

**Target:**
Under 500ms for the dashboard endpoint.
```
