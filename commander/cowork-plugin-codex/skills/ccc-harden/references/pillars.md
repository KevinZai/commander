# /ccc-harden native pillar checks

Used when the `harden-site` engine is not installed. Every command is read-only. Set `D` to the production domain first (`D=example.com`) and run only the pillars enabled in `.harden.json`. Grade each check pass / warn / fail / skip; a missing CLI or credential is skip with the reason. Fixes in this mode are manual actions in the report.

Never print secret values: use file-name-only searches (`rg -l`) and `gitleaks --redact`.

## 1. Vercel

```bash
test -f .vercel/project.json && echo "linked" || echo "not linked (warn)"
vercel env ls 2>/dev/null | head -n 30          # names only; never `vercel env pull` here
curl -sI "https://$D" | grep -iE '^(strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy):'
```
Fail: production domain missing HSTS or CSP. Warn: preview deployments without deploy protection (check the project settings page or a connected Vercel connector).

## 2. GitHub linkage

```bash
git remote -v | head -n 2
git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo "no upstream (warn)"
git status --porcelain | head -n 20
for f in .env .env.local .env.production; do git check-ignore -q "$f" && echo "$f ignored" || echo "$f NOT ignored (fail if the file exists)"; done
```

## 3. GitHub org

```bash
gh api "repos/{owner}/{repo}/branches/$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)/protection" >/dev/null 2>&1 && echo "branch protection on" || echo "no branch protection (fail for production)"
gh api "repos/{owner}/{repo}" --jq '.security_and_analysis'
ls .github/dependabot.yml .github/CODEOWNERS CODEOWNERS docs/CODEOWNERS 2>/dev/null
```

## 4. Sentry

```bash
rg -l '"@sentry/' package.json 2>/dev/null || echo "no Sentry SDK"
rg -n 'SENTRY_DSN|NEXT_PUBLIC_SENTRY_DSN' .env.example .env.sample 2>/dev/null
rg -n 'tracesSampleRate|sourcemaps|withSentryConfig' --glob '!node_modules' . | head -n 10
```
Warn: `tracesSampleRate: 1.0` in production; no source-map upload in the build.

## 5. PostHog

```bash
rg -l '"posthog-(js|node)"' package.json 2>/dev/null || echo "no PostHog SDK"
rg -n 'autocapture|mask_all_text|maskAllInputs|person_profiles' --glob '!node_modules' . | head -n 10
```
Warn: autocapture on without input masking.

## 6. Plausible

```bash
rg -n 'plausible\.io/js|data-domain=' --glob '!node_modules' . | head -n 5
```

## 7. Clarity

```bash
rg -n 'clarity\.ms' --glob '!node_modules' . | head -n 5
```

## 8. Google

```bash
rg -n 'googletagmanager\.com|gtag\(' --glob '!node_modules' . | head -n 5
curl -s -o /dev/null -w 'sitemap %{http_code}\n' "https://$D/sitemap.xml"
curl -s -o /dev/null -w 'robots %{http_code}\n' "https://$D/robots.txt"
```
Search Console verification is checked in the Search Console UI; report it as a manual action.

## 9. Stripe

```bash
rg -l 'sk_live_[0-9A-Za-z]' --glob '!node_modules' . && echo "LIVE KEY IN REPO (critical)" || echo "no live key in tracked files"
rg -n 'STRIPE_(SECRET_KEY|WEBHOOK_SECRET|PUBLISHABLE_KEY)' .env.example .env.sample 2>/dev/null
rg -n 'constructEvent|webhooks\.construct' --glob '!node_modules' . | head -n 5
```
Fail: webhook handler without signature verification (`constructEvent`).

## 10. Secrets & PII

```bash
command -v gitleaks >/dev/null && gitleaks detect --no-banner --redact --exit-code 1 || echo "gitleaks absent (skip; install needs approval)"
git ls-files | rg '(^|/)\.env($|\.)' | rg -v '\.example$|\.sample$'
curl -sI "https://$D" | grep -icE '^(strict-transport-security|content-security-policy|x-frame-options|x-content-type-options):'
rg -n 'console\.(log|info)\(.*(email|password|token|ssn|card)' --glob '!node_modules' . | head -n 10
```
Critical: a tracked `.env` file or any gitleaks finding. Fail: fewer than 4 security headers.

## 11. Cloudflare

```bash
dig +short NS "$D"
curl -sI "https://$D" | grep -iE '^(server|cf-ray|cf-cache-status|alt-svc):'
echo | openssl s_client -connect "$D:443" -servername "$D" 2>/dev/null | openssl x509 -noout -issuer -enddate
```
Warn: no `h3` in `alt-svc` (HTTP/3 off), certificate expiring within 14 days. Bot management, WAF and cache rules are checked in the dashboard or a connected Cloudflare connector; report them as manual actions.
