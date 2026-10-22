---
description: "Multi-model collaborative planning: retrieve context, run Codex and Gemini analyses in parallel, and save a step-by-step implementation plan with session ids. Use before /ccc-multi-execute; plans only, never edits code."
---

# /ccc-multi-plan — dual-model implementation plan

**CC Commander** · /ccc-multi-plan · a saved, reviewable plan in `.claude/plan/` that `/ccc-multi-execute` can run.

## Usage

```bash
/ccc-multi-plan <task description>
```

Task: `$ARGUMENTS`. If it is empty, ask the user for the task before starting.

## Protocols

- Use English with tools and external models; reply to the user in their language.
- Planning only: read context and write `.claude/plan/*` files. Never modify production code.
- External models never write to the filesystem.
- Do not start the next phase until the current phase's output is checked.
- The user's selected session model is preserved.

## Prerequisite: ccg-workflow runtime (opt-in)

This command calls the external `ccg-workflow` runtime, which Commander does not bundle. Check it first:

```bash
test -x ~/.claude/bin/codeagent-wrapper && ls ~/.claude/.ccg/prompts/codex ~/.claude/.ccg/prompts/gemini
```

If the check fails, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Plan Claude-only — use `/ccc-plan` instead
- Install first — point the user to the upstream ccg-workflow installation guide and stop
- Cancel — stop without changes

## Model call

Run every wrapper call with Bash, `run_in_background: true` and `timeout: 3600000`, even a single call, so the main thread is not blocked. Add any extra flags your ccg-workflow install documents (for example lite mode) before `--backend`. For Gemini, pass `--gemini-model <model>` with the model your install documents, or omit it to use the wrapper default.

```bash
~/.claude/bin/codeagent-wrapper --backend <codex|gemini> [--gemini-model <model>] - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement>
Context: <retrieved project context>
</TASK>
OUTPUT: Step-by-step implementation plan with pseudo-code. Do not modify any files.
EOF
```

| Phase | Codex | Gemini |
|---|---|---|
| Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| Planning | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` |

Each call prints `SESSION_ID: <id>`. Save both ids; the plan hands them to `/ccc-multi-execute`.

Wait for every background call to finish before moving on; the harness reports when each exits. Do not kill a running call. If one reaches its timeout, ask with AskUserQuestion:

- 🟢 Keep waiting — poll the call again
- Stop the call — continue with the other model's result
- Cancel — end planning here

## Steps

### Phase 1 — Context `[Mode: Research]`

1. Prompt enhancement. If the opt-in ace-tool MCP server is connected, call:

   ```
   mcp__ace-tool__enhance_prompt({
     prompt: "$ARGUMENTS",
     conversation_history: "<last 5-10 conversation turns>",
     project_root_path: "$PWD"
   })
   ```

   Use the result as the requirement for every later phase. Without ace-tool, use `$ARGUMENTS` as is.
2. Context retrieval. With ace-tool, call `mcp__ace-tool__search_context({ query: "<where/what/how query>", project_root_path: "$PWD" })`. Without it, use Glob (for example `**/*.ts`), Grep for key symbols and class names, Read for the files found, and the Agent tool with the Explore subagent for wider searches. Base every statement on retrieved code, not assumptions.
3. Completeness check. Collect complete definitions and signatures for the classes, functions and variables involved; retrieve again if anything is missing. Record entry file, line number and symbol name; add code snippets only to resolve ambiguity.
4. Requirement alignment. If the requirement is still ambiguous, ask the user the questions that fix its boundaries before continuing.

### Phase 2 — Analysis `[Mode: Analysis]`

1. Call both models in parallel with the original requirement and no preset opinion:
   - Codex, analyzer role: technical feasibility, architecture impact, performance, risks; several solutions with pros and cons.
   - Gemini, analyzer role: UI/UX impact, user experience, visual design; several solutions with pros and cons.

   Save `CODEX_SESSION` and `GEMINI_SESSION`.
2. Cross-validate: list consensus (strong signal), divergence (needs weighing), and gaps in reasoning. Backend logic follows Codex; frontend design follows Gemini.
3. Optional plan drafts, recommended for larger tasks: call Codex (architect role; data flow, edge cases, error handling, test strategy) and Gemini (architect role; information architecture, interaction, accessibility, visual consistency) in parallel for step-by-step drafts with pseudo-code. Record where they differ.
4. Write the final plan in this shape:

   ```markdown
   ## Implementation Plan: <Task Name>

   ### Task Type
   - [ ] Frontend (→ Gemini)
   - [ ] Backend (→ Codex)
   - [ ] Fullstack (→ parallel)

   ### Technical Solution
   <solution synthesized from the Codex and Gemini analyses>

   ### Implementation Steps
   1. <step> — expected deliverable

   ### Key Files
   | File | Operation | Description |
   |------|-----------|-------------|
   | path/to/file.ts:L10-L50 | Modify | <description> |

   ### Risks and Mitigation
   | Risk | Mitigation |
   |------|------------|

   ### SESSION_ID (for /ccc-multi-execute)
   - CODEX_SESSION: <session_id>
   - GEMINI_SESSION: <session_id>
   ```

### Phase 3 — Delivery, not execution

1. Save the plan before presenting it: first version to `.claude/plan/<feature-name>.md` (name from the requirement, for example `user-auth`), later revisions to `<feature-name>-v2.md`, `-v3.md`, and so on.
2. Confirm the file exists with `ls .claude/plan/`.
3. Present the full plan, then state the actual saved path and the command to run it:

   ```bash
   /ccc-multi-execute .claude/plan/<actual-feature-name>.md
   ```

   Tell the user they can ask for changes or run that command, ideally in a fresh session.
4. End the response. Make no further tool calls.

## Revising a plan

When the user asks for changes: update the plan content, save it to the next version file, confirm it with `ls .claude/plan/`, re-present it, and give the execute command again.

## Done when

The plan file exists at the reported path, contains both session ids, and no file outside `.claude/plan/` changed (`git status --short`).

## Guardrails

- Never write production code, and never start `/ccc-multi-execute` or any implementation step from this command.
- Do not ask a yes/no question and then execute; execution belongs to `/ccc-multi-execute`.
- Do not call the models again unless the user asks for plan changes.

## See also

`/ccc-multi-execute` · `/ccc-multi-workflow` · `/ccc-plan`
