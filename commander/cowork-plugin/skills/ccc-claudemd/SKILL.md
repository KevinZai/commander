---
name: ccc-claudemd
description: "Audit a project CLAUDE.md against the real codebase for stale paths, dead commands, missing context and token waste, then apply fixes only after picker approval. Use when asking to audit, clean up or optimize CLAUDE.md or project instructions, or when the suggest engine flags it as stale."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[check | fix | report]"
model: sonnet
effort: medium
---

# /ccc-claudemd — Keep instructions honest

**CC Commander** · /ccc-claudemd · a verified audit of CLAUDE.md, and edits only after you approve them

## When to use / when not to

- Use when CLAUDE.md may have drifted from the tree. The suggest engine recommends this skill when `claudeMdAgeDays` exceeds 30, read from the per-project state at `~/.claude/commander/projects/<slug>/project-state.json` (find it with `ls -d ~/.claude/commander/projects/$(basename "$PWD")-*`).
- No CLAUDE.md at all: route to `/ccc-adopt`, which owns the create flow (diff preview, approval, backup, delimited write). This skill never creates one.
- For older-model prompting patterns across CLAUDE.md, skills, agents and commands, the user can also run `/doctor prompt-audit` in Claude Code; this skill checks factual drift against the tree.
- `$ARGUMENTS`: `check` runs steps 1–3 and prints findings; `report` also writes the report file; `fix` runs the full flow including the approval picker. No argument means `fix`.

## What it checks

1. **Stale references.** Paths that no longer exist; commands missing from `package.json` scripts, Makefile or justfile targets; dependencies absent from `package.json`, `pyproject.toml` or `Cargo.toml`; framework references that do not match installed versions; counts and version strings that drifted.
2. **Missing context.** Undocumented key directories (`src/`, `lib/`, `tests/`); unmentioned package scripts; environment variables used in code but not documented (names only, never values); configured MCP servers not referenced; git hooks or CI workflows not mentioned.
3. **Cache order.** Static content first and dynamic last; frequently used paths near the top; file under 500 lines; duplicate instructions.
4. **Token efficiency.** Verbose instructions that can be condensed; commented-out or TODO sections; path listings that a glob covers; long example blocks.

## What happens

1. **Read CLAUDE.md** at the project root in full. If it does not exist, stop and offer `/ccc-adopt` with AskUserQuestion (🟢 Run /ccc-adopt · Cancel).
2. **Scan the codebase** in one Bash call, silent on failure:
   ```bash
   ls -la package.json tsconfig.json pyproject.toml Cargo.toml Makefile justfile Dockerfile docker-compose.yml 2>/dev/null
   ls -d src/ lib/ tests/ app/ pages/ components/ .github/workflows/ .husky/ 2>/dev/null
   node -e "console.log(Object.keys(require('./package.json').scripts||{}).join(', '))" 2>/dev/null
   node -e "const p=require('./package.json');console.log(Object.keys({...p.dependencies,...p.devDependencies}).join(', '))" 2>/dev/null
   ls .env* 2>/dev/null   # names only; never read or print .env contents
   wc -l CLAUDE.md
   ```
3. **Cross-reference.** For each claim in CLAUDE.md, run the check that proves it: `test -e <path>` for paths, the scripts list for commands, Grep for symbols and env-var names. Mark each finding **CONFIRMED** (check ran and failed, with the command) or **INFERRED** (likely, not proven, for example "probably renamed to X"). Drop anything you did not check. Skip historical sections (changelogs, dated decisions); only current-state claims are in scope.
4. **Report.** Print a markdown summary with four groups (stale references, missing context, cache order, token savings) and, per finding, its evidence line and status. Estimate token savings as removed characters divided by 4 and say that is the method.
5. **Approval gate.** Ask the picker below. Never edit before an answer that allows it.
6. **Apply.** If CLAUDE.md is not tracked by git (`git ls-files --error-unmatch CLAUDE.md` fails), first copy it to `CLAUDE.md.bak-<YYYYMMDD>`. In walk-through mode, ask one AskUserQuestion per fix showing the exact before and after (🟢 Apply · Skip · Stop), then Edit. In apply-all mode, Edit only CONFIRMED findings.
7. **Report the result** with the checks in Done when.

## Decision points

```
question: "CLAUDE.md audit found N issues (about T tokens per session). How should I proceed?"
header: "CLAUDE.md"
multiSelect: false
options:
  - label: "🟢 Show me each fix first"
    description: "One approval per edit, with the exact before and after. Safest."
  - label: "✅ Apply all confirmed fixes"
    description: "Edits only CONFIRMED findings in one pass; a summary diff follows."
  - label: "📝 Export report only"
    description: "Writes tasks/reviews/claudemd-audit-YYYYMMDD.md. Zero edits to CLAUDE.md."
  - label: "❌ Cancel"
    description: "Do nothing."
```

In Codex, ask the same four choices as a plain-text question and wait for the answer.

## Done when

- After edits: CLAUDE.md is re-read, and `wc -l CLAUDE.md` plus `git diff --stat CLAUDE.md` (or a diff against the backup) are shown with the before and after line counts and the token delta.
- After export: `test -f tasks/reviews/claudemd-audit-<YYYYMMDD>.md` succeeds (create `tasks/reviews/` if missing) and the path is printed.
- Every reported finding carries its evidence line and CONFIRMED or INFERRED status.

## Guardrails

- Never edits CLAUDE.md before the approval picker returns "Show me each fix first" or "Apply all confirmed fixes".
- Never flags a stale reference it did not verify against the live tree; every count in the report states its method.
- Never creates a CLAUDE.md; that is `/ccc-adopt`.
- Never rewrites historical sections.
- Never reads or prints secret values; environment variables are reported by name only.
- Never commits or pushes; that needs separate authorization.

## See also

- `/ccc-adopt` — create a CLAUDE.md for a project that has none
- `/ccc-memory` — decide what belongs in CLAUDE.md versus other memory tiers
- `/ccc-prompt-fix` — tighten a single prompt
- `/ccc-doc-sync` — count and version drift in Commander's own docs

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
