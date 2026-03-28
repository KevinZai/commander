---
name: secrets-scanner
description: "Scan codebases for hardcoded secrets, API keys, tokens, passwords, and credentials with remediation guidance."
version: 1.0.0
category: security
parent: mega-security
tags: [mega-security, secrets, credentials, scanning]
disable-model-invocation: true
---

# Secrets Scanner

## What This Does

Scans codebases for hardcoded secrets — API keys, passwords, tokens, private keys, database connection strings, and other credentials that should never be committed to source code. Identifies exposed secrets, assesses the risk, and provides remediation steps including rotation procedures.

## Instructions

1. **Scan the codebase.** Check systematically for:

   **High-confidence patterns:**
   - AWS access keys: `AKIA[A-Z0-9]{16}`
   - AWS secret keys: 40-character base64 strings near AWS context
   - GitHub tokens: `ghp_[a-zA-Z0-9]{36}`, `gho_`, `ghs_`, `ghu_`
   - Slack tokens: `xoxb-`, `xoxp-`, `xoxs-`
   - Stripe keys: `sk_live_`, `sk_test_`, `pk_live_`
   - Private keys: `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`
   - JWT secrets: long random strings assigned to JWT_SECRET or similar
   - Database URLs: `postgres://`, `mysql://`, `mongodb://` with credentials
   - Generic API keys: variables named `*_API_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`

   **Medium-confidence patterns:**
   - Base64-encoded strings > 20 characters in config files
   - Hex strings > 32 characters in non-hash contexts
   - URLs with embedded credentials (user:pass@host)

2. **Check specific file types and locations:**
   ```
   Priority files:
   - .env, .env.*, *.env (environment files)
   - config.*, settings.*, *.config.* (configuration files)
   - docker-compose.yml (often contains credentials)
   - CI/CD configs (.github/workflows/, .gitlab-ci.yml, Jenkinsfile)
   - Infrastructure as Code (terraform.tfvars, *.tf)
   - Test fixtures and seed data
   - README and documentation (example credentials that are real)
   ```

3. **Check git history.** Secrets removed from the current code may still be in commits:
   ```bash
   # Search git history for secrets (use with caution on large repos)
   git log -p --all -S "AKIA" -- . ":(exclude)node_modules"
   git log -p --all -S "sk_live_" -- . ":(exclude)node_modules"
   ```

4. **Verify findings.** For each potential secret:
   - Is it a real credential or a placeholder/example? (check for `example`, `placeholder`, `xxx`, `changeme`)
   - Is the file in `.gitignore`? (still a risk if it was committed before)
   - Is it a test credential? (lower severity but still flag it)
   - Is it already in a secrets manager? (may be a copy that shouldn't be here)

5. **Assess the impact.** For confirmed secrets:
   - What does this credential access? (database, payment system, cloud provider)
   - Is the repository public or private?
   - Has this been in git history? For how long?
   - Who has access to this repository?

6. **Remediate.** For each confirmed secret:
   - **Rotate immediately:** Generate a new credential and update the service
   - **Remove from code:** Replace with environment variable reference
   - **Clean git history:** If the repo is public, use `git filter-repo` or BFG Repo-Cleaner
   - **Add to .gitignore:** Prevent future commits of secret files
   - **Set up pre-commit hooks:** Prevent future secrets from being committed

7. **Set up prevention.**
   ```bash
   # Install gitleaks as a pre-commit hook
   brew install gitleaks
   gitleaks detect --source . --verbose

   # Or use detect-secrets (Python)
   pip install detect-secrets
   detect-secrets scan > .secrets.baseline
   ```

## Output Format

```markdown
# Secrets Scan Report: {Repository}
**Date:** {YYYY-MM-DD}
**Files scanned:** {count}
**Secrets found:** {count}

## Critical Findings (Confirmed Secrets)

### {Secret Type}: {file path}:{line}
- **Type:** {API key / password / token / private key}
- **Service:** {what it accesses}
- **Risk:** {CRITICAL / HIGH}
- **In git history:** {Yes/No — how many commits}
- **Remediation:**
  1. Rotate: {specific rotation steps for this service}
  2. Remove: Replace with `process.env.{VAR_NAME}`
  3. Add to `.env.example` with placeholder value

## Medium Confidence Findings
| File | Line | Pattern | Likely Type | Action |
|------|------|---------|-------------|--------|
| {file} | {line} | {matched pattern} | {type} | {verify/dismiss} |

## Prevention Setup
- [ ] `.gitignore` updated to exclude secret files
- [ ] Pre-commit hook installed (gitleaks/detect-secrets)
- [ ] CI pipeline includes secret scanning
- [ ] `.env.example` created with placeholder values
- [ ] Secrets migrated to {secrets manager}

## Rotation Checklist
- [ ] {Service 1}: Key rotated, old key revoked
- [ ] {Service 2}: Key rotated, old key revoked
```

## Tips

- A secret in git history is as exposed as a secret in the current code — always check history
- `.env` files should NEVER be committed, even to private repos — team members change, repos get transferred
- The most commonly leaked secrets: AWS keys, GitHub tokens, and database passwords
- If a secret was committed to a public repo, assume it has been scraped — rotate immediately
- Use 1Password, AWS Secrets Manager, or HashiCorp Vault for production secrets management
- `.env.example` with placeholder values is the correct way to document required environment variables
- Pre-commit hooks are the best prevention — catch secrets before they enter git history
