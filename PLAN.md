# CC Commander — Roadmap

**Dated:** 2026-11-18 · **Current release:** 8.1.6 · **History:** [CHANGELOG.md](CHANGELOG.md)

This is the current roadmap. Release facts (versions, counts, what shipped) live in `package.json`, `commander/contract.json` and the changelog, not here. Core skills, agents, hooks, mods, workflows and connectors stay free; the plugin works fully offline and MCP stays opt-in.

## Release 8.2: platform refresh

Bring the plugin up to the current Claude Code platform surface (facts in `docs/reference/platform-facts-2026-10.md`).

- Deferred MCP loading: connectors load on demand, not at session start.
- `userConfig`: plugin settings declared in the manifest instead of hand-edited files.
- Plugin data dir: persistent state in the plugin's own data directory, with lane-aware fallback.
- Monitors: background monitors for long-running checks (CI, PR wait, fleet).
- Code Mode readiness: the doctor and tool references work when tools are called as code.
- Context budget: measured per-skill and per-hook context cost, with a budget the release gate enforces.

Done when: `claude plugin validate ./commander/cowork-plugin --strict` and the release gate pass, the Codex mirror is regenerated, and the context budget is reported in `/ccc-doctor`.

## Release 8.3: flagship workflows

Six flagships, each with a verifier and an eval, so the claim "it works" is measured.

- `/ccc-start`: first-run onboarding that ends in a real first task.
- `/ccc-xray`: read a repository and report its shape, risks and commands.
- `/ccc-plan`: turn a goal into a plan with acceptance criteria.
- `/ccc-build`: execute a plan in an isolated worktree.
- `/ccc-review`: adversarial review of a diff.
- `/ccc-ship`: checks, PR and handoff, only with authorization for the actual action.

Activation metric: share of new installs that complete one flagship end to end within seven days, counted from opt-in telemetry only. Done when each flagship has a verifier, at least one `claude plugin eval` case scoring it, and the activation metric is reported.

## Distribution

- Plugin directory submission: package, review notes and screenshots.
- Launch: announcement, demo, install-in-one-command path.
- Pulse content: recurring write-ups of what Commander users and fleets are shipping, from opt-in aggregate data.

## Revenue

Core stays free and portable. Revenue is disclosed and opt-in:

- Consulting (primary).
- Affiliate links, clearly disclosed.
- Optional community.
- Sponsorship.

No paid tier gates core features.

## Not planned

Gating core skills, agents, hooks or connectors; folding `claude-mem` (AGPL) into the MIT distribution; services that need personal paths or credentials.
