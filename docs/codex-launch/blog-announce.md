# Commander Comes to Codex

## Hero

CC Commander v4.2 brings Commander to Codex. That makes Commander the first PM-layer plugin built to ship on both Claude Code and Codex: same repo, same 51 skills, same 17 specialist agents, and the same bias toward one clear next step.

That last point matters more than the platform badge. Most coding-agent setups fail in the same boring way: too many commands, too many half-remembered workflows, and no clear answer to "what should I do next?" Commander is designed to be the project manager in the room. It plans, routes, reviews, and keeps the work moving.

## Why Commander on Codex

Codex already has the ingredients serious developers want: CLI and Desktop surfaces, plugin installs, subagents, hooks, MCP, and an `AGENTS.md` convention for project memory. Commander adds the workflow layer on top.

Use `/ccc-suggest` when you are staring at a repo and need a ranked next move. Use `/ccc-plan` when the task needs a spec before code. Use `/ccc-build` when you are ready to execute. Use `/ccc-review` when the branch needs a second set of eyes. Use `/ccc-ship` when release work needs a checklist. Use `/ccc-fleet` when the job is large enough to split across multiple agents and worktrees.

That is the before/after: Codex gives you a strong agent runtime. Commander gives it a PM loop.

## What's in the Box

The Codex launch carries the same Commander core:

- 51 plugin skills, including the `/ccc-*` workflow surface
- 17 specialist agents: architect, builder, reviewer, debugger, security-auditor, QA, devops, designer, technical-writer, and more
- 8 lifecycle hook events in the source package, with 16 handlers total
- 2 bundled credential-free MCP servers: `context7` and `sequential-thinking`
- 16 opt-in MCP connectors through `/ccc-connect`
- 502+ ecosystem skills across the broader Commander catalog

The local plugin is free forever. The bundled MCP baseline avoids the install-day failure mode where a plugin tries to start credentialed services before the user has configured anything.

## The 85% Mechanical Port

The reason this launch is possible is simple: OpenAI and Anthropic converged on the Agent Skills spec in Dec 2025. Commander already had a skill-based architecture, so the `SKILL.md` files port 1:1.

The remaining work is translation, not reinvention. The Codex adapter turns `.claude-plugin/plugin.json` into `.codex-plugin/plugin.json`, converts Markdown/YAML agent definitions into Codex TOML agents, remaps model IDs from Claude names to Codex names, and maps lifecycle hooks where Codex exposes the same event shape.

The honest number from the compatibility assessment is about 85% mechanical port. The full engineering writeup is here: [Codex Compatibility Assessment, 2026-04-24](../codex-compatibility-2026-04-24.md).

There are real gaps. Codex does not expose Claude's Notification, PreCompact, or SubagentStop hooks. v4.2 drops or remaps those behaviors and documents the difference. The core workflows still hold: skills load, agents map, MCP config is close, and the PM loop survives the platform change.

## What's Next

The v4.2 Codex release is targeted for April 29, 2026. The launch checklist is practical: generate the Codex artifact, smoke test that Codex lists all 51 skills and 17 agents, finish the Codex marketplace listing, document the three hook differences, and update the user-facing install path.

After that, the next frontier is Cursor, Windsurf, Cline, and Continue through hosted MCP. That is a different problem. The native Claude Code and Codex plugin paths are close because both platforms now share enough plugin semantics. The broader editor ecosystem is less uniform, so the right path is a hosted MCP layer rather than pretending every editor has the same plugin model. The MCP cloud is not deployed yet; it stays out of this launch.

## Install

On launch day:

```bash
codex plugin marketplace add KevinZai/commander
codex plugin install commander
```

Repo: https://github.com/KevinZai/commander

Start with `/ccc-suggest`. If Commander does its job, it should make the next move obvious, not louder.
