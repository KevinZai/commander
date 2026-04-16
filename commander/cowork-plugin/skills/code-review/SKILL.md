---
name: code-review
description: "Review code changes for security, performance, correctness, and maintainability. Use when: 'review code', 'PR review', 'check changes', 'review my diff', 'is this safe?', 'before I merge', 'audit this code'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<PR URL, file path, or diff>"
---

# /ccc:code-review

> Placeholders like ~~source control refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Review code changes with a structured lens across four dimensions: Security, Performance, Correctness, Maintainability. Quick Mode reviews the current diff. Power Mode runs a full 4-dimension scored review.

## Quick Mode (default)

If an argument is provided (file path, PR URL, or diff), review it immediately.

If no argument, run:
```bash
git diff HEAD~1
```
and review the most recent change. If the working tree has unstaged changes, prefer `git diff` instead.

Highlight:
- Critical issues (must fix before merge)
- High issues (should fix)
- Suggestions (nice to have)

Limit to 20 most important findings. Skip minor style nits unless `--style` flag is passed.

## Power Mode

Activate by passing `--power` or `detailed`.

Full 4-dimension review with scores (1-10):

### Security (weight: 35%)
- SQL injection, XSS, CSRF
- Authentication and authorization flaws
- Secrets or credentials in code
- Input validation gaps
- SSRF, path traversal, insecure deserialization

### Performance (weight: 25%)
- N+1 queries
- Unnecessary memory allocations
- Algorithmic complexity (O(n²) in hot paths)
- Missing indexes or unbounded queries
- Resource leaks

### Correctness (weight: 25%)
- Edge cases (null, empty input, overflow)
- Race conditions and concurrency
- Error handling and propagation
- Off-by-one errors, type safety

### Maintainability (weight: 15%)
- Naming clarity and single responsibility
- Duplication, test coverage
- Documentation for non-obvious logic

**Overall score** = weighted average. Verdict: Approve (8+) / Request Changes (5-7) / Needs Discussion (<5).

## Delegating Large Reviews

For reviews >500 lines of changes, use the Agent tool to delegate to the `reviewer` agent:
- The reviewer agent runs in parallel across sections
- Synthesizes findings into a single report
- Catches issues a single pass might miss

## If Connectors Available

If **~~source control** is connected:
- Pull PR diff automatically from the URL — no copy-pasting
- Check CI/test status before reviewing (fail fast on broken CI)
- Post review comments directly to the PR via the source control MCP
- Verify the PR addresses its linked issue requirements

If **~~project tracker** is connected:
- Link Critical/High findings to new bug issues automatically
- Verify the PR description matches the linked ticket scope

If **~~library docs** (Context7) is connected:
- Verify API usage against current docs — catches deprecated methods
- Check imports and signatures against live documentation

If **~~knowledge base** is connected:
- Check changes against team coding standards and style guides
- Reference prior ADRs for architectural decisions

## Output Format

```markdown
## Code Review: [PR title or file]

### Summary
[1-2 sentence overview of the changes and overall quality]

### Issues
| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| 1 | auth.ts | 42 | JWT secret read from process.env without fallback | 🔴 Critical |
| 2 | db.ts | 18 | N+1 query in getUserPosts loop | 🟠 High |
| 3 | utils.ts | 91 | Magic number 86400 — use a named constant | 🟡 Medium |

### What Looks Good
- [Positive observations — acknowledge the good]

### Verdict
**[Approve / Request Changes / Needs Discussion]**
Score: [X/10] (Security: X | Performance: X | Correctness: X | Maintainability: X)
```

## Tips

1. **Provide context** — "This handles PII" or "This is a hot path" focuses the review.
2. **Specify focus** — pass `--security` or `--performance` to narrow the lens.
3. **Include tests** — I'll check test coverage and quality alongside the implementation.
4. **Fix Critical first** — never merge with a Critical issue open, even under time pressure.
