---
name: github-actions-security
description: "GitHub Actions security — secrets management, OIDC, permissions hardening, supply chain attacks, and secure CI/CD pipelines."
risk: low
source: custom
date_added: '2026-03-20'
---

# GitHub Actions Security

Expert guide to securing GitHub Actions workflows and CI/CD pipelines.

## Use this skill when

- Hardening GitHub Actions workflows against supply chain attacks
- Configuring OIDC for AWS/GCP/Azure authentication
- Managing secrets and permissions in workflows
- Auditing workflows for security vulnerabilities

## Do not use this skill when

- Building workflows from scratch (see github-actions-templates)
- Using GitLab CI, Jenkins, or other CI systems

## Instructions

1. Audit existing workflows for security issues.
2. Harden permissions, pin actions, and secure secrets.
3. Implement OIDC for cloud authentication.
4. Set up security scanning in CI.

---

## Permission Hardening

```yaml
# ALWAYS set restrictive top-level permissions
permissions:
  contents: read  # Minimum needed

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write  # Only for jobs that need it
    steps:
      - uses: actions/checkout@v4

  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for OIDC
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-deploy
          aws-region: us-east-1
```

## Pin Actions to SHA (Not Tags)

```yaml
# BAD: Tag can be moved to malicious commit
- uses: actions/checkout@v4

# GOOD: Pinned to specific commit SHA
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

# Use Dependabot or Renovate to keep SHA pins updated
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

## OIDC Authentication (No Long-Lived Credentials)

```yaml
# AWS OIDC — no AWS_ACCESS_KEY_ID needed
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy
          aws-region: us-east-1
          role-session-name: github-${{ github.run_id }}
```

```json
// AWS IAM Trust Policy for OIDC
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
      }
    }
  }]
}
```

## Secrets Management

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Environment-level secrets + approval
    steps:
      # Secrets are masked in logs automatically
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          # NEVER echo secrets
          # NEVER pass secrets as command arguments (visible in process list)
          # Use environment variables instead
          curl -H "Authorization: Bearer $API_KEY" https://api.example.com/deploy
```

### Secrets Best Practices

- Use **environment secrets** for deployment credentials (scoped to specific environment)
- Use **repository secrets** for build-time credentials
- Use **organization secrets** only for truly shared credentials
- Rotate secrets regularly
- Never log or print secret values
- Use OIDC instead of long-lived credentials when possible

## Supply Chain Protection

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Pin checkout to SHA
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
        with:
          persist-credentials: false  # Don't persist token

      # Verify dependencies
      - name: Verify lockfile integrity
        run: npm ci --ignore-scripts  # Don't run postinstall scripts

      # Scan for vulnerabilities
      - name: Audit dependencies
        run: npm audit --audit-level=high

      # SBOM generation
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
```

## Untrusted Input Protection

```yaml
# DANGEROUS: Injection via PR title
- run: echo "${{ github.event.pull_request.title }}"

# SAFE: Use environment variable (shell-escaped)
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "$PR_TITLE"

# DANGEROUS: Arbitrary code execution from fork PRs
on:
  pull_request_target:  # Runs with base repo permissions
    types: [opened]

# SAFE: Use pull_request (runs with fork permissions)
on:
  pull_request:
    types: [opened]
```

## Workflow Security Checklist

- [ ] Top-level `permissions` set to minimum required
- [ ] All third-party actions pinned to commit SHA
- [ ] OIDC used instead of long-lived cloud credentials
- [ ] `pull_request_target` avoided (or carefully scoped)
- [ ] User inputs passed via env vars, not string interpolation
- [ ] `persist-credentials: false` on checkout
- [ ] Dependabot configured for action updates
- [ ] Environment protection rules for production deployments
- [ ] Branch protection requires status checks
- [ ] CODEOWNERS file protects `.github/workflows/`

## Common Pitfalls

1. **Using `pull_request_target`** — Gives fork PRs access to secrets. Use `pull_request` instead.
2. **Tag-based action references** — Tags can be force-pushed. Pin to SHA.
3. **Overly broad permissions** — Default `GITHUB_TOKEN` has write access to many scopes. Restrict it.
4. **Secrets in fork PR workflows** — Fork PRs don't get secrets by default. This is intentional.
5. **String interpolation of user input** — `${{ github.event.issue.title }}` can inject commands.
6. **Long-lived AWS keys** — Use OIDC. If keys are unavoidable, rotate frequently.
