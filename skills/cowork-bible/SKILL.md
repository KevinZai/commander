---
name: cowork-bible
description: |
  Claude Desktop Cowork integration guide for Bible users. Cowork is Claude Desktop's
  autonomous execution mode with 11 official Anthropic plugins. This skill teaches how
  to configure Bible skills for Cowork mode, plugin compatibility, scheduled task patterns,
  custom plugin development, handoff protocols, and security considerations.
triggers:
  - /cowork
  - cowork setup
  - cowork integration
  - claude desktop autonomous
  - cowork bible
  - cowork plugins
  - scheduled cowork
---

# Cowork Bible Integration

## What Is Cowork?

Cowork is Claude Desktop's autonomous execution mode. Instead of interactive chat, Claude runs unattended with access to 11 official Anthropic plugins (file system, terminal, browser, etc.). Sessions execute against a project directory, follow a task description, and produce artifacts without human intervention.

Key differences from Claude Code CLI:
- **GUI-based** -- runs inside Claude Desktop, not terminal
- **Plugin architecture** -- capabilities come from discrete plugins, not raw tool access
- **Session-scoped** -- each Cowork session is a bounded execution unit
- **Scheduled** -- can be triggered on timers, webhooks, or file watchers

## Bible Feature Compatibility Matrix

| Bible Feature | Cowork Support | Notes |
|---|---|---|
| Skills (SKILL.md) | Full | Load via project context or plugin manifest |
| Slash commands | Partial | Commands that invoke tools work; interactive prompts do not |
| Hooks (PreToolUse) | Not supported | Cowork uses plugin permissions, not hook interception |
| Hooks (PostToolUse) | Plugin adapter | Use `cowork-plugin-builder` to wrap as plugin |
| Hooks (Stop) | Session end event | Map to Cowork session completion callback |
| Mode switcher | Full | Set mode in session config before launch |
| Prompt templates | Full | Include in task description |
| Terminal art | Not supported | No terminal output in Cowork |
| CLAUDE.md | Full | Loaded automatically from project root |
| Mega-skills | Router only | Sub-skills work if they don't require interactive input |
| Task Commander | Full | Excellent fit -- task lists drive autonomous execution |
| Confidence check | Partial | Runs but cannot prompt user for confirmation |

## Configuring Bible Skills for Cowork

### Step 1: Project Setup

Cowork sessions bind to a project directory. Ensure your project has:

```
your-project/
  CLAUDE.md          # Bible-style project instructions
  .claude/
    settings.json    # Permissions and tool config
    commands/        # Slash commands (optional)
  tasks/
    todo.md          # Task list for autonomous execution
```

### Step 2: Session Configuration

Create a Cowork session config that references Bible skills:

```json
{
  "name": "bible-daily-standup",
  "project": "/path/to/your-project",
  "task": "Run the daily standup workflow. Follow the session-startup skill, then execute /standup. Write results to output/standup-{date}.md.",
  "plugins": ["filesystem", "terminal", "browser"],
  "schedule": "0 9 * * 1-5",
  "maxDuration": "15m",
  "context": {
    "skills": [
      "session-startup",
      "overnight-runner",
      "verification-loop"
    ]
  }
}
```

### Step 3: Skill Loading

Cowork loads skills from two sources:

1. **Project context** -- skills referenced in `CLAUDE.md` or `.claude/` directory
2. **Plugin manifest** -- skills packaged as Cowork plugins (see `cowork-plugin-builder`)

For project-level skills, include them in your CLAUDE.md:

```markdown
## Available Skills
Load these skills on demand:
- `session-startup` -- initialize session state
- `task-commander` -- manage multi-step task execution
- `verification-loop` -- verify work before marking complete
```

## Scheduled Task Patterns

### Daily Standup (Weekdays 9:00 AM)

```json
{
  "name": "daily-standup",
  "schedule": "0 9 * * 1-5",
  "task": "Read tasks/todo.md. For each in-progress task: check git log for recent commits, check test results, identify blockers. Write standup summary to output/standups/{date}.md. Format: What was done, what is planned, what is blocked.",
  "plugins": ["filesystem", "terminal"],
  "maxDuration": "10m",
  "costLimit": "$0.50"
}
```

