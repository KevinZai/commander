# CC Commander Runbook

**Owner:** Kevin Zicherman — kevin@kevinz.ai  
**Discord:** https://discord.gg/cc-commander  
**Linear:** https://linear.app/cc/team/CC  
**npm package:** cc-commander  
**GitHub:** https://github.com/KevinZai/commander

---

## Scenario 1 — npm rollback

Use when a published version is broken and users are actively hitting it.

### Within 72 hours of publish (deprecate, not unpublish)

```bash
# Deprecate: package stays installable but users see a warning
npm deprecate cc-commander@4.0.0 "Rolled back due to [ISSUE]. Pin to <previous-known-good> or wait for 4.0.1."

# Verify the deprecation notice appears
npm info cc-commander@4.0.0 deprecated
```

### Unpublish (only within 72h and only if deprecate is insufficient)

```bash
# DESTRUCTIVE — breaks existing installs that didn't cache the package
# Requires npm login with publish rights
npm unpublish cc-commander@4.0.0

# Verify removal
npm info cc-commander@4.0.0 2>&1 | grep -i "not found"
```

### Via rollback script (dry-run default)

```bash
# Preview
bash scripts/rollback.sh --target npm --version 4.0.0 --reason "crash on startup"

# Execute (requires --yes)
bash scripts/rollback.sh --target npm --version 4.0.0 --reason "crash on startup" --yes
```

### Ship a hotfix

1. Fix the bug on `main` (or a hotfix branch off the bad tag)
2. `npm version patch` — bumps `4.0.0` → `4.0.1`
3. `git push --follow-tags` — triggers `release.yml`
4. The release workflow gates on full test suite before publishing

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
curl https://mcp.cc-commander.com/health
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

## Contact chain

| Step | Action |
|------|--------|
| 1 | Check `#incidents` in Discord — may already be triaged |
| 2 | Open a Linear issue: `CC / Infra & Tooling` with `[INCIDENT]` prefix |
| 3 | Email kevin@kevinz.ai with subject `[CC Commander INCIDENT] <short description>` |
| 4 | For npm-auth issues: check `op://Alfred/npm-publish-token` in 1Password |
| 5 | For Fly.io auth: `fly auth login` or `op://Alfred/fly-io-token` |

---

## Verification checklist (post-rollback)

- [ ] `npm info cc-commander dist-tags` shows correct `latest` and `beta` versions
- [ ] `npx cc-commander@latest --version` returns expected version
- [ ] GitHub Release page shows correct release
- [ ] Discord `#announcements` notified
- [ ] Linear incident issue closed with root-cause note
