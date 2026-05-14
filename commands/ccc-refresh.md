---
description: "[DEPRECATED] Use /ccc:init instead — unified init + refresh command as of v4.0.0-beta.1."
---

# `/ccc-refresh` — Deprecated Alias

> ⚠️ **Deprecated in v4.0.0-beta.1.** Use [`/ccc:init`](./init.md) — unified init + refresh that auto-detects whether to scaffold or merge-refresh.

This alias is preserved for backward compatibility and will be removed in v5.0. The execution behavior below is identical to the refresh path in `/ccc:init`.

---

This command analyzes your existing CLAUDE.md and proposes updates based on the latest CC Commander template.

## What This Command Does

1. **Reads** your current `~/.claude/CLAUDE.md` (or project-level CLAUDE.md)
2. **Compares** H2 sections against the latest CC Commander v2.1.0 template
3. **Identifies**: missing sections, outdated sections, custom sections
4. **Proposes** a merge plan showing what would be added/updated
5. **Preserves** all custom sections you've written
6. **Applies** changes only after your explicit confirmation

## Merge Strategy

- **Missing sections**: Added from template with `<!-- Added by CC Commander v2.1.0 -->` marker
- **Outdated sections**: Template version shown side-by-side for comparison
- **Custom sections**: Left untouched (any H2 not in template is considered custom)
- **User name**: Preserved from existing file (not overwritten with placeholder)

## When to Use

- After upgrading CC Commander
- When your CLAUDE.md is >30 days old
- When CCC staleness hook suggests a refresh
- After running /makeover on a project
- Periodically to pick up new best practices

## Auto-Prompt Triggers

The `claude-md-staleness` hook will suggest running this command when:
- CLAUDE.md is missing entirely
- Template version is older than installed CC Commander version
- File hasn't been modified in >30 days
- Key H2 sections are missing (Workflow, Core Principles, etc.)

## Execution Steps

When invoked, follow this procedure:

### Step 1: Read Current State

Read the user's CLAUDE.md. Extract:
- The HTML version comment (if any) at the top of the file
- All H2 (`## `) section headers and their content
- The user's name from the H1 title line

### Step 2: Read Template

Read the CC Commander template at the kit's `CLAUDE.md.template`.
Parse it into the same H2 section structure.

### Step 3: Classify Sections

For each section, determine its status:
- **MATCH**: Header exists in both files (case-insensitive match)
- **MISSING**: In template but not in user's file -> recommend adding
- **CUSTOM**: In user's file but not in template -> preserve untouched

For MATCH sections, compare content. If the template has significant additions (new subsections, new rules), flag as UPDATE candidate.

### Step 4: Present Merge Plan

Show a summary table:

```
| Action | Section | Reason |
|--------|---------|--------|
| ADD    | Aggregator Ecosystem | New in v2.1.0 |
| ADD    | CCC Domains | New in v2.1.0 |
| ADD    | Linear Integration | New in v2.1.0 |
| ADD    | Knowledge Compounding | New in v2.1.0 |
| UPDATE | Workflow | 6 new subsections (Anti-Sycophancy, Scope Discipline, etc.) |
| UPDATE | Core Principles | 2 new principles added |
| KEEP   | My Custom Section | Custom (not in template) |
```

### Step 5: Apply After Confirmation

Ask: "Apply these changes? (yes / no / show-diff)"

- **yes**: Apply all proposed changes, update version comment at top
- **no**: Abort, no changes made
- **show-diff**: Display full diff blocks for each change, then ask again

After applying, update the version comment to:
```
<!-- CC Commander Template v2.1.0 | Generated: YYYY-MM-DD -->
```

## Example

```
User: /claude-md:refresh

Claude:
# CLAUDE.md Refresh Analysis

## Current State
- File: ~/.claude/CLAUDE.md
- Template version: v1.3.0
- Latest template: v2.1.0
- File age: 45 days
- Custom sections: 3

## Proposed Changes
+ [ADD] ## Aggregator Ecosystem — CC Commander v2.0 vendor packages
+ [ADD] ## CCC Domains — 11 CCC domains, 172+ sub-skills
+ [ADD] ## Knowledge Compounding — session learning system
~ [UPDATE] ## Workflow — add Anti-Sycophancy, Scope Discipline, Corrective Framing
= [KEEP] ## My Custom Rules — unchanged
= [KEEP] ## Project-Specific Notes — unchanged

Apply these changes? (yes/no/show-diff)
```
