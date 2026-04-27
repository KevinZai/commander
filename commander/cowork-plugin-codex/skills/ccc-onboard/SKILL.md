---
name: ccc-onboard
description: "CC Commander contributor onboarding workflow. Detects project conventions, asks for contributor role, builds a tailored first-hour checklist, starter links, and clone-time tool validator. [Commander]"
model: sonnet
effort: high
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[role: frontend | backend | full-stack | docs | first-pr]"
---

# /ccc-onboard — New Contributor Onboarding

**CC Commander** · /ccc-onboard · Role → first task → first hour

Use this when a contributor is new to the repository and needs a practical first hour, not a generic tour. Build the guide from the repo’s own instructions and scripts.

## Response Shape

Always return these sections:

1. Brand header:

```markdown
**CC Commander** · /ccc-onboard · Contributor first hour
```

2. Repo context:

Read only the files that exist:

- `CLAUDE.md` for local conventions, required tools, test commands, and workflow rules
- `BIBLE.md` for product architecture, domain language, and non-negotiable project rules
- `package.json` for scripts, package manager clues, and workspace structure
- `README.md` only if the first three do not provide enough starter links

Summarize:

```markdown
Repo: <name> · package manager: <npm|bun|pnpm|yarn|unknown> · scripts: <top useful scripts> · primary stack: <detected stack>
```

3. Role picker — `AskUserQuestion`

Never show more than four options in one picker. The first picker covers the three most common code roles plus a "More roles" option; the second picker covers docs and first-PR onboarding.

```yaml
question: "What kind of contributor are you onboarding?"
header: "CC Commander Onboard"
multiSelect: false
autocomplete: true
options:
  - label: "Frontend"
    value: "frontend"
    description: "UI, components, client flows, accessibility, and visual polish."
    preview: "First task focuses on finding a small UI improvement and validating it locally."
  - label: "Backend"
    value: "backend"
    description: "APIs, services, persistence, auth, jobs, and platform integrations."
    preview: "First task focuses on one safe server-side fix with tests."
  - label: "Full-stack"
    value: "full-stack"
    description: "End-to-end product change crossing UI and backend."
    preview: "First task traces one user flow from UI to data boundary."
  - label: "More roles"
    value: "more-roles"
    description: "Docs or smallest safe first PR."
    preview: "Opens a second picker for non-code or first-contribution paths."
```

If the user chooses "More roles", ask:

```yaml
question: "Which onboarding path?"
header: "CC Commander Onboard"
multiSelect: false
autocomplete: true
options:
  - label: "Docs"
    value: "docs"
    description: "Documentation, examples, guides, changelogs, and contributor notes."
    preview: "First task updates one stale or missing guide from repo truth."
  - label: "First PR"
    value: "first-pr"
    description: "Smallest safe contribution for a brand-new contributor."
    preview: "First task is a low-risk validation or test improvement with a clean PR path."
  - label: "Back"
    value: "back"
    description: "Return to frontend, backend, and full-stack roles."
    preview: "Choose one of the primary contributor paths instead."
```

## Clone-Time Validator

Run the validator before writing the checklist. Use `CLAUDE.md` as the source of truth for required tool versions, then check common tools:

```bash
node --version
bun --version
npm --version
git --version
gh --version
```

Also inspect the package manager clues:

```bash
test -f bun.lockb && echo bun
test -f bun.lock && echo bun
test -f pnpm-lock.yaml && echo pnpm
test -f yarn.lock && echo yarn
test -f package-lock.json && echo npm
```

If `CLAUDE.md` names additional tools, check those too. Examples: `python3 --version`, `go version`, `swift --version`, `docker --version`, `op --version`, `vercel --version`, `fly version`, `wrangler --version`.

Report missing tools as setup blockers. Do not fabricate install commands for tools not named in repo docs; link to repo docs or official docs when the repo provides a URL.

## First Task Guides

Tailor the first task from `CLAUDE.md`, `BIBLE.md`, and `package.json` scripts. Prefer tasks that can be completed without production credentials.

### Frontend

Good first task shape:

- Find one small UI issue, empty state, accessibility label, copy mismatch, or visual regression.
- Identify the component or route.
- Run the relevant dev, lint, test, and visual check scripts from `package.json`.
- Avoid broad redesigns in the first PR.

Suggested scripts to surface when present: `dev`, `build`, `lint`, `test`, `test:screenshots`, `storybook`, `typecheck`.

### Backend

Good first task shape:

- Pick one narrow API, validation, error handling, or integration test improvement.
- Trace the request path and data boundary.
- Add or update a focused test.
- Run the smallest backend test command first, then the broader suite if needed.

Suggested scripts to surface when present: `test`, `test:api`, `test:integration`, `lint`, `typecheck`, `migrate`, `dev`.

### Full-Stack

Good first task shape:

- Pick a tiny user-visible behavior that crosses UI and service logic.
- Trace from route/component to API/service to persistence or external boundary.
- Add one frontend assertion and one backend or integration assertion where the repo supports it.
- Keep the PR small enough to review in one sitting.

Suggested scripts to surface when present: `dev`, `test`, `test:e2e`, `build`, `lint`, `typecheck`.

### Docs

Good first task shape:

- Fix one stale instruction by reconciling docs with actual scripts or source files.
- Prefer `CLAUDE.md`, `BIBLE.md`, docs pages, examples, or command references named by the repo.
- Verify every command in the edited doc or mark it as intentionally not run.
- Do not update unrelated marketing copy.

Suggested scripts to surface when present: `docs:dev`, `docs:build`, `lint`, `test`, `check:links`.

### First PR

Good first task shape:

- Choose a low-risk validation: one missing test, typo in a developer-facing message, stale script reference, or small diagnostic improvement.
- Make one cohesive change.
- Run the narrowest relevant test plus any required repo audit from `CLAUDE.md`.
- Include a PR summary with what changed and how it was verified.

## Output Contract

For the selected role, output exactly:

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

The five starter resources must be real files from the repo or official project URLs found in the repo. Prefer `CLAUDE.md`, `BIBLE.md`, `README.md`, package scripts, architecture docs, test docs, and the directory containing the first task.

## Script Selection Rules

- Use the detected package manager when running scripts.
- If `bun.lock` or `bun.lockb` exists, prefer `bun run <script>`.
- If `pnpm-lock.yaml` exists, prefer `pnpm <script>` or `pnpm run <script>`.
- If `yarn.lock` exists, prefer `yarn <script>`.
- Otherwise use `npm run <script>` for named scripts and `npm test` for `test`.

## Anti-Patterns

- Do not give a generic open source onboarding checklist.
- Do not invent repo architecture that is not in `CLAUDE.md`, `BIBLE.md`, or source files.
- Do not suggest a credential-required task for a first PR.
- Do not output more or fewer than five first-hour checklist items.
- Do not output more or fewer than five starter resources.
