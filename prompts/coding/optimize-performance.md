---
name: optimize-performance
category: coding
skills: [optimize, benchmark, systematic-debugging]
mode: plan
estimated_tokens: 700
---

# Performance Optimization

## When to Use
When you have a measurable performance problem — slow page loads, high memory usage, laggy interactions, slow API responses. Do NOT optimize prematurely; use this when you have evidence of a problem.

## Template

```
Analyze and optimize the performance of the following code. Every optimization must be measured — no speculative changes.

**Problem area:**
{{file_paths_or_description}}

**Symptom:**
{{what_is_slow — e.g., API response takes 3s, page load is 8s, memory grows to 2GB}}

**Target:**
{{desired_performance — e.g., API response under 200ms, page load under 2s}}

**Phase 1: Profile**
- Read the relevant code paths with the Read tool
- Identify the hot path (the code that runs for every request/render/operation)
- Look for these common patterns with Grep:
  - N+1 queries: loops containing DB/API calls
  - Unnecessary re-computation: missing memoization
  - Large payloads: over-fetching data
  - Synchronous blocking: heavy computation on main thread
  - Memory leaks: growing arrays, unclosed listeners, circular references

**Phase 2: Measure baseline**
- If backend: add timing instrumentation or use `console.time`/`console.timeEnd`
- If frontend: check bundle size with `npx next build` or equivalent
- If DB: run `EXPLAIN ANALYZE` on slow queries
- Record exact numbers — these are the baseline

**Phase 3: Identify top 3 bottlenecks**
- Rank by impact (biggest time savings first)
- For each: explain WHY it's slow and WHAT the fix is
- Estimate the expected improvement for each fix

**Phase 4: Optimize (one at a time)**
- Implement fix #1 → measure → record improvement
- Implement fix #2 → measure → record improvement
- Implement fix #3 → measure → record improvement
- After each fix, run the test suite to verify no regressions

**Phase 5: Report**
Present a table:
| Optimization | Before | After | Improvement |
|---|---|---|---|
| Fix 1 | Xms | Yms | Z% |
| Fix 2 | Xms | Yms | Z% |
| Fix 3 | Xms | Yms | Z% |
| **Total** | **Xms** | **Yms** | **Z%** |
```

## Tips
- Use the `benchmark` skill to set up automated performance measurement
- The `optimize` skill handles common optimization patterns automatically
- Profile before you optimize — intuition about bottlenecks is often wrong

## Example

```
Analyze and optimize the performance of the following code. Every optimization must be measured — no speculative changes.

**Problem area:**
src/api/routes/dashboard.ts — the /api/dashboard endpoint

**Symptom:**
Dashboard API takes 4.2 seconds on average. Users see a loading spinner for too long.

**Target:**
Under 500ms for the dashboard endpoint.
```
