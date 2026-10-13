# Security lanes — commands and checks

Reference for `/ccc-security`. Each lane lists its focus, the exact commands,
what to look for, and the fallback when a tool is missing. The full playbook
for a lane is `skills/ccc-security/<lane>/SKILL.md` in the Commander repository
(or under `skills/` in an installed CLI toolkit). Glob for
`**/skills/ccc-security/<lane>/SKILL.md` and Read it before running the lane;
if there is no match, use the section below alone.
Never print a secret value in any output; redact to the first four characters.

## Routing matrix

| User intent | Lane(s) |
|---|---|
| "Security audit", "review for vulnerabilities" | `/security-review`, then `security-audit` + `owasp-top-10` |
| "Prompt injection", "AI app security" | `prompt-injection-defense` |
| "Vulnerable dependencies", "npm audit" | `dependency-audit` |
| "Hardcoded secrets", "API key scan" | `secrets-scanner` |
| "OWASP", "Top 10 check" | `owasp-top-10` |
| "CodeQL", "automated security CI" | `codeql-integration` |
| "Find all variants of this bug" | `variant-analysis` |
| "Security incident", "we were breached" | `incident-response` |

## 1. security-audit — SAST, DAST, manual review

1. Scope: components, trust boundaries, data classes handled, deployment surface.
2. Threat model the attack surface before reading code (entry points, auth model, data stores, third parties). For a non-trivial system, delegate the threat model to the `security-auditor` agent at the `fable` tier.
3. Static pass:
   ```bash
   git ls-files | head -500
   ```
   Then Grep for injection sinks (`exec(`, `eval(`, raw SQL string building, `dangerouslySetInnerHTML`, `innerHTML =`), missing authorization middleware on routes, unsafe deserialization, and permissive CORS.
4. Dynamic pass (only against a target the user owns and names): headers, error verbosity, auth flows.
   ```bash
   curl -sI "$TARGET_URL" | grep -iE "strict-transport|content-security|x-frame|x-content-type"
   ```
5. Classify each finding Critical / High / Medium / Low with impact and reproduction.

## 2. owasp-top-10 — application checklist

Walk each category and record pass, fail or not applicable with evidence (`path:line` or command output):

| Category | Check |
|---|---|
| A01 Broken Access Control | every route enforces authorization server-side; no IDOR on object ids |
| A02 Cryptographic Failures | TLS everywhere; no MD5/SHA1 for passwords; secrets not in source |
| A03 Injection | parameterized queries; no shell/template injection |
| A04 Insecure Design | rate limits, abuse controls, business-logic limits |
| A05 Security Misconfiguration | security headers present; no stack traces to users; no default credentials |
| A06 Vulnerable Components | run the `dependency-audit` lane |
| A07 Identification and Authentication Failures | session expiry, MFA option, credential-stuffing protection |
| A08 Software and Data Integrity Failures | signed artifacts, pinned CI actions, no unsafe deserialization |
| A09 Logging and Monitoring Failures | auth and admin events logged, no secrets in logs |
| A10 SSRF | outbound fetches of user-supplied URLs are allow-listed |

For AI-powered apps, also walk the OWASP Top 10 for LLM Applications (prompt injection, insecure output handling, excessive agency, sensitive data disclosure, supply chain of models and tools).

## 3. secrets-scanner — hardcoded credentials

```bash
gitleaks detect --source . --redact --verbose
```

Fallback when gitleaks is absent (history search, values not printed):

```bash
git log --all -S "AKIA" --oneline -- . ":(exclude)node_modules"
git log --all -S "sk_live_" --oneline -- . ":(exclude)node_modules"
```