### Weekly Code Review (Friday 4:00 PM)

```json
{
  "name": "weekly-review",
  "schedule": "0 16 * * 5",
  "task": "Run git log --since='1 week ago' --oneline. For each significant commit, review the diff for: security issues, code quality, missing tests. Write review to output/reviews/week-{date}.md using the receiving-code-review skill format.",
  "plugins": ["filesystem", "terminal"],
  "maxDuration": "30m",
  "costLimit": "$2.00"
}
```

### Overnight Build Pipeline

```json
{
  "name": "overnight-build",
  "schedule": "0 1 * * *",
  "task": "Follow the overnight-runner skill pattern. Read tasks/build-queue.json. For each item: checkout branch, run tests, build, record results. Write checkpoint after each item. On completion, write summary to output/builds/{date}.md.",
  "plugins": ["filesystem", "terminal"],
  "maxDuration": "4h",
  "costLimit": "$5.00",
  "retry": {
    "maxAttempts": 3,
    "backoffMinutes": 30
  }
}
```

### Dependency Health Check (Monday 6:00 AM)

```json
{
  "name": "dep-health",
  "schedule": "0 6 * * 1",
  "task": "Run npm audit and npm outdated for all projects in the monorepo. Cross-reference with known CVEs. Write report to output/deps/{date}.md with severity ratings and upgrade recommendations.",
  "plugins": ["filesystem", "terminal"],
  "maxDuration": "20m",
  "costLimit": "$1.00"
}
```

### Content Generation (Tuesday/Thursday 10:00 AM)

```json
{
  "name": "content-batch",
  "schedule": "0 10 * * 2,4",
  "task": "Read tasks/content-queue.json. For each content brief: research topic, generate draft following brand-guidelines skill, write to output/content/drafts/{slug}.md. Mark item complete in queue. Use human-gate pattern for items marked 'review-required'.",
  "plugins": ["filesystem", "terminal", "browser"],
  "maxDuration": "45m",
  "costLimit": "$3.00"
}
```

## Handoff Protocol: Claude Code <-> Cowork

### Claude Code to Cowork

When handing work from a Claude Code session to a Cowork session:

1. **Checkpoint state** -- write current progress to `tasks/checkpoint.json`
2. **Define task** -- create a clear task description in `tasks/cowork-handoff.md`
3. **Set permissions** -- ensure `.claude/settings.json` grants needed tool access
4. **Queue the session** -- create or update the Cowork session config
5. **Include context** -- reference specific files, not conversation history

```markdown
<!-- tasks/cowork-handoff.md -->
## Handoff: Data Migration Phase 2

### Context
Phase 1 complete. 500/1200 records migrated. See tasks/checkpoint.json.

### Task
Continue migration from checkpoint. For each remaining record:
1. Read from source (data/source.json)
2. Transform using schema in data/transform-rules.json
3. Validate against data/target-schema.json
4. Write to output/migrated/{id}.json
5. Update checkpoint

### On Completion
Write summary to output/migration-report.md
Set checkpoint status to "complete"

### On Failure
Write error details to output/migration-errors.log
Set checkpoint status to "blocked" with error description
```

### Cowork to Claude Code

When a Cowork session produces results that need interactive follow-up:

1. Cowork writes results to a known output path
2. Cowork sets a flag file: `tasks/cowork-complete-{sessionName}.json`
3. Next Claude Code session reads the flag and results
4. Human reviews with Claude Code interactively

```json
{
  "session": "overnight-build",
  "completedAt": "2026-03-28T05:30:00Z",
  "status": "partial",
  "summary": "Built 8/10 projects. 2 failures need human review.",
  "artifacts": [
    "output/builds/2026-03-28.md",
    "output/builds/errors/project-foo.log"
  ],
  "nextSteps": [
    "Review project-foo build failure (missing env var)",
    "Review project-bar test timeout (flaky test?)"
  ]
}
```

## Security Considerations

### File System Access

Cowork has file system access through the filesystem plugin. Scope it tightly:

```json
{
  "plugins": {
    "filesystem": {
      "allowedPaths": [
        "/path/to/project",
        "/tmp/cowork-scratch"
      ],
      "denyPaths": [
        "**/.env",
        "**/.env.*",
        "**/credentials*",
        "**/*.pem",
        "**/*.key",
        "**/secrets/**"
      ]
    }
  }
}
```

