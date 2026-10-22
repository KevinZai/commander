# Writing templates

Structures and fill-in templates for `/ccc-agent-writing`. Replace every bracketed placeholder; delete a section only when the skill's procedure says it does not apply.

## Structure by document type

| Writing type | Structure |
|---|---|
| Spec / PRD | Problem → Context → Requirements → Acceptance criteria → Out of scope → Open questions |
| PR description | Summary → Changes → Test plan → Screenshots (UI only) |
| README section | What → Why → How, in that order |
| Runbook | Trigger → Steps → Expected result → Rollback |
| Technical doc | Concept → Example → Edge cases → See also |

## PR description

```markdown
## Summary

[1-3 bullets — WHAT changed and WHY]

## Changes

- `path/to/file.ts` — [what changed and why]

## Test plan

- [ ] [Specific step to verify the happy path]
- [ ] [Edge case tested]
- [ ] [Regression check]

## Screenshots (if UI change)

[Before/After screenshots]
```

## Spec / PRD

```markdown
## Problem

[1 paragraph: what's broken, who it affects, evidence]

## Context

[Background needed to understand the decision. Links to prior decisions.]

## Requirements

- MUST: [non-negotiable]
- SHOULD: [strong preference]
- COULD: [nice to have]

## Acceptance Criteria

- Given [state], when [action], then [outcome]

## Out of Scope

- [Explicit exclusion] — deferred to [issue/version]

## Open Questions

- [ ] [Unresolved question] — owner: [name], by: [date]
```

## Runbook

```markdown
## Trigger

[The alert, symptom or request that starts this runbook]

## Steps

1. [Exact command or action] — expect: [observable result]

## Expected result

[How the operator knows the system is healthy again]

## Rollback

1. [Exact command or action to undo step N]
```

## README section

```markdown
## [Feature name]

[What it is, in one sentence.]

[Why a reader would use it, in one or two sentences.]

### Usage

[Install or invoke command, then one minimal example with its output.]
```

## Technical doc

```markdown
## [Concept]

[One-paragraph definition.]

### Example

[Smallest runnable example.]

### Edge cases

- [Case] — [behavior]

### See also

- [Related doc or file]
```
