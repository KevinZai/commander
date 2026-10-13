---
description: "Multi-model collaborative execution: get a diff prototype from Codex or Gemini, refactor and apply it, then run a dual-model audit before delivery. Use to run a plan saved by /ccc-multi-plan."
---

# /ccc-multi-execute — run a multi-model plan

**CC Commander** · /ccc-multi-execute · a plan implemented by the assistant from model prototypes, audited by two models, verified by tests.

## Usage

```bash
# Run a saved plan
/ccc-multi-execute .claude/plan/feature-name.md

# Run a task already planned in this conversation
/ccc-multi-execute implement user authentication based on the previous plan
```

Input: `$ARGUMENTS`.

## Protocols

- Use English with tools and external models; reply to the user in their language.
- External models never write to the filesystem. The assistant makes every change.
- Treat each model's unified diff as a rough prototype and refactor it to production quality before applying.
- Do not start the next phase until the current phase's output is checked.
- The user's selected session model is preserved.

## Prerequisite: ccg-workflow runtime (opt-in)

This command calls the external `ccg-workflow` runtime, which Commander does not bundle. Check it first:

```bash
test -x ~/.claude/bin/codeagent-wrapper && ls ~/.claude/.ccg/prompts/codex ~/.claude/.ccg/prompts/gemini
```

If the check fails, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Execute Claude-only — implement the plan with built-in tools and skip prototypes and model audits
- Install first — point the user to the upstream ccg-workflow installation guide and stop
- Cancel — stop without changes

## Model calls

Run every wrapper call with Bash, `run_in_background: true` and `timeout: 3600000`. Add any extra flags your ccg-workflow install documents (for example lite mode) before `--backend`. For Gemini, pass `--gemini-model <model>` with the model your install documents, or omit it to use the wrapper default. Prefer `resume <SESSION_ID>` with the id from the plan; start a new session when the plan has none.

Prototype call:

```bash
~/.claude/bin/codeagent-wrapper --backend <codex|gemini> [--gemini-model <model>] resume <SESSION_ID> - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <task description>
Context: <plan content + target files>
</TASK>
OUTPUT: Unified Diff Patch only. Do not modify any files.
EOF
```

For a new session, drop `resume <SESSION_ID>`.

Audit call:

```bash
~/.claude/bin/codeagent-wrapper --backend <codex|gemini> [--gemini-model <model>] resume <SESSION_ID> - "$PWD" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Scope: Audit the final code changes.
Inputs:
- The applied patch (git diff / final unified diff)
- The touched files (relevant excerpts if needed)
Constraints:
- Do not modify any files.
- Do not output tool commands that assume filesystem access.
</TASK>
OUTPUT:
1) A prioritized list of issues (severity, file, rationale)
2) Concrete fixes; if code changes are needed, include a Unified Diff Patch in a fenced code block.
EOF
```

| Phase | Codex | Gemini |
|---|---|---|
| Implementation | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/frontend.md` |
| Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` |

Wait for every background call to finish before moving on; the harness reports when each exits. Do not kill a running call. If one reaches its timeout, ask with AskUserQuestion:

- 🟢 Keep waiting — poll the call again
- Stop the call — continue with the other model's result
- Cancel — end the run here and report what was done

## Steps

### Phase 0 — Read the plan `[Mode: Prepare]`

1. Identify the input: a plan file path (for example `.claude/plan/xxx.md`) or a direct task description.
2. If it is a path, read it and extract the task type, implementation steps, key files and session ids (`CODEX_SESSION`, `GEMINI_SESSION`).
3. Confirm before executing when the input is a direct description, the plan lacks session ids or key files, or the user has not approved the plan in this conversation. Ask with AskUserQuestion:
   - 🟢 Execute this plan — continue to retrieval
   - Revise the plan first — stop and return to `/ccc-multi-plan`
   - Cancel — stop without changes
