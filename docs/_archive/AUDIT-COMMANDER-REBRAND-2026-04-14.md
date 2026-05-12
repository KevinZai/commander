# Commander Full Audit Scope — 2026-04-14

**Auditor:** Codex (sandboxed, report-only unless confidence is high)
**Repo:** `~/clawd/projects/cc-commander` (GitHub: `KevinZai/commander`)
**Version:** 2.3.1
**Mode:** Audit-first. Report all findings. May apply safe fixes (rename strings, doc updates). Must NOT break CLI, tests, or install flow.

---

## 1. Rebrand: cc-commander -> commander

The npm package name is `cc-commander` but the GitHub repo is now `KevinZai/commander`. All user-facing references should say **Commander** (or **CCC** for the CLI command). Internal package.json `name` field stays `cc-commander` for npm compatibility unless we decide to rename.

### 1A. GitHub URL Migration

Every occurrence of the OLD repo URLs must be updated to the new canonical URL.

| Find | Replace With |
|------|-------------|
| `github.com/KevinZai/cc-commander` | `github.com/KevinZai/commander` |
| `github.com/KevinZai2/cc-commander` | `github.com/KevinZai/commander` |
| `KevinZai2` (any context) | Verify — likely stale, remove or replace with `KevinZai` |
| `k3v80/` (any GitHub ref except claudeswap) | Replace with `KevinZai/` or `kzicherman/` as appropriate |

**Known files with GitHub URL refs (check all):**
- `install-remote.sh` (clone URL — CRITICAL)
- `install.sh`
- `README.md`, `BIBLE.md`, `CHANGELOG.md`
- `bin/kc.js` (update check URL)
- `commander/update-check.js`
- `commander/share-card.js`
- `commander/branding.js`
- `commander/engine.js`
- `commander/ingestion/github-scanner.js`
- `package.json` (`repository`, `homepage`, `bugs` fields)
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- `extension/package.json`, `extensions/vscode/package.json`
- `extensions/cloudcli/manifest.json`
- `mintlify-docs/docs.json`, `mintlify-docs/mint.json`
- `video/package.json`
- All `marketing/*.md` files
- All `docs/*.md` files
- `skills/fleet/SKILL.md`, `skills/openclaw-bridge/SKILL.md`
- `commands/fleet.md`, `commands/ccc.md`
- `kevin/USER-MANUAL.md`
- `guides/quickstart-beginner.md`
- `compatibility/README.md`

### 1B. k3v80 Deprecated Account References

These files reference the deprecated `k3v80` GitHub account:
- `CHANGELOG.md` — update ClaudeSwap repo refs to `KevinZai/claudeswap` or `kzicherman/claudeswap`
- `docs/AUDIT-HANDOFF-2026-04-07-v2.md`
- `docs/AUDIT-ACTION-CHECKLIST-2026-04-07-v2.md`
- `docs/EVALUATION.md`
- `marketing/CCC-RECOMMENDATIONS-FROM-MAIN.md`

### 1C. User-Facing Name

- CLI command stays `ccc` (no change)
- Product name in docs: **Commander** (not CC Commander, not cc-commander)
- `package.json` `name` field: leave as `cc-commander` for now (npm publish compatibility) — flag for future decision
- Help text in `bin/kc.js`: verify it says "Commander" not "CC Commander" or "cc-commander"

---

## 2. Documentation Freshness Audit

All major docs must reflect current state: commands, skills, vendor versions, install flow, and architecture.

### 2A. BIBLE.md (98.5K)

The BIBLE is the comprehensive reference. Verify:
- [ ] All CLI commands from `ccc --help` are documented (see Section 6 below for full list)
- [ ] Hook count matches actual hooks in `hooks/` directory
- [ ] Skill count matches `node scripts/audit-counts.js` output
- [ ] Vendor list matches current `.gitmodules` (19 submodules) with correct version tags
- [ ] All code examples use current API/syntax
- [ ] No references to deprecated services (Mission Control :4001, OpenAgents :8800/:8801, Synapse :4682, Claude Peers :7899)
- [ ] ClaudeSwap references point to correct repo
- [ ] Install instructions match current `install.sh` behavior

### 2B. CHEATSHEET.md (36.4K)

