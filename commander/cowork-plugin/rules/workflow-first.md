# Workflow-First Execution and Context Discipline

Ambient session rules for CC Commander. The lead session is a thin control plane, context stays slim by construction, and compaction is prepared for, never an emergency. Referenced by `CLAUDE.md.template`, `/ccc`, `/ccc-suggest`, `/ccc-ultracode`, and `/ccc-fleet`. The doctrine behind these rules (verification, isolation, delegation briefs, truth over cache, effort, outcome-first reporting) lives in `rules/fable-method.md`; this file does not restate it.

## 1. Choose the engine

| Work | Engine |
|---|---|
| Conversational reply, single edit, reading the file you are about to edit, anything that fits in a handful of tool calls | Inline, no subagent |
| One large independent subtask (broad search, isolated implementation) | Agent tool; set `effort` for the brief; `isolation: worktree` when it writes code; background when it runs long |
| Multi-file, multi-step, audit, migration, repo-wide review that splits into independent parts | Workflow tool (inspect runs with `/workflows`); a plugin workflow when one exists (`/commander:<name>`) |
| Work that should run on a separate budget or a GPT-6 executor | Codex: `codex exec --json` through `/ccc-orchestrate` or `/ccc-codex` |
| Recurring or unattended work | `/loop` locally, Routines via `/schedule`, `/goal` for a verifiable stop condition (gate in fable-method Pillar 3) |

- Opus 5.5 delegates readily. Delegate only large, independent, parallelizable work and keep spawn counts low; spawn overhead is real.
- Prefer `pipeline()` over barriers in workflow scripts so no stage idles waiting on the slowest sibling.
- After you delegate a search, do not also run it yourself. Wait for the result.
- Agents do the reading; you keep the decision.
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` stays enabled where `/ccc-fleet` teams need it. Teammates coordinate through `SendMessage` inside the team; for unattended cross-session hand-offs, use the tracker's comments when one is configured.

## 2. Keep context slim

- Never read large tool output into context. Route it to a file, then `jq`, `grep`, or read a slice (offset and limit).
- Do not re-read a file you just edited; the edit tool already confirmed it. Do not re-derive facts established this session.
- Reference code as `path:line` instead of pasting it.
- Run long or independent work in the background and relay only what matters from the result.

## 3. Prepare for compaction

- Treat live context as disposable (fable-method Pillar 7).
- At about 70% used, write or refresh `tasks/SESSION-HANDOFF-<date>.md`: current state, decisions, what not to retry, exact next step. When the work is tracked and the current request authorizes tracker writes, post the same summary there.
- At about 85% used, compact or hand off (`/ccc-handoff`) rather than risk a mid-task truncation.
- A configured PreCompact hook is a safety net, not the plan.

## 4. The test

If the transcript reads like a control tower (decisions in, conclusions out), the session is healthy. If it is filling with file contents, command output, or re-reads, push that work into a subagent, a workflow, or a file.

## 5. Engine fallback

If subagents or workflows are unavailable (usage limit, harness without the Workflow tool), keep the shape and swap the engine: hand the same fan-out to `codex exec --json` workers on their own budget, or run the steps sequentially, and keep the lead context as the verifying control plane.

**Bottom line:** delegate the doing, keep the deciding.
