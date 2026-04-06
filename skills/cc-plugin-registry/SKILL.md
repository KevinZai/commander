---
name: cc-plugin-registry
description: Reports all installed plugins, vendor packages, phase coverage, conflicts, and scoring
version: 1.0.0
category: meta
---

# CC Plugin Registry

Audit and report on all installed CC Commander plugins, vendor packages, and integrations.

## Usage

Run this skill to get a full inventory of your CC Commander installation.

## Report Sections

### 1. Installed Plugins

Scan for all detected plugins and integrations:

- **Core Skills** -- built-in skills from `skills/` directory
- **CCC Domains** -- multi-skill routers from `skills/ccc-*/`
- **Hooks** -- active hooks from `hooks/` and `hooks.json`
- **Commands** -- slash commands from `commands/`
- **Templates** -- project templates from `templates/`
- **Adventures** -- interactive decision trees from `commander/adventures/`

### 2. Vendor Packages

Check for third-party integrations:

- **gstack** -- Google stack integration (detect via `~/.claude/commands/gstack.md`)
- **Superpowers** -- Claude Superpowers plugin
- **CE** -- Compound Engineering plugin
- **Cowork** -- Claude Desktop Cowork plugin
- **ECC** -- Everything Claude Code hooks and skills

### 3. Phase Coverage

Map which development phases have tool coverage:

| Phase | Tools | Coverage |
|-------|-------|----------|
| Planning | /plan, spec-interviewer, brainstorming | Full |
| Development | /tdd, /build-fix, 450+ skills | Full |
| Testing | /e2e, /test-coverage, /qa | Full |
| Review | /code-review, /review | Full |
| Deploy | /ship, /land-and-deploy | Full |
| Monitor | /canary, /browse | Partial |
| Learn | /learn, knowledge.js | Full |
| Maintain | /refactor-clean, /audit | Full |

### 4. Conflict Detection

Check for conflicts between plugins:

- Duplicate command names across plugins
- Hook ordering conflicts (same event, competing handlers)
- Skill name collisions
- Settings.json merge conflicts

### 5. Scoring

Rate the installation health:

- **Completeness** (0-100): How many phases are covered
- **Freshness** (0-100): How recently plugins were updated
- **Compatibility** (0-100): Conflict-free integration score
- **Overall** (0-100): Weighted average

## Output Format

The registry report is generated as markdown and can be saved to `~/.claude/commander/registry-report.md`.
