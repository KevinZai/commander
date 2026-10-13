---
name: ccc-ship
description: "Ship menu: run a parallel pre-flight matrix with a GO, CAUTION or NO-GO scorecard, cut a tagged release with changelog, deploy to a platform, or roll back the last deploy, each gated by a picker. Use when the user says ship it, pre-flight, cut a release, tag a version, or roll back."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - WebFetch
  - AskUserQuestion
  - mcp__ccd_session__spawn_task
  - mcp__ccd_session__mark_chapter
argument-hint: "[action: preflight | release | deploy | rollback]"
model: sonnet
effort: high
disable-model-invocation: true
---

# /ccc-ship — Pre-flight, tag, deploy

**CC Commander** · /ccc-ship · pre-flight → tag → deploy, with rollback one pick away

## When to use / when not to

- Use for the whole ship path: check readiness, cut a release, deploy, or undo the last deploy.
- Use `/ccc-deploy-check` for a deeper readiness gate with a rollback plan, `/ccc-deploy` for the deploy alone, and `/ccc-rollback` to revert commits and redeploy.
- Desktop session tools (`mcp__ccd_session__mark_chapter`, `mcp__ccd_session__spawn_task`) are used when present and skipped silently otherwise. In Codex, ask pickers as plain-text questions with the same options and list failures as next steps instead of chips.

## What happens

### 1. Read ship readiness

Run in one Bash call, silent on failure:

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain | wc -l
git rev-list --count main..HEAD 2>/dev/null
test -f package.json && node -p "require('./package.json').version"
test -f .github/workflows/ci.yml && echo yes
ls -t tasks/ship/preflight-*.md 2>/dev/null | head -1
```

Render one line:

> 📊 Branch: `<branch>` · <N> commits ahead · <X> uncommitted · current version: `<ver>` · CI: `<yes/no>`

If uncommitted changes > 0, add: "⚠️ Uncommitted changes detected — commit or stash before shipping."

### 2. Route

| `$ARGUMENTS` | Go to |
|---|---|
| empty | step 3 picker |
| `preflight` | step 4 |
| `release` | step 5 |
| `deploy` | step 6 |
| `rollback` | step 7 |
| anything else | echo it in the readiness line, then step 3 |

### 3. Ship picker

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-ship.json` for the action labels and descriptions. Ask with AskUserQuestion, at most four options, the recommended one first with 🟢:

```yaml
question: "What are we shipping?"
header: "Ship"
multiSelect: false
options:
  - label: "Pre-flight check"
    description: "Tests, lint, typecheck, secrets, airplane mode. One click, full matrix."
    preview: "Six-check parallel matrix. Results as a checkbox scorecard."
  - label: "Cut a release"
    description: "Bump version, write changelog, tag, push, create GitHub release."
    preview: "Patch by default. Asks for bump type and release-notes source."
  - label: "Deploy"
    description: "Vercel, Fly.io, Cloudflare and more — pick target, run its deploy."
    preview: "Uses the /ccc-deploy runners and health check."
  - label: "Rollback"
    description: "Restore the previous platform build. Asks for confirmation."
    preview: "Last deploy only. Platform command or git revert."
```

Recommendation (pick one):

- Preflight artifact from step 1 is under 15 minutes old with 0 blockers → 🟢 Cut a release
- Version bumped and tag exists, no deploy since → 🟢 Deploy
- Last deploy within an hour and the arguments mention "revert" or "broken" → 🟢 Rollback
- Otherwise → 🟢 Pre-flight check

The menu's "Codex second opinion" entry is offered after pre-flight (step 4), not in this picker.

### 4. Pre-flight check

Mark the chapter: `mcp__ccd_session__mark_chapter` with title `Ship preflight: <branch>`, summary `Running preflight matrix on <branch>`.

Run the matrix in one Bash call, each probe in the background with output captured to its own temp file, then `wait`. Detect which tools exist; a missing tool is ⏭️ skip, never ❌.

| Probe | Command (first that applies) |
|---|---|
| Tests | `npm test` · `pnpm test` · `npx vitest run` |
| Lint | `npm run lint` · `npx eslint .` |
| Typecheck | `npx tsc --noEmit` (only with a `tsconfig.json`) |
| Airplane mode | the grep below — flags unexpected external calls |
| Audit counts | `bin/audit-counts` or `node scripts/audit-counts.js --check` if present, else skip |
| Doc sync | `grep -c "v<ver>" README.md CHANGELOG.md` against the `package.json` version — catches stale version refs |

```bash
grep -rnE "fetch\(|axios\.|http\.(get|post)" src/ | grep -vE "localhost|127\.0\.0\.1"
```

After the matrix, mark the chapter `Tests: <pass>/<total>` with summary `<pass>/<total> tests passing; <N> gates remaining`.

Report as a checkbox list, never a numbered list:

```markdown
## 🧪 Pre-flight — <branch> — <HH:MM>

- [x] ✅ Tests — <pass>/<total> pass (<runner>, <seconds>s)
- [x] ✅ Lint — 0 errors, <n> warnings
- [x] ✅ Typecheck — clean
- [ ] ❌ Airplane mode — 1 unexpected external call in `src/api/sync.ts:42`
- [x] ⏭️ Audit counts — skipped, no script
- [ ] ⚠️ Doc sync — README references an older version than package.json

**Verdict:** 🟡 CAUTION — 1 blocker, 1 warning. Fix before shipping.
```

