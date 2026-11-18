# Launch plan: release 8.3

DRAFT for review. Nothing here has been posted, scheduled or sent. Dates are proposed (today is 2026-11-18) and slip with the release gate: nothing launches until 8.3 is tagged and `npm run release:gate` is green. The repo is at 8.1.6 with an Unreleased section; what ships as 8.3 is Kevin's call (open question in the report).

Goal: weekly active users (the 90-day north star, see `metrics.md`). Activation, a first finished result, is the leading signal. Every post therefore points at a one-line install and a first command (`/ccc-start`), not at the pricing or consulting pages. Revenue is secondary.

Evidence rule: draft posts state only what the repo backs. No install, user, star or revenue numbers (telemetry shows near zero; `docs/stats.json`). Numbers used: 93 plugin skills, 22 agents, 28 hook events, 46 handlers, 467 ecosystem skills (`commander/contract.json`), and the session-start token figures measured in CC-2112 (say "in our measurement").

## Sequence

All times US Pacific. Launch on a Tuesday; avoid the US Thanksgiving window (Nov 26-27).

### Pre-launch (Mon 2026-11-23 to Mon 2026-12-07)

| Date | Action | Owner |
|---|---|---|
| Mon Nov 23 | Decide 8.3 scope; add the missing Code Mode CHANGELOG entry; fix the site pricing and affiliate pages (see `revenue.md`) | Kevin |
| Wed Nov 25 | Add the WAU query and activation event or proxy (`metrics.md`); capture the six flagship screenshots and a 60-second recording of `/ccc-start` to `/ccc-xray` to `/ccc-plan` | Kevin, Claude |
| Mon Nov 30 | Create `KevinZai/cc-commander-plugin` and the mirror secret; build the mirror; local install test; `claude plugin eval` | Kevin |
| Wed Dec 2 | Submit to the directory portal (`plugin-directory-submission.md`). Approval timing is unknown; the launch does not wait for it | Kevin |
| Fri Dec 4 | Tag 8.3 after the release gate; verify a clean install on a machine that never had Commander (Claude Code 2.1.292 or later) and run `/ccc-start` end to end | Kevin |
| Mon Dec 7 | Final read of every draft below; schedule nothing automatically. Prepare a reply bank for likely questions (telemetry, license, Codex, cost, "what does it do that skills do not") | Kevin, Claude |

Pre-launch teaser (Dec 1 to Dec 7): two or three short posts from the Pulse queue (see below), no hard claims.

### Launch day (Tue 2026-12-08)

| Time | Action |
|---|---|
| 07:30 | Confirm the install line works from a clean machine one more time |
| 08:00 | Post the Show HN (draft below). Link the GitHub repo, not a landing page, so it is tryable without a sign-up |
| 08:10 | Post the X thread |
| 09:00 | Post to the Claude community and Discord channels where self-promotion is allowed (below) |
| 10:00 | Reddit posts, staggered by an hour and tailored per community. Never cross-post identical text |
| All day | Kevin answers every comment within the hour on HN and Reddit. No upvote requests, anywhere. Log questions for the FAQ |

### Week after (Wed 2026-12-09 to Tue 2026-12-15)

| Date | Action |
|---|---|
| Wed Dec 9 | Follow-up post: the most-asked question answered with a screenshot (from Pulse) |
| Thu Dec 10 | Short write-up: how `/ccc-build` verifies a scaffold instead of trusting the agent |
| Fri Dec 11 | First weekly review (`metrics.md`): WAU, activation, installs by source. Fix the biggest drop-off before the next post |
| Mon Dec 14 | Thank-you and what changed after feedback, with the fixes shipped as 8.3.x if any |
| Tue Dec 15 | Second weekly review; set the 90-day WAU target from the measured baseline |

If the directory approves during the window, post one announcement ("now installable as `cc-commander@claude-community`"), not before.

## Channels and rules

| Channel | Rule to respect | Format |
|---|---|---|
| X | Thread from Kevin's account; one image or the 60-second recording per post | Thread of 5 |
| Hacker News | Show HN must be something people can try without signing up; plain title, no marketing language, no asking for votes; first comment from the author with context | Title + first comment |
| Reddit | Only communities whose current rules allow self-promotion (check each sidebar and the weekly self-promotion thread the day before; r/ClaudeAI and r/ClaudeCode are candidates, r/programming is not). Disclose that you built it. One post per community | Text post |
| Discord | Only channels labelled for projects or showcases, in servers where Kevin is already a member; one message, no cross-channel spam | Short message |
| Claude community | Anthropic's community spaces for plugin showcases; confirm the current venue and rules first | Short post |

All channels: disclose authorship, link only the repo and docs, no affiliate links, no consulting pitch in the first post. Open questions in the report cover the Discord servers and handles to use.

## Drafts

### DRAFT: Show HN

Title: `Show HN: CC Commander, a guided project manager plugin for Claude Code (MIT)`

First comment:

