---
name: security-audit
description: "Comprehensive security audit combining SAST, DAST, manual code review, and threat modeling for applications."
version: 1.0.0
category: security
parent: mega-security
tags: [mega-security, audit, sast, dast]
disable-model-invocation: true
---

# Security Audit

## What This Does

Performs a comprehensive security audit of an application — combining static analysis (SAST), dynamic analysis (DAST), manual code review, and threat modeling. Produces a prioritized findings report with remediation guidance. Designed for pre-launch reviews, periodic assessments, or after significant codebase changes.

## Instructions

1. **Define the audit scope.** Clarify:
   - What's being audited? (full app, specific module, API, auth system)
   - Tech stack and frameworks
   - Authentication and authorization mechanisms
   - External integrations and data flows
   - Previous audit findings (if any)
   - Compliance requirements (SOC2, HIPAA, PCI, GDPR)

2. **Threat modeling.** Before reviewing code, understand the attack surface:
   - **Assets:** What data and systems need protection?
   - **Threats:** Who would attack and why? (STRIDE model)
   - **Entry points:** Where does untrusted input enter?
   - **Trust boundaries:** Where do privilege levels change?
   - Draw the data flow diagram and mark trust boundaries

3. **Static analysis (SAST).** Review code for vulnerabilities:
   - **Injection:** SQL, NoSQL, command, LDAP injection points
   - **Authentication:** Password handling, session management, MFA
   - **Authorization:** Access control checks, IDOR vulnerabilities
   - **Cryptography:** Weak algorithms, hardcoded keys, improper randomness
   - **Data exposure:** PII in logs, verbose errors, insecure storage
   - **Configuration:** Debug modes, default credentials, unnecessary features

4. **Manual code review focus areas:**
   ```
   Priority 1 (always review):
   - Authentication flows (login, register, password reset, MFA)
   - Authorization checks (every endpoint, every data access)
   - Input validation (every user-facing input)
   - Data serialization/deserialization
   - File upload handling
   - Payment/financial logic

   Priority 2 (review if time permits):
   - Error handling (information leakage)
   - Logging (sensitive data exposure)
   - Third-party integrations (trust boundaries)
   - Admin functionality
   - API rate limiting
   ```

5. **Dynamic analysis (DAST).** Test the running application:
   - Inject payloads into every input field
   - Test authentication bypass scenarios
   - Attempt privilege escalation (horizontal and vertical)
   - Check for CORS misconfigurations
   - Test rate limiting and brute force protections
   - Verify security headers (CSP, HSTS, X-Frame-Options)

6. **Classify findings by severity.**

   | Severity | Criteria | Response |
   |----------|----------|----------|
   | CRITICAL | Active exploitation possible, data breach risk | Fix immediately, block release |
   | HIGH | Exploitable with moderate effort | Fix before release |
   | MEDIUM | Requires specific conditions to exploit | Fix within current sprint |
   | LOW | Minimal impact, defense-in-depth | Schedule for next cycle |
   | INFO | Best practice recommendation | Track and address opportunistically |

7. **Produce the audit report.**

## Output Format

```markdown
# Security Audit Report: {Application Name}
**Date:** {YYYY-MM-DD}
**Auditor:** Claude (automated) + {human reviewer if applicable}
**Scope:** {what was audited}
**Classification:** {Internal / Confidential}

## Executive Summary
{2-3 sentences: overall security posture, critical findings count, recommendation}

## Risk Summary
| Severity | Count |
|----------|-------|
| CRITICAL | {n} |
| HIGH | {n} |
| MEDIUM | {n} |
| LOW | {n} |
| INFO | {n} |

## Findings

### [CRITICAL] {Finding Title}
- **Location:** {file:line or endpoint}
- **Description:** {what the vulnerability is}
- **Impact:** {what an attacker could do}
- **Reproduction:** {steps to reproduce}
- **Remediation:** {how to fix, with code example}

### [HIGH] {Finding Title}
...

## Positive Findings
{Security controls that are working well — important for morale and to prevent regression}

## Recommendations
1. {Prioritized recommendation}
2. {Prioritized recommendation}

## Methodology
{Tools used, areas reviewed, time spent}
```

## Tips

- Start with the threat model — it tells you where to focus manual review
- The most critical bugs are usually in authentication, authorization, and input validation
- Check for the "easy wins" first: hardcoded secrets, SQL injection, XSS — they're common and high-impact
- Don't just find bugs — provide working remediation code
- Document positive findings too — teams need to know what they're doing right
- If the application handles payments, review PCI DSS requirements specifically
- After the audit, recommend setting up automated scanning (see `codeql-integration` skill)
