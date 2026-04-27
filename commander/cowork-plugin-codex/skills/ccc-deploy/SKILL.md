---
name: ccc-deploy
description: "CC Commander actual deployment workflow. Detects Vercel, Fly.io, Cloudflare, GitHub Pages, or npm deploy targets, asks for the deploy destination, runs the platform deploy, watches status, verifies health, and emits post-deploy comms."
model: sonnet
effort: high
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[platform: vercel | fly | cloudflare | github-pages | npm]"
---

# /ccc-deploy — Actual Deploy Workflow

**CC Commander** · /ccc-deploy · Detect target → deploy → verify → announce

Use this when the user is ready to push a build live. This is distinct from `/ccc-ship` and `/ccc-deploy-check`: `/ccc-ship` handles pre-flight and release tagging, `/ccc-deploy-check` is a readiness gate, and `/ccc-deploy` runs the real deploy.

## Response Shape

Always return these sections:

1. Brand header:

```markdown
**CC Commander** · /ccc-deploy · Actual deployment
```

2. Detection summary:

Read the repository root and report detected deploy targets from:

- `package.json` scripts: `deploy`, `deploy:prod`, `deploy:production`, `pages:deploy`, `wrangler:deploy`, `vercel:deploy`, `fly:deploy`, `publish`, `release`
- `fly.toml` → Fly.io
- `vercel.json` or a `vercel` package/script → Vercel
- `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` → Cloudflare
- `.github/workflows/deploy.yml`, `.github/workflows/deploy.yaml`, `.github/workflows/pages.yml`, or `.github/workflows/pages.yaml` → GitHub Pages or workflow deploy
- `package.json` `publishConfig`, `bin`, or `files` plus a `prepublishOnly` script → npm package publish candidate

Use parallel Bash reads where possible and keep failures non-fatal:

```bash
test -f package.json && node -e "const p=require('./package.json'); console.log(JSON.stringify({scripts:p.scripts||{}, publishConfig:p.publishConfig||null, bin:p.bin||null, files:p.files||null}, null, 2))"
test -f fly.toml && echo fly.toml
test -f vercel.json && echo vercel.json
test -f wrangler.toml && echo wrangler.toml
find .github/workflows -maxdepth 1 -type f \( -name 'deploy.yml' -o -name 'deploy.yaml' -o -name 'pages.yml' -o -name 'pages.yaml' \) 2>/dev/null
```

3. Platform picker — `AskUserQuestion`

Build the options from the detection summary, put detected targets first, and enable autocomplete for the user to override. If exactly one strong target is detected, mark that label with `⭐`. Never show more than four options in a single `AskUserQuestion`; use the second picker below for lower-confidence targets.

```yaml
question: "Where should I deploy?"
header: "CC Commander Deploy"
multiSelect: false
autocomplete: true
options:
  - label: "Vercel production"
    value: "vercel"
    description: "Detected from vercel.json or Vercel scripts. Runs vercel deploy --prod."
    preview: "Deploys the current branch to Vercel production and verifies the returned URL."
  - label: "Fly.io"
    value: "fly"
    description: "Detected from fly.toml. Runs fly deploy."
    preview: "Streams deploy logs, checks release status, then verifies the app URL."
  - label: "Cloudflare"
    value: "cloudflare"
    description: "Detected from wrangler config or Cloudflare deploy scripts."
    preview: "Runs wrangler or npm Cloudflare deploy command, then verifies the Worker or Pages URL."
  - label: "More deployment targets"
    value: "more-targets"
    description: "GitHub Pages, npm publish, or custom package deploy scripts."
    preview: "Opens one more picker with less common deploy targets."
```

If the user chooses "More deployment targets", ask:

```yaml
question: "Which deploy target?"
header: "CC Commander Deploy"
multiSelect: false
autocomplete: true
options:
  - label: "GitHub Pages"
    value: "github-pages"
    description: "Detected from GitHub Pages workflow files."
    preview: "Dispatches or watches the deploy workflow and verifies the Pages URL."
  - label: "npm publish"
    value: "npm"
    description: "Detected from package publish metadata."
    preview: "Publishes the package after package metadata and auth checks."
  - label: "Custom npm deploy script"
    value: "npm-script"
    description: "Detected from package.json deploy scripts."
    preview: "Runs the chosen npm deploy script and verifies the configured health URL."
  - label: "Back"
    value: "back"
    description: "Return to the primary deploy target picker."
    preview: "Choose Vercel, Fly.io, or Cloudflare instead."
```

If no target is detected, show the same picker without a star and include a short note: "No deploy target was obvious from the repo; pick the platform to use."

