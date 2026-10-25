---
name: ccc-deploy
description: "Deploy the current build to Vercel, Fly.io, Cloudflare, GitHub Pages, npm, or a package deploy script, verify the live URL, and draft post-deploy notes. Use when a build is ready to go live or the user says deploy, push to production, or publish the package."
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[platform: vercel | fly | cloudflare | github-pages | npm]"
disable-model-invocation: true
---

# $ccc-deploy — Deploy and verify live

**CC Commander** · $ccc-deploy · detect target → deploy → verify health → draft comms

## When to use / when not to

- Use when the user is ready to push a build live.
- Use `$ccc-deploy-check` for a readiness gate before deploying, `$ccc-ship release` to bump the version and tag, and `$ccc-rollback` to undo a bad deploy.
- In Codex, ask each picker below as a plain-text question with the same options.

## What happens

### 1. Detect deploy targets

Read the repository root. A target is detected by:

- `package.json` scripts: `deploy`, `deploy:prod`, `deploy:production`, `pages:deploy`, `wrangler:deploy`, `vercel:deploy`, `fly:deploy`, `publish`, `release`
- `fly.toml` → Fly.io
- `vercel.json`, a `vercel` script or dependency → Vercel
- `wrangler.toml`, `wrangler.json` or `wrangler.jsonc` → Cloudflare
- `.github/workflows/deploy.yml`, `.github/workflows/deploy.yaml`, `.github/workflows/pages.yml` or `.github/workflows/pages.yaml` → GitHub Pages or a workflow deploy
- `package.json` `publishConfig`, `bin` or `files` plus a `prepublishOnly` script → npm publish candidate

Run the reads in one Bash call; a missing file is not an error:

```bash
test -f package.json && node -e "const p=require('./package.json'); console.log(JSON.stringify({name:p.name, version:p.version, scripts:p.scripts||{}, publishConfig:p.publishConfig||null, bin:p.bin||null, files:p.files||null}, null, 2))"
for f in fly.toml vercel.json wrangler.toml wrangler.json wrangler.jsonc; do test -f "$f" && echo "$f"; done
find .github/workflows -maxdepth 1 -type f \( -name 'deploy.yml' -o -name 'deploy.yaml' -o -name 'pages.yml' -o -name 'pages.yaml' \) 2>/dev/null
```

Report the detected targets in one line. If `$ARGUMENTS` names a platform, skip step 2 and use it.

### 2. Platform picker — `AskUserQuestion`

Build the options from step 1. Each picker below has exactly one 🟢 option, listed first: the strongest detected target in that picker. In the first picker, if the only detected targets are in the second picker, "More deployment targets" is the 🟢 option. Show at most four options; less common targets go in the second picker. The examples assume Vercel and GitHub Pages were detected.

```yaml
question: "Where should I deploy?"
header: "Deploy"
multiSelect: false
options:
  - label: "🟢 Vercel production"
    description: "Detected from vercel.json or Vercel scripts. Runs vercel deploy --prod."
    preview: "Deploys the current branch to Vercel production and verifies the returned URL."
  - label: "Fly.io"
    description: "Detected from fly.toml. Runs fly deploy."
    preview: "Streams deploy logs, checks release status, then verifies the app URL."
  - label: "Cloudflare"
    description: "Detected from wrangler config or Cloudflare deploy scripts."
    preview: "Runs the wrangler or npm Cloudflare deploy command, then verifies the Worker or Pages URL."
  - label: "More deployment targets"
    description: "GitHub Pages, npm publish, or a custom package deploy script."
    preview: "Opens one more picker with less common deploy targets."
```

On "More deployment targets", show the second picker. Mark its strongest detected target 🟢 and list it first; if none of its targets was detected, mark the first target option 🟢. "Back" is never the 🟢 option.

```yaml
question: "Which deploy target?"
header: "Deploy"
multiSelect: false
options:
  - label: "🟢 GitHub Pages"
    description: "Detected from GitHub Pages workflow files."
    preview: "Dispatches or watches the deploy workflow and verifies the Pages URL."
  - label: "npm publish"
    description: "Detected from package publish metadata."
    preview: "Publishes the package after auth and pack checks."
  - label: "Custom npm deploy script"
    description: "Detected from package.json deploy scripts."
    preview: "Runs the chosen npm deploy script and verifies the configured health URL."
  - label: "Back"
    description: "Return to the primary deploy target picker."
    preview: "Choose Vercel, Fly.io, or Cloudflare instead."
```