### Terminal Access

Restrict terminal commands to what the task actually needs:

```json
{
  "plugins": {
    "terminal": {
      "allowedCommands": [
        "git *",
        "npm run *",
        "npx tsc --noEmit",
        "node *"
      ],
      "denyCommands": [
        "rm -rf *",
        "sudo *",
        "curl * | bash",
        "ssh *",
        "scp *"
      ],
      "timeout": 300
    }
  }
}
```

### Cost Controls

Always set cost limits on Cowork sessions:

- **Per-session limit** -- `costLimit` in session config
- **Daily aggregate** -- monitor across all sessions
- **Alert threshold** -- notify at 80% of budget
- **Kill switch** -- auto-terminate if session exceeds 2x expected cost

### Secrets

Never include secrets in Cowork task descriptions or session configs. Use:
- Environment variables loaded at runtime
- 1Password `op://` references
- Vault paths that the terminal plugin can resolve

## Sample Cowork Configs

### Minimal: File Processing

```json
{
  "name": "process-csvs",
  "project": "/path/to/data-project",
  "task": "Read all CSV files in input/. For each, validate against schema.json and write cleaned output to output/cleaned/. Log errors to output/errors.log.",
  "plugins": ["filesystem"],
  "maxDuration": "10m"
}
```

### Standard: Development Workflow

```json
{
  "name": "feature-build",
  "project": "/path/to/app",
  "task": "Read tasks/todo.md. Pick the next 'todo' item. Create a feature branch, implement the feature following CLAUDE.md standards, write tests, run the test suite, commit with conventional commit message. Update tasks/todo.md to mark complete.",
  "plugins": ["filesystem", "terminal"],
  "maxDuration": "30m",
  "costLimit": "$2.00"
}
```

### Advanced: Multi-Tool Pipeline

```json
{
  "name": "full-pipeline",
  "project": "/path/to/app",
  "task": "Execute the full CI pipeline: lint, typecheck, test, build, generate docs. If all pass, create a git tag. If any fail, write failure report to output/pipeline/{date}.md and set tasks/pipeline-status.json to 'failed'.",
  "plugins": ["filesystem", "terminal", "browser"],
  "maxDuration": "1h",
  "costLimit": "$3.00",
  "retry": {
    "maxAttempts": 2,
    "backoffMinutes": 5
  },
  "notification": {
    "onComplete": "terminal-notifier",
    "onFailure": "telegram"
  }
}
```

## Debugging Cowork Sessions

### Logs

Cowork session logs are stored in Claude Desktop's data directory:
```
~/Library/Application Support/Claude/cowork/logs/{sessionId}.log
```

### Common Issues

| Issue | Cause | Fix |
|---|---|---|
| Session times out | Task too broad | Break into smaller sessions |
| Plugin permission denied | Insufficient config | Add path/command to allowlist |
| Stale checkpoint | Previous session crashed | Reset checkpoint status to "in-progress" |
| Cost limit exceeded | Under-estimated complexity | Increase limit or reduce scope |
| Missing context | Skills not loaded | Add skill references to CLAUDE.md |

### Monitoring

Check Cowork session health:
```bash
# List recent sessions
ls -la ~/Library/Application\ Support/Claude/cowork/logs/ | tail -10

# Check if session is running
ps aux | grep -i "claude.*cowork"

# View latest session log
tail -50 ~/Library/Application\ Support/Claude/cowork/logs/latest.log
```

## Best Practices

1. **Start small** -- test with a 5-minute session before scheduling overnight runs
2. **Checkpoint everything** -- Cowork sessions can crash; write state to disk frequently
3. **Scope tightly** -- one clear task per session, not "do everything"
4. **Set cost limits** -- always, even for trusted tasks
5. **Review outputs** -- never auto-deploy from Cowork without human review
6. **Use handoff protocol** -- clean boundaries between interactive and autonomous work
7. **Deny by default** -- only grant the plugins and permissions the task needs
8. **Test the task description** -- run it interactively in Claude Code first to verify the instructions produce the right behavior
