# Platform runners

Per-platform run, watch and verify commands for `/ccc-deploy`. `/ccc-ship` and `/ccc-rollback` use the same runners. Prefer an explicit production script in `package.json` (`deploy`, `deploy:prod`, `deploy:production`, `pages:deploy`, `wrangler:deploy`, `vercel:deploy`, `fly:deploy`) over the bare platform command when one exists.

If a command needs credentials that are not present, name the missing credential and stop. If the project keeps secrets in a secret manager (for example 1Password), run the command through its injector (`op run -- <command>`) instead of exporting or printing values.

## Vercel

Detected by `vercel.json`, a Vercel script, or a `vercel` dependency.

```bash
vercel deploy --prod
```

Watch:

```bash
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

Verify: parse the deployment URL from the deploy output and fetch it with WebFetch. If the repo's safe example config (`.env.example`, README) names `HEALTHCHECK_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL` or `APP_URL`, fetch that URL too.

## Fly.io

Detected by `fly.toml`.

```bash
fly deploy
```

Watch:

```bash
fly status
fly releases --limit 3
fly logs --no-tail
```

Verify: derive the app name from `fly.toml` (`app = "..."`) or `fly status`, then fetch `https://<app-name>.fly.dev` (or the configured health URL) with WebFetch.

## Cloudflare (Workers and Pages)

Detected by `wrangler.toml`, `wrangler.json`, `wrangler.jsonc`, or a Cloudflare script. Prefer the explicit script:

```bash
npm run deploy            # or deploy:prod, wrangler:deploy — whichever exists
```

Otherwise, for a Worker:

```bash
wrangler deploy
```

For a Pages project:

```bash
wrangler pages deploy <build-output-dir>
```

Watch:

```bash
wrangler deployments list
wrangler tail
```

Verify: fetch the Worker or Pages URL printed by Wrangler with WebFetch. For bindings, routes or multi-environment setups, hand off to the `cloudflare-deploy` skill when it is installed and pass the selected target.

## GitHub Pages or workflow deploy

Detected by `.github/workflows/deploy.yml`, `deploy.yaml`, `pages.yml` or `pages.yaml`. Use the exact workflow filename found.

```bash
gh workflow run <workflow-file>
```

If the workflow triggers on push only, it runs when the already-committed branch is pushed; pushing needs its own authorization.

Watch:

```bash
gh run list --workflow <workflow-file> --limit 5
gh run watch <run-id>
gh run view <run-id> --log-failed
```

Verify: derive the Pages URL with `gh api repos/{owner}/{repo}/pages --jq .html_url`; if that fails, ask for the URL. Fetch it with WebFetch.

## npm publish

Detected by `publishConfig`, `bin` or `files` plus a `prepublishOnly` script. This is a package release, not a web deploy. A published version number can never be reused, even after unpublishing.

```bash
npm whoami
npm pack --dry-run
npm publish --access public
```

Run `npm whoami` and `npm pack --dry-run` first and show the file list before publishing.

Watch and verify:

```bash
npm view <package-name> version
npm view <package-name> dist-tags --json
```

The published version must equal `package.json` `version`. For a public package, fetch `https://www.npmjs.com/package/<package-name>` with WebFetch.

## Custom npm deploy script

```bash
npm run <deploy-script>
```

Verify with the URL the script prints, `SITE_URL`, `APP_URL`, or a health URL the user supplies.

## Platform rollback (no git change)

Restores the previous build on the platform without touching git. Used by `/ccc-ship rollback`; `/ccc-rollback` uses git revert plus redeploy instead.

| Platform | Command |
|---|---|
| Vercel | `vercel rollback` (optionally `vercel rollback <deployment-url>`) |
| Fly.io | `fly releases rollback` |
| Cloudflare Workers | `wrangler rollback` |
| Unknown | runbook only: `git revert <sha>`, then the platform deploy command; do not execute |
