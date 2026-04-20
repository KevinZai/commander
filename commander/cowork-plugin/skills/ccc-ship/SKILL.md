---
name: ccc-ship
description: "CC Commander — pre-flight checks, cut a release, deploy to a platform, or rollback safely. Runs the test matrix in parallel and reports a checkbox scorecard; orchestrates version bump + CHANGELOG + tag + GitHub release; dispatches to platform-specific deploy scripts. Use when the user types /ccc-ship, /ccc ship, picks 'Ship' from the /ccc hub, or says 'ship it', 'deploy', 'cut a release', 'preflight', 'rollback'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
argument-hint: "[action: preflight | release | deploy | rollback]"
---

# /ccc-ship — Pre-flight + deploy

Click-first ship flow. Four actions, one test matrix, one release pipeline, one deploy path. User picks the action, the matrix (or agent) runs, results surface as a checkbox scorecard.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · /ccc-ship · Pre-flight → tag → deploy
```

### 2. Context strip (one paragraph)

Detect ship readiness with **five quick reads** (parallel Bash, silent on failure):
- `git rev-parse --abbrev-ref HEAD` → branch
- `git status --porcelain | wc -l` → uncommitted changes
- `git rev-list --count main..HEAD 2>/dev/null` → commits ahead of main
- `test -f package.json && node -p "require('./package.json').version"` → current version
- `test -f .github/workflows/ci.yml && echo yes` → CI configured

Render one line:
> 🧭 Branch: `<branch>` · <N> commits ahead · <X> uncommitted · current version: `<ver>` · CI: `<yes/no>`

If uncommitted changes > 0: "⚠️ Uncommitted changes detected — commit or stash before shipping."

### 3. The picker — `AskUserQuestion` with 4 ship actions

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-ship.json` for canonical option data. Surface the 4 non-back choices.

```
question: "What are we shipping?"
header: "CC Commander Ship"
multiSelect: false
options:
  - label: "✈️ Pre-flight check"
    description: "Tests, lint, typecheck, secrets, airplane-mode. One click, full matrix."
    preview: "6-check parallel matrix. Results as ✓/✗ scorecard. ~30-90s."
  - label: "📦 Cut a release"
    description: "Bump version, write changelog, tag, push, create GitHub release."
    preview: "Patch by default. Prompts for bump type + release notes source."
  - label: "🚀 Deploy"
    description: "Vercel / Fly.io / Cloudflare — pick target, run deploy script."
    preview: "Prompts for platform. Invokes platform's deploy script, not inline."
  - label: "↩️ Rollback"
    description: "Revert latest deploy + restore previous version. Idempotent."
    preview: "Last deploy only. Prompts for confirmation."
```

**Recommendation logic** (prepend ⭐ to ONE label):
- Clean branch + commits ahead of main + CI green → ⭐ "Pre-flight check"
- Preflight recently passed (last review artifact < 15 min old, blockers = 0) → ⭐ "Cut a release"
- Version bumped + tag exists but no deploy since → ⭐ "Deploy"
- Last deploy within 1h AND user mentions "revert" / "broken" in args → ⭐ "Rollback"

## Step 2 — Dispatch the chosen action

### Action A: "Pre-flight check"

Run a **parallel Bash matrix** (single Bash call with `&` + `wait`), each probe captured to a temp file. Auto-detect which commands to run — missing tools = ⚪ skip, not ✗ fail.

Matrix (all parallel):
- `npm test` / `pnpm test` / `vitest run` — tests
- `npm run lint` / `eslint .` — lint
- `npx tsc --noEmit` — typecheck
- Airplane mode: `grep -rE "fetch\(|axios\.|http\.(get|post)" src/ | grep -vE "localhost|127\.0\.0\.1"` — flag unexpected external calls
- Audit counts: if `bin/audit-counts` exists, run it — else skip
- Doc sync: `grep -c "v<ver>" README.md CHANGELOG.md` vs `package.json` version — catch stale version refs

**Report as a markdown checklist (NOT a numbered list):**

```markdown
## ✈️ Pre-flight — <branch> — <HH:MM>

- [x] ✓ Tests — 187/187 pass (vitest, 12.3s)
- [x] ✓ Lint — 0 errors, 2 warnings (eslint)
- [x] ✓ Typecheck — clean (tsc --noEmit)
- [ ] ✗ Airplane mode — 1 unexpected external call in `src/api/sync.ts:42`
- [x] ✓ Audit counts — 500/500 match
- [ ] ⚠️ Doc sync — README references v3.2.0, package.json is v3.3.0

**Verdict:** 🟡 CAUTION — 1 blocker (airplane mode) + 1 warning (doc sync). Fix before shipping.
```

