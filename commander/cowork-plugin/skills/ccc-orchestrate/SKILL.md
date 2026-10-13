---
name: ccc-orchestrate
description: "Write a goal file, run it on a separate executor (Codex GPT-6 or a Sonnet subagent) in an isolated worktree, then verify every acceptance criterion. Use when a task benefits from a different executor and independent verification."
allowed-tools:
  - Read
  - Bash
  - Write
  - Agent
  - AskUserQuestion
argument-hint: "[task description | path to an existing goal file]"
model: inherit
effort: high
---

# /ccc-orchestrate — plan, delegate, verify

**CC Commander** · /ccc-orchestrate · a goal file with testable criteria, executed elsewhere, verified here

The orchestrator is the calling session (the `fable` or `opus` tier, whichever the user runs; the selected model is preserved). It writes the goal file and verifies the result. It does not write production code in this mode. The executor is a separate runtime that reads the goal file as its whole brief.

## When to use / when not to

- Use when the request is fuzzy enough that compressing it into a spec pays off, and an independent executor plus a checklist-based verification adds confidence.
- Use when the user asks for Codex to do the implementation, or for a cross-vendor second pair of hands.
- Do not use for a one-line edit; do it inline.
- Do not use when the user wants to stay in one vendor and one session; use `/ccc-plan-exec`.

## Executors

| Executor id | Runs on | Use for |
|---|---|---|
| `codex-gpt-6-astra` | `codex exec -m gpt-6-astra` | deep work: migrations, tricky concurrency, security-sensitive changes |
| `codex-gpt-6.1-sol` | `codex exec -m gpt-6.1-sol` | default implementation executor |
| `codex-gpt-6-luna` | `codex exec -m gpt-6-luna` | mechanical, high-volume edits with exact steps |
| `codex-cloud` | `codex cloud exec --env <id>` | long tasks that should run off this machine; needs a Codex Cloud environment and a pushed branch |
| `sonnet-subagent` | Agent tool, `model: sonnet` | stays inside Claude; use when Codex is absent or a single-vendor trail is wanted |

Honor an executor the user already named. Otherwise pick from task difficulty. Offer Codex executors only after step 1 confirms the CLI.

## What happens

1. **Check the runtimes.**
   ```bash
   command -v codex && codex --version
   codex doctor --json --summary
   ```
   Look for `"overallStatus"` and the `auth.credentials` check. If `codex` is missing or auth fails, drop the Codex executors and say once: "Codex CLI unavailable (`command -v codex` failed or auth not configured); executing with a Sonnet subagent." `/ccc-codex doctor` explains failures.

2. **Clarify scope** only if a material decision is open (target behavior, files in scope, test command). Otherwise infer from the request and the repository.

3. **Write the goal file** to the session scratchpad directory if one exists, else `/tmp/ccc-orchestrate/<slug>.md`:

   ```markdown
   ---
   goal: <slug>
   created: <ISO date>
   orchestrator: <calling session model id>
   executor: codex-gpt-6-astra | codex-gpt-6.1-sol | codex-gpt-6-luna | codex-cloud | sonnet-subagent
   worktree: <absolute worktree path from step 5>
   ---

   # Goal: <one-line outcome>

   ## Context
   <the minimum the executor needs>

   ## Steps
   0. Run `git rev-parse --show-toplevel`; it must print the worktree path above. Stop if it does not.
   1. <concrete, ordered step>

   ## Files in scope
   - path/to/file — <what changes>

   ## Files explicitly out of scope
   - path/to/other — <why it must not change>

   ## Done-when (acceptance criteria)
   - [ ] <checkable by reading the diff or running a command>
   - [ ] Tests green: `<exact command>`

   ## Explicitly NOT required
   - <tempting but out of scope>

   ## Report
   End with: files changed, commands run with their exit codes, any criterion you could not meet and why.
   ```

   Every criterion must be checkable by a diff read or a command. "Code is cleaner" is not a criterion.

4. **Pick the executor** when the choice is still open. Ask with AskUserQuestion (header "Executor"); on Codex, ask the same options as a numbered plain-text question:
   - 🟢 **Codex GPT-6.1 Sol** — default executor; different runtime, different failure modes
   - **Codex GPT-6 Astra** — deepest Codex model; slower and costlier
   - **Codex GPT-6 Luna** — mechanical edits with exact steps
   - **Sonnet subagent** — stays in Claude; no Codex needed

   Offer `codex-cloud` only when the user asks for cloud execution or `codex cloud list --json` shows an environment.

