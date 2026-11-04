# CC Commander Runbook

**Owner:** Kevin Zicherman — kevin@kevinz.ai  
**Discord:** https://discord.gg/cc-commander  
**Linear:** https://linear.app/cc/team/CC  
**npm package:** cc-commander (historical; releases are tag-only GitHub releases)  
**GitHub:** https://github.com/KevinZai/commander

---

## Scenario 1 — bad GitHub release (tag-only, no npm)

CC Commander ships as a Claude Code plugin from this repository's tags plus a GitHub release; npm publish was removed (no-npm-publish policy). A pushed `v*` tag runs `.github/workflows/release.yml`: its `gate` job runs `node scripts/release-gate.js --tag <tag>` (every check script, lint, Codex mirror, `npm run test:ci`, smoke and the full `npm test` suite), and only then does the `release` job create the GitHub release. Before tagging, follow [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).

Older `cc-commander` versions on npm are historical; do not publish, deprecate or unpublish there as part of a rollback. `scripts/rollback.sh --target npm` is legacy and not part of this procedure.

### Pull a broken release

```bash
# Mark it as a prerelease so it stops being "latest" (keeps the tag for users pinned to it)
gh release edit v<bad-version> --prerelease

# Confirm which release is now latest
gh release view --json tagName,isPrerelease
```

Do not delete or move a pushed tag; ship a hotfix with a new version instead.

### Ship a hotfix

1. Fix the bug on a branch from `main` and merge it through the normal PR gate.
2. Bump the version with `node scripts/bump-version.js <new-version>` (it writes every manifest), add the `CHANGELOG.md` entry, and commit only the files you changed. Do not use `npm version`: its `version` lifecycle script runs `git add -A`, which stages unrelated files.
3. Run the release checklist (`node scripts/release-gate.js --tag v<new-version>`) on the exact commit you will tag.
4. Tag and push: `git tag v<new-version> && git push origin v<new-version>`. The release workflow gates again and creates the GitHub release.

---

## Scenario 2 — Plugin rollback (Desktop / Cowork Desktop)

The plugin is pulled directly from the GitHub repo tag. There is no separate plugin registry.

### User-side: pin to last good version

```bash
# Uninstall current
/plugin uninstall commander

# Install a specific tag (if the marketplace supports versioned installs)
/plugin install commander@<previous-known-good>   # e.g. 4.0.0-beta.11

# If versioned install is not supported, install from a branch/tag URL:
# Settings → Plugin Marketplace → Add from GitHub → KevinZai/commander@v<previous-known-good>
```

**Limitation:** the `/plugin install` CLI does not currently support version pinning. Users who cannot pin should wait for the hotfix `4.0.1` tag.

### Kevin-side: issue a hotfix

1. Push hotfix to `main` with a `v4.0.1` tag
2. Announce in Discord `#announcements` and GitHub Release notes
3. Users re-install — they will get the new tag

```bash
bash scripts/rollback.sh --target plugin --version <previous-known-good>   # e.g. 4.0.0-beta.11
```

---

## Scenario 3 — Fly.io hosted MCP rollback (v4.1+)

Applies once `cc-commander-mcp` is deployed to Fly.io.

### Immediate rollback to previous release

```bash
# List recent deploys
fly releases list --app cc-commander-mcp

# Roll back to previous (ETA < 90s)
fly releases rollback --app cc-commander-mcp

# Confirm the rollback completed
fly status --app cc-commander-mcp
curl https://mcp.commanderplugin.com/health
```

### Via rollback script

```bash
# Dry-run
bash scripts/rollback.sh --target mcp-cloud

# Execute
bash scripts/rollback.sh --target mcp-cloud --yes
```

### Monitor after rollback

```bash
fly logs --app cc-commander-mcp | grep -E "ERROR|WARN" &
# Watch for 60s, then cancel
```

**Blast radius:** all users of the hosted MCP endpoint are offline during the rollback window (~90s).  
**Schedule:** if non-emergency, coordinate a 2am PT maintenance window.

---

## Scenario 4 — `ccc` checkout behind the installed plugin

A `ccc` shim that execs a git checkout's `bin/kc.js` reports that checkout's version, while Claude Code loads the plugin from its own cache. `ccc --version` prints both, for the config dir in `CCC_CONFIG_DIR` or `CLAUDE_CONFIG_DIR` (default `~/.claude`), and warns on stderr when the checkout is older:

```text
CC Commander v8.1.1 (installed plugin v8.1.2)
warning: ccc checkout 8.1.1 is behind the installed plugin 8.1.2. Update: on a clean main: git -C "<checkout>" fetch origin main && git -C "<checkout>" merge --ff-only origin/main
```

An npm install (no `.git`) suggests `npm update -g cc-commander` instead.

Fast-forward only a clean checkout on `main` (`git status --short` empty, `git fetch origin main` first). If it has local changes or another branch, leave it and record the drift instead.

---

## Contact chain

| Step | Action |
|------|--------|
| 1 | Check `#incidents` in Discord — may already be triaged |
| 2 | Open a Linear issue: `CC / Infra & Tooling` with `[INCIDENT]` prefix |
| 3 | Email kevin@kevinz.ai with subject `[CC Commander INCIDENT] <short description>` |
| 4 | For Fly.io auth: `fly auth login` or `op://<vault>/fly-io-token` |

---

## Verification checklist (post-rollback)

- [ ] `gh release view --json tagName` shows the expected latest release
- [ ] `ccc --version` (after the installer one-liner) returns the expected version
- [ ] GitHub Release page shows correct release
- [ ] Discord `#announcements` notified
- [ ] Linear incident issue closed with root-cause note