- [ ] All slash commands listed match actual `commands/*.md` and `skills/*/SKILL.md`
- [ ] Keyboard shortcuts are accurate
- [ ] Quick-reference tables match current CLI flags
- [ ] No stale examples

### 2C. SKILLS-INDEX.md (31.7K)

- [ ] Every skill in `skills/` directory has an entry
- [ ] No entries for skills that don't exist
- [ ] Descriptions are accurate (spot-check 10 random skills)
- [ ] Categories are correct
- [ ] New vendor skills from updated submodules are included (especially claude-skills which added `karpathy-coder` and `llm-wiki`)

### 2D. README.md (27.9K)

- [ ] Install command uses correct GitHub URL (`KevinZai/commander`)
- [ ] Feature list matches current capabilities
- [ ] Screenshots/video refs point to existing files in `docs/assets/`
- [ ] Badge URLs are correct
- [ ] No broken links (check all markdown links)
- [ ] Stats (skill count, command count, vendor count) match `audit-counts.js`

### 2E. CLAUDE.md (11.6K)

- [ ] Version number matches `package.json`
- [ ] Statusline example is current
- [ ] Architecture description matches actual file structure
- [ ] No stale references

### 2F. docs/*.md

- [ ] `docs/WHY-CCC.md` — no stale comparisons, stats are current
- [ ] `docs/INFOGRAPHIC.md` — numbers match current state
- [ ] `docs/BIBLE-AGENT.md` — agent instructions align with current BIBLE
- [ ] `docs/ECOSYSTEM.md` — vendor list current

---

## 3. Install Process Verification

### 3A. Remote Install (`install-remote.sh`, 98 lines)

```bash
# Simulate fresh install (DO NOT actually run — just trace the logic)
```
- [ ] Clone URL is `https://github.com/KevinZai/commander.git` (not cc-commander, not KevinZai2)
- [ ] Install dir is `~/.cc-commander` (or verify intended dir)
- [ ] `git pull` works on re-run (idempotent)
- [ ] Calls `install.sh` after clone
- [ ] No hardcoded paths that break on non-Mac

### 3B. Local Install (`install.sh`, 668 lines)

- [ ] Bash 3.2 compatible (no `${var,,}`, no top-level `local`, no `${!var}`)
- [ ] `--force` flag works non-interactively
- [ ] `--skills=essential` installs correct tier from `_tiers.json`
- [ ] npm dependencies auto-install when `node_modules/` missing
- [ ] Symlink creation for `ccc` binary works (`/usr/local/bin/ccc` or `~/.local/bin/ccc`)
- [ ] BIBLE.md version stamp matches `package.json`
- [ ] Hooks are installed correctly
- [ ] No `rm -rf` on user directories
- [ ] Uninstall path (`uninstall.sh`) removes symlink cleanly

### 3C. Update Flow

- [ ] `ccc --update` runs `git pull` + `npm install` + re-runs install
- [ ] Update check in `commander/update-check.js` hits correct GitHub API URL
- [ ] No breaking changes on update (state.json preserved, themes preserved)

---

## 4. CLI Functional Testing

Run every CLI flag and verify output. Use `node bin/kc.js` directly.

### 4A. Non-Interactive Commands

```bash
node bin/kc.js --version          # Should print 2.3.1
node bin/kc.js --test             # Should pass 27/27 self-tests
node bin/kc.js --stats            # Should print stats JSON
node bin/kc.js --status           # Should print health check JSON
node bin/kc.js --list-skills      # Should list all skills
node bin/kc.js --list-skills --json  # Should output valid JSON array
node bin/kc.js --list-sessions    # Should list sessions (may be empty)
node bin/kc.js --template         # Should print CLAUDE.md template
node bin/kc.js --help             # Should print help text
node bin/kc.js --skills list      # Should list installed skills
node bin/kc.js --skills available # Should list available skills
```

### 4B. Dispatch Mode (Headless)

```bash
node bin/kc.js --dispatch "echo hello" --json  # Should produce JSON output
```

### 4C. Self-Test Deep Dive

Run `node bin/kc.js --test` and verify all 27 checks pass. If any fail, document which and why.

### 4D. Audit Counts

```bash
node scripts/audit-counts.js --check  # Must pass — version, skill count, hook count all consistent
```

