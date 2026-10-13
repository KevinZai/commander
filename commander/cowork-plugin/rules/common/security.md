# Security

Review the security properties the change actually touches. A prose edit does not trigger a full application audit.

## Checks at relevant boundaries

- [ ] No hardcoded secrets (API keys, passwords, tokens) in code, config, logs, prompts, or argv.
- [ ] Untrusted input validated at the boundary.
- [ ] Queries parameterized.
- [ ] HTML output escaped or sanitized.
- [ ] Browser sessions protected against request forgery where it applies.
- [ ] Authentication and authorization enforced on every protected path.
- [ ] Abuse controls (rate limits) on exposed endpoints that need them.
- [ ] Error messages leak no internals or sensitive data.

## Secrets

- Use environment variables, a secret manager, or the platform's keychain; never print a secret to check it exists.
- Validate required secrets at startup without echoing their values.
- Treat a secret that reached a log, commit, or transcript as exposed.

## When you find a vulnerability

1. Establish scope and severity with evidence (`rules/common/reasoning-hygiene.md`).
2. Contain further exposure within your authorization.
3. Fix the authorized issue; hand larger or riskier work to `security-auditor` or `/ccc-security`.
4. Search adjacent paths where the same cause plausibly applies.
5. Credential rotation, production changes, and notifications need explicit authorization; prepare them and ask.
