---
name: security-audit
category: coding
skills: [security-audit, pentest-checklist, guard]
mode: plan
estimated_tokens: 700
---

# Security Audit

## When to Use
Use for a code-level vulnerability review: before a release, after adding authentication features, or as a periodic check. It does not cover infrastructure; use `/ccc-harden` for production hardening.

## Template

```
Audit this codebase for security vulnerabilities. Report vulnerabilities, not style issues. Every finding needs a concrete exploit scenario and a fix. Do not edit files during the audit.

**Scope:**
{{file_paths_or_glob_pattern_or_entire_project}}

**Stack:**
{{e.g., Next.js + Prisma + PostgreSQL, or Express + MongoDB}}

**Auth system:**
{{describe_auth — JWT, sessions, OAuth, API keys}}

Check 1: Authentication and authorization.
- Use Grep to find every route handler and API endpoint.
- Confirm every endpoint checks authentication.
- Confirm mutation endpoints check authorization (roles or ownership).
- Look for privilege escalation: can user A read or change user B's data?
- Review token handling: storage, expiry, rotation, invalidation.

Check 2: Injection.
- SQL injection: string concatenation in queries instead of parameters.
- XSS: `dangerouslySetInnerHTML` and unescaped user content in templates.
- Command injection: `exec`, `spawn`, or `eval` reached by user input.
- Path traversal: file operations on user-controlled paths.

Check 3: Data exposure.
- Use Grep to find API response serialization; confirm sensitive fields are filtered.
- Check error responses for stack traces, database schemas, and internal paths.
- Search source for hardcoded secrets: API keys, passwords, tokens. Report the file and line only; do not print the secret value.
- Check that `.env.example` contains placeholders, not real values.
- Confirm `.gitignore` covers every secret-bearing file.

Check 4: Input validation.
- Find every request body parser; confirm input is validated before use.
- Check file uploads: size limits, type validation, storage location.
- Confirm rate limiting on login, registration, and password reset.
- Check for mass assignment (accepting arbitrary fields from the request body).

Check 5: Dependencies.
- Run `npm audit` or the project's equivalent and report the actual output.
- Flag known vulnerable package versions.
- Note dependencies that could be removed to reduce attack surface.

Check 6: Configuration.
- CORS: flag overly permissive origins such as `*` on credentialed routes.
- Cookies: HttpOnly, Secure, SameSite.
- HTTPS enforcement.
- Security headers: CSP, HSTS, X-Frame-Options.

Before reporting a CRITICAL or HIGH finding, trace the input from its entry point to the vulnerable line and confirm no existing guard blocks it.

Output format, one block per finding:
| Field | Value |
|---|---|
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **Category** | Auth / Injection / Exposure / Validation / Config |
| **Location** | file:line |
| **Exploit scenario** | How an attacker would use this |
| **Fix** | Specific code change |
```

## Tips
- The built-in `/security-review` and `/ccc-security` cover OWASP, secrets, dependency CVEs, and prompt-injection lanes.
- The `pentest-checklist` skill provides a structured penetration-testing workflow.
- For load-bearing findings, have a fresh-context subagent (Agent tool) try to refute each one; a `fable`-tier verifier suits threat modeling, otherwise the session's selected model is kept.
- Run the audit before every major release, not once.

## Example

```
Audit this codebase for security vulnerabilities. Report vulnerabilities, not style issues.

**Scope:** src/**/*.ts
**Stack:** Next.js App Router + Prisma + PostgreSQL
**Auth system:** NextAuth.js with JWT strategy, Google OAuth + email/password
```
