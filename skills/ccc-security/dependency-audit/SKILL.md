---
name: dependency-audit
description: "Audit npm, pip, cargo, and other package dependencies for known vulnerabilities, license compliance, and supply chain risks."
version: 1.0.0
category: security
parent: ccc-security
tags: [ccc-security, dependencies, supply-chain, vulnerabilities]
disable-model-invocation: true
---

# Dependency Audit

## What This Does

Audits application dependencies for known vulnerabilities (CVEs), license compliance issues, and supply chain risks. Covers npm, pip, cargo, and other package managers. Produces a prioritized remediation plan and recommends ongoing monitoring setup.

## Instructions

1. **Identify all dependency sources.** Check for:
   - `package.json` / `package-lock.json` (npm/Node.js)
   - `requirements.txt` / `Pipfile` / `pyproject.toml` (Python)
   - `Cargo.toml` / `Cargo.lock` (Rust)
   - `go.mod` / `go.sum` (Go)
   - `Gemfile` / `Gemfile.lock` (Ruby)
   - `pom.xml` / `build.gradle` (Java/Kotlin)
   - Docker base images
   - CDN-loaded scripts (often missed)

2. **Run automated vulnerability scans.**
   ```bash
   # npm
   npm audit
   npm audit --json > audit-report.json

   # pip
   pip-audit
   pip-audit --format json > audit-report.json

   # cargo
   cargo audit

   # Snyk (cross-platform)
   snyk test --json > snyk-report.json

   # GitHub (if repo is on GitHub)
   gh api repos/{owner}/{repo}/vulnerability-alerts
   ```

3. **Analyze the vulnerability report.** For each finding:
   - **CVE ID and severity** (CVSS score)
   - **Affected package and version range**
   - **Fix available?** If yes, what version?
   - **Is the vulnerable code path actually used?** (reachability analysis)
   - **Transitive or direct dependency?** Direct dependencies are easier to update

4. **Check for supply chain risks.** Beyond known CVEs:
   - **Maintainer count:** Single-maintainer packages are higher risk
   - **Last published:** Packages not updated in 2+ years may be abandoned
   - **Download count:** Very low downloads may indicate an untested package
   - **Typosquatting:** Check for similarly-named packages that might be malicious
   - **Install scripts:** Check for suspicious `postinstall` scripts
   - **Dependency count:** Packages with many transitive dependencies expand attack surface

5. **Check license compliance.** For each dependency:
   - Identify the license (MIT, Apache-2.0, GPL, etc.)
   - Flag copyleft licenses (GPL, AGPL) if the project is proprietary
   - Flag licenses with patent clauses if relevant
   - Check for "license: UNLICENSED" or missing license fields

   ```bash
   # npm license checker
   npx license-checker --summary
   npx license-checker --failOn "GPL-3.0;AGPL-3.0"
   ```

6. **Create the remediation plan.** Prioritize by:
   1. CRITICAL/HIGH CVEs with known exploits — fix immediately
   2. CRITICAL/HIGH CVEs without known exploits — fix this sprint
   3. MEDIUM CVEs — schedule for next cycle
   4. License violations — assess and address
   5. Supply chain risks — evaluate and mitigate

7. **Set up ongoing monitoring.**
   - Enable Dependabot or Renovate for automated PRs
   - Add `npm audit` / `pip-audit` to CI pipeline
   - Configure Snyk or Socket.dev for continuous monitoring
   - Set up alerts for new CVEs in your dependency tree

## Output Format

```markdown
# Dependency Audit Report: {Project}
**Date:** {YYYY-MM-DD}
**Package manager:** {npm/pip/cargo/etc.}
**Total dependencies:** {count direct} direct, {count transitive} transitive

## Vulnerability Summary
| Severity | Count | Fixable |
|----------|-------|---------|
| Critical | {n} | {n} |
| High | {n} | {n} |
| Medium | {n} | {n} |
| Low | {n} | {n} |

## Critical Findings

### CVE-{id}: {package}@{version}
- **Severity:** {CVSS score}
- **Description:** {what the vulnerability allows}
- **Fix:** Update to {package}@{fixed-version}
- **Reachable:** {Yes/No — is the vulnerable code path used?}
- **Command:** `npm install {package}@{fixed-version}`

## Supply Chain Risks
| Package | Risk | Details |
|---------|------|---------|
| {package} | {risk type} | {description} |

## License Summary
| License | Count | Compliance |
|---------|-------|------------|
| MIT | {n} | OK |
| Apache-2.0 | {n} | OK |
| GPL-3.0 | {n} | REVIEW |

## Remediation Plan
1. [ ] {Highest priority fix}
2. [ ] {Next priority fix}
...

## Monitoring Setup
{Recommended tools and CI configuration}
```

## Tips

- `npm audit` often reports vulnerabilities in dev dependencies — prioritize production dependencies first
- A vulnerability in a transitive dependency may not be exploitable if the parent doesn't use the affected API
- Dependabot PRs can pile up — batch minor/patch updates with Renovate's grouping feature
- Socket.dev specifically detects supply chain attacks (install scripts, network calls, etc.) — use it for npm
- Lock files (package-lock.json, Cargo.lock) are critical for reproducible builds — always commit them
- Check base Docker images too — they often contain more vulnerabilities than your application code