Optional second scanner: `detect-secrets scan` (install only with the user's approval). Report file, line, secret type and whether it is in history; never the value. A secret found in history is compromised: recommend rotation first, history rewrite second, and ask before either.

## 4. dependency-audit — known vulnerabilities and licenses

Run the audits that match the lockfiles present. Write output to a temp
directory, never into the user's repository:

```bash
AUDIT_DIR="$(mktemp -d)"
npm audit --json > "$AUDIT_DIR/npm-audit.json"           # package-lock.json
pip-audit --format json > "$AUDIT_DIR/pip-audit.json"    # requirements*.txt / pyproject.toml
cargo audit --json > "$AUDIT_DIR/cargo-audit.json"       # Cargo.lock
gh api repos/{owner}/{repo}/dependabot/alerts --paginate # GitHub-hosted repos
git status --short   # confirm the audit left the working tree unchanged
```

Optional: `snyk test --json` when the user already has Snyk configured. License check:

```bash
npx license-checker --summary
npx license-checker --failOn "GPL-3.0;AGPL-3.0"
```

Group results by severity, mark which have a fixed version, and separate direct from transitive dependencies. Do not run `npm audit fix --force` without approval; it can apply breaking major upgrades.

## 5. prompt-injection-defense — AI app surfaces

1. Map every place untrusted text reaches a model: user input, retrieved documents, tool results, web pages, file uploads, emails.
2. Classify risk by what the model can do with tools (read-only, writes, external actions, payments).
3. Check the defense layers:
   - Input: length limits, structure, no instruction-like content passed as system text.
   - Prompt architecture: untrusted content delimited and labeled as data; system instructions separate.
   - Output: validate model output against a schema before acting; never execute or render it unsanitized.
   - Privilege separation: least-privilege tools; human approval for state-changing actions.
4. Monitoring: log tool calls and refusals; alert on anomalous tool use.
5. Write test cases: direct injection, indirect injection via retrieved content, data exfiltration via links or images, tool-abuse attempts.

## 6. codeql-integration — automated scanning in CI

1. Confirm language support (JavaScript/TypeScript, Python, Java, C/C++, C#, Go, Ruby, Swift, Kotlin) and GitHub hosting.
2. Write `.github/workflows/codeql.yml` (on push and pull_request to the default branch, plus a weekly schedule) using `github/codeql-action` `init`, `autobuild`, `analyze`. Pin action versions.
3. Choose the query suite: `default` first; `security-extended` once the baseline is triaged.
4. Add custom queries under `.github/codeql/` only for project-specific patterns.
5. Validate the file before handing off:
   ```bash
   if command -v actionlint >/dev/null; then
     actionlint .github/workflows/codeql.yml
   else  # syntax-only fallback; record "actionlint absent" (and "ruby absent" if this also fails to run)
     ruby -ryaml -e 'YAML.load_file(ARGV[0])' .github/workflows/codeql.yml
   fi
   git diff --stat .github/workflows/codeql.yml
   ```
   Fix any reported error before continuing. After the user authorizes and pushes the change, confirm GitHub registered it with `gh workflow view codeql.yml`.
6. Expect many first-run findings; triage by severity and dismiss false positives with a reason.

## 7. variant-analysis — find siblings of a known bug

1. Write down the root cause of the known bug as a pattern (source, sink, missing guard).
2. Search by code pattern, for example:
   ```bash
   grep -rn "db\.query.*+" --include="*.ts" --include="*.js"
   grep -rn 'db\.query.*`' --include="*.ts" --include="*.js"
   ```
3. Search by vulnerability class: if it was an auth bypass, check every endpoint's authorization; if XSS, every place user content renders.
4. Confirm each candidate by reading the code path; a grep hit is a lead, not a finding.
5. Report confirmed variants, rejected candidates with the reason, and a regression test or CodeQL query that would catch the class.

## 8. incident-response — active security event

1. Detect and triage: confirm it is real; classify severity; identify who owns the response.
2. Preserve evidence before changing anything: logs, timestamps, affected commits, access records.
3. Contain: propose containment actions (revoke tokens, disable accounts, block IPs, take a service offline). Each is an external state change; ask before every one.
4. Investigate scope: entry point, accessed data, duration, affected users, lateral movement.
5. Build a timeline of events with sources.
6. Eradicate and verify: patch the root cause, rotate every exposed credential, confirm the indicator no longer reproduces.
7. Recover and review: restore service, decide notifications (legal and regulatory obligations are the user's call), write the post-incident review.

Incident report shape: Summary, Timeline, Affected Systems, Root Cause, Remediation Actions, Data Impact, Lessons Learned.
