---
name: ccc-spawn
description: "Plan and launch parallel Claude Code peers (quick, team, swarm or domain expert), each on its own branch and worktree with non-overlapping files, then track or stop them. Use when work splits into independent parts that should run in separate sessions."
triggers:
  - "/ccc-spawn"
  - "/ccc-spawn quick"
  - "/ccc-spawn team"
  - "/ccc-spawn swarm"
  - "/ccc-spawn expert"
  - "/ccc-spawn status"
---

# /ccc-spawn — parallel peers with clear boundaries

**CC Commander** · /ccc-spawn · a reviewed spawn plan, ready-to-run peer commands, and a status view of the peers you launched.

## Before you spawn

- Peer messaging uses the claude-peers MCP server (`list_peers`, `send_message`, `check_messages`, `set_summary`). It is opt-in and absent by default. Without it, peers still run, but `status` and `kill` fall back to `git worktree list` and the user closing terminals; say so once.
- For parallel work inside this session, the built-in route is usually simpler: the Agent tool with `isolation: worktree` for a few bounded tasks, the Workflow tool for scripted fan-out, or `/ccc-fleet`. Offer it when the user has not asked for separate sessions.
- Codex: launch peers with `codex exec --json --cd <worktree> "<prompt>"` instead of `claude -p`.
- Peers inherit the user's selected model. Add `--model <alias>` (`fable`, `opus`, `sonnet`, `haiku`) only when the user chooses one for a role.
- Never quote a dollar estimate without a source. Describe cost as relative (one peer ≈ one session of that size) and point to `/ccc-cost` for actuals.

## Routing

Parse `$ARGUMENTS`:

| Form | Flow |
|---|---|
| empty | Menu |
| `quick <task>` | Quick: one self-contained peer |
| `team <n> <role1> <role2> …` | Team: n peers with assigned roles |
| `swarm <goal>` | Swarm: decompose the goal into a peer team |
| `expert <domain>` | Expert: one domain review peer |
| `status` | Status of active peers and messages |
| `templates` | Pre-built team compositions |
| `kill` | Ask every spawned peer to finish and exit |

## Menu

With no arguments, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Quick — one fire-and-forget peer for a self-contained task
- Team or swarm — several peers; you name the roles, or the goal is decomposed for you
- Expert review — one domain expert reviews files you choose
- Manage — status, templates, or stop peers

For **Team or swarm**, ask next: 🟢 Swarm (decompose my goal) · Team (I name the roles) · Template (start from a pre-built team). For **Manage**, ask: 🟢 Status · Templates · Kill.

## Safety checks (every spawn)

Run these before generating launch commands. If any fails, explain it and ask the user to fix it or explicitly confirm proceeding.

1. Work is committed or checkpointed: `git status --porcelain` is empty, or the user ran `/ccc-checkpoint`.
2. Total peers (existing from `list_peers` plus new) is at most 8.
3. File boundaries are non-overlapping across peers.
4. Branch names are unique and follow `spawn/<goal>/<role>`: `git branch --list 'spawn/<goal>/*'` returns none of them.
5. The user accepts the relative cost of running that many sessions.

## Peer launch command

Every peer gets its own worktree and a fully self-contained prompt; never assume shared state.

```bash
git worktree add "../<repo>-spawn-<role>" -b "spawn/<goal>/<role>"
cd "../<repo>-spawn-<role>" && claude -p "<prompt>" --allowedTools "Edit,Write,Read,Bash,Grep,Glob"
```

Each prompt contains:

- ROLE and TASK
- BRANCH and the worktree path
- FILE BOUNDARIES: the explicit files and directories this peer owns, and that it must not edit anything else
- CONTEXT: specs, schemas and API contracts it needs, pasted in full
- ON START: call `set_summary("<Role>: <task>")` when the claude-peers tools are available
- WHEN DONE: run the project's tests, commit on its branch, and send a completion message (branch, files changed, test result) to the coordinator with `send_message`
- OUTPUT: where results go (files, branch, or stdout)

## Quick (`quick <task>`)

1. Take the task from `$ARGUMENTS`. If empty, ask "What task should the peer handle?"
2. Check it is self-contained. If it depends on uncommitted work in this session, warn and offer to commit or checkpoint first.
3. Rate complexity (simple, medium, complex) to set expectations.
4. Run the safety checks, then print the launch command with the generated prompt, where to run it (a new terminal tab or pane), and where the output will appear.
5. Set your summary when available: `set_summary("Coordinator: spawned quick peer for <task>")`.
6. Tell the user to track it with `/ccc-spawn status` or `/ccc-peers list`.

## Team (`team <n> <roles…>`)

1. Parse n and the roles. If either is missing, ask for the peer count and the overall goal.
2. n must be 2 to 8; otherwise explain the limit and ask again.
3. Plan each peer: role, task, file boundaries, branch `spawn/<goal>/<role>`, relative cost.
4. Present the plan:

   ```
   TEAM SPAWN PLAN: <goal>
   Peers: <n>    Branches: spawn/<goal>/<role>

   | # | Role | Branch | File boundaries | Task |
   |---|------|--------|-----------------|------|
   ```

