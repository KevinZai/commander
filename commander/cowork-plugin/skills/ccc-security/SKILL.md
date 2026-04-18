---
name: ccc-security
context: fork
description: |
  CCC domain — complete application security ecosystem — 8 skills in one. OWASP Top 10, secrets scanning, dependency audits, prompt injection defense, CodeQL, and incident response. Invokes Claude Code's built-in /security-review rather than reimplementing from scratch.

  <example>
  user: run a security audit on this codebase
  assistant: Loads ccc-security and invokes /security-review built-in, then routes to owasp-top-10 + secrets-scanner for comprehensive coverage.
  </example>

  <example>
  user: our app uses AI — protect it from prompt injection
  assistant: Loads ccc-security and routes to prompt-injection-defense for AI-specific attack surface hardening.
  </example>

  <example>
  user: scan our dependencies for vulnerabilities
  assistant: Loads ccc-security and routes to dependency-audit for npm/pip/cargo vulnerability scanning.
  </example>
version: 1.0.0
category: CCC domain
# NOTE: ccc-security is a candidate for the `monitors` key in a future plugin.json schema update
# (for automated security scans on schedule). Not added pending GA confirmation of the monitors schema.
---

# ccc-security

> Load ONE skill. Get the entire application security domain. 8 skills in one.

**Integration note:** This skill invokes Claude Code's built-in `/security-review` command as the entry point, then routes to specialist sub-skills for deeper analysis. It does not reimplement the security review — it extends it.

## Sub-Skills

| # | Skill | Focus |
|---|-------|-------|
| 1 | security-audit | Comprehensive security audit — SAST, DAST, manual review |
| 2 | prompt-injection-defense | Defend AI-powered apps against prompt injection attacks |
| 3 | dependency-audit | Audit npm/pip/cargo dependencies for known vulnerabilities |
| 4 | secrets-scanner | Scan codebase for hardcoded secrets, API keys, tokens |
| 5 | owasp-top-10 | Check application against OWASP Top 10 vulnerabilities |
| 6 | codeql-integration | Set up CodeQL for automated security analysis in CI |
| 7 | variant-analysis | Find variants of known vulnerabilities across codebase |
| 8 | incident-response | Security incident response playbook and remediation |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Security audit" / "Review for vulnerabilities" | `/security-review` → `security-audit` + `owasp-top-10` |
| "Prompt injection" / "AI app security" | `prompt-injection-defense` |
| "Vulnerable dependencies" / "npm audit" | `dependency-audit` |
| "Hardcoded secrets" / "API key scan" | `secrets-scanner` |
| "OWASP" / "Top 10 check" | `owasp-top-10` |
| "CodeQL" / "Automated security CI" | `codeql-integration` |
| "Find all variants of this bug" | `variant-analysis` |
| "Security incident" / "We were breached" | `incident-response` |

## Protocol

1. **Always start with `/security-review`** built-in — it provides the initial scan surface
2. Route to specialist skills for deeper analysis per domain
3. `secrets-scanner` and `dependency-audit` on every new project
4. `owasp-top-10` before every production release
5. `incident-response` for active security events — stop all other work first

## Campaign Templates

### New Project Security Baseline
1. `/security-review` → built-in initial scan
2. `secrets-scanner` → hardcoded credentials check
3. `dependency-audit` → vulnerable package scan
4. `owasp-top-10` → application-level vulnerabilities
5. `codeql-integration` → wire automated scanning into CI

### Pre-Release Security Gate
1. `security-audit` → comprehensive SAST + manual review
2. `owasp-top-10` → full Top 10 checklist
3. `dependency-audit` → final dependency sweep
4. `variant-analysis` → check for related vulnerability patterns

### AI App Hardening
1. `prompt-injection-defense` → input validation, sandboxing, output filtering
2. `security-audit` → standard audit extended for AI surfaces
3. `owasp-top-10` → plus AI-specific additions (OWASP LLM Top 10)
