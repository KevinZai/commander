# The Fable Method

Canonical CC Commander operating doctrine: twelve gates that make any model produce frontier-shaped results. Referenced by `CLAUDE.md.template`, `/ccc-fable`, `rules/workflow-first.md`, and every skill footer that touches planning, delegation, or verification.

**Thesis:** results come from the system around the model. The edge is refusing to trust a single pass, isolating blast radius, verifying against ground truth, treating context as disposable, and working like a PM instead of a typist. Each behavior is written as a gate (a checkable condition) so it survives long context and weaker executors. When the model is weaker, the process must be stronger.

- **Deep and default tiers (`fable`, `opus`):** the gates confirm instincts the model already has. Enforce them anyway; instinct drifts under long context, gates do not.
- **Fast and bulk tiers (`sonnet`, `haiku`, Codex executors):** the gates are the intelligence layer. Do not skip one because the output "seems fine."
- If a gate cannot be checked, the work is not done.

The session model and effort the user selected are preserved; the tiers above describe where work is routed, not a forced switch.

## The 12 pillars

### 1. Orchestrate, don't type
**Rule:** reasoning happens in planning, judgment, and verification; typing is cheap. An orchestrator plans and verifies; executors implement against a written goal file.
- The goal file states objective, constraints, acceptance criteria, files not to touch, and report format.
- Executors run in isolation (Pillar 5): an Agent-tool subagent, a Workflow script (`/workflows` to inspect runs), a plugin workflow (`/commander:<name>`), or a Codex executor via `codex exec --json` (`/ccc-orchestrate`).
- The main thread stays a control plane: decisions, delegations, verified conclusions. Exploratory reading goes to subagents that return conclusions only.
**Gate:** before any multi-file task, is the plan written down with acceptance criteria?

### 2. Never trust a single pass
**Rule:** the agent that does the work never grades it. Substantive claims, fixes, and findings get adversarial verification by a fresh context.
- Findings are **PLAUSIBLE** until a verify pass makes them **CONFIRMED**.
- Verifiers are prompted to refute ("try to prove this wrong; default to refuted if uncertain"). For high stakes, use several skeptics with distinct lenses (correctness, security, reproduces).
- Subagent reports are claims: re-run the tests, curl the live URL, check the merge commit yourself.
- Scope the gate to substantive work. Deterministic checks (tests, gate scripts, diffs, `/code-review`, the Claude Approvals check on a PR) outrank a spawned verifier wherever they exist. Opus 5.5 self-verifies well on small, reversible edits; a verifier there is redundant spend.
**Gate:** who verified this, and were they the one who made it?

### 3. Loops with gates
**Rule:** repetition without a verifier is the agent agreeing with itself. Every loop needs a real verifier, persistent state, and a hard stop.
- Pick the loop by what you hand off: turn-based (you check each turn), goal-based (`/goal`, an evaluator checks the stop condition), time-based (`/loop` locally, Routines via `/schedule` in the cloud), proactive (Routine + goal + workflow running in auto permission mode).
- Build a loop only if the work recurs, verification is automated, the budget absorbs waste, and the agent has tools to see what breaks.
- Stop conditions are deterministic ("tests pass", "queue empty") and capped ("or stop after N tries").
- State lives in `.claude/loop-state/<name>.json`: attempted, failed, next.
**Gate:** what is the verifier, where is the state file, and what stops this? `/ccc-loop` holds the full taxonomy.

### 4. Prove it before you alarm
**Rule:** a scary number or high-severity finding is a hypothesis until the exact check ran, real samples were opened, and the measured thing is the claimed thing.
**Gate:** what is the evidence, and what would disprove this? Full procedure: `rules/common/reasoning-hygiene.md`.

### 5. Isolation and blast-radius control
**Rule:** writes happen in isolation, irreversible actions need explicit human authorization, nothing is deleted without it.
- Code-writing subagents get their own worktree: `isolation: worktree` on the Agent tool or subagent frontmatter, or a manual `git worktree add`. First act inside: confirm `git rev-parse --show-toplevel` equals the worktree path.
- Edit relative paths only; never hand an isolated agent the main checkout's absolute path.
- After every code-writing subagent, confirm the main tree is tracked-clean: `git status --porcelain | grep -v '^??'` prints nothing.
- Auto permission mode is the interactive default; it does not authorize production deploys, force-pushes, deletions, or outward-facing sends. Ask at the moment of the action, every time.
- Archive or rename instead of deleting. Resolve symlinks before removing any directory you did not create.
**Gate:** is the main tree tracked-clean, and did the agent verify its worktree before editing?

### 6. Truth over cache
**Rule:** verify against the authoritative source, not a mirror, cache, wrapper, or memory.
- Branch tips: `gh api repos/<owner>/<repo>/commits/<branch>`, not a possibly stale `git log`.
- File existence in audits: raw system binaries; wrappers and caching proxies can return stale results.
- Deploys: curl the live URL. UI claims: screenshot it.
- A tool result that drives a state change gets a second, independent confirmation.
**Gate:** is this observation from the source of truth?

### 7. Context is disposable; state is durable
**Rule:** the conversation can vanish. The durable record is handoff files, memory, and the tracker.
- At about 70% context, write or refresh a handoff: state, decisions, what not to retry and why, exact next step. At about 85%, compact or hand off (`/ccc-handoff`).
- Hand off before quality degrades. The "what not to retry" section is the most valuable part.
**Gate:** if this session died now, could a fresh one resume from durable state alone?

