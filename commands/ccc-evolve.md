---
name: ccc-evolve
description: "Cluster learned instincts into candidate commands, skills, and agents, and optionally generate those files. Use when instincts have accumulated and you want to promote repeated patterns into reusable structures."
command: true
---

# /ccc-evolve — turn instincts into structures

**CC Commander** · /ccc-evolve · evolution candidates from your project and global instincts, with optional generated files.

## Arguments

`$ARGUMENTS`:

- empty — analyze all instincts and print candidates
- `--generate` — also write the candidate files under `evolved/{skills,commands,agents}`

## What happens

1. Run the instinct CLI. Use the plugin-root form when `CLAUDE_PLUGIN_ROOT` is set:

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
   ```

   Otherwise use the manual-install path:

   ```bash
   python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py evolve [--generate]
   ```

   If neither file exists, report that the continuous-learning-v2 skill is not installed and stop. If the CLI exits non-zero, show its stderr and stop.
2. The CLI detects the current project, reads project and global instincts (project wins on id conflicts), groups them by trigger and domain, and identifies:
   - **Skill candidates** — trigger clusters with 2 or more instincts
   - **Command candidates** — high-confidence workflow instincts
   - **Agent candidates** — larger, high-confidence clusters
   - **Promotion candidates** — project instincts worth moving to global scope
3. Present the CLI output as-is, then add a short interpretation using the evolution rules below. Do not invent candidates the CLI did not report.
4. With `--generate`, the CLI writes files to:
   - project scope: `~/.claude/homunculus/projects/<project-id>/evolved/`
   - global fallback: `~/.claude/homunculus/evolved/`

   Verify with `ls -R` on the directory the CLI reported and list each generated file. Tell the user the files are drafts to review before copying into `~/.claude/commands/`, `~/.claude/skills/` or `~/.claude/agents/`.
5. When the output shows promotion candidates, point to `/ccc-promote`.

## Evolution rules

| Becomes | When the instincts describe | Example cluster | Result |
|---|---|---|---|
| Command (user-invoked) | Actions a user explicitly requests; "when creating a new X"; a repeatable sequence | `new-table-step1..3`: create migration, update schema, regenerate types | `new-table` command |
| Skill (auto-triggered) | Pattern-matching triggers, error-handling responses, style enforcement | `prefer-functional`, `use-immutable`, `avoid-classes` | `functional-patterns` skill |
| Agent (needs depth or isolation) | Multi-step processes such as debugging, refactoring sequences, research | `debug-step1..4`: check logs, isolate, reproduce, verify with test | `debugger` agent |

## Output format

```
============================================================
  EVOLVE ANALYSIS - <n> instincts
  Project: <project-name> (<project-id>)
  Project-scoped: <n> | Global: <n>
============================================================

High confidence instincts (>=80%): <n>

## SKILL CANDIDATES
1. Cluster: "adding tests"
   Instincts: <n>
   Avg confidence: <n>%
   Domains: testing
   Scopes: project

## COMMAND CANDIDATES (<n>)
  /adding-tests
    From: test-first-workflow [project]
    Confidence: <n>%

## AGENT CANDIDATES (<n>)
  adding-tests-agent
    Covers <n> instincts
    Avg confidence: <n>%
```

## Generated file formats

Command:

```markdown
---
name: new-table
description: Create a new database table with migration, schema update, and type generation
command: /new-table
evolved_from:
  - new-table-migration
  - update-schema
  - regenerate-types
---

# New Table Command

[Generated content based on clustered instincts]

## Steps
1. ...
```

Skill:

```markdown
---
name: functional-patterns
description: Enforce functional programming patterns
evolved_from:
  - prefer-functional
  - use-immutable
  - avoid-classes
---

# Functional Patterns Skill

[Generated content based on clustered instincts]
```

Agent:

```markdown
---
name: debugger
description: Systematic debugging agent
model: sonnet
evolved_from:
  - debug-check-logs
  - debug-isolate
  - debug-reproduce
---

# Debugger Agent

[Generated content based on clustered instincts]
```

The agent `model:` is an alias (`haiku`, `sonnet`, `opus`, `fable`, `inherit`); pick the tier the work needs, never a dated model id.

## Done when

The CLI output has been shown; with `--generate`, the listed files exist on disk per the `ls -R` check.

## Guardrails

- Writes happen only with `--generate`, and only under `~/.claude/homunculus/`.
- Never copy generated files into active command, skill or agent directories without the user asking.

## See also

`/ccc-instinct-status` · `/ccc-promote` · `/ccc-skill-create` · `/ccc-learn-eval`
