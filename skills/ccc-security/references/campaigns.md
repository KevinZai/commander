# ccc-security campaigns

Multi-step sequences. Run one sub-skill at a time and record findings as `path:line` + severity + fix before moving on. Sub-skill files live beside the router at `../<sub-skill>/SKILL.md`.

## Pre-launch security review

1. `secrets-scanner` — find hardcoded credentials and plan their removal.
2. `dependency-audit` — check every dependency for known CVEs.
3. `owasp-top-10` — verify against the OWASP Top 10 checklist.
4. `security-audit` — manual review of authentication, authorization and input validation.
5. `codeql-integration` — automated scanning for ongoing protection.

Deliverable: a findings report with each item fixed or accepted, and CI scanning active.

## AI application security

1. `prompt-injection-defense` — harden every LLM-facing input and output.
2. `secrets-scanner` — confirm AI-service API keys are not exposed.
3. `security-audit` — review data flow between user input, the model and the actions it can take.
4. `owasp-top-10` — standard web security around the AI features.

Deliverable: injection defenses in place and API keys held in a secret store.

## Incident response

1. `incident-response` — run the playbook and contain the threat.
2. `secrets-scanner` — identify every potentially compromised credential.
3. `variant-analysis` — find related vulnerabilities the attacker may have used.
4. `security-audit` — post-incident audit to prevent recurrence.
5. `codeql-integration` — detection rules for the vulnerability class.

Deliverable: incident contained, credentials rotated by their owners, codebase hardened, CI rules added.

## Continuous security pipeline

1. `codeql-integration` — CodeQL in GitHub Actions.
2. `dependency-audit` — automated dependency scanning (Dependabot, Snyk or equivalent).
3. `secrets-scanner` — pre-commit secret detection.
4. `owasp-top-10` — a security test suite in CI.

Deliverable: a pipeline that catches these classes of issue before they reach production.
