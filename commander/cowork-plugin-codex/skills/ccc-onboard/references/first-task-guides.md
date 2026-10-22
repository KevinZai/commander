# First task guides by role

Used by `/ccc-onboard` step 5. Tailor each shape to the repo's `CLAUDE.md`, `BIBLE.md` and real `package.json` scripts. Surface a suggested script only when it exists.

## Frontend

- Find one small UI issue, empty state, accessibility label, copy mismatch, or visual regression.
- Identify the component or route.
- Run the relevant dev, lint, test and visual-check scripts.
- Avoid broad redesigns in the first PR.

Suggested scripts: `dev`, `build`, `lint`, `test`, `test:screenshots`, `storybook`, `typecheck`.

## Backend

- Pick one narrow API, validation, error-handling, or integration-test improvement.
- Trace the request path and data boundary.
- Add or update a focused test.
- Run the smallest backend test command first, then the broader suite if needed.

Suggested scripts: `test`, `test:api`, `test:integration`, `lint`, `typecheck`, `migrate`, `dev`.

## Full-stack

- Pick a tiny user-visible behavior that crosses UI and service logic.
- Trace from route or component to API or service to persistence or the external boundary.
- Add one frontend assertion and one backend or integration assertion where the repo supports it.
- Keep the PR small enough to review in one sitting.

Suggested scripts: `dev`, `test`, `test:e2e`, `build`, `lint`, `typecheck`.

## Docs

- Fix one stale instruction by reconciling docs with actual scripts or source files.
- Prefer `CLAUDE.md`, `BIBLE.md`, docs pages, examples, or command references the repo names.
- Verify every command in the edited doc, or mark it as intentionally not run.
- Do not touch unrelated marketing copy.

Suggested scripts: `docs:dev`, `docs:build`, `lint`, `test`, `check:links`.

## First PR

- Choose a low-risk validation: one missing test, a typo in a developer-facing message, a stale script reference, or a small diagnostic improvement.
- Make one cohesive change.
- Run the narrowest relevant test plus any audit `CLAUDE.md` requires.
- Write a PR summary stating what changed and how it was verified.
