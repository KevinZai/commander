---
name: KZ Mega-Security
description: "Complete security ecosystem — 8 skills in one. Security audits, prompt injection defense, dependency audits, secrets scanning, OWASP Top 10, CodeQL, variant analysis, and incident response."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
tags: [CCC domain, security, appsec, devsecops]
---

# KZ Mega-Security

> Load ONE skill. Get the entire application security domain. From proactive auditing to reactive incident response, with AI-specific defenses included.

## Sub-Skills

| # | Skill | Command | Description |
|---|-------|---------|-------------|
| 1 | security-audit | `/security-audit` | Comprehensive security audit — SAST, DAST, manual review |
| 2 | prompt-injection-defense | `/prompt-injection-defense` | Defend AI-powered apps against prompt injection attacks |
| 3 | dependency-audit | `/dependency-audit` | Audit npm/pip/cargo dependencies for known vulnerabilities |
| 4 | secrets-scanner | `/secrets-scanner` | Scan codebase for hardcoded secrets, API keys, tokens |
| 5 | owasp-top-10 | `/owasp-top-10` | Check application against OWASP Top 10 vulnerabilities |
| 6 | codeql-integration | `/codeql-integration` | Set up CodeQL for automated security analysis in CI |
| 7 | variant-analysis | `/variant-analysis` | Find variants of known vulnerabilities across codebase |
| 8 | incident-response | `/incident-response` | Security incident response playbook and remediation |

## How To Use

**Step 1:** Tell me what security concern you have or what you want to audit.

**Step 2:** I'll confirm the scope (specific files, entire repo, specific vulnerability class) and your tech stack before routing.

**Step 3:** The specialist skill handles the work. You get comprehensive security coverage without loading 8 separate skills.

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Audit my app for security issues" / "Security review" | `security-audit` | `owasp-top-10` (specific checklist, not full audit) |
| "Protect against prompt injection" / "AI safety" | `prompt-injection-defense` | `security-audit` (general, not AI-specific) |
| "Check my dependencies" / "npm audit" / "Are my packages safe?" | `dependency-audit` | `secrets-scanner` (credentials, not packages) |
| "Find hardcoded secrets" / "API keys in code" | `secrets-scanner` | `dependency-audit` (packages, not credentials) |
| "OWASP compliance" / "Top 10 vulnerabilities" | `owasp-top-10` | `security-audit` (broader than OWASP) |
| "Set up CodeQL" / "Automated security scanning in CI" | `codeql-integration` | `security-audit` (manual review, not CI automation) |
| "Find similar bugs" / "This vulnerability might exist elsewhere" | `variant-analysis` | `codeql-integration` (setup, not analysis) |
| "We've been breached" / "Security incident" / "Respond to attack" | `incident-response` | `security-audit` (prevention, not response) |

## Campaign Templates

### Pre-Launch Security Review
1. `secrets-scanner` -> find and remove any hardcoded credentials
2. `dependency-audit` -> check all dependencies for known CVEs
3. `owasp-top-10` -> verify against OWASP Top 10 checklist
4. `security-audit` -> comprehensive manual review of auth, authz, input validation
5. `codeql-integration` -> set up automated scanning for ongoing protection
6. Deliver: security clearance report with all findings addressed and CI scanning active

### AI Application Security
1. `prompt-injection-defense` -> harden all LLM-facing inputs and outputs
2. `secrets-scanner` -> verify API keys for AI services are not exposed
3. `security-audit` -> review data flow between user input, LLM, and actions
4. `owasp-top-10` -> standard web security around the AI features
5. Deliver: AI-hardened application with injection defenses and secure API key management

### Incident Response
1. `incident-response` -> activate response playbook, contain the threat
2. `secrets-scanner` -> identify all potentially compromised credentials
3. `variant-analysis` -> find related vulnerabilities the attacker may have exploited
4. `security-audit` -> full post-incident audit to prevent recurrence
5. `codeql-integration` -> add detection rules for the vulnerability class
6. Deliver: incident resolved, credentials rotated, codebase hardened, CI rules added

### Continuous Security Pipeline
1. `codeql-integration` -> set up CodeQL in GitHub Actions
2. `dependency-audit` -> configure automated dependency scanning (Dependabot/Snyk)
3. `secrets-scanner` -> add pre-commit hooks for secret detection
4. `owasp-top-10` -> create security test suite for CI
5. Deliver: automated security pipeline that catches issues before they reach production

## Severity Classification

| Severity | Response Time | Examples |
|----------|--------------|---------|
| CRITICAL | Immediate | Hardcoded production secrets, RCE, SQL injection, active breach |
| HIGH | Same day | Authentication bypass, SSRF, insecure deserialization |
| MEDIUM | This sprint | XSS, CSRF, missing rate limiting, verbose error messages |
| LOW | Backlog | Information disclosure, missing security headers, weak algorithms |

## Context Strategy

This CCC domain uses on-demand loading. Sub-skills have `disable-model-invocation: true` so they only load when explicitly invoked, keeping your context lean.
