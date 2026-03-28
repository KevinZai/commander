---
name: variant-analysis
description: "Find variants of known vulnerabilities across a codebase — when one bug is found, systematically find its siblings."
version: 1.0.0
category: security
parent: mega-security
tags: [mega-security, variant-analysis, vulnerability, patterns]
disable-model-invocation: true
---

# Variant Analysis

## What This Does

When a vulnerability is found in one location, systematically searches the entire codebase for similar patterns that might have the same bug. This is "variant analysis" — finding siblings of known vulnerabilities. One SQL injection usually means there are more; one missing auth check usually means several endpoints are unprotected.

## Instructions

1. **Understand the original vulnerability.** Document precisely:
   - What is the vulnerability class? (injection, auth bypass, race condition, etc.)
   - What code pattern makes it vulnerable? (the "shape" of the bug)
   - What makes a location NOT vulnerable? (the fix pattern)
   - Where was it found? (file, function, line)

2. **Extract the vulnerable pattern.** Generalize from the specific instance:
   ```
   Example — Original finding:
   File: routes/users.js, Line 45
   Pattern: db.query("SELECT * FROM users WHERE id = " + req.params.id)
   Bug class: SQL injection via string concatenation in queries

   Generalized pattern to search for:
   - Any db.query() call with string concatenation or template literals
   - Any raw SQL construction with user input
   - Any query builder bypassing parameterization
   ```

3. **Search for variants.** Use multiple search strategies:

   **Strategy 1: Grep for the code pattern.**
   ```bash
   # Find similar SQL construction patterns
   grep -rn "db\.query.*+" --include="*.ts" --include="*.js"
   grep -rn "db\.query.*\`" --include="*.ts" --include="*.js"
   grep -rn "\$\{.*\}" --include="*.sql"
   ```

   **Strategy 2: Search for the vulnerability class.**
   - If it's an auth bypass: search ALL endpoints for authorization middleware
   - If it's XSS: search ALL places user content is rendered
   - If it's IDOR: search ALL places resource IDs come from request parameters

   **Strategy 3: Search for the "unsafe" function/API.**
   ```
   If the vulnerability uses a specific unsafe API:
   - Raw SQL: search for all raw query calls
   - eval(): search for all eval/Function constructor usage
   - innerHTML: search for all DOM manipulation
   - exec()/spawn(): search for all command execution
   ```

   **Strategy 4: Data flow analysis.**
   - Trace all paths where user input enters the system
   - For each path, check if it reaches the same "sink" (dangerous operation)
   - Use CodeQL if available for automated data flow analysis

4. **Verify each potential variant.** For each match:
   - Is the same vulnerability class present? (true positive)
   - Is there a sanitization/validation step that the original lacked? (false positive)
   - Is the input source actually user-controlled? (reachability)
   - What is the impact if exploited?

5. **Apply the fix pattern consistently.** Once variants are confirmed:
   - Apply the same fix that resolved the original vulnerability
   - Ensure the fix is applied uniformly across all instances
   - Consider creating a shared utility/helper that enforces the safe pattern
   - Add a linting rule or CodeQL query to prevent future instances

6. **Document and prevent recurrence.**

## Output Format

```markdown
# Variant Analysis Report

## Original Vulnerability
- **Location:** {file:line}
- **Class:** {vulnerability type}
- **Pattern:** {code pattern that makes it vulnerable}
- **Fix:** {how the original was fixed}

## Search Strategy
{What patterns were searched for and how}

## Variants Found

| # | File | Line | Status | Impact | Fix Applied |
|---|------|------|--------|--------|-------------|
| 1 | {file} | {line} | {confirmed/false positive} | {severity} | {yes/no} |
| 2 | {file} | {line} | {confirmed/false positive} | {severity} | {yes/no} |

## Variant Details

### Variant 1: {file}:{line}
- **Code:** {the vulnerable code}
- **Why it's vulnerable:** {explanation}
- **Fix:** {the applied fix}

## Prevention Measures
- [ ] Shared utility created: {utility name and location}
- [ ] Linting rule added: {rule description}
- [ ] CodeQL query added: {query description}
- [ ] Code review checklist updated

## Coverage Assessment
- Files searched: {count}
- Matches examined: {count}
- True positives: {count}
- False positives: {count}
- Confidence that all variants are found: {HIGH/MEDIUM/LOW}
```

## Tips

- The "one bug means more bugs" heuristic is almost always correct — invest the time to search thoroughly
- Search broadly first (grep for the unsafe API), then narrow down (check each match manually)
- Copy-paste code is the top source of variant vulnerabilities — if code was duplicated, bugs were too
- After fixing variants, create an abstraction that makes the unsafe pattern impossible (e.g., a query builder that only accepts parameterized queries)
- CodeQL variant analysis is the industrial-strength version of this — use it if available
- Keep a "vulnerability pattern library" — each class of bug you find becomes a search pattern for future audits
- This skill pairs naturally with `operationalize-fixes` — find the variants, then operationalize the prevention
