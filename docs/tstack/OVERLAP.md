# tstack overlap review (CC-2124)

Upstream: [t3dotgg/tstack](https://github.com/t3dotgg/tstack) at `92e38e2cf677a84a142e8df296861c588542135c` (MIT, Copyright (c) 2026 Theo Browne). Each upstream skill was compared with the plugin skills in `commander/cowork-plugin/skills/`, the toolkit commands in `commands/` and the ecosystem skills in `skills/`. NAMING.md rule 1 requires the `ccc-` prefix, so every skill is renamed; none duplicates an existing skill's job, so none is merged into another.

| Upstream skill | Closest CCC equivalent | Decision | Why |
|---|---|---|---|
| `full-send` | `/ccc-night-mode` (spec-first overnight build loops), `/ccc-ship` (release, tag, deploy) | new, renamed to `ccc-full-send` | Night mode builds a spec over many cycles and ship cuts releases; neither takes one change to a merged PR. The merge path is rewritten behind CCC's local green-suite gate. |
| `full-stop` | `ccc-full-send` (this batch) | new, renamed to `ccc-full-stop` | A thin variant that reads `ccc-full-send` and forbids merging. Kept separate because the trigger phrase and the authority differ (no merge grant), and Codex needs its own `openai.yaml`. |
| `council` | `/ccc-debate` (single-provider lens debate), `/commander:ccc-fleet-run` judge and debate modes, ecosystem `dialectic-review` | new, renamed to `ccc-council` | The others run Claude agents in different roles. Council asks one flagship model per provider (Claude, OpenAI via Codex, an opt-in third) and loops on scores. The routes are disjoint: "debate" goes to ccc-debate and "council" to ccc-council. |
| `sol-loop` | `/ccc-codex` (manages the Codex CLI, one-shot reviews), `/ccc-orchestrate` (Codex as executor) | new, renamed to `ccc-sol-loop` | ccc-codex manages the CLI and ccc-orchestrate executes with Codex. Neither runs a budgeted review loop with a findings ledger. The name keeps the user's trigger "sol loop"; the reviewer is Codex `gpt-6.1-sol` (PROMPT-STANDARD §7 bans the bare "Sol"). |
| `file-pr` | toolkit command `commands/ccc-pr.md` (commit, test, push, open), `/ccc-agent-writing` (drafts PR descriptions) | new, renamed to `ccc-file-pr` | `/ccc-pr` is a CLI-toolkit command, not a plugin skill, and the names stay unique (command-name-uniqueness). ccc-file-pr owns filing in the plugin, with title and body rules, a draft until green and the local check record. ccc-agent-writing stays the general doc drafter. |
| `takeover` | `/ccc-handoff` and `/ccc-resume-session` (your own session state) | new, renamed to `ccc-takeover` | Those resume your own context. Takeover inherits someone else's PR, branch or thread and keeps their Git credit. |
| `babysit-pr` | `/ccc-ci` (diagnose a failed CI run), CLI adventure "PR Babysitter" (`--task babysit` loop dispatch), ecosystem `auto-loop-patterns` | new, renamed to `ccc-babysit-pr` | ccc-ci diagnoses one failure. The adventure entry is a timed loop task. ccc-babysit-pr is the event-driven watcher (`scripts/pr-wait`) plus review-bot handling, and it is what the new PR workflows menu opens. |
| `modernize` | none (ecosystem `using-git-worktrees` covers worktrees only) | new, renamed to `ccc-modernize` | No CCC skill decides whether an old PR should still exist. It is rewritten to merge the base in rather than rebasing a pushed branch. |
| `leaving-pr-comments` | none (`/ccc-broadcast` relays to team chat, not GitHub) | new, renamed to `ccc-pr-comments` | The shortened name keeps the `ccc-` slug short. It is hidden (on demand), and the other tstack skills read it before posting. |

## Surfaces each skill now ships on

- Plugin: `commander/cowork-plugin/skills/<name>/SKILL.md` with `LICENSE.txt` and `agents/openai.yaml`; all nine set `disable-model-invocation: true`, so the skill listing budget is unchanged.
- Routing: curated hints in `commander/core/route-hints.json` → `hooks/lib/ccc-routes.json` (`npm run build:routes`), with positive and negative cases in `commander/tests/fixtures/routing-prompts.json`. Manual skills are offered in the router menu ("user types it") and selected by `ccc next`; they never auto-run.
- CLI menu: `commander/adventures/pr-workflows.json`, opened from the main menu (`p`).
- Codex: generated into `commander/cowork-plugin-codex/skills/` by `npm run build:codex`; `agents/openai.yaml` sets the display metadata and `policy.allow_implicit_invocation: false`.
