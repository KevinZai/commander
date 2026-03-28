---
name: mode-switch
category: meta
skills: [plan, careful, overdrive]
mode: code
estimated_tokens: 400
---

# Mode Switching Workflow

## When to Use
When transitioning between different types of work within a session — from planning to coding, from coding to review, or from exploration to focused execution. Each mode has different tool usage patterns and quality expectations.

## Template

```
Switch to {{target_mode}} mode for the following task. Adjust tool usage, verification level, and pacing accordingly.

**Current mode:**
{{what_you_were_doing}}

**Target mode:**
{{plan|code|review|explore|ship}}

**Task:**
{{what_needs_to_be_done_in_this_mode}}

**Mode definitions:**

### Plan Mode
- **Purpose:** Think before acting. Design before building.
- **Tools:** Read, Glob, Grep (for exploration). No Write/Edit.
- **Output:** Structured plan document with phases and checkpoints
- **Pacing:** Slow and deliberate. Consider alternatives.
- **Verification:** Plan review before proceeding to code mode
- **Trigger skill:** `/plan`

### Code Mode
- **Purpose:** Implement a known plan. Build features, fix bugs.
- **Tools:** All tools. Edit preferred over Write for existing files.
- **Output:** Working code, passing tests
- **Pacing:** Steady. One change at a time, verify after each.
- **Verification:** Tests pass, types check, no console errors
- **Trigger skill:** Default mode

### Review Mode
- **Purpose:** Find issues in existing code. Quality assurance.
- **Tools:** Read, Grep, Glob (for analysis). Bash for test runs.
- **Output:** Findings with severity, location, and fix suggestions
- **Pacing:** Thorough. Check every file in scope.
- **Verification:** All findings have concrete evidence
- **Trigger skill:** `/code-review`

### Explore Mode
- **Purpose:** Understand unfamiliar code. Research before planning.
- **Tools:** Glob, Grep, Read extensively. Bash for running things.
- **Output:** Mental model of the system, documented in notes
- **Pacing:** Curious. Follow dependencies, read broadly.
- **Verification:** Can explain the system's architecture
- **Trigger skill:** `/investigate`

### Ship Mode
- **Purpose:** Get to production. Final verification and deploy.
- **Tools:** Bash (for testing, building, deploying). Read for verification.
- **Output:** Deployed, verified, documented
- **Pacing:** Focused. Checklist-driven. No new features.
- **Verification:** E2E tests pass, deploy health checks pass
- **Trigger skills:** `/verify`, `/ship`

### Careful Mode
- **Purpose:** High-stakes changes. Extra verification at every step.
- **Tools:** All, but with confirmation before each destructive action
- **Output:** Small, verified changes with rollback points
- **Pacing:** Very slow. One change, verify, commit, repeat.
- **Verification:** After EVERY change, not just at the end
- **Trigger skill:** `/careful`

### Overdrive Mode
- **Purpose:** Maximum speed for well-understood tasks. Trust the plan.
- **Tools:** All. Batch multiple changes before verification.
- **Output:** Rapid progress through mechanical work
- **Pacing:** Fast. Verify at milestones, not every step.
- **Verification:** At phase boundaries only
- **Trigger skill:** `/overdrive`

**Switch now to {{target_mode}} mode and begin: {{task}}**
```

## Tips
- Use the `plan` skill to enter plan mode with structured reasoning
- The `careful` skill activates extra verification for high-stakes changes
- The `overdrive` skill enables maximum throughput for mechanical tasks
- Mode switches are mental — they change how you use tools, not which tools are available

## Example

```
Switch to plan mode for the following task.

**Current mode:** Was in code mode implementing auth endpoints
**Target mode:** plan
**Task:** Design the webhook delivery system before implementing it. Need to decide on retry strategy, queue technology, and failure handling.
```
