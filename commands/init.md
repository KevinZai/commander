---
description: CC Commander init — scaffold or refresh project CLAUDE.md, tasks/, and lessons.md from the latest v4.0 template. Preserves custom sections.
---

# `/ccc:init` — Project Initialization + Refresh

One command for both **new projects** and **existing stale CLAUDE.md refreshes**. Replaces `/ccc-refresh` (kept as deprecated alias).

## What this does

1. Detects current project state:
   - **No CLAUDE.md** → scaffold from `CLAUDE.md.template`
   - **CLAUDE.md older than 30 days OR template version mismatch** → refresh proposal
   - **CLAUDE.md current** → report healthy + offer optional sections
2. Creates `tasks/` directory + `tasks/lessons.md` if missing
3. Creates `.claude/settings.json` scaffold if missing (project-scoped permissions)
4. Shows a merge plan with ADD / UPDATE / KEEP / CUSTOM classifications
5. Applies only after explicit confirmation
6. Updates version comment to: `<!-- CC Commander Template v4.0.0-beta.1 | Generated: YYYY-MM-DD -->`

## Scaffold paths (new project)

```
project-root/
├── CLAUDE.md              # from CLAUDE.md.template
├── tasks/
│   ├── todo.md            # stub
│   └── lessons.md         # empty header
└── .claude/
    └── settings.json      # project-level scaffold
```

## Refresh strategy (existing project)

Same H2-section merge behavior as legacy `/ccc-refresh`:
- **MATCH** — header exists in both, compare bodies
- **MISSING** — in template but not user's → recommend adding with `<!-- Added by CC Commander v4.0.0-beta.1 -->`
- **CUSTOM** — user has it, template doesn't → preserved untouched
- **UPDATE** — content drift → side-by-side proposal

## Auto-prompt triggers

The `session-start` hook proactively nudges when:
- CLAUDE.md missing entirely
- Template version older than installed CC Commander
- File unmodified >30 days
- Key H2 sections missing (Workflow, Core Principles, Rules)

Override via `CC_NUDGE_DISABLE=1`.

## Deprecated alias

`/ccc-refresh` is preserved as a deprecated alias — calling it emits a deprecation notice, then executes `/ccc:init` refresh behavior.

## Example

```
User: /ccc:init

CC Commander:
# Project Initialization

## State detected
- CLAUDE.md: present, v2.1.0 → v4.0.0-beta.1 available
- tasks/lessons.md: missing
- .claude/settings.json: missing
- Last modified: 47 days ago

## Proposed actions
+ [SCAFFOLD] tasks/lessons.md
+ [SCAFFOLD] .claude/settings.json (project permissions scaffold)
~ [REFRESH]  CLAUDE.md — 6 new H2 sections, 4 updated
= [KEEP]     "My Custom Rules" section (untouched)

Apply? (yes / no / show-diff)
```

## Rationale

Unifying `/ccc:init` with `/ccc-refresh` removes a common source of user confusion: "do I init or refresh?" Answer: always `/ccc:init` — the command figures out which it is.
