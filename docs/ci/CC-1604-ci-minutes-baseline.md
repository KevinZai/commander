# CC-1604 slice 1: CI minutes and redundant-run baseline (read-only)

Window: 2026-09-22 to 2026-10-22 (30 days). Source: `gh api repos/*/actions/runs` and `.../timing` (read-only), run on 2026-10-22 by Fleet chunk t_6bjfmd5z51.
No billing, workflow or runner changes were made.

## Billing data: not available with the current token
| Endpoint | Result |
|---|---|
| `/users/kzicherman/settings/billing/usage` | 404, needs the `user` scope |
| `/users/kzicherman/settings/billing/actions` | 404, needs the `user` scope |
| `/orgs/KevinZai/settings/billing/actions` | 410 (moved), needs `admin:org` |

The per-run `timing` endpoint returned `billable.*.total_ms = 0` on all 96 sampled runs (15 most recent per repo; fewer where a repo had fewer runs), including the macOS jobs. That means the per-run billable field cannot be used to measure spend here.
**Exact billed minutes by OS need Kevin to choose one option:**
- 🟢 Kevin downloads the GitHub billing usage CSV (Settings → Billing → Usage), with no token change.
- Refresh the gh token with the `user` scope.

## Run baseline (all repos with runs in the window)
| Repo | Runs | Fail | Cancel | Dup runs (same SHA + workflow) | Top workflows |
|---|---|---|---|---|---|
| kzicherman/clawd | 637 | 119 (19%) | 4 | 574* | Ops Deadman 496 (schedule), PR Agent 140 |
| kzicherman/readyiq | 298 | 160 (54%) | 6 | 0 | E2E Tests 95, Unit + Types 95, Security Sweep 94 |
| KevinZai/commander | 250 | 19 (8%) | 2 | 12 | Claude Code Review 82, CI 68, Lighthouse CI 33 |
| kzicherman/paperclip | 198 | 89 (45%) | 1 | 42 | CI profile 43, Storybook Visual 43, PR 43 |
| kzicherman/dmhub | 37 | 14 (38%) | 0 | 0 | CI 37 |
| kzicherman/gbrain | 11 | 2 | 8 | 1 | Nightly watch, CI health, macOS 26 validation |
| kzicherman/fleet | 5 | 0 | 0 | 2 | Tests, control-plane |
| kzicherman/commander-pulse | 4 | 4 (100%) | 0 | 0 | CI |
| kzicherman/kevinzai | 1 | 1 | 0 | 0 | Visual Regression (macOS) |
| kzicherman/panel-of-experts | 1 | 0 | 0 | 0 | test |

\* clawd's duplicates are mostly a scheduled workflow (Ops Deadman) re-running on an unchanged default-branch SHA. That is expected for a cron, but at about 16 runs a day it is the largest run count in the account.

Wall-clock sample (15 most recent completed runs per repo, total minutes; `run_duration_ms` includes queue time, so it is not billed time): dmhub 300, readyiq 95, paperclip 94, commander 10.7, clawd 3.0. gbrain's 10 sampled runs total about 12,961 minutes, about 21 h per run, which is above the 6 h hosted-job limit. That is most likely queue time or a self-hosted runner, not billed hosted minutes. **gbrain is the top run-hygiene risk; whether it costs money is unproven until the billing CSV is in.**

Confidence: 🎯 70% on the run counts and ratios (complete API listing). Minutes are a 15-run sample and are wall-clock, not billed.

## Redundant and wasteful spend, ranked
1. 🥇 **gbrain**: 8 of 11 runs cancelled, after very long wall-clock durations, including a macOS 26 validation job. macOS would bill at 10x if hosted, but billing is unproven (billable = 0). Proposal: `timeout-minutes` on every job; macOS only on a label or nightly.
2. 🥈 **readyiq**: a 54% failure rate across three parallel workflows per PR (E2E, Unit + Types, Security Sweep). Proposal: a `concurrency: {group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }}}` group (cancels only superseded PR runs, never push-to-main); run E2E after Unit + Types with a job-level `needs:` **inside the same workflow** (not `workflow_run`, which changes the check context). Skip docs-only PRs with a job-level `if:` on a changed-files step rather than workflow-level `paths-ignore`: a required check skipped by `paths` stays "Expected — waiting" and blocks merge. Use local exact-SHA unit/type/security receipts per the AC, but keep the required hosted check names so branch protection semantics don't change.
3. 🥉 **paperclip**: a 45% failure rate, with `workflow_run` + `pull_request_target` fan-out (CI profile → Storybook → PR, 43 each). Proposal: gate Storybook Visual with a job-level `if:` on changed UI files (not workflow `paths`, for the same required-check reason).
4. **clawd Ops Deadman**: 496 scheduled runs a month. Proposal: halve the cron cadence. Don't move it to Alfred cron: a deadman should not run on the infrastructure it watches.
5. **commander**: Claude Code Review runs on every PR sync (82). Proposal: `concurrency` cancel-in-progress for `pull_request` events only, and skip draft PRs (`if: !github.event.pull_request.draft`).

## Next slice (needs a new draft PR per repo; not done here)
- First list each repo's required check names from branch protection (`gh api repos/O/R/branches/main/protection`, which needs admin read). Then apply the concurrency, job-level `if:` and timeouts changes per repo, keeping those names unchanged.
- Self-hosted runners need Kevin's approval plus an isolation and disk budget (held).
