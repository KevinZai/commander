# Listing copy

DRAFT for review. Keep the word "Fable" out of anything that goes to the directory (the mirror builder fails on it). Counts below are the current values in `commander/contract.json`; if the contract changes, update them (the parity checker covers this folder).

## Name and tagline

- Name: CC Commander (plugin id `cc-commander` in the directory, `commander` in the own marketplace)
- Tagline: A guided project manager for Claude Code: one next step, a click-first menu, and a separate check on the work.

## Short description (one sentence, about 160 characters)

Know what to do first, plan it, build it, review it and ship it from one click-first menu, with a separate verifier checking the result. Free and MIT.

## Short description, alternate (for a character-limited field)

Guided PM for Claude Code: plan, build, review and ship from click-first menus, with an independent verifier. Free, MIT, telemetry off by default.

## Long description

CC Commander turns Claude Code into a guided project manager. Type `/ccc` and it reads your project, recommends one next step and offers the alternatives as a click-first menu. You decide; specialist agents do the work; hooks keep state and guard secrets.

Six workflows carry most of the value:

- **`/ccc-start`: oriented in about ninety seconds.** First-run onboarding detects your setup, offers new project, import existing, tour or skip, and writes a start plan file you can open.
- **`/ccc-xray`: know where the repo stands.** A health scorecard scored 0 to 100 across quality, docs, tests, dependencies, security, performance and CI, plus context cost, with one recommendation for what to fix first.
- **`/ccc-plan`: a reviewed plan before any code.** Turns an idea, bug, refactor or Linear issue into a plan file with success and failure evals, so "what does done look like" is written down first.
- **`/ccc-build`: scaffold with an independent verifier.** Three questions pick the template; a background agent writes the files; the lead session then verifies the result itself before it says "scaffold ready", because the agent's report is a claim, not proof.
- **`/ccc-review`: a severity-rated review.** Reviews your branch or PR, or runs a security, performance or whole-project audit, and returns a report ranked by severity.
- **`/ccc-ship`: a GO, CAUTION or NO-GO before you release.** A parallel pre-flight matrix, then, each behind a picker, a tagged release with changelog, a deploy, or a rollback.

Behind the menus: 93 plugin skills (32 visible to Claude, the rest load only when you type their name, which keeps session start light: about 2,900 tokens in our measurement, down from about 6,700), 22 specialist agents, 28 lifecycle hook events with 46 handlers, and a 12-gate method (plan before build, verifier separate from worker, prove before alarm, loops need gates, leave durable state, and seven more).

**Safe by default.** Telemetry is off unless you opt in. `CCC_OFFLINE=1` blocks every outbound call Commander makes itself. The permission gate denies every force-push form. The secret-leak guard stops key literals before a tool runs. Every outbound call is listed in the README.

**Free.** The core is MIT-licensed and free. Revenue comes from disclosed affiliate links in the optional `/ccc-connect` wizard, consulting, an optional community and sponsorship. There is no paid tier.

Also ships for the Codex CLI, and for Cursor, Windsurf and Cline through the CLI toolkit.

## Code Mode support (CLI and plugin)

Claude Code's Code Mode lets Claude run a JavaScript program that makes many tool calls at once. Commander is built not to break it:

- `ccc doctor` and `/ccc-doctor` report Code Mode readiness read-only: the Claude Code version it needs, agent-teams and provider settings that keep it from starting, and the environment variables that block it. It never changes a setting.
- The secret-leak guard scans Code Mode programs for key literals before they run.
- The PreToolUse hooks run in one dispatcher process, so the cost tracker and the cost ceiling no longer race on the counter file, and the hooks stay quiet on Code Mode poll output instead of logging it as a prompt.

Source: commits `f9617ac` and `cf62150`; `commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics.js`, `hooks/orchestrator/pre-tool-use-dispatcher.js`, `hooks/secret-leak-guard.js`. These changes are not in `CHANGELOG.md` yet; add an entry before the release, or drop this section from the copy.

## Feature bullets (for a card or a tweet-length list)

- One next step, offered as a click-first menu
- `/ccc-xray` repo health scorecard, 0 to 100
- `/ccc-plan` plans with evals before code
- `/ccc-build` scaffolds that an independent verifier checks
- `/ccc-review` severity-rated reviews
- `/ccc-ship` GO, CAUTION or NO-GO pre-flight
- Code Mode readiness check and secret scanning
- 22 specialist agents, 28 hook events, 93 plugin skills
- Telemetry off by default; MIT; no paid tier

## Install lines

```
/plugin install commander --marketplace KevinZai/commander
```

After directory approval: `claude plugin install cc-commander@claude-community`.

## Claims check

Each claim above is backed by: `commander/cowork-plugin/skills/ccc-start|ccc-xray|ccc-plan|ccc-build|ccc-review|ccc-ship/SKILL.md` (descriptions and steps), README "Load on demand" table (the 2,900 and 6,700 token figures are CC-2112 measurements with a tokenizer proxy; say "in our measurement"), README "Data & network", `SECURITY.md`, and the permission-gate entry in the changelog. Do not add usage, install or star counts: telemetry shows near zero.
