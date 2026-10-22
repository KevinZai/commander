---
description: "Backend-focused multi-model workflow (research, ideation, plan, execute, optimize, review) with Codex as the backend authority. Use for API design, algorithms, database work and business logic."
---

# /ccc-multi-backend — Codex-led backend workflow

**CC Commander** · /ccc-multi-backend · a backend change planned and reviewed with Codex, written by the assistant.

## Usage

```bash
/ccc-multi-backend <backend task description>
```

Task: `$ARGUMENTS`. If it is empty, ask the user for the backend task before starting.

Roles:

- **Codex** — backend logic and algorithms; its backend opinions are authoritative.
- **Gemini** — frontend perspective; treat its backend opinions as reference only.
- **The assistant** — orchestration, planning, every file write, and delivery. External models never write to the filesystem.

The user's selected session model is preserved. Codex runs on the model set in the user's Codex config; Commander's default executor is `gpt-6.1-sol` and `gpt-6-astra` suits the review pass.

## Prerequisite: ccg-workflow runtime (opt-in)

This command calls the external `ccg-workflow` runtime, which Commander does not bundle. Check it first:

```bash
test -x ~/.claude/bin/codeagent-wrapper && ls ~/.claude/.ccg/prompts/codex
```

If the check fails, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Run Claude-only — continue with built-in tools and skip the Codex calls (use `/ccc-plan` for planning)
- Install first — point the user to the upstream ccg-workflow installation guide and stop
- Cancel — stop without changes

## Codex call

Run every wrapper call with Bash, `run_in_background: true` and `timeout: 3600000`. Add any extra flags your ccg-workflow install documents (for example lite mode) before `--backend`.

```bash
# New session
~/.claude/bin/codeagent-wrapper --backend codex - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement, or the original task>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: <expected output format>
EOF

# Resume an existing session
~/.claude/bin/codeagent-wrapper --backend codex resume <SESSION_ID> - "$PWD" <<'EOF'
...same body...
EOF
```

| Phase | Role prompt |
|---|---|
| Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` |
| Planning | `~/.claude/.ccg/prompts/codex/architect.md` |
| Review | `~/.claude/.ccg/prompts/codex/reviewer.md` |

Each call prints `SESSION_ID: <id>`. Save it as `CODEX_SESSION` in Phase 2 and pass `resume <CODEX_SESSION>` in Phases 3 and 5.

Wait for the background call to finish before moving on; the harness reports when it exits. Do not kill a running call. If it reaches its timeout, ask with AskUserQuestion:

- 🟢 Keep waiting — poll the call again
- Stop the call — continue Claude-only for this phase
- Cancel — end the workflow here

## Steps

Start each response with a mode label (`[Mode: Research]`, `[Mode: Ideation]`, and so on) and follow the phases in order.

0. `[Mode: Prepare]` Optional prompt enhancement. If the opt-in ace-tool MCP server is connected, call `mcp__ace-tool__enhance_prompt` and use its result as the requirement for every later Codex call. Otherwise use `$ARGUMENTS` as is.
1. `[Mode: Research]` Gather context.
   - If ace-tool is connected, call `mcp__ace-tool__search_context` for existing APIs, data models and service architecture. Otherwise use Glob for files, Grep for symbols and APIs, Read for context, and the Agent tool with the Explore subagent for wider exploration.
   - Score requirement completeness from 0 to 10. At 7 or above, continue. Below 7, stop and ask the user the questions that close the gaps.
2. `[Mode: Ideation]` Call Codex with the analyzer role. Output: technical feasibility, at least two solutions, risk assessment. Save `CODEX_SESSION`. Present the solutions with AskUserQuestion, recommended one first and marked 🟢, each with a one-line trade-off.
3. `[Mode: Plan]` Call Codex with the architect role and `resume <CODEX_SESSION>`. Requirement: the chosen solution. Output: file structure, function and class design, dependencies. Synthesize the plan, then ask:
   - 🟢 Approve and save — write the plan to `.claude/plan/<task-name>.md` and implement
   - Revise — adjust the plan from the user's feedback and ask again
   - Stop — keep the plan in the conversation only
4. `[Mode: Execute]` Implement the approved plan with Edit and Write. Follow the project's existing code standards and handle errors, input validation and performance at each boundary you touch. Change only what the plan names.
5. `[Mode: Optimize]` Call Codex with the reviewer role and `resume <CODEX_SESSION>`. Context: `git diff`. Output: security, performance, error-handling and API-compliance issues. Present the issues, then ask:
   - 🟢 Apply the fixes — make the listed changes
   - Apply selected — the user names which issues to fix
   - Skip — record the issues and continue to review
6. `[Mode: Review]` Final check.
   - Compare the result against the plan, item by item.
   - Run the project's test command (from `package.json`, `Makefile`, `pyproject.toml` or the project `CLAUDE.md`, for example `npm test`, `pytest`, `go test ./...`) and its typecheck or lint command if one exists.
   - Run `git status --short` and `git diff --stat` and confirm only planned files changed.

## Done when

The plan items are complete, the test command's actual pass/fail line is reported, and `git status --short` shows only planned files. Report remaining issues and recommendations.

## Guardrails

- External models get read-only context; the assistant makes every file change.
- Codex is authoritative for backend decisions; Gemini's backend input is reference only.
- No commit, push or deploy unless the user asks for it in this conversation.

## See also

`/ccc-multi-frontend` · `/ccc-multi-workflow` · `/ccc-multi-plan` · `/ccc-multi-execute`