## Deployment Runners

Before any deploy command:

- Confirm the git branch with `git rev-parse --abbrev-ref HEAD`.
- Show dirty state from `git status --short`.
- If dirty state is non-empty, warn clearly and ask the user whether to continue before deploying.
- Prefer package manager scripts when they are explicit production deploy scripts. Otherwise use the platform command below.
- Never fabricate secrets. If a command needs credentials, state the missing credential and stop.

### Vercel

Use when selected or detected via `vercel.json`, Vercel scripts, or Vercel dependency.

Run:

```bash
vercel deploy --prod
```

Watch:

```bash
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

Verify health:

- Parse the deploy URL from command output.
- Fetch the deploy URL with `WebFetch`.
- If the repo defines `HEALTHCHECK_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, or `APP_URL` in safe local config examples, verify that URL too.
- PASS requires an HTTP success response and no obvious platform error page text.

### Fly.io

Use when selected or detected via `fly.toml`.

Run:

```bash
fly deploy
```

Watch:

```bash
fly status
fly releases --limit 3
fly logs --no-tail
```

Verify health:

- Derive the app name from `fly.toml` or `fly status`.
- Fetch `https://<app-name>.fly.dev` with `WebFetch` when no explicit health URL exists.
- If secrets are managed through 1Password, tell the user to rerun through `op run -- fly deploy` instead of printing secret values.

### Cloudflare

Use when selected or detected via `wrangler.toml`, `wrangler.json`, `wrangler.jsonc`, or Cloudflare scripts.

Prefer an explicit script if present:

```bash
npm run deploy
npm run deploy:prod
npm run wrangler:deploy
```

Otherwise run:

```bash
wrangler deploy
```

For Pages projects, run:

```bash
wrangler pages deploy <build-output-dir>
```

Watch:

```bash
wrangler deployments list
wrangler tail
```

Verify health:

- Fetch the Worker or Pages URL emitted by Wrangler with `WebFetch`.
- If the Cloudflare project is better served by the dedicated Cloudflare deployment workflow, hand off to `cloudflare-deploy` and preserve the selected target context.

### GitHub Pages

Use when selected or detected via `.github/workflows/deploy.yml`, `.github/workflows/deploy.yaml`, `.github/workflows/pages.yml`, or `.github/workflows/pages.yaml`.

Run:

```bash
gh workflow run deploy.yml
```

If the workflow file is named differently, use that exact filename. If the workflow is triggered by push only, push the already committed release branch and then watch it.

Watch:

```bash
gh run list --workflow <workflow-file> --limit 5
gh run watch <run-id>
gh run view <run-id> --log-failed
```

Verify health:

- Derive the Pages URL from repository metadata when possible.
- Otherwise ask for the URL and fetch it with `WebFetch`.

### npm Publish

Use when selected or detected from publish metadata. This is a release deploy, not a web deploy.

Run checks first:

```bash
npm whoami
npm pack --dry-run
npm publish --access public
```

Watch:

```bash
npm view <package-name> version
npm view <package-name> dist-tags --json
```

Verify:

- Confirm the published version matches `package.json`.
- Fetch the npm package page with `WebFetch` if the package is public.

### Custom npm Deploy Script

Use the exact script selected from `package.json`.

Run:

```bash
npm run <deploy-script>
```

Watch and verify using any URL printed by the script, `SITE_URL`, `APP_URL`, or a user-provided health URL.

## Post-Deploy Comms

After a verified deploy, emit a concise post-deploy message the user can send:

```markdown
Deploy complete: <project> to <platform>
- Version or commit: <sha-or-version>
- URL: <deploy-url>
- Health check: PASS at <timestamp>
- Rollback: /ccc-rollback
```

If Discord or Slack is configured through `/ccc-connect`, offer to post the comms there. Do not invent channel names; use configured connector context or ask the user.

## Failure Mode

When a deploy command, log watch, or health check fails:

1. Surface the exact failing command and the relevant error lines.
2. State whether the deploy likely failed before release, released but unhealthy, or could not be verified.
3. Preserve the deploy URL, run id, release id, and commit sha if available.
4. Suggest `/ccc-rollback` for released-but-bad deploys.
5. Do not keep retrying indefinitely. One retry is acceptable only for transient network or platform status errors.

## Anti-Patterns

- Do not run `/ccc-ship`; this skill is the actual deploy step.
- Do not skip health verification.
- Do not claim success from a zero exit code alone.
- Do not print secrets or `.env` values.
- Do not post Slack or Discord comms without user confirmation.