5. Ask with AskUserQuestion: 🟢 Spawn — generate the launch commands · Modify — change roles or boundaries, then re-plan · Cancel — nothing is created.
6. On Spawn, suggest `/ccc-checkpoint` if the tree is dirty, run the safety checks, create the worktrees, and print one launch command per peer.
7. Verify with `git worktree list`; every planned branch appears. Report any that failed to create.
8. Set your summary: `set_summary("Coordinator: managing <n> peers for <goal>")`. Monitor with `list_peers` and `check_messages`, and remind the user that `/ccc-spawn status` shows progress.

## Swarm (`swarm <goal>`)

1. Take the goal from `$ARGUMENTS`; ask if empty.
2. Decompose it: independent units of work, the specializations needed, natural file or module boundaries, and the dependency graph.
3. Apply the heuristics: one independent unit per peer; at most 8 peers; merge units that share files or mutable state; prefer fewer focused peers over many shallow ones; order dependent units into waves.
4. Present the analysis:

   ```
   SWARM ANALYSIS: <goal>
   Independent units: <n>    Recommended peers: <n> (max 8)

   | # | Role | Scope | Deliverable | Depends on |
   |---|------|-------|-------------|------------|

   Wave 1: peers <ids> (parallel)
   Wave 2: peers <ids> (after <ids> complete)
   ```

5. Ask: 🟢 Spawn wave 1 · Modify — re-plan with the user's changes · Cancel.
6. On Spawn, follow Team from step 6 for the first wave only. Launch a later wave when its dependencies report completion.
7. Run the swarm with the coordinator protocol in the `spawn-manager` skill (monitoring, failure recovery, merge order).

## Expert (`expert <domain>`)

1. Take the domain from `$ARGUMENTS`. If it is empty or not in this list, show the list and ask:

   | Domain | Reviews |
   |---|---|
   | security | OWASP Top 10, auth, injection, secrets, dependency vulnerabilities |
   | performance | N+1 queries, memory leaks, bundle size, caching, lazy loading |
   | design | Component patterns, responsive layout, UX heuristics |
   | testing | Coverage gaps, edge cases, flaky tests, test architecture |
   | devops | CI/CD, containers, deployment, monitoring, infrastructure |
   | database | Schema design, indexes, migrations, query plans |
   | api | REST/GraphQL design, versioning, pagination, error handling |
   | accessibility | WCAG 2.2 AA, screen readers, keyboard navigation, ARIA |

2. Ask which files or modules the expert should review.
3. Generate the expert prompt: the domain's review criteria, the target paths, read-only instructions, and an output contract — one finding per item with severity (CRITICAL, HIGH, MEDIUM, LOW), `path:line`, the issue, why it matters, and a recommended fix with code. On start, `set_summary("<Domain> expert: reviewing <target>")`; when done, send the findings to the coordinator with `send_message`.
4. An expert peer is read-only, so it needs no worktree; launch it in the current checkout with `--allowedTools "Read,Grep,Glob"`. Print the command for a new terminal.
5. Set your summary: `set_summary("Coordinator: spawned <domain> expert to review <target>")`.

## Status (`status`)

1. Call `list_peers` with scope `repo`; if empty, retry with scope `machine`. Without the claude-peers tools, run `git worktree list` and report spawn branches instead.
2. Call `check_messages`.
3. Print:

   ```
   ACTIVE PEERS
   | ID | Summary | Working directory | Status |
   |----|---------|-------------------|--------|
   Total active: <n>

   PENDING MESSAGES: <n>
     From: <id> (<summary>)
     Content: "<first 200 characters>…"
   ```

4. With no peers, say "No active peers. Use `/ccc-spawn quick`, `team` or `swarm` to create some."
5. When a pending message asks a question, offer to reply: `/ccc-peers send <id> <message>`. Other actions: `/ccc-peers broadcast <message>`, `/ccc-spawn kill`.

## Templates (`templates`)

| Template | Roles |
|---|---|
| Feature team | frontend, backend, tester, plus you as coordinator |
| Review board | security, performance and correctness reviewers, plus a synthesizer |
| Research squad | package-registry, GitHub, docs and community researchers, plus a synthesizer |
| Bug hunt | two reproducers, one fixer, one regression tester |
| Migration crew | schema, data migrator, rollback tester, verifier |
| Content factory | three writers, an editor, an SEO optimizer |

Ask with AskUserQuestion: 🟢 Feature team · Review board · Bug hunt · Other template (then a second picker with the remaining three). Pre-fill Team from step 3 with the chosen roles, then ask for the specific goal and any changes.

## Kill (`kill`)

1. Call `list_peers` to find active peers.
2. Ask with AskUserQuestion: 🟢 Ask all <n> peers to finish and exit · Pick peers — choose which ones · Cancel.
3. Send each chosen peer: "COORDINATOR: Task complete. Finish any in-progress work, commit your changes, and exit."
4. Call `list_peers` again after a short wait and report "<n> exited, <n> still running".
5. For peers still running, suggest checking again in a minute or closing their terminals. Leave worktrees and branches in place; removing them is a separate step the user asks for.

## Done when

The plan was approved and every planned worktree appears in `git worktree list`, or the status/kill report reflects a fresh `list_peers` (or `git worktree list`) result.

## Guardrails

- Never spawn, message or stop peers without the picker confirmation in that flow.
- Never give two peers overlapping file boundaries or the same branch.
- Never delete worktrees or branches from this command.
- Messages to peers are inter-session messages; send only the ones listed in these flows.

## See also

`/ccc-peers` · `/ccc-fleet` · `/ccc-checkpoint` · `/ccc-sessions`
