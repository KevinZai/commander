---
description: "Scaffold or refresh a project's CLAUDE.md, tasks/, lessons.md and .claude/settings.json from the CC Commander template, preserving custom sections. Use when starting a project or when CLAUDE.md is missing, stale, or behind the template."
---

# /ccc-init — project init and refresh

**CC Commander** · /ccc-init · one command that scaffolds a new project or merge-refreshes an existing CLAUDE.md, applied only after you approve the plan.

`/ccc-refresh` is a deprecated alias for the refresh path of this command.

## What happens

1. Locate the template: `CLAUDE.md.template` at the root of the CC Commander install or checkout. Read the installed version from that install's `package.json` (`node -p "require('./package.json').version"` run in that directory). If the template is not found, ask the user for its path and stop until it is given.
2. Detect the project state from the repository root (`git rev-parse --show-toplevel`, or the current directory outside git):
   - **No `CLAUDE.md`** → scaffold.
   - **`CLAUDE.md` unmodified for more than 30 days** (`date -r CLAUDE.md`), **or** its header comment records a version different from the installed one → refresh.
   - **Otherwise** → report healthy and offer the optional template sections it lacks.
3. Check the companions: `tasks/`, `tasks/todo.md`, `tasks/lessons.md`, `.claude/settings.json`.
4. Build the merge plan:
   - **Scaffold**: the full layout below.
   - **Refresh**: compare H2 sections of `CLAUDE.md` with the template:
     - **MATCH** — header in both, bodies equal → keep
     - **UPDATE** — header in both, bodies differ → side-by-side proposal
     - **MISSING** — in the template only → add, marked `<!-- Added by CC Commander <installed version> -->`
     - **CUSTOM** — in the user's file only → preserved untouched
   - Preserve the user's name and every filled-in placeholder; never reintroduce `[placeholder]` text over real content.
5. Show the plan:

   ```
   # Project Initialization

   ## State detected
   - CLAUDE.md: present, header <recorded version> → <installed version> available
   - tasks/lessons.md: missing
   - .claude/settings.json: missing
   - Last modified: <n> days ago

   ## Proposed actions
   + [SCAFFOLD] tasks/lessons.md
   + [SCAFFOLD] .claude/settings.json (project permissions scaffold)
   ~ [REFRESH]  CLAUDE.md — <n> new H2 sections, <n> updated
   = [KEEP]     "My Custom Rules" section (untouched)
   ```

6. Ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Apply — write every proposed change
   - Show diff first — print the full diff, then ask again
   - Pick sections — choose which UPDATE and MISSING sections to apply
   - Cancel — nothing is written
7. On Apply, write the changes and set the first line of `CLAUDE.md` to `<!-- CC Commander template | Version: <installed version> | Generated: <YYYY-MM-DD> -->`.
8. Verify: `head -1 CLAUDE.md`, `ls tasks/ .claude/settings.json`, and `git diff --stat` inside git. Confirm `.claude/settings.json` parses with `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"`. Report the results.

## Scaffold layout (new project)

```
project-root/
├── CLAUDE.md              # from CLAUDE.md.template, placeholders listed for the user to fill
├── tasks/
│   ├── todo.md            # stub
│   └── lessons.md         # header only
└── .claude/
    └── settings.json      # {"permissions": {"allow": [], "deny": []}}
```

Never overwrite an existing companion file; only create missing ones.

## Startup nudge

The plugin's `stale-claude-md-nudge` hook nudges toward `/ccc-adopt` when a code repository has no `CLAUDE.md`, and toward `/ccc-adopt --check` when `CLAUDE.md` has been untouched for more than 30 days. Set `CC_NUDGE_DISABLE=1` to silence it.

## Done when

The verification in step 8 ran and its output matches the applied plan, or the user cancelled and no file changed.

## Guardrails

- Nothing is written before the Apply pick.
- CUSTOM sections and user-filled content are never modified or removed.
- No commit or push; the user reviews `git diff` and commits.

## See also

`/ccc-refresh` · `/ccc-adopt` · `/ccc-claudemd` · `/ccc-feature-start`
