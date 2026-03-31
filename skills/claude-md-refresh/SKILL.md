---
name: claude-md-refresh
description: Analyze and refresh CLAUDE.md files against the latest CC Commander template
disable-model-invocation: true
---

# CLAUDE.md Refresh Skill

## Purpose

Intelligently merge updates from the CC Commander staff template into an existing CLAUDE.md file without destroying user customizations.

## Algorithm

1. **Parse existing CLAUDE.md** into sections (split on `## ` headers)
2. **Parse latest template** into sections
3. **Classify each section**:
   - MATCH: exists in both -> compare content, flag if template is newer
   - MISSING: in template but not in existing -> recommend adding
   - CUSTOM: in existing but not in template -> preserve untouched
4. **Generate merge plan** showing adds, updates, and preserves
5. **Apply after confirmation** — insert new sections, update outdated ones, keep custom

## Section Matching

Match by H2 header text (case-insensitive, ignoring leading/trailing whitespace).
Known aliases: "Coding Standards" = "Code Style", "Workflow" = "Development Workflow"

## Template Version Detection

Look for HTML comment at top of file:
```
<!-- CC Commander Staff Template vX.Y.Z | Generated: YYYY-MM-DD -->
```
If missing, assume v1.0.0.

## Output Format

Show a clean summary table:
```
| Action | Section | Reason |
|--------|---------|--------|
| ADD    | Aggregator Ecosystem | New in v2.0.0 |
| UPDATE | Workflow | 3 new subsections added |
| KEEP   | My Custom Rules | Custom section |
```

Then show the full diff of proposed changes using ```diff blocks.

## Merge Rules

1. **Section ordering**: New sections are inserted after the closest existing neighbor from the template order. If no neighbor exists, append before Rules.
2. **Content within matched sections**: If the template section has new H3 subsections not present in the user's version, add them at the end of that section. Do not remove existing H3 subsections.
3. **H1 title**: Preserve the user's name. Never overwrite with `[Your Name]`.
4. **Version comment**: Update to the current template version after applying changes.
5. **Whitespace**: Normalize to single blank lines between sections. No trailing whitespace.

## Safety

- NEVER delete custom sections
- NEVER overwrite user's name with [Your Name] placeholder
- ALWAYS show diff before applying
- ALWAYS preserve existing content order where possible
- NEVER remove existing rules, principles, or workflow steps
- Only ADD or AUGMENT — never subtract

## Integration

- **Command**: `/claude-md:refresh` triggers this skill
- **Hook**: `claude-md-staleness.js` detects when a refresh is needed and suggests running the command
- **Installer**: `install.sh` uses `CLAUDE.md.staff-template` for initial creation; this skill handles subsequent updates