---

## 5. TUI / tmux Flow Testing

These require an interactive terminal. Test each menu path.

### 5A. Main Menu Launch

```bash
ccc                    # Should launch TUI with tmux split
ccc --simple           # Should launch menu-only (no tmux)
```

Verify:
- [ ] ANSI Shadow CCC banner renders (rainbow gradient, no garbled chars)
- [ ] Statusline footer renders (version, model, meters, skill count)
- [ ] Theme is `cyberpunk` by default
- [ ] Menu items are navigable with arrow keys
- [ ] `q` quits cleanly
- [ ] `?` opens help overlay
- [ ] Help overlay closes without listener leak (press `?` twice — should toggle, not stack)

### 5B. Menu Navigation

Test each top-level menu item:
1. **Quick Actions** — dispatches task
2. **Skill Browser** — lists skills, search works, categories load
3. **Session Manager** — shows session history
4. **Cockpit** — renders panels with rounded borders (╭╮╰╯)
5. **Settings** — theme picker works, selection persists
6. **Vendor Status** — shows 19 submodules with versions

### 5C. Existing tmux Test

Run the existing tmux menu audit test:
```bash
node commander/tests/tmux-menu-audit.test.js
```
Document results.

---

## 6. Full CLI Command Reference (verify all exist)

From `--help` output, every command must work:

| Flag | Expected Behavior |
|------|------------------|
| `--version` | Print `2.3.1` |
| `--test` | Run 27 self-tests, all pass |
| `--stats` | Print JSON stats |
| `--repair` | Fix corrupt state file |
| `--simple` | Launch TUI without tmux |
| `--update` | Git pull + npm install + reinstall |
| `--dispatch "task"` | Headless dispatch |
| `--list-skills` | List all skills |
| `--list-skills --json` | JSON skill list |
| `--skills list` | Installed skills |
| `--skills available` | Available skills |
| `--skills install <name>` | Install a skill |
| `--skills remove <name>` | Remove a skill |
| `--skills tier` | Show current tier |
| `--list-sessions` | Session history |
| `--list-sessions --json` | JSON session list |
| `--status` | Health check JSON |
| `--template` | Print CLAUDE.md template |
| `--daemon` | Start background daemon |
| `--queue "task"` | Queue task for daemon |
| `--queue-list` | Show queued tasks |
| `--daemon-stop` | Stop daemon |
| `--ingest <url>` | Evaluate GitHub repo |
| `--help` | Print help |

---

## 7. Test Suite

### 7A. npm test (187 tests)

```bash
npm test
```
- [ ] All 187 tests pass
- [ ] No skipped tests that should be active
- [ ] Coverage is reasonable

### 7B. Smoke Test

```bash
bash tests/smoke.sh
```
- [ ] Passes

### 7C. Visual Showcase

```bash
bash tests/visual-showcase.sh
```
- [ ] All visual components render without errors

### 7D. Hook Syntax

Verify all hooks in `hooks/` parse without syntax errors:
```bash
for f in hooks/*.js; do node -c "$f" && echo "OK: $f"; done
for f in hooks/*.sh; do bash -n "$f" && echo "OK: $f"; done
```

---

## 8. Vendor Submodule Health

All 19 submodules should be pinned to a specific commit. Verify:

```bash
git submodule status
```

- [ ] No submodules show `-` prefix (uninitialized)
- [ ] No submodules show merge conflicts
- [ ] `.gitmodules` URLs are all valid and fetchable

Check recently updated vendors for breaking changes:
- **claude-skills** (v2.0.0-395) — 2 new skills added. Verify they appear in skill browser
- **oh-my-claudecode** (v4.11.6) — verify no breaking hook changes
- **caliber-ai-setup** (v1.41.4) — verify no config format changes

---

## 9. Security Spot-Check

- [ ] No hardcoded API keys or tokens in source (grep for patterns: `sk-`, `ghp_`, `gho_`, `xai-`, `ANTHROPIC_API_KEY=`)
- [ ] `install.sh` doesn't run arbitrary code from network without verification
- [ ] `--dispatch` sanitizes task text before tmux send-keys (shell injection)
- [ ] No `eval()` on user input in any JS file
- [ ] `.gitignore` covers `.env`, `coverage/`, `node_modules/`

