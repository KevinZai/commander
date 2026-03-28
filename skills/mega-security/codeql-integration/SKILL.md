---
name: codeql-integration
description: "Set up CodeQL for automated security analysis in CI/CD pipelines with custom queries and alert management."
version: 1.0.0
category: security
parent: mega-security
tags: [mega-security, codeql, sast, ci-cd]
disable-model-invocation: true
---

# CodeQL Integration

## What This Does

Sets up GitHub's CodeQL for automated static analysis security testing (SAST) in CI/CD pipelines. Covers initial configuration, language setup, custom query writing, alert triage, and integration with PR workflows. CodeQL finds vulnerabilities by analyzing code as data — modeling data flow from sources (user input) to sinks (dangerous operations).

## Instructions

1. **Assess the codebase.** Determine:
   - Languages used (CodeQL supports: JavaScript/TypeScript, Python, Java, C/C++, C#, Go, Ruby, Swift, Kotlin)
   - Repository hosting (GitHub.com, GitHub Enterprise, or other)
   - Existing CI/CD pipeline
   - Current security scanning tools

2. **Set up CodeQL in GitHub Actions.**

   ```yaml
   # .github/workflows/codeql.yml
   name: "CodeQL"

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
     schedule:
       - cron: '0 6 * * 1'  # Weekly Monday 6am

   jobs:
     analyze:
       name: Analyze
       runs-on: ubuntu-latest
       permissions:
         actions: read
         contents: read
         security-events: write

       strategy:
         fail-fast: false
         matrix:
           language: ['javascript-typescript']
           # Add more: 'python', 'java-kotlin', 'go', 'ruby', etc.

       steps:
         - name: Checkout repository
           uses: actions/checkout@v4

         - name: Initialize CodeQL
           uses: github/codeql-action/init@v3
           with:
             languages: ${{ matrix.language }}
             queries: security-extended
             # Options: security-extended, security-and-quality

         - name: Autobuild
           uses: github/codeql-action/autobuild@v3

         - name: Perform CodeQL Analysis
           uses: github/codeql-action/analyze@v3
           with:
             category: "/language:${{ matrix.language }}"
   ```

3. **Choose the query suite.**

   | Suite | Coverage | False Positives | Use When |
   |-------|----------|----------------|----------|
   | `default` | Standard security queries | Low | Starting out |
   | `security-extended` | Expanded security coverage | Medium | After triaging defaults |
   | `security-and-quality` | Security + code quality | Higher | Comprehensive scanning |

4. **Write custom CodeQL queries.** For project-specific patterns:

   ```ql
   /**
    * @name Unvalidated user input in database query
    * @description User input flows to a database query without validation
    * @kind path-problem
    * @problem.severity error
    * @security-severity 8.0
    * @id js/custom/sql-injection
    */

   import javascript
   import semmle.javascript.security.dataflow.SqlInjectionQuery
   import DataFlow::PathGraph

   from SqlInjection::Configuration config, DataFlow::PathNode source, DataFlow::PathNode sink
   where config.hasFlowPath(source, sink)
   select sink.getNode(), source, sink, "This query depends on a $@.", source.getNode(),
     "user-provided value"
   ```

5. **Configure alert management.**
   - Enable code scanning alerts in repository settings
   - Set up branch protection rules to require CodeQL checks
   - Configure alert dismissal policy (who can dismiss, what reasons are valid)
   - Set up Slack/email notifications for new critical alerts

6. **Integrate with PR workflow.**
   ```yaml
   # Add to branch protection rules:
   # - Require status checks: "CodeQL"
   # - Require code scanning alerts to be resolved

   # In the workflow, add PR comment with results:
   - name: Upload SARIF
     uses: github/codeql-action/upload-sarif@v3
     with:
       sarif_file: results.sarif
   ```

7. **Triage initial results.** On first run, expect many findings:
   - Start with CRITICAL and HIGH severity
   - Dismiss false positives with a reason (improves future scans)
   - Create issues for true positives
   - Adjust query configuration to reduce noise

## Output Format

```markdown
# CodeQL Setup: {Repository}

## Configuration
- Languages: {list}
- Query suite: {suite}
- Trigger: {push to main, PRs, weekly schedule}

## Workflow File
{Path to the committed workflow YAML}

## Custom Queries
| Query | Description | Severity |
|-------|-------------|----------|
| {name} | {what it finds} | {severity} |

## Branch Protection
- [ ] CodeQL check required for PRs to main
- [ ] Alert dismissal requires review

## Initial Findings
| Severity | Count | Action |
|----------|-------|--------|
| Critical | {n} | Fix immediately |
| High | {n} | Fix this sprint |
| Medium | {n} | Schedule |
| Low | {n} | Backlog |
```

## Tips

- Start with the `default` query suite — it has the best signal-to-noise ratio
- CodeQL runs on every PR by default — if scan time is too long, limit to push-to-main + weekly schedule
- Custom queries are powerful but complex — start with the built-in queries before writing custom ones
- The `security-extended` suite catches more issues but requires more triage effort
- CodeQL is free for public repositories and included with GitHub Advanced Security for private repos
- Use `codeql-action/autobuild` for most languages — manual build steps are rarely needed for JS/Python
- Alert trends over time are more useful than absolute counts — track whether findings are increasing or decreasing
