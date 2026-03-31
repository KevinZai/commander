---
name: agency-orchestrator
description: Integrate with Agency Orchestrator for multi-agent DAG workflows — parallel research, code review pipelines, deploy verification
tags: [integration, multi-agent, orchestration]
---

# Agency Orchestrator Integration

Agency Orchestrator is a YAML-based multi-agent workflow engine that runs as an MCP server. It enables DAG-based task orchestration where multiple Claude Code agents work in parallel with dependency management.

## What This Enables

- **Parallel agent execution** — Run 3-8 agents simultaneously on independent tasks
- **DAG dependencies** — Define which tasks must complete before others start
- **GitHub integration** — Auto-create PRs, run checks, merge on success
- **Built-in testing** — Verify outputs at each stage before proceeding

## Setup

Add to your `.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "agency-orchestrator": {
      "command": "npx",
      "args": ["-y", "agency-orchestrator", "mcp"],
      "description": "Multi-agent DAG workflow orchestration"
    }
  }
}
```

## Available MCP Tools

Once connected, you get 6 tools:
- `create_workflow` — Define a new workflow from YAML
- `run_workflow` — Execute a workflow
- `get_workflow_status` — Check progress of running workflow
- `list_workflows` — List all defined workflows
- `cancel_workflow` — Stop a running workflow
- `get_task_output` — Get output from a specific task in a workflow

## Usage with CC Commander Skills

Combine with CCC domains for powerful workflows:

1. **Research Pipeline**: ccc-research skills as parallel tasks → synthesis task
2. **Code Review Pipeline**: security-audit + code-review + type-check in parallel → merge gate
3. **Deploy Pipeline**: build → test (parallel: unit + e2e + security) → deploy → verify

## Example Workflows

See `workflows/` directory for ready-to-use YAML templates.

## When to Use

- Tasks requiring 3+ parallel agents
- Multi-step pipelines with dependencies
- Automated review/deploy workflows
- Research that benefits from diverse agent perspectives
