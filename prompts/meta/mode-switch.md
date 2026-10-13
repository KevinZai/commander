---
name: mode-switch
category: meta
skills: [ccc-plan, ccc-careful, ccc-review]
mode: code
estimated_tokens: 400
---

# Mode Switching Workflow

## When to Use
Use when moving between kinds of work in one session: planning to coding, coding to review, or exploration to focused execution. Each mode has its own tool usage, verification level and pacing.

## Template

```
Switch to {{target_mode}} mode for the task below. Adjust tool usage, verification level and pacing to match the mode definition.

**Current mode:**
{{what_you_were_doing}}

**Target mode:**
{{plan|code|review|explore|ship|careful|overdrive}}

**Task:**
{{what_needs_to_be_done_in_this_mode}}

**Mode definitions:**

### Plan mode
- Purpose: think before acting; design before building.
- Tools: Read, Glob, Grep for exploration. No Write or Edit.
- Output: a structured plan with phases and checkpoints.
- Pacing: slow and deliberate; consider alternatives.
- Verification: the plan is reviewed before switching to code mode.
- Entry: `/ccc-plan`, or the Claude Code plan permission mode.

### Code mode
- Purpose: implement a known plan; build features, fix bugs.
- Tools: all. Prefer Edit over Write for existing files.
- Output: working code and passing tests.
- Pacing: steady; one change at a time, verified after each.
- Verification: tests pass, types check, no console errors.
- Entry: the default mode (auto permission mode in interactive sessions).

### Review mode
- Purpose: find issues in existing code.
- Tools: Read, Grep, Glob for analysis; Bash for test runs.
- Output: findings with severity, `path:line` location and a fix suggestion.
- Pacing: thorough; check every file in scope.
- Verification: every finding has concrete evidence.
- Entry: `/code-review` or `/ccc-review`.

### Explore mode
- Purpose: understand unfamiliar code; research before planning.
- Tools: Glob, Grep, Read extensively; Bash for running things.
- Output: a model of the system, written down in notes.
- Pacing: follow dependencies and read broadly.
- Verification: you can explain the system's architecture.
- Entry: the `investigate` skill.

### Ship mode
- Purpose: get to production; final verification and deploy.
- Tools: Bash for testing, building and deploying; Read for verification.
- Output: deployed, verified, documented.
- Pacing: focused and checklist-driven; no new features.
- Verification: end-to-end tests pass and deploy health checks pass.
- Entry: `/ccc-verify`, then `/ccc-ship`. Deploying needs my authorization in this conversation.

### Careful mode
- Purpose: high-stakes changes with extra verification at every step.
- Tools: all, with confirmation before each destructive action.
- Output: small, verified changes with rollback points.
- Pacing: very slow; one change, verify, commit, repeat.
- Verification: after every change, not only at the end.
- Entry: `/ccc-careful`.

### Overdrive mode
- Purpose: maximum speed on well-understood, mechanical tasks; trust the plan.
- Tools: all. Batch several changes before verifying.
- Output: rapid progress through mechanical work.
- Pacing: fast; verify at milestones, not every step.
- Verification: at phase boundaries only. Name the milestones before starting.
- Entry: state the milestone list; fan independent slices out to subagents or the Workflow tool.

Switch now to {{target_mode}} mode and begin: {{task}}
```

## Tips
- `/ccc-plan` turns a request into a reviewed plan file before code mode.
- `/ccc-careful` adds confirmations, diffs before writes and a command log for high-stakes sessions.
- Overdrive mode has no dedicated skill; it is a pacing choice. Do not use it for unfamiliar or high-risk work.
- Mode switches change how you use tools. Only plan mode, as a permission mode, changes which tools are available.

## Example

```
Switch to plan mode for the task below.

**Current mode:** Code mode, implementing auth endpoints.
**Target mode:** plan
**Task:** Design the webhook delivery system before implementing it. Decide on retry strategy, queue technology and failure handling.
```