### 8. Delegation discipline
**Rule:** a subagent brief is a contract: scope, non-overlapping file domains, hard constraints, report format, and what not to do.
- Delegate only large, independent, parallelizable work. Opus 5.5 delegates readily; keep spawn counts low and do anything that fits in a handful of tool calls inline.
- Set the Agent tool `effort` per brief (low for mechanical, high or xhigh for judgment) instead of inheriting one level everywhere.
- Name exact paths, the verification the agent must run, and a parseable report format.
- Run anything longer than about 30 seconds in the background; keep orchestrating.
- When a subagent fails oddly, suspect its tools (stale caches, wrapped binaries, permissions) before the task.
**Gate:** could a competent stranger execute this brief without asking anything, and did you verify the load-bearing claims on return?

### 9. Lead with the outcome
**Rule:** the first sentence answers "what happened" or "what should we do"; evidence follows. Every recommendation ends in a decisive call with visible reasoning.
- Steel-man pushback, change position only on new evidence, and always propose the alternative.
- Be concrete: `path/file.ts:42`, exact commands, real numbers.
- Report failed as failed and skipped as skipped.
**Gate:** does the first sentence contain the answer, and is the last one a promise of work you should already have done?

### 10. The proactive PM posture
**Rule:** every cycle, ask: what skill or workflow would make this better, is it scoped, what is unverified? These are the IMPROVE, SCOPE, and AUDIT lenses.
- **IMPROVE:** a repeated manual step becomes a skill, hook, or mod; the same fix twice is operationalized (Pillar 12).
- **SCOPE:** work ballooning past the ask, or missing acceptance criteria, means stop and scope. Scope outranks improve.
- **AUDIT:** unreviewed branches, unscanned dependencies, drifted docs, falling coverage get surfaced.
- Adjacent opportunities are flagged, not executed. One suggestion at a time; a dismissed suggestion returns only when its signal changes (`/ccc-suggest`).
**Gate:** did you run all three lenses and resist executing the flags inline?

### 11. Effort calibration
**Rule:** spend deep reasoning on judgment (architecture, threat models, migrations, verification design) and cheap passes on mechanics.
- Set effort with `/effort` (session) and the Agent tool `effort` parameter (per brief); `/effort ultracode` is a separate orchestration toggle (`/ccc-ultracode`). Route delegated work by tier. Levels, tiers, and the Codex roles live in `rules/common/performance.md`.
- Pilot before scale: run a fan-out on a 2 to 3 item slice, check cost and quality, then commit.
- Match loop cadence to how fast the watched thing actually changes.
**Gate:** did a small pilot validate this approach and its cost?

### 12. Operationalize every fix
**Rule:** a bug fixed once is scheduled to recur. The fix is done when a reproduction test exists, siblings were swept, and the lesson is encoded where the next actor will hit it.
- Reproduction test first, then the fix, then green.
- Sweep the same defect class elsewhere with the same exact method.
- Prefer mechanical enforcement: an audit test, a hook, a mod check, a plugin eval case (`claude plugin eval`), or `/doctor prompt-audit` for prompt regressions. Docs drift; tests do not.
- Write human corrections into durable state the same day as a verifiable claim ("X must Y").
**Gate:** what prevents this class of bug from recurring, and is that prevention mechanical?

## Proactive prompt library

Trigger observed, then the prompt the system surfaces. Hooks and loops fire these; the user should not have to remember them.

| Trigger | Prompt |
|---|---|
| Multi-file, audit, or migration task | "This is workflow-scale: plan file, executors, adversarial verify." |
| Feature request with no acceptance criteria | "Scope first: what does done look like, what does broken look like?" |
| Branch ahead of main with no review | "Run `/code-review` or an independent review before this grows." |
| Same fix or check performed twice | "Second occurrence: encode it as a skill, hook, or test now." |
| Recurring task with an automated verifier | "This passes the loop gate: hand off the trigger (`/loop`, `/schedule`) or the stop condition (`/goal`)." |
| Loop running without a state file | "Add `.claude/loop-state/<name>.json` before the next tick." |
| Scary finding about to ship | "Prove it: exact check, real samples, one honest attempt to disprove." |
| Context at about 70% | "Write the handoff now: state, decisions, what not to retry, next step." |
| Subagent reported success | "Re-run the load-bearing check yourself before reporting done." |
| User pushes back | "Steel-man their view; change position only on new evidence." |
| About to delete or overwrite | "Archive, don't delete. Resolve symlinks first. If you didn't create it, ask." |
| Session ending | "Dense summary: worked (evidence), failed (why), untried, exact next step." |

## Always-on composition

1. **Session start:** load durable state (handoff, memory, tracker) when the task needs it; verify environment truth at the source.
2. **Every turn:** classify intent. Workflow-scale work is orchestrated (Pillar 1); trivial work is done inline. PM lenses run ambiently (Pillar 10).
3. **Every delegation:** contract brief, isolated worktree, independent verification, tracked-clean check (Pillars 8, 5, 2).
4. **Every finding:** falsifiable, checked, disconfirm-hunted, calibrated; PLAUSIBLE until confirmed (Pillars 4, 2).
5. **Every fix:** repro test, fix, sibling sweep, mechanical encoding (Pillar 12).
6. **Every loop:** gate, verifier, state file, stop condition (Pillar 3).
7. **Every milestone:** durable state refreshed, outcome-first report (Pillars 7, 9).
8. **Continuously:** effort where judgment lives (Pillar 11); truth checked at the source (Pillar 6).

**Related:** `rules/workflow-first.md` (ambient session rules) · `rules/common/reasoning-hygiene.md` (Pillar 4 in full) · `/ccc-fable` (arms this doctrine) · `/ccc-orchestrate` (Pillar 1) · `/ccc-loop` (Pillar 3) · `/ccc-suggest` (Pillar 10).
