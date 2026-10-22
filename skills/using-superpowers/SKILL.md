---
name: using-superpowers
description: Select and load relevant Superpowers workflows when the user requests one or a substantial task benefits from their specific process guidance.
---

# Using Superpowers

For a dispatched subagent with a specific task, follow that task and load another skill only if it contributes necessary guidance.

## Selection and priority

Use an explicitly requested skill, or one whose workflow materially improves the requested outcome. Match its description to the actual task. A simple self-contained question, focused edit, or already-defined subtask does not require a process skill merely because one exists.

Follow platform system and developer instructions first. Within those constraints, user instructions and authorization take precedence over skill guidelines. Authorization established in the current conversation persists; a skill does not create new permission for external writes or destructive actions. If a skill would require a new approval, first check whether the user has already authorized that exact work. Explain the specific skill rule only when it actually blocks progress.

## Access and platform adaptation

- In Claude Code, use the exposed `Skill` tool when available. If it is unavailable, read the installed `SKILL.md` through an available file tool.
- In Gemini CLI, use `activate_skill` when exposed; otherwise follow that harness's skill-loading mechanism.
- In Codex, follow the active harness instructions for reading skills. For Claude Code tool-name translations, consult [references/codex-tools.md](references/codex-tools.md) only when needed. Gemini equivalents are in [references/gemini-tools.md](references/gemini-tools.md).

Use only tools actually exposed in the session. A reference to a tool is not proof that the tool is installed or authorized.

## Applying a workflow

1. Load the most relevant skill and inspect its scope and constraints.
2. Apply task-specific guidance without expanding the user's request or loading unrelated skills.
3. Use a plan or checklist when complexity warrants one; do not create tracking artifacts for trivial tasks.
4. Keep concrete safety and correctness constraints. Adapt advisory sequence, formatting, and detail to the current task and existing authorization.
5. Verify the requested result with focused checks. Stop when the relevant checks pass unless new evidence warrants further investigation.

When several skills are relevant, start with whichever resolves the current uncertainty. For an ambiguous substantial design, that may be brainstorming. For a reproduced bug, it may be systematic debugging. Do not impose either workflow on a routine request with a clear outcome.
