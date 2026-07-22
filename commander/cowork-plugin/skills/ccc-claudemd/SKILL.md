---
name: ccc-claudemd
description: "Audit the project CLAUDE.md against the codebase — stale paths, dead commands, token waste — fixes applied only after AskUserQuestion approval. Use when: 'audit claude md', 'optimize instructions'."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Edit
  - AskUserQuestion
argument-hint: "[check | fix | report]"
---

# /ccc-claudemd — CLAUDE.md Auditor

Compares the project's CLAUDE.md instructions against the real state of the codebase and proposes concrete fixes. **Nothing is edited without explicit AskUserQuestion approval** — the permission ask is native to this flow.

**CC Commander** · /ccc-claudemd · Keep your instructions honest

> The ambient suggest engine recommends this skill when `claudeMdAgeDays > 30` (from the per-project state at `~/.claude/commander/projects/<slug>/project-state.json` — locate it with `ls -d ~/.claude/commander/projects/$(basename "$PWD")-*`; the flat pre-v7.3.0 path is no longer written). If the project has NO CLAUDE.md at all, route to `/ccc-adopt` instead — it owns the create flow (diff preview → approval → backup → delimited write).

## What It Checks

### 1. Stale References
- File paths mentioned in CLAUDE.md that no longer exist
- Commands referenced that aren't in package.json scripts (or Makefile/justfile targets)
- Dependencies mentioned that aren't in package.json / pyproject.toml / Cargo.toml
- Tool/framework references that don't match installed versions
- Counts and version strings that drifted from reality (prove before alarm — verify each against the live tree before flagging)

### 2. Missing Context
- Key directories not documented (src/, lib/, tests/)
- Package.json scripts not mentioned
- Environment variables used in code but not documented
- MCP servers configured but not referenced
- Git hooks or CI workflows not mentioned

### 3. Cache Optimization
- Is static content first, dynamic last? (cache-friendly ordering)
- Are frequently-referenced paths at the top?
- Is the file under 500 lines? (diminishing returns above this)
- Are there duplicate instructions that waste tokens?

### 4. Token Efficiency
- Verbose instructions that could be condensed
- Commented-out or TODO sections wasting context
- Redundant path listings that could use glob patterns
- Long example blocks that could be shortened

## Process

### Step 1: Read CLAUDE.md
Read the project's CLAUDE.md file completely. If it doesn't exist, stop and offer `/ccc-adopt` via AskUserQuestion — do not create one here.

### Step 2: Scan Codebase
Use Glob and Bash to check (one parallel Bash call, silent on failure):
```bash
# Files that exist
ls -la package.json tsconfig.json .env* Dockerfile docker-compose.yml
# Package scripts
node -e "console.log(Object.keys(require('./package.json').scripts || {}).join(', '))"
# Key directories
ls -d src/ lib/ tests/ app/ pages/ components/ 2>/dev/null
# Installed deps
node -e "var p=require('./package.json'); console.log(Object.keys({...p.dependencies,...p.devDependencies}).join(', '))"
```

### Step 3: Cross-Reference
For each instruction in CLAUDE.md:
- Does the referenced file/path exist?
- Does the referenced command work?
- Is the information current?

Only report a finding you actually verified against the tree (run the check, don't pattern-match). Distinguish **observed** ("path missing, confirmed via ls") from **inferred** ("probably renamed").

### Step 4: Report + approval gate (AskUserQuestion — MANDATORY before any edit)

Present the audit summary as markdown (stale references / missing context / cache optimization / token savings estimate, each finding with its evidence), then ask via `AskUserQuestion`:

```
question: "CLAUDE.md audit found <N> issues (~<T> tokens/session wasted). How should I proceed?"
header: "CLAUDE.md Auditor"
multiSelect: false
options:
  - label: "🔍 Show me each fix first"
    description: "Walk through every proposed edit one at a time — approve or skip each."
    preview: "Safest. One AskUserQuestion per fix, with the exact before/after diff."
  - label: "✅ Apply all safe fixes"
    description: "Apply the verified stale-reference removals and dead-command fixes in one pass."
    preview: "Only findings marked CONFIRMED. A summary diff is shown after."
  - label: "📄 Export report only"
    description: "Write the audit to tasks/reviews/claudemd-audit-<YYYYMMDD>.md — no edits."
    preview: "Zero writes to CLAUDE.md."
  - label: "❌ Cancel"
    description: "Do nothing."
```

**Never edit CLAUDE.md without one of the first two answers.** In "show me each" mode, every Edit is preceded by its own approval chip. After edits land, re-read the file and show the final line-count + token-savings delta.

## Anti-patterns — DO NOT

- ❌ Edit CLAUDE.md before the AskUserQuestion approval gate — the permission ask is the whole point
- ❌ Flag a "stale" reference you didn't verify against the live tree (no scary counts without a method line)
- ❌ Create a CLAUDE.md when none exists — that's `/ccc-adopt`'s job
- ❌ Rewrite historical sections (changelogs, dated decisions) — only current-state claims are in scope
- ❌ Render fixes as a numbered "type 1/2/3" list — AskUserQuestion chips only

---

**Bottom line:** read → scan → cross-reference → report → **ask** → fix. Your CLAUDE.md stays honest, and it never changes without your click.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