5. **Isolate.** Record the main checkout state, then create the worktree:
   ```bash
   mkdir -p /tmp/ccc-orchestrate
   git status --porcelain > /tmp/ccc-orchestrate/<slug>.pre-status
   git worktree add .claude/worktrees/<slug> -b goal/<slug>
   git -C .claude/worktrees/<slug> rev-parse --show-toplevel
   ```
   The last command must print the worktree path. Never give the executor the main checkout as an edit root.

6. **Execute.**

   Local Codex (`codex-gpt-6-astra`, `codex-gpt-6.1-sol`, `codex-gpt-6-luna`):
   ```bash
   codex exec --json --output-last-message /tmp/ccc-orchestrate/<slug>.result.md \
     --sandbox workspace-write --cd "<worktree>" -m <model-id> - \
     < /tmp/ccc-orchestrate/<slug>.md > /tmp/ccc-orchestrate/<slug>.events.jsonl
   ```
   Use a Bash timeout that fits the task (up to 600000 ms in the foreground; run longer tasks in the background and poll). The final report is in `<slug>.result.md`; `<slug>.events.jsonl` holds the event stream (`item.completed` items of type `command_execution` show what ran). Do not add `--dangerously-bypass-approvals-and-sandbox`, API-key auth, or `danger-full-access`.

   Codex Cloud (`codex-cloud`): the branch must exist on the remote, and pushing needs the user's authorization in this conversation.
   ```bash
   codex cloud exec --env <ENV_ID> --branch goal/<slug> "$(cat /tmp/ccc-orchestrate/<slug>.md)"
   codex cloud list --json --env <ENV_ID> --limit 5
   codex cloud status <TASK_ID>
   codex cloud diff <TASK_ID>
   ```
   When the task finishes, apply its diff inside the worktree only: `cd "<worktree>" && codex cloud apply <TASK_ID>`.

   Sonnet subagent: call the Agent tool with `model: "sonnet"` and the goal file's full text as the prompt, adding one line that names the worktree as the only edit root. Add nothing else; the goal file carries the context.

7. **Verify** (the orchestrator, not the executor). Read the diff and run each criterion's command:
   ```bash
   git -C "<worktree>" status --short
   git -C "<worktree>" diff
   ```
   - Every box true: report done.
   - A box unmet: re-dispatch with only that gap. For local Codex, continue the same session from the worktree so the executor keeps its context:
     ```bash
     cd "<worktree>" && codex exec resume --last -c 'sandbox_mode="workspace-write"' --json \
       --output-last-message /tmp/ccc-orchestrate/<slug>.result.md \
       "Criterion 3 is unmet: <exact failure>. Fix only that."
     ```
     For the Sonnet path, send the gap to a fresh Agent call. Do not rewrite the goal file and do not let the executor decide what "close enough" means.
   - For a convergence loop with an iteration cap, run the verify cycle as a `/goal` loop (see `/ccc-loop`).
   - For a load-bearing change, add an independent read-only review: `cd "<worktree>" && codex review --uncommitted`, or a fresh-context reviewer agent. A verifier is never the executor that produced the change.

8. **Isolation check.** Compare the main checkout with the recorded state:
   ```bash
   git status --porcelain | diff /tmp/ccc-orchestrate/<slug>.pre-status - && echo "main checkout unchanged"
   ```
   Any new line is an executor leak: report it and investigate; never reset unrelated work.

## Decision points

- Executor choice (step 4), only when the user has not named one.
- Merging the worktree branch into the user's branch, pushing, or opening a PR: ask with AskUserQuestion (header "Next step"): 🟢 **Leave the branch for review** — nothing leaves this machine / **Merge locally** — fast-forward into the current branch / **Open a PR** — pushes `goal/<slug>`.

## Done when

The report states the goal file path, the executor, and `N/M criteria met` with the command output that proves each one, plus the isolation-check result:

> Orchestrate: goal file `<path>`, executed by `<executor id>` in `<worktree>`. Done-when N/M. Main checkout unchanged: yes/no.

## Guardrails

- The orchestrator never edits production files in this mode; the executor works only inside the worktree.
- No sandbox bypass flags, no API-key auth switch, no `danger-full-access`.
- Pushing a branch (needed for `codex-cloud`), merging, and opening PRs each need the user's authorization in this conversation.
- Never claim a criterion is met from the executor's report alone; run the command.
- Do not invent CLI flags; check `codex exec --help` when unsure.

## See also

- `/ccc-codex` — Codex CLI health, models, cloud environments and reviews
- `/ccc-plan-exec` — the same split, Claude-only
- `/ccc-loop` — `/goal` convergence loops with gates
- `/ccc-handoff` — durable state when the orchestration outlives the context window

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
