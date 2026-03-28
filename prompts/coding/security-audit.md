---
name: security-audit
category: coding
skills: [harden, pentest-checklist, guard]
mode: plan
estimated_tokens: 700
---

# Security Audit

## When to Use
When you need to scan a codebase for security vulnerabilities before a release, after adding auth features, or as a periodic security review. This is a code-level audit, not infrastructure.

## Template

```
Perform a security audit of this codebase. Find vulnerabilities, not style issues. Every finding must include a concrete exploit scenario and fix.

**Scope:**
{{file_paths_or_glob_pattern_or_entire_project}}

**Stack:**
{{e.g., Next.js + Prisma + PostgreSQL, or Express + MongoDB}}

**Auth system:**
{{describe_auth — JWT, sessions, OAuth, API keys}}

**Check 1: Authentication & Authorization**
- Use Grep to find all route handlers / API endpoints
- Verify every endpoint checks authentication
- Verify authorization (role checks) on mutation endpoints
- Check for privilege escalation (can user A access user B's data?)
- Review token handling (storage, expiry, rotation, invalidation)

**Check 2: Injection**
- SQL injection: search for string concatenation in queries (not parameterized)
- XSS: search for `dangerouslySetInnerHTML`, unescaped user content in templates
- Command injection: search for `exec`, `spawn`, `eval` with user input
- Path traversal: search for file operations with user-controlled paths

**Check 3: Data Exposure**
- Use Grep to find all API response serialization — are sensitive fields filtered?
- Check error messages for stack traces, DB schemas, internal paths
- Search for hardcoded secrets: API keys, passwords, tokens in source code
- Check `.env.example` — does it accidentally contain real values?
- Verify `.gitignore` covers all secret files

**Check 4: Input Validation**
- Find all request body parsers — is input validated before use?
- Check file upload handling (size limits, type validation, storage location)
- Verify rate limiting on auth endpoints (login, register, password reset)
- Check for mass assignment (accepting arbitrary fields from request body)

**Check 5: Dependencies**
- Run `npm audit` or equivalent
- Check for known vulnerable package versions
- Review dependency count — minimize attack surface

**Check 6: Configuration**
- CORS configuration — is it overly permissive (`*`)?
- Cookie settings — HttpOnly, Secure, SameSite flags
- HTTPS enforcement
- Security headers (CSP, HSTS, X-Frame-Options)

**Output format:**
For each finding:
| Field | Value |
|---|---|
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **Category** | Auth / Injection / Exposure / Validation / Config |
| **Location** | file:line |
| **Exploit scenario** | How an attacker would use this |
| **Fix** | Specific code change |
```

## Tips
- Use the `harden` skill to auto-fix common security issues after the audit
- The `pentest-checklist` skill provides a structured penetration testing workflow
- Run this audit before every major release, not just once

## Example

```
Perform a security audit of this codebase. Find vulnerabilities, not style issues.

**Scope:** src/**/*.ts
**Stack:** Next.js 14 App Router + Prisma + PostgreSQL
**Auth system:** NextAuth.js with JWT strategy, Google OAuth + email/password
```
