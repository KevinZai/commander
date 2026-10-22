---
description: "Frontend-focused multi-model workflow (research, ideation, plan, execute, optimize, review) with Gemini as the UI authority. Use for components, responsive layout, UI animation and style work."
---

# /ccc-multi-frontend — Gemini-led frontend workflow

**CC Commander** · /ccc-multi-frontend · a UI change planned and reviewed with Gemini, written by the assistant.

## Usage

```bash
/ccc-multi-frontend <UI task description>
```

Task: `$ARGUMENTS`. If it is empty, ask the user for the UI task before starting.

Roles:

- **Gemini** — frontend UI and UX; its frontend opinions are authoritative.
- **Codex** — backend perspective; treat its frontend opinions as reference only.
- **The assistant** — orchestration, planning, every file write, and delivery. External models never write to the filesystem.

The user's selected session model is preserved.

## Prerequisite: ccg-workflow runtime (opt-in)

This command calls the external `ccg-workflow` runtime, which Commander does not bundle. Check it first:

```bash
test -x ~/.claude/bin/codeagent-wrapper && ls ~/.claude/.ccg/prompts/gemini
```

If the check fails, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Run Claude-only — continue with built-in tools and skip the Gemini calls (use `/ccc-plan` for planning)
- Install first — point the user to the upstream ccg-workflow installation guide and stop
- Cancel — stop without changes

## Gemini call

Run every wrapper call with Bash, `run_in_background: true` and `timeout: 3600000`. Add any extra flags your ccg-workflow install documents (for example lite mode) before `--backend`. Pass `--gemini-model <model>` with the Gemini model your install documents, or omit it to use the wrapper default.

```bash
# New session
~/.claude/bin/codeagent-wrapper --backend gemini --gemini-model <model> - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement, or the original task>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: <expected output format>
EOF

# Resume an existing session
~/.claude/bin/codeagent-wrapper --backend gemini --gemini-model <model> resume <SESSION_ID> - "$PWD" <<'EOF'
...same body...
EOF
```

| Phase | Role prompt |
|---|---|
| Analysis | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| Planning | `~/.claude/.ccg/prompts/gemini/architect.md` |
| Review | `~/.claude/.ccg/prompts/gemini/reviewer.md` |

Each call prints `SESSION_ID: <id>`. Save it as `GEMINI_SESSION` in Phase 2 and pass `resume <GEMINI_SESSION>` in Phases 3 and 5.

Wait for the background call to finish before moving on; the harness reports when it exits. Do not kill a running call. If it reaches its timeout, ask with AskUserQuestion:

- 🟢 Keep waiting — poll the call again
- Stop the call — continue Claude-only for this phase
- Cancel — end the workflow here

## Steps

Start each response with a mode label (`[Mode: Research]`, `[Mode: Ideation]`, and so on) and follow the phases in order.

0. `[Mode: Prepare]` Optional prompt enhancement. If the opt-in ace-tool MCP server is connected, call `mcp__ace-tool__enhance_prompt` and use its result as the requirement for every later Gemini call. Otherwise use `$ARGUMENTS` as is.
1. `[Mode: Research]` Gather context.
   - If ace-tool is connected, call `mcp__ace-tool__search_context` for existing components, styles and the design system. Otherwise use Glob for files, Grep for components and styles, Read for context, and the Agent tool with the Explore subagent for wider exploration.
   - Score requirement completeness from 0 to 10. At 7 or above, continue. Below 7, stop and ask the user the questions that close the gaps.
2. `[Mode: Ideation]` Call Gemini with the analyzer role. Output: UI feasibility, at least two solutions, UX evaluation. Save `GEMINI_SESSION`. Present the solutions with AskUserQuestion, recommended one first and marked 🟢, each with a one-line trade-off.
3. `[Mode: Plan]` Call Gemini with the architect role and `resume <GEMINI_SESSION>`. Requirement: the chosen solution. Output: component structure, UI flow, styling approach. Synthesize the plan, then ask:
   - 🟢 Approve and save — write the plan to `.claude/plan/<task-name>.md` and implement
   - Revise — adjust the plan from the user's feedback and ask again
   - Stop — keep the plan in the conversation only
4. `[Mode: Execute]` Implement the approved plan with Edit and Write. Follow the project's design system and code standards; keep the result responsive and accessible. Change only what the plan names.
5. `[Mode: Optimize]` Call Gemini with the reviewer role and `resume <GEMINI_SESSION>`. Context: `git diff`. Output: accessibility, responsiveness, performance and design-consistency issues. Present the issues, then ask:
   - 🟢 Apply the fixes — make the listed changes
   - Apply selected — the user names which issues to fix
   - Skip — record the issues and continue to review
6. `[Mode: Review]` Final check.
   - Compare the result against the plan, item by item.
   - Run the project's test, typecheck and lint commands (from `package.json` or the project `CLAUDE.md`, for example `npm test`, `npm run typecheck`, `npm run lint`).
   - Check responsiveness and accessibility: run the project's browser or accessibility tests if it has them; otherwise open the changed views at phone and desktop widths with the installed browser tooling and list what was checked.
   - Run `git status --short` and `git diff --stat` and confirm only planned files changed.

## Done when

The plan items are complete, the actual results of the test and lint commands and the responsive/accessibility check are reported, and `git status --short` shows only planned files.

## Guardrails

- External models get read-only context; the assistant makes every file change.
- Gemini is authoritative for frontend decisions; Codex's frontend input is reference only.
- No commit, push or deploy unless the user asks for it in this conversation.

## See also

`/ccc-multi-backend` · `/ccc-multi-workflow` · `/ccc-multi-plan` · `/ccc-multi-execute`