---

## 10. Deliverable Format

### Report Structure

Produce a single markdown report with:

```markdown
# Commander Audit Report — 2026-04-14

## Summary
- Total findings: X
- Critical (breaks functionality): X
- High (wrong info in docs): X  
- Medium (stale references): X
- Low (cosmetic): X

## Rebrand Findings
[List every file + line where cc-commander/KevinZai2/k3v80 appears, with suggested replacement]

## Documentation Findings
[List every doc that needs updates, with specific line numbers and what's wrong]

## Install Findings
[Any issues with install flow]

## CLI Findings
[Any commands that fail or produce wrong output]

## TUI Findings
[Any menu paths that break or render incorrectly]

## Test Findings
[Any test failures or gaps]

## Security Findings
[Any issues found]

## Recommended Changes (Prioritized)
1. [Critical fixes first]
2. [High priority]
3. [Medium priority]
4. [Low priority]
```

### Rules for Codex

1. **Read everything before changing anything.** Full audit pass first, then fixes.
2. **Safe fixes OK:** String replacements (cc-commander -> commander URLs), doc count updates, version stamps. Apply these directly.
3. **Risky fixes — report only:** Anything touching JS logic, install scripts, hooks, or test files. Report what needs to change but don't modify.
4. **Always verify after changes:** Run `npm test` and `node scripts/audit-counts.js --check` after any edits.
5. **Do not modify vendor/ submodules** — those are upstream packages.
6. **Do not modify ~/.openclaw/ or ~/.claude/ paths** — those are system configs, not repo files.
7. **Commit separately:** Rebrand changes in one commit, doc updates in another.

---

## 11. Linear Integration Setup

Codex should use the Linear OAuth app token (not a personal API key) so all task updates show as "Claude Code" app, not Kevin's user.

### Token Helper

```bash
# One-time: ensure env vars are available
export LINEAR_APP_ID_PERSONAL="LINEAR_APP_ID_REDACTED"
export LINEAR_APP_SECRET_PERSONAL="LINEAR_APP_SECRET_REDACTED"

# Get token (cached for 30 days, auto-refreshes)
TOKEN=$(bash ~/clawd/scripts/linear-token.sh)

# Check status
bash ~/clawd/scripts/linear-token.sh --status

# Force refresh
bash ~/clawd/scripts/linear-token.sh --refresh
```

### Reporting Progress to Linear

This audit is tracked as **CC-290**. Update it as you work:

```bash
TOKEN=$(bash ~/clawd/scripts/linear-token.sh)

# Post a comment with findings
curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "mutation { commentCreate(input: { issueId: \"bf9e433d-baae-450a-b437-5b11c883770c\", body: \"YOUR FINDINGS HERE\" }) { success } }"}'

# Mark in progress
curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "mutation { issueUpdate(id: \"bf9e433d-baae-450a-b437-5b11c883770c\", input: { stateId: \"IN_PROGRESS_STATE_ID\" }) { success } }"}'
```

### Linear Team Context

- **Team:** Claude Code (`CC`)
- **Team ID:** `896f0925-87e5-4143-88d0-34f605d91049`
- **Issue:** CC-290 (`bf9e433d-baae-450a-b437-5b11c883770c`)
- **Attribution:** Shows as "Claude Code" app (OAuth client_credentials flow)

### GitHub Account Context

- **Active account:** `kzicherman` (primary — all future work)
- **Org:** `KevinZai` (cc-commander repo lives here as `commander`)
- **Deprecated:** `k3v80` account and `KevinZai2` org — do not use
- **Repo URL:** `https://github.com/KevinZai/commander`
- **ClaudeSwap repo:** Both `KevinZai/claudeswap` and `kzicherman/claudeswap` exist. Use `KevinZai/claudeswap` as canonical.

---

## Quick Reference

| Check | Command | Expected |
|-------|---------|----------|
| Version | `node bin/kc.js --version` | `2.3.1` |
| Self-test | `node bin/kc.js --test` | 27/27 pass |
| Unit tests | `npm test` | 187/187 pass |
| Audit counts | `node scripts/audit-counts.js --check` | PASS |
| Smoke | `bash tests/smoke.sh` | PASS |
| Fetch | `git fetch origin` | No errors |
