---
description: "Full multi-model development workflow with quality gates, routing frontend work to Gemini and backend work to Codex. Use for a feature that spans research through review and benefits from two model perspectives."
---

# /ccc-multi-workflow — six-phase multi-model build

**CC Commander** · /ccc-multi-workflow · research, ideation, plan, execute, optimize and review, with a user gate after each phase.

## Usage

```bash
/ccc-multi-workflow <task description>
```

Task: `$ARGUMENTS`. If it is empty, ask the user for the task before starting.

Roles:

- **Codex** — backend logic, algorithms, debugging; authoritative on backend.
- **Gemini** — frontend UI/UX and visual design; authoritative on frontend, reference only on backend.
- **ace-tool MCP** (opt-in, absent by default) — code retrieval and prompt enhancement.
- **The assistant** — orchestration, planning, every file write, and delivery. External models never write to the filesystem.

The user's selected session model is preserved. Keep replies concise and technical.

## Prerequisite: ccg-workflow runtime (opt-in)

This command calls the external `ccg-workflow` runtime, which Commander does not bundle. Check it first:

```bash
test -x ~/.claude/bin/codeagent-wrapper && ls ~/.claude/.ccg/prompts/codex ~/.claude/.ccg/prompts/gemini
```

If the check fails, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Run Claude-only — follow the same phases with built-in tools and skip the model calls
- Install first — point the user to the upstream ccg-workflow installation guide and stop
- Cancel — stop without changes

## Model calls

Run every wrapper call with Bash and `timeout: 3600000`; use `run_in_background: true` for parallel calls. Add any extra flags your ccg-workflow install documents (for example lite mode) before `--backend`. For Gemini, pass `--gemini-model <model>` with the model your install documents, or omit it to use the wrapper default.

```bash
# New session
~/.claude/bin/codeagent-wrapper --backend <codex|gemini> [--gemini-model <model>] - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement, or the original task>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: <expected output format>
EOF

# Resume (the subcommand is `resume`, not `--resume`)
~/.claude/bin/codeagent-wrapper --backend <codex|gemini> [--gemini-model <model>] resume <SESSION_ID> - "$PWD" <<'EOF'
...same body...
EOF
```

| Phase | Codex | Gemini |
|---|---|---|
| Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| Planning | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` |
| Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` |

Each call prints `SESSION_ID: <id>`; reuse it with `resume` in later phases.

Wait for every model to return before the next phase; the harness reports when each background call exits. Do not kill a running call. If one reaches its timeout, ask with AskUserQuestion:

- 🟢 Keep waiting — poll the call again
- Stop the call — continue with the other model's result
- Cancel — end the workflow here

## Isolation for parallel writers

This workflow keeps one writer: the main session. When the work must split across parallel workers that each need their own git state, terminal, or build and test run, use isolated workers instead: the Agent tool with `isolation: worktree`, or `/ccc-fleet`. Use in-process subagents without isolation only for analysis, planning or review.

## Steps

Start each response with a mode label (`[Mode: Research]` first). Follow the phases in order and skip one only when the user says so. After each phase, ask the user to confirm before moving on.

1. `[Mode: Research]` Understand the requirement.
   - With ace-tool connected, call `mcp__ace-tool__enhance_prompt` and use the result for every later model call; otherwise use `$ARGUMENTS` as is.
   - With ace-tool, call `mcp__ace-tool__search_context`. Otherwise use Glob for files, Grep for symbols, Read for context, and the Agent tool with the Explore subagent for wider exploration.
   - Score completeness from 0 to 10: goal clarity (0–3), expected outcome (0–3), scope boundaries (0–2), constraints (0–2). At 7 or above, continue. Below 7, stop and ask clarifying questions.
2. `[Mode: Ideation]` Call both models in parallel with the analyzer role: Codex for technical feasibility, solutions and risks; Gemini for UI feasibility, solutions and UX evaluation. Save `CODEX_SESSION` and `GEMINI_SESSION`. Compare at least two options and present them with AskUserQuestion, recommended one first and marked 🟢, each with a one-line trade-off.
3. `[Mode: Plan]` Call both models in parallel with the architect role, resuming their sessions: Codex for backend architecture, Gemini for frontend architecture. Combine the Codex backend plan with the Gemini frontend plan, then ask:
   - 🟢 Approve and save — write the plan to `.claude/plan/<task-name>.md` and continue
   - Revise — adjust from the user's feedback and ask again
   - Stop — end the workflow with the plan in the conversation
4. `[Mode: Execute]` Implement the approved plan with Edit and Write, following the project's code standards. Pause for feedback at the milestones the plan names.
5. `[Mode: Optimize]` Call both models in parallel with the reviewer role on `git diff`: Codex for security, performance and error handling; Gemini for accessibility and design consistency. Present the combined findings, then ask:
   - 🟢 Apply the fixes — make the listed changes
   - Apply selected — the user names which issues to fix
   - Skip — record the issues and continue to review
6. `[Mode: Review]` Final evaluation.
   - Compare the result against the plan, item by item.
   - Run the project's test command and its typecheck or lint command (from `package.json`, `Makefile`, `pyproject.toml` or the project `CLAUDE.md`, for example `npm test`, `pytest`, `go test ./...`).
   - Run `git status --short` and `git diff --stat` and confirm only planned files changed.
   - Report issues and recommendations and ask for final confirmation.

## Done when

Every plan item is complete, the actual pass/fail lines of the test and lint commands are reported, `git status --short` shows only planned files, and the user has confirmed the final review.

## Guardrails

- Stop when the completeness score is below 7 or the user does not approve a phase.
- External models get read-only context; the assistant makes every file change.
- No commit, push or deploy unless the user asks for it in this conversation.

## See also

`/ccc-multi-plan` · `/ccc-multi-execute` · `/ccc-multi-backend` · `/ccc-multi-frontend`
