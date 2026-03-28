---
name: owasp-top-10
description: "Check applications against the OWASP Top 10 vulnerabilities with specific tests, examples, and remediation for each category."
version: 1.0.0
category: security
parent: mega-security
tags: [mega-security, owasp, web-security, vulnerabilities]
disable-model-invocation: true
---

# OWASP Top 10

## What This Does

Systematically checks an application against the OWASP Top 10 (2021) vulnerability categories. For each category, provides specific tests to run, code patterns to look for, and remediation guidance. Produces a compliance checklist with pass/fail/partial status for each category.

## Instructions

1. **Determine the application type.** The OWASP Top 10 applies to web applications, but the specific checks vary by:
   - Server-rendered vs SPA + API
   - Framework (Next.js, Express, Django, Rails, etc.)
   - Authentication method (session, JWT, OAuth)
   - Database (SQL, NoSQL, ORM)

2. **Check each OWASP category systematically.**

### A01:2021 — Broken Access Control

**Check for:**
- Missing authorization checks on API endpoints
- Insecure Direct Object References (IDOR) — can user A access user B's data by changing an ID?
- Missing function-level access control — can a regular user access admin endpoints?
- CORS misconfiguration allowing unauthorized origins
- JWT token manipulation (alg: none, key confusion)
- Path traversal in file operations

**Test:**
```
- Try accessing /api/users/{other_user_id} with a regular user token
- Try accessing /admin/* without admin role
- Check if CORS allows * or overly broad origins
- Modify JWT claims and check if they're validated
```

### A02:2021 — Cryptographic Failures

**Check for:**
- Sensitive data transmitted without TLS
- Weak hashing algorithms (MD5, SHA1) for passwords
- Hardcoded encryption keys
- Sensitive data in logs or error messages
- Missing encryption at rest for PII/financial data
- Weak random number generation for tokens

**Test:**
```
- Verify all endpoints use HTTPS
- Check password hashing (should be bcrypt, scrypt, or Argon2)
- Search for console.log/print statements with sensitive data
- Verify token generation uses crypto-secure randomness
```

### A03:2021 — Injection

**Check for:**
- SQL injection (dynamic query construction)
- NoSQL injection (MongoDB query operators in user input)
- Command injection (shell command execution with user input)
- XSS (user input rendered as HTML without sanitization)
- LDAP injection, XML injection, template injection

**Test:**
```
- Input: ' OR 1=1 -- in every text field
- Input: {$gt: ""} in JSON fields (NoSQL)
- Input: ; ls -la in fields that might reach shell
- Input: <script>alert(1)</script> in text fields
- Check if ORM/parameterized queries are used everywhere
```

### A04:2021 — Insecure Design

**Check for:**
- Missing rate limiting on authentication endpoints
- No account lockout after failed login attempts
- Password reset flow vulnerabilities (token reuse, no expiry)
- Missing CSRF protection on state-changing operations
- Business logic flaws (negative quantities, race conditions)

### A05:2021 — Security Misconfiguration

**Check for:**
- Default credentials on admin panels, databases, services
- Unnecessary features enabled (debug mode, directory listing)
- Missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Verbose error messages exposing stack traces
- Unnecessary ports or services exposed
- Outdated software versions

**Test:**
```bash
# Check security headers
curl -I https://example.com | grep -iE "strict-transport|content-security|x-frame|x-content-type"
```

### A06:2021 — Vulnerable and Outdated Components

**Check for:**
- Known CVEs in dependencies (see `dependency-audit` skill)
- Outdated framework versions
- Unsupported or end-of-life components
- Components with known security issues

### A07:2021 — Identification and Authentication Failures

**Check for:**
- Weak password requirements
- Missing MFA option
- Session fixation vulnerabilities
- Session tokens in URL parameters
- No session invalidation on logout
- Credential stuffing protections missing

### A08:2021 — Software and Data Integrity Failures

**Check for:**
- Missing integrity checks on downloaded updates
- Insecure CI/CD pipeline (unsigned artifacts, unverified dependencies)
- Deserialization of untrusted data
- Missing Subresource Integrity (SRI) for CDN scripts

### A09:2021 — Security Logging and Monitoring Failures

**Check for:**
- Authentication events not logged
- Failed access attempts not logged
- Logs missing timestamps, user IDs, or IP addresses
- Sensitive data in logs (passwords, tokens, PII)
- No alerting on suspicious activity
- Log injection vulnerabilities

### A10:2021 — Server-Side Request Forgery (SSRF)

**Check for:**
- User-supplied URLs fetched by the server
- Internal service URLs accessible through user input
- Cloud metadata endpoint access (169.254.169.254)
- DNS rebinding vulnerabilities

3. **Score each category.**

## Output Format

```markdown
# OWASP Top 10 Assessment: {Application}
**Date:** {YYYY-MM-DD}
**OWASP Version:** 2021

## Summary
| # | Category | Status | Findings |
|---|----------|--------|----------|
| A01 | Broken Access Control | {PASS/FAIL/PARTIAL} | {count} |
| A02 | Cryptographic Failures | {PASS/FAIL/PARTIAL} | {count} |
| A03 | Injection | {PASS/FAIL/PARTIAL} | {count} |
| A04 | Insecure Design | {PASS/FAIL/PARTIAL} | {count} |
| A05 | Security Misconfiguration | {PASS/FAIL/PARTIAL} | {count} |
| A06 | Vulnerable Components | {PASS/FAIL/PARTIAL} | {count} |
| A07 | Auth Failures | {PASS/FAIL/PARTIAL} | {count} |
| A08 | Integrity Failures | {PASS/FAIL/PARTIAL} | {count} |
| A09 | Logging Failures | {PASS/FAIL/PARTIAL} | {count} |
| A10 | SSRF | {PASS/FAIL/PARTIAL} | {count} |

## Detailed Findings
{Per-category findings with severity, evidence, and remediation}

## Remediation Priority
1. {Highest priority fix}
2. {Next priority}
...
```

## Tips

- A01 (Broken Access Control) is the most common vulnerability — spend the most time here
- A03 (Injection) is often mitigated by modern frameworks (ORMs, template engines) but verify the edge cases
- Security headers (A05) are quick wins — add them even if no other findings
- Check both happy path and error path — many vulnerabilities hide in error handling
- Test as different user roles: anonymous, regular user, admin, suspended user
- This checklist covers the most common issues but is not exhaustive — use `security-audit` for comprehensive coverage