If nothing was detected, still mark one option 🟢: the first option of the first picker ("Vercel production"). Say: "No deploy target was obvious from the repo; 🟢 is a default, not a detection. Pick the platform to use."

### 3. Pre-deploy gate

```bash
git rev-parse --abbrev-ref HEAD
git status --short
git log --oneline -1
```

- If `git status --short` is non-empty, ask with AskUserQuestion: "🟢 Stop — commit or stash first" (nothing is deployed) or "Deploy with uncommitted changes" (the live build will not match any commit).
- If the platform came from `$ARGUMENTS` (no picker was shown), confirm once: "🟢 Deploy `<branch>` to `<platform>` now" or "Cancel". A pick in step 2 is the authorization; do not ask twice.
- Never fabricate a secret. If the deploy needs a credential that is missing, name it and stop.

### 4. Run the platform runner

Open [references/platform-runners.md](references/platform-runners.md) and run the section for the chosen platform: its run command, then its watch commands.

| Target | Run | Watch |
|---|---|---|
| Vercel | `vercel deploy --prod` | `vercel inspect <url>`, `vercel logs <url>` |
| Fly.io | `fly deploy` | `fly status`, `fly releases --limit 3`, `fly logs --no-tail` |
| Cloudflare | `npm run deploy` if present, else `wrangler deploy` or `wrangler pages deploy <dir>` | `wrangler deployments list`, `wrangler tail` |
| GitHub Pages | `gh workflow run <workflow-file>` | `gh run list --workflow <workflow-file> --limit 5`, `gh run watch <run-id>` |
| npm publish | `npm whoami`, `npm pack --dry-run`, then `npm publish --access public` | `npm view <package-name> version` |
| Custom script | `npm run <deploy-script>` | the script's own output |

Capture the deploy URL, run id, release id and commit sha from the output.

### 5. Verify health

A zero exit code is not a successful deploy. Verify:

1. Fetch the deploy URL with WebFetch, plus any health URL named in safe example config (`HEALTHCHECK_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`).
2. PASS requires an HTTP success response and no platform error page text ("404: NOT_FOUND", "Application error", "Worker threw exception").
3. For npm, PASS requires `npm view <package-name> version` to equal `package.json` `version`.
4. Report one line: `Health: PASS|FAIL · <url> · <status> · <timestamp>`.

### 6. Draft post-deploy comms

After a PASS, print a message the user can send:

```markdown
Deploy complete: <project> to <platform>
- Version or commit: <sha-or-version>
- URL: <deploy-url>
- Health check: PASS at <timestamp>
- Rollback: $ccc-rollback
```

If a Slack or Discord connector is configured through `$ccc-connect`, ask with AskUserQuestion: "🟢 Keep it here" or "Post to <configured channel>". Use only a channel from configured connector context; never invent one.

After the comms, you may show one short list from [references/partner-services.md](references/partner-services.md) for the deployed platform, with its disclosure link.

## Failure mode

When the deploy, a watch command or the health check fails:

1. Show the exact failing command and the relevant error lines.
2. Say which case it is: failed before release, released but unhealthy, or could not be verified.
3. Keep the deploy URL, run id, release id and commit sha.
4. For released-but-unhealthy, offer `$ccc-rollback` (git revert and redeploy) or the platform rollback in [references/platform-runners.md](references/platform-runners.md#platform-rollback-no-git-change).
5. Retry once only for a transient network or platform-status error. Never loop.

## Done when

- The deploy command finished and step 5 printed `Health: PASS` from a real fetch, or
- the failure report from "Failure mode" was printed with the failing command and its case.

## Guardrails

- Deploying, publishing to npm, and posting comms each need the user's authorization in this conversation; ask at the moment of the action, as in steps 3 and 6.
- Never claim success from an exit code alone; never skip step 5.
- Never print secrets or `.env` values; never fabricate credentials.
- Never roll a custom deploy pipeline when the platform or package script exists.
- Never run the ship step from here; this skill is the deploy step, and `$ccc-ship` is a typed command.

## See also

- `$ccc-deploy-check` — readiness gate before a deploy
- `$ccc-ship` — pre-flight, release tagging, and the ship menu
- `$ccc-rollback` — revert commits and redeploy
- `$ccc-connect` — configure Slack or Discord for comms

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