Verdict: all ✅ or ⏭️ → 🟢 GO · any ⚠️ → 🟡 CAUTION · any ❌ → 🔴 NO-GO. Mark the chapter `Preflight complete`, summary `Verdict: <GO|CAUTION|NO-GO> — <blocker-count> blockers`.

Write the scorecard, verdict and blocker list to `tasks/ship/preflight-<YYYYMMDD>-<HHMM>.md` (create `tasks/ship/` if needed) so step 5 can reference it. Confirm with `test -s <path>`.

After the scorecard is rendered, for each failed gate call `mcp__ccd_session__spawn_task` once:

- `title`: imperative, under 60 characters ("Fix 3 failing tests before ship")
- `prompt`: self-contained — the gate, the error output or `file:line`, and the fix direction; the new session has no memory of this one
- `tldr`: one or two plain sentences on what broke and what to do

If `codex` is installed (`command -v codex`), offer one picker: "🟢 Continue" or "Codex second opinion" (runs `codex review --uncommitted`, read-only, and lists its findings beside the scorecard).

### 5. Cut a release

Ask two pickers in sequence:

- Bump type: "🟢 Patch (bug fixes only)", "Minor (new features, backward-compatible)", "Major (breaking changes)".
- Release notes: "🟢 Auto-generate from commits (conventional commits grouped by type)", "I'll write them now", "Use CHANGELOG.md as-is".

If the latest preflight verdict is 🔴 NO-GO or older than the last commit, say so before continuing.

Then, in order:

1. Bump `version` in `package.json` with Edit, and in `.claude-plugin/plugin.json` or `plugin.json` if present.
2. Prepend the new section to `CHANGELOG.md` (auto-generated: `git log --oneline <last-tag>..HEAD`, grouped by conventional-commit type). Write the release notes to `tasks/ship/release-notes-v<new>.md`.
3. Stage only the changed files: `git add package.json CHANGELOG.md <plugin.json if changed>`.
4. Commit: `git commit -m "chore(release): v<new>"`, following the repository's commit convention without adding AI attribution trailers.
5. Tag: `git tag -a v<new> -m "v<new> — <date>"`.
6. Stop and ask: "🟢 Push commit and tag now" or "Keep local — I'll push later". Never push without this answer.
7. On push: `git push origin <branch> && git push origin v<new>` (the single tag, not `--tags`, so stray local tags stay local).
8. Ask again before the public release: "🟢 Create the GitHub release" or "Skip". On yes: `gh release create v<new> --notes-file tasks/ship/release-notes-v<new>.md`.

Verify and mark the chapter `Release tagged v<new>`, summary `v<new> tagged and pushed`:

```bash
git ls-remote --tags origin v<new>
gh release view v<new> --json url --jq .url
```

Report:

> 📦 **Released v<new>** · tag pushed · [GitHub release](<url>) · CHANGELOG updated
> 💡 Next: `/ccc-ship deploy` to put it live.

### 6. Deploy

Run the `/ccc-deploy` procedure in this session (it is user-invoked only, so do not call it through the Skill tool): read `${CLAUDE_PLUGIN_ROOT}/skills/ccc-deploy/SKILL.md` and follow its steps 1 to 5, using [../ccc-deploy/references/platform-runners.md](../ccc-deploy/references/platform-runners.md) for the commands. Its platform picker covers Vercel, Fly.io, Cloudflare (or the `cloudflare-deploy` skill), GitHub Pages, npm, and package scripts. For an unrecognized platform, print a runbook checklist and stop without executing it.

Report the deploy URL, the `Health: PASS|FAIL` line, and the health-check command the user can rerun.

### 7. Rollback

Ask first with AskUserQuestion:

```yaml
question: "Roll back the last deploy?"
header: "Rollback"
multiSelect: false
options:
  - label: "🟢 Platform rollback"
    description: "Restore the previous build on the platform. No git change; fastest."
  - label: "Revert in git and redeploy"
    description: "Hand off to /ccc-rollback: revert commits, push, redeploy, verify."
  - label: "Cancel"
    description: "Nothing changes."
```

On platform rollback, detect the platform as in `/ccc-deploy` step 1 and run its command from the platform-rollback table in [../ccc-deploy/references/platform-runners.md](../ccc-deploy/references/platform-runners.md#platform-rollback-no-git-change): `vercel rollback`, `fly releases rollback`, or `wrangler rollback`. If the platform is unknown, print the runbook `git revert <sha> && <deploy command>` and stop.

Verify by fetching the production URL with WebFetch, and report: version restored, health result, and the health-check command. On "Revert in git", tell the user to run `/ccc-rollback` (it is user-invoked only).

## Done when

- Pre-flight: the scorecard and verdict are shown and `test -s tasks/ship/preflight-<stamp>.md` succeeded.
- Release: `git ls-remote --tags origin v<new>` returned the tag (or the user chose to keep it local, and that is reported).
- Deploy and rollback: a `Health: PASS|FAIL` line from a real fetch was printed.

## Guardrails

- Pushing, creating a GitHub release, deploying and rolling back each need the user's authorization in this conversation; ask with a picker at that step, never at the start.
- Never run the pre-flight matrix sequentially; never report it as a numbered list.
- Never auto-push tags or auto-rollback.
- Never roll a custom deploy pipeline; use the platform's own command or script.
- Never add AI attribution trailers to release commits.
- Never offer more than four ship actions in one picker.
- Run every command here through Bash; do not send the user to a separate terminal.

## See also

- `/ccc-deploy-check` — readiness gate with risk assessment and rollback plan
- `/ccc-deploy` — deploy runners and health check
- `/ccc-rollback` — git revert and redeploy
- `/ccc-review` — code review before shipping

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