Verdict rules: all ✓ → 🟢 GO · any ⚠️ → 🟡 CAUTION · any ✗ → 🔴 NO-GO.

### Action B: "Cut a release"

Two AUQs back-to-back:

**AUQ-1 — Bump type:**
- "Patch (bug fixes only)" — default
- "Minor (new features, backward-compatible)"
- "Major (breaking changes)"

**AUQ-2 — Release notes source:**
- "Auto-generated from commits (conventional commits → groups)"
- "I'll write them in a sec"
- "Use CHANGELOG.md as-is"

Then execute (via Bash, sequentially, with confirmation before push):
1. Bump version in `package.json` (+ `plugin.json` if present)
2. Prepend new section to `CHANGELOG.md` (or write auto-generated from commits)
3. `git add` the changed files
4. Create a commit: `chore(release): v<new-version>` (no AI attribution per project rules)
5. Create an annotated tag: `git tag -a v<new-version> -m "<version> — <date>"`
6. **STOP and prompt user** before `git push --tags` — never auto-push
7. After user confirms push: `gh release create v<new-version> --notes-file <notes-source>`

Report back:
> 📦 **Released v<version>** · tag pushed · [GitHub release](<url>) · CHANGELOG updated
> 💡 Next: `/ccc-ship deploy` to push it live.

### Action C: "Deploy"

One AUQ for platform:
- "Vercel (Next.js, static sites)"
- "Fly.io (backend services, Dockerfile apps)"
- "Cloudflare (Workers, Pages)"
- "Other (I'll run the script)"

On pick, **invoke the platform's deploy script** — do NOT roll a custom deploy inline:
- Vercel → `vercel deploy --prod` (check for `vercel.json`)
- Fly.io → `fly deploy` (check for `fly.toml`; remind to run through `op run --` if secrets in 1Password)
- Cloudflare → route to the `cloudflare-deploy` skill
- Other → emit a runbook checklist + stop (don't auto-execute)

Report deploy URL + health-check command after completion.

### Action D: "Rollback"

Before anything, emit a ⚠️ confirmation AUQ:
- "Yes — roll back the last deploy"
- "No — cancel"

On yes, detect the last deploy and run the platform's rollback:
- Vercel → `vercel rollback`
- Fly.io → `fly releases rollback`
- Cloudflare → `wrangler rollback`
- If platform unknown: emit a runbook with `git revert <sha> && <deploy command>` + STOP.

Report: previous version restored + ETA + health-check command.

## Anti-patterns — DO NOT do these

- ❌ Run the full test matrix sequentially — ALWAYS parallel with `&` + `wait`
- ❌ Report preflight results as a numbered list — ALWAYS checkbox markdown
- ❌ Auto-push tags without explicit user confirmation — git push is user-gated
- ❌ Roll a custom deploy pipeline — always invoke the platform's script
- ❌ Skip the rollback confirmation — destructive op, always AUQ first
- ❌ Commit with AI attribution trailers — project rule, no `Co-Authored-By` lines
- ❌ Offer more than 4 ship actions in the picker

## Argument handling

- `/ccc-ship` → root picker
- `/ccc-ship preflight` → skip picker, run matrix immediately
- `/ccc-ship release` → skip picker, jump to bump-type AUQ
- `/ccc-ship deploy` → skip picker, jump to platform AUQ
- `/ccc-ship rollback` → skip picker, jump to confirmation AUQ
- `/ccc-ship <anything else>` → echo arg in context strip + show root picker

## Artifact format

Every preflight writes `tasks/ship/preflight-<YYYYMMDD>-<HHMM>.md` with the verdict, matrix, and blocker list so Release can reference it later.

## Brand rules

- Checkbox markdown for preflight — NEVER numbered lists
- 🟢/🟡/🔴 verdict badges — consistent across preflight, review, and ship
- Never auto-push — git push is a user gate
- Never auto-rollback — rollback is a user gate (AUQ confirmation first)
- Never mention the CLI — Desktop-plugin flow

---

**Bottom line:** four ship tiles → parallel matrix OR gated release/deploy/rollback → checkbox scorecard. Destructive ops always gated by AUQ.
