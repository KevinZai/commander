---
name: feature-start
description: "Kickoff a new feature with branch creation, TDD setup, and task breakdown"
usage: /feature-start [feature name or description]
version: 1.3.0
---

# Feature Start — Structured Feature Kickoff

Starting feature: **{{input}}**

## Phase 1: Research & Context

1. **Check existing work**: Search codebase for related code, previous PRs, and open issues
2. **Check lessons**: Read `tasks/lessons.md` for relevant past learnings
3. **Check dependencies**: Identify what this feature touches (files, modules, APIs)
4. **Architecture fit**: Where does this feature belong in the codebase?

## Phase 2: Branch & Setup

1. Pull latest from main: `git pull origin main`
2. Create feature branch: `git checkout -b feature/{{input-slug}}`
3. Verify baseline: run tests to confirm everything passes before changes

## Phase 3: Task Breakdown

Create `tasks/todo.md` with a structured plan:

```markdown
# Feature: {{input}}

## Tasks
- [ ] Write spec (requirements, acceptance criteria, edge cases)
- [ ] Design API/interface (if applicable)
- [ ] Write failing tests (TDD red phase)
- [ ] Implement core logic (TDD green phase)
- [ ] Refactor and clean up
- [ ] Integration tests
- [ ] Documentation updates
- [ ] Code review preparation
- [ ] Final verification
```

## Phase 4: TDD Kickoff

1. Define what "done" looks like (acceptance criteria)
2. Define what "broken" looks like (edge cases, error scenarios)
3. Write the FIRST failing test
4. Create WIP commit: `git commit -m "feat: start {{input}} — failing tests"`

## Phase 5: Architecture Notes

Document key decisions in the commit or task file:
- **Pattern chosen**: [why this approach]
- **Files to modify**: [list]
- **Files to create**: [list]
- **Dependencies**: [new packages needed?]
- **Risks**: [what could go wrong]

## Output

```
FEATURE START: {{input}}
Branch: feature/{{input-slug}}
Baseline tests: [PASS/FAIL]
Tasks created: [count]
First test: [written/pending]
Ready for TDD: [YES/NO]
```
