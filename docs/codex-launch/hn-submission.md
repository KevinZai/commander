# Hacker News Submission

**Title:** Show HN: Commander, a PM layer for Claude Code and Codex

**URL:** https://github.com/KevinZai/commander

## First Comment

I built Commander as a PM layer for coding agents. It is meant to answer the recurring question "what should I do next?" rather than add another large command catalog.

The existing Claude Code plugin ships 51 skills, 17 specialist agents, lifecycle hooks, and MCP wiring. The Codex work is a v4.2 port of that package. The practical result is that the same workflow layer can run in both Claude Code and Codex:

```bash
codex plugin marketplace add KevinZai/commander
codex plugin install commander
```

What makes it different:

- It starts from project-management workflows: plan, build, review, ship, fleet, diagnose.
- `/ccc-suggest` reads project state and recommends one next step, including when another plugin is the better tool.
- The agent set is role-based: architect, builder, reviewer, debugger, security-auditor, QA, devops, designer, technical-writer, etc.
- The port is mostly mechanical because Codex and Claude Code now share Agent Skills semantics. Skills move over directly; manifests, agents, models, and hooks need translation.

What it cannot do yet:

- The Codex marketplace listing is pending the v4.2 build.
- Codex does not have Claude's Notification, PreCompact, or SubagentStop hooks. Those are dropped or remapped.
- Hosted MCP for Cursor/Windsurf/Cline/Continue is separate follow-on work, not part of the Codex plugin launch.
- It is not a replacement for understanding your codebase. It is a workflow layer that helps keep the agent work organized.

The compatibility writeup is here:
https://github.com/KevinZai/commander/blob/main/docs/codex-compatibility-2026-04-24.md
