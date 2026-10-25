---
name: ccc-onboard
description: "Contributor first-hour plan for the current repository: reads CLAUDE.md, BIBLE.md and package.json, checks required tools, asks the contributor's role, and returns a five-step checklist plus five real starter resources. Use when someone new joins a repo or types $ccc-onboard."
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[role: frontend | backend | full-stack | docs | first-pr]"
model: sonnet
effort: high
disable-model-invocation: true
---

# $ccc-onboard — contributor first hour

**CC Commander** · $ccc-onboard · role → first task → a verified first hour

Build the guide from the repository's own instructions and scripts, never from a generic open-source checklist. The skill is read-only: it inspects files and tool versions and returns a plan; it installs, edits and commits nothing.

On Codex, AskUserQuestion becomes a plain-text question with the same options, and WebFetch becomes a `curl -sI` reachability check.

## When to use / when not to

- Use when a contributor is new to a repository (any repository, including Commander's own) and needs a practical first hour.
- Use `$ccc-start` for first-run Commander onboarding, `$ccc-adopt` to add Commander conventions to a project's CLAUDE.md, and `$ccc-xray` for a project health scorecard.

## What happens

### 1. Brand header

```markdown
**CC Commander** · $ccc-onboard · Contributor first hour
```

### 2. Repo context

Read only the files that exist, in this order:

- `CLAUDE.md` — local conventions, required tools, test commands, workflow rules
- `BIBLE.md` — product architecture, domain language, non-negotiable project rules
- `package.json` — scripts, package manager clues, workspace structure
- `README.md` — only if the first three do not yield enough starter links

```bash
ls CLAUDE.md BIBLE.md package.json README.md 2>/dev/null
git rev-parse --show-toplevel 2>/dev/null
```

Summarize in one line:

```markdown
Repo: <name> · package manager: <npm|bun|pnpm|yarn|unknown> · scripts: <top useful scripts> · primary stack: <detected stack>
```

If none of the four files exist and there is no git root, say so and stop: there is no repo truth to build from.

### 3. Clone-time validator

Run before writing the checklist. `CLAUDE.md` is the source of truth for required tool versions; also check the common tools:

```bash
node --version
bun --version
npm --version
git --version
gh --version
```

Package manager clues:

```bash
test -f bun.lockb && echo bun
test -f bun.lock && echo bun
test -f pnpm-lock.yaml && echo pnpm
test -f yarn.lock && echo yarn
test -f package-lock.json && echo npm
```

If `CLAUDE.md` names other tools, check those too, for example `python3 --version`, `go version`, `swift --version`, `docker --version`, `op --version`, `vercel --version`, `fly version`, `wrangler --version`.

Report a missing or wrong-version tool as a setup blocker. Do not invent install commands for tools the repo docs do not name; link to the repo docs or the official URL the repo provides.

### 4. Role picker — `AskUserQuestion`

A role passed as the argument skips the picker. Otherwise ask, never more than four options per picker. Put the recommended role first with 🟢 in its label: frontend dependencies only (react, vue, svelte, next) → Frontend; server dependencies only (express, fastify, hono, django, fastapi) → Backend; both → Full-stack.

```yaml
question: "What kind of contributor are you onboarding?"
header: "Onboarding"
multiSelect: false
options:
  - label: "Frontend"
    description: "UI, components, client flows, accessibility, and visual polish."
    preview: "First task: a small UI improvement, validated locally."
  - label: "Backend"
    description: "APIs, services, persistence, auth, jobs, and platform integrations."
    preview: "First task: one safe server-side fix with tests."
  - label: "Full-stack"
    description: "End-to-end product change crossing UI and backend."
    preview: "First task: trace one user flow from UI to data boundary."
  - label: "More roles"
    description: "Docs or the smallest safe first PR."
    preview: "Opens a second picker for non-code or first-contribution paths."
```

If the user picks "More roles", ask a second picker. Check for prior history with `git log --author="$(git config user.email)" -1 --format=%h 2>/dev/null`. Mark First PR with 🟢 when that prints nothing (no prior history in the repo), otherwise mark Docs with 🟢. Put the recommended label first; Back always stays last. The default order (no prior history) is:

```yaml
question: "Which onboarding path?"
header: "Onboarding"
multiSelect: false
options:
  - label: "🟢 First PR"
    description: "Smallest safe contribution for a brand-new contributor."
    preview: "First task: a low-risk validation or test improvement with a clean PR path."
  - label: "Docs"
    description: "Documentation, examples, guides, changelogs, and contributor notes."
    preview: "First task: update one stale or missing guide from repo truth."
  - label: "Back"
    description: "Return to frontend, backend, and full-stack roles."
    preview: "Shows the first picker again."
```

### 5. Pick the first task

Use the role's task shape and suggested scripts in [references/first-task-guides.md](references/first-task-guides.md), tailored by `CLAUDE.md`, `BIBLE.md` and the actual `package.json` scripts. Prefer a task that needs no production credentials. Name the file or directory where it lives.

Run scripts with the detected package manager:

- `bun.lock` or `bun.lockb` → `bun run <script>`
- `pnpm-lock.yaml` → `pnpm <script>`
- `yarn.lock` → `yarn <script>`
- otherwise `npm run <script>` (`npm test` for `test`)

Only name scripts that exist in `package.json` (or commands that `CLAUDE.md` names).

### 6. Verify starter resources

Collect five resources: real files from the repo or official URLs found in repo files. Prefer `CLAUDE.md`, `BIBLE.md`, `README.md`, package scripts, architecture docs, test docs, and the directory holding the first task.

```bash
for f in <path1> <path2> <path3>; do test -e "$f" && echo "ok $f" || echo "missing $f"; done
```

For each URL, confirm it resolves with WebFetch (one short fetch each); drop and replace any that fail.

### 7. Output

Return exactly this shape for the selected role:

```markdown
## Your First Hour

- [ ] 0-10 min: <setup validation step>
- [ ] 10-20 min: <repo orientation step>
- [ ] 20-35 min: <first task implementation step>
- [ ] 35-50 min: <verification step using actual scripts>
- [ ] 50-60 min: <PR handoff step>

## Starter Resources

- <link or file path 1>
- <link or file path 2>
- <link or file path 3>
- <link or file path 4>
- <link or file path 5>
```

Put any setup blockers from step 3 above the checklist as a short list.

## Done when

- The checklist has exactly five items and the resources list exactly five entries.
- Every file path printed `ok` in step 6, and every URL was fetched successfully this turn.
- Every script named in the checklist exists in `package.json` or is named in `CLAUDE.md`.

## Guardrails

- Never give a generic open-source onboarding checklist.
- Never invent architecture that is not in `CLAUDE.md`, `BIBLE.md` or source files.
- Never suggest a credential-requiring task for a first PR.
- Never install tools, edit files, create branches or open PRs; this skill only reads and reports.
- Never output more or fewer than five checklist items or five starter resources.

## See also

- `$ccc-start` — first-run Commander onboarding
- `$ccc-adopt` — merge Commander conventions into a project's CLAUDE.md
- `$ccc-xray` — project health scorecard
- `$ccc-review` — review the first PR before it goes up

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
