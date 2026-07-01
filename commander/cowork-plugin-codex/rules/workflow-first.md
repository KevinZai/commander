# Workflow-First Execution & Context Discipline

> Canonical CC Commander orchestration doctrine. Referenced by the CLAUDE.md template, `/ccc-suggest`, `/ccc`, `/ccc-ultracode`, `/ccc-fleet`, and every CCC element. Goal: the lead session stays a thin **control plane**; context stays slim by construction; compaction is proactive, never an emergency.

You are an **ORCHESTRATOR**. Default to delegation. The lead context is a control tower — decisions, delegations, and verified conclusions only. Never let it fill with raw file contents or tool output.

## 1. Workflow-first
- For any **substantive** task — multi-file, multi-step, research, audit, migration, repo-wide review, or anything requiring broad reads — use the **Workflow tool**. Fan out agents that read/search/build and return ONLY conclusions or structured results; never raw file dumps into the lead context.
- Go **solo (inline) ONLY** for: a conversational reply, a single trivial edit, or reading the one file you are about to edit.
- Prefer `pipeline()` over barriers (no idle wall-clock). **Adversarially verify** findings (independent skeptics / diverse lenses) before acting on them. After you delegate a search, do not also run it yourself — wait for the result.
- Agents do the reading; you keep the decision.
- **Delegation engine = Anthropic Agent Teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, beta — keep ON). The Workflow tool and Agent fan-out execute *on* Agent Teams; teammates coordinate via `SendMessage` **within the team**. This is the PRIMARY path for both workflow execution and cross-agent delegation. **Cross-session peers (CCD `send_message` / claude-peers) are BACKUP only** — for cross-session/cross-account hand-offs, and they're harness-gated when unattended, so **your tracker's comments (e.g. Linear/Paperclip) remain the autonomous cross-agent channel.**

## 2. Keep context slim
- Never read large tool outputs into context. Route big results to files: workflows return summaries; MCP / `list_*` overflow is saved to disk — `jq`/`grep`/slice the file, never `cat` it. Read only the part you need (offset/limit).
- Don't re-read a file you just edited (the edit tool already confirmed it). Don't re-derive facts already established this session.
- Spawn **background** agents for long or independent work; relay only what matters from their results.
- Reference code as `path:line`, not by pasting it.

## 3. Context strategy — auto-prepare for compaction
- Track your context budget continuously. Treat live context as **disposable**; the durable state is your handoff notes + structured memory + tracker.
- **At ~70% used:** write/refresh `tasks/SESSION-HANDOFF-<date>.md` (current state, decisions made, what-NOT-to-retry, exact next step, one-line memory pointer) **AND sync the same summary to your work tracker — a comment on the Linear/Paperclip/etc. issue — wherever the work is tracked there.** Keep two durable copies: **local + tracker**.
- **At ~85% used:** proactively compact / hand off rather than risk an uncontrolled truncation mid-task.
- If a PreCompact hook is configured, treat it as a last-chance safety net, not the plan — **don't rely on it alone**, prepare proactively. The handoff doc + memory + tracker note ARE the resumable state.

## 4. The test
If the transcript reads like a control tower (decisions in, conclusions out) you're doing it right. If it's filling with file contents, command output, or re-reads — stop and push that work into a workflow or a file.

---

## Engine fallback (when Workflow agents are unavailable)
If the Workflow/subagent fleet is blocked (e.g. a spend/quota limit), preserve the **shape**, swap the **engine**: delegate the same fan-out work to an external CLI worker (`codex exec -s workspace-write …`, which runs on its own budget) or other available executors, and keep the lead context as the verifying control plane. Workflow-first is a discipline, not a single tool.

**Bottom line:** delegate the doing, keep the deciding. Conclusions in, file-dumps out.