4. Route by task type:

   | Task type | Signals | Route |
   |---|---|---|
   | Frontend | pages, components, UI, styles, layout | Gemini |
   | Backend | API, interfaces, database, logic, algorithms | Codex |
   | Fullstack | both | Codex and Gemini in parallel |

### Phase 1 — Context `[Mode: Retrieval]`

1. With the opt-in ace-tool MCP server connected, call:

   ```
   mcp__ace-tool__search_context({
     query: "<semantic query covering key files, modules, function names>",
     project_root_path: "$PWD"
   })
   ```

   Build the query from the plan's Key Files table: entry files, dependency modules, related type definitions. If the results are thin, run one or two more retrievals.
2. Without ace-tool, use Glob on the Key Files paths (for example `src/components/**/*.tsx`), Grep for key symbols and types, Read for the files found, and the Agent tool with the Explore subagent for wider searches.
3. Confirm the context is complete for implementation before continuing.

### Phase 2 — Prototype `[Mode: Prototype]`

- **Frontend → Gemini.** Keep the context under 32k tokens. Use `gemini/frontend.md`; input the plan, retrieved context and target files; request a unified diff only. Gemini's CSS/React/Vue prototype is the visual baseline; ignore its backend logic suggestions. Resume `GEMINI_SESSION` when present.
- **Backend → Codex.** Use `codex/architect.md`; same inputs; unified diff only. Codex is the authority on backend logic. Resume `CODEX_SESSION` when present.
- **Fullstack.** Call both in parallel, each on its part, each resuming its own session id (new session if missing). Wait for both.

### Phase 3 — Implement `[Mode: Implement]`

1. Parse the returned unified diff.
2. Simulate applying it to the target files: check logical consistency, conflicts and side effects.
3. Refactor the prototype into readable, maintainable code that follows the project's standards; remove redundancy; add comments only where the code cannot speak for itself.
4. Keep changes inside the plan's scope and review each for side effects.
5. Apply the changes with Edit and Write, touching only necessary code.
6. Run the project's lint, typecheck and test commands for the affected scope (from `package.json`, `Makefile`, `pyproject.toml` or the project `CLAUDE.md`, for example `npm run lint`, `npm run typecheck`, `npm test -- <path>`). Fix any regression before Phase 4.

### Phase 4 — Audit and delivery `[Mode: Audit]`

1. Call both reviewers in parallel, resuming the Phase 2 sessions:
   - Codex, `codex/reviewer.md`: security, performance, error handling, logic correctness.
   - Gemini, `gemini/reviewer.md`: accessibility, design consistency, user experience.

   Input for both: the changed diff and the target files.
2. Synthesize the findings. Backend issues follow Codex; frontend issues follow Gemini. Apply the necessary fixes, rerun the Phase 3 checks, and repeat the audit until the remaining risk is acceptable.
3. Run `git status --short` and `git diff --stat` and confirm only planned files changed.
4. Report:

   ```markdown
   ## Execution Complete

   ### Change Summary
   | File | Operation | Description |
   |------|-----------|-------------|
   | path/to/file.ts | Modified | <description> |

   ### Verification
   - <command>: <actual pass/fail line>

   ### Audit Results
   - Codex: <passed | N issues, M fixed>
   - Gemini: <passed | N issues, M fixed>

   ### Recommendations
   1. [ ] <suggested test step>
   2. [ ] <suggested verification step>
   ```

## Done when

The lint, typecheck and test commands report the actual results shown in the summary, both audits have run (or the user chose to skip one), and `git status --short` shows only planned files.

## Guardrails

- External models never write files; their diffs are drafts.
- Only modify code the plan names; never affect unrelated functionality.
- No commit, push or deploy unless the user asks for it in this conversation.

## See also

`/ccc-multi-plan` generates the plan and session ids; the user approves it; `/ccc-multi-execute` reads the plan, resumes those sessions and implements. Related: `/ccc-multi-workflow` · `/ccc-verify`