> I built this. It's a Claude Code plugin: type `/ccc` and it reads your project, recommends one next step and offers the alternatives as a click-first menu, instead of leaving you with a blank prompt.
>
> The part I care most about is that the worker and the checker are different. `/ccc-build` scaffolds an app with a background agent, then the lead session verifies the result itself (runs the checks) before it reports "scaffold ready". `/ccc-plan` writes a plan file with success and failure evals before any code. `/ccc-ship` runs a pre-flight and returns GO, CAUTION or NO-GO before it tags or deploys. `/ccc-xray` scores a repo 0 to 100 across quality, tests, deps, security and CI. `/ccc-review` returns a severity-rated review.
>
> Some specifics: 93 plugin skills, but only 32 are visible to Claude; the rest load when you type their name, which in my measurement cut session-start context from about 6,700 to about 2,900 tokens. Telemetry is off unless you opt in, and `CCC_OFFLINE=1` blocks every outbound call it makes. The permission gate denies every force-push form. It's MIT, and there's no paid tier.
>
> Install: `/plugin install commander --marketplace KevinZai/commander` (Claude Code 2.1.292 or later). Try `/ccc-start`.
>
> It's early and I'd like to hear where it gets in your way. Repo: https://github.com/KevinZai/commander

### DRAFT: X thread

1. `I built CC Commander: a guided project manager for Claude Code. Type /ccc and it reads your repo, recommends one next step and gives you a click-first menu. Free, MIT. [recording]`
2. `/ccc-xray scores your repo 0-100 on quality, docs, tests, deps, security, performance and CI, and tells you what to fix first. [screenshot]`
3. `/ccc-plan turns an idea or a Linear issue into a plan file with success and failure evals before any code. /ccc-build then scaffolds it with a background agent and verifies the result itself. [screenshot]`
4. `/ccc-review gives a severity-rated review of your branch. /ccc-ship runs a pre-flight and says GO, CAUTION or NO-GO before it tags or deploys. [screenshot]`
5. `Telemetry is off unless you opt in. No paid tier. Install: /plugin install commander --marketplace KevinZai/commander then /ccc-start. https://github.com/KevinZai/commander`

### DRAFT: Reddit (r/ClaudeAI, adjust to each community's format and flair)

Title: `I built a free Claude Code plugin that plans, builds, reviews and ships with a separate verifier (MIT)`

> I'm the author. CC Commander is a Claude Code plugin that acts as a guided project manager: `/ccc` reads your repo and offers one recommended next step plus alternatives as a click-first menu.
>
> What it does that I haven't seen bundled elsewhere: `/ccc-build` has the lead session verify a scaffold instead of trusting the agent's report; `/ccc-plan` writes evals before code; `/ccc-ship` gives a GO, CAUTION or NO-GO pre-flight; `/ccc-xray` scores repo health; `/ccc-review` rates findings by severity. There are also 22 specialist agents and lifecycle hooks (28 events) that keep session state and block secret leaks.
>
> It's MIT, telemetry is off unless you opt in, and every outbound call is listed in the README. Install: `/plugin install commander --marketplace KevinZai/commander`, then `/ccc-start`. Feedback welcome, especially on where `/ccc-start` confuses you.

Note for Kevin: "that I haven't seen bundled elsewhere" is an opinion, not a repo fact; keep or cut it deliberately.

### DRAFT: Discord / Claude community (short)

> Sharing a free Claude Code plugin I built, CC Commander: a guided PM with `/ccc-start`, `/ccc-xray` (repo scorecard), `/ccc-plan`, `/ccc-build` (scaffold checked by an independent verifier), `/ccc-review` and `/ccc-ship` (GO/CAUTION/NO-GO). MIT, telemetry off by default. `/plugin install commander --marketplace KevinZai/commander` then `/ccc-start`. Would value feedback. https://github.com/KevinZai/commander

### DRAFT: Code Mode note (week-after post, only once the CHANGELOG entry exists)

> If you use Claude Code's Code Mode: Commander's `ccc doctor` reports whether Code Mode can start on your setup (version, provider and agent-teams settings) without changing anything, and its secret-leak guard scans Code Mode programs for key literals before they run.

## Commander Pulse: a steady content stream

Commander Pulse (`kzicherman/commander-pulse`) turns work events into drafted posts that are approved in Discord. Facts here come from the brief for this plan; the Pulse repo was not read, so confirm its event list and approval flow with Kevin before relying on the specifics below.

How it feeds the plan:

1. **Events in**: merged changes, tagged releases, a flagship skill's output, a fix prompted by a user report.
2. **Drafts out**: Pulse drafts a post per event. Each draft must cite the commit, PR or CHANGELOG line it rests on (the evidence rule above); a draft without a source is rejected at approval.
3. **Approval in Discord**: Kevin approves, edits or drops each draft there. Nothing posts without that step; the launch-day posts above are written by hand, not by Pulse.
4. **Cadence**: two to three posts a week after launch, one theme per flagship (`/ccc-start`, `/ccc-xray`, `/ccc-plan`, `/ccc-build`, `/ccc-review`, `/ccc-ship`), plus the Code Mode readiness check. A "what changed" post per release.
5. **Measurement**: each post uses a UTM-tagged repo or docs link (`utm_source=<channel>&utm_campaign=<post>`); the weekly review reads which posts moved WAU and activation, and the next week's Pulse themes follow.
6. **Guardrails**: no counts we do not have; no consulting or affiliate links in launch-week posts; always disclose affiliate links elsewhere.
