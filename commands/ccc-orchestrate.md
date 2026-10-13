---
description: "Run a sequential multi-agent workflow (feature, bugfix, refactor, security or custom chain) with structured handoffs, plus optional tmux and worktree workers for long-running sessions. Use when a task needs planner, implementer and reviewer stages in order."
---

# /ccc-orchestrate — chained agent workflows

**CC Commander** · /ccc-orchestrate · runs agents in sequence, each reading the previous handoff, and ends with one report.

## Usage

```text
/ccc-orchestrate <workflow> "<task description>"
/ccc-orchestrate custom "<agent,agent,...>" "<task description>"
```

`$ARGUMENTS`:

| Argument | Chain |
|---|---|
| `feature <description>` | planner → tdd-guide → code-reviewer → security-reviewer |
| `bugfix <description>` | planner → tdd-guide → code-reviewer |
| `refactor <description>` | architect → code-reviewer → tdd-guide |
| `security <description>` | security-reviewer → code-reviewer → architect |
| `custom <agents> <description>` | the comma-separated agents, in order |

The agents are defined in `agents/` (`planner.md`, `tdd-guide.md`, `code-reviewer.md`, `security-reviewer.md`, `architect.md`). If `$ARGUMENTS` names no workflow, ask with AskUserQuestion:

- 🟢 feature — full plan, test-first build, quality and security review.
- bugfix — plan, test-first fix, review.
- refactor — design first, then review and tests.
- security — security-led review.

## What happens

1. Confirm each agent in the chain exists:

   ```bash
   ls agents/<name>.md
   ```

   Stop and name any missing agent.

2. For each agent in order, call the Agent tool with the task, the previous handoff (none for the first), and the files in scope. Keep the user's selected model unless they choose otherwise; set Agent `effort` to `high` for planner, architect and security-reviewer stages. Give implementing stages `isolation: worktree` when they write code in parallel with other work.

3. Require each agent to return a handoff in this shape:

   ```markdown
   ## HANDOFF: <previous-agent> -> <next-agent>

   ### Context
   <what was done>

   ### Findings
   <key discoveries or decisions>

   ### Files Modified
   <paths touched>

   ### Open Questions
   <unresolved items for the next agent>

   ### Recommendations
   <suggested next steps>
   ```

4. Between stages, run the project's test command when the previous stage changed code (read `package.json` scripts or the project's CLAUDE.md for the exact command). A failing run goes into the next handoff as an open question; do not hide it.

5. After the last agent, verify the result yourself:

   ```bash
   git status --short
   git diff --stat
   <project test command>
   ```

6. Write the final report:

   ```text
   ORCHESTRATION REPORT
   Workflow: <type>
   Task: <description>
   Agents: <chain>

   SUMMARY          <one paragraph>
   AGENT OUTPUTS    <one line per agent>
   FILES CHANGED    <from git diff --stat>
   TEST RESULTS     <command and actual pass/fail counts>
   SECURITY STATUS  <findings, or "not reviewed">
   RECOMMENDATION   SHIP | NEEDS WORK | BLOCKED
   ```

   Base SHIP only on the step 5 output, not on the agents' self-reports. For load-bearing claims, have a reviewer that did not write the code check them.

### Example

```text
/ccc-orchestrate feature "Add user authentication"
```

1. planner analyzes requirements, writes the plan and dependencies → `HANDOFF: planner -> tdd-guide`.
2. tdd-guide reads the plan, writes tests first, implements until they pass → `HANDOFF: tdd-guide -> code-reviewer`.
3. code-reviewer reviews the implementation and lists issues with fixes → `HANDOFF: code-reviewer -> security-reviewer`.
4. security-reviewer audits for vulnerabilities and gives the final call → final report.

### Custom example

```text
/ccc-orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## Parallel phase

Independent checks can run at the same time: send code-reviewer (quality), security-reviewer (security) and architect (design) as parallel Agent calls in one message, or as one Workflow tool run with `parallel()` where the Workflow tool is available. Merge their outputs into a single report section. Without delegation tools, run them one after another.

## tmux and worktree workers

For long-running or cross-harness work, run external workers in tmux panes, each in its own git worktree, using the vendored helper:

```bash
node vendor/everything-claude-code/scripts/orchestrate-worktrees.js plan.json            # dry run: prints the plan
node vendor/everything-claude-code/scripts/orchestrate-worktrees.js plan.json --execute  # creates worktrees and panes
```

When workers need dirty or untracked files from the main checkout, list them in `seedPaths`. The helper copies only those paths into each worker worktree after `git worktree add`, so the branch stays isolated while in-flight scripts, plans or docs remain visible.

```json
{
  "sessionName": "workflow-e2e",
  "seedPaths": [
    "scripts/my-in-progress-script.js",
    ".claude/plan/workflow-e2e-test.json"
  ],
  "workers": [
    { "name": "docs", "task": "Update orchestration docs." }
  ]
}
```

Export a control-plane snapshot of a live session (session activity, tmux pane metadata, worker states, objectives, seeded overlays and recent handoff summaries, as JSON):

```bash
node vendor/everything-claude-code/scripts/orchestration-status.js .claude/plan/<plan>.json
```

Ask with AskUserQuestion before `--execute`:

- 🟢 Dry run first — prints worktrees and panes without creating them.
- Execute — creates the worktrees and tmux panes now.
- Cancel — nothing is created.

## Control-plane block

When the workflow spans several sessions, worktrees or tmux panes, append this to the final report:

```markdown
CONTROL PLANE
Sessions:   session id or alias; branch and worktree path per worker; tmux pane or session name
Diffs:      git status summary; git diff --stat for touched files; merge or conflict risk
Approvals:  pending user approvals; steps blocked on confirmation
Telemetry:  last activity or idle signal; token or cost drift; policy events from hooks or reviewers
```

## Guidance

- Start with planner for complex features.
- Include code-reviewer before any merge.
- Include security-reviewer for authentication, payments and personal data.
- Keep handoffs to what the next agent needs.

## Guardrails

- The workflow never merges, pushes or opens a PR; those need the user's approval at the moment.
- An agent's handoff is a claim; the step 5 checks decide the recommendation.
- Do not start more parallel workers than the user agreed to.

## See also

`/ccc-parallel` · `/ccc-peers` · `/ccc-pr`
