# Codex Marketplace Listing

**Tagline:** Commander is the guided PM layer for Codex: 51 skills, 17 specialist agents, and one recommended next step.

## Feature Highlights

- **Guided workflow surface:** `/ccc`, `/ccc-suggest`, `/ccc-plan`, `/ccc-build`, `/ccc-review`, `/ccc-ship`, `/ccc-fleet`, `/ccc-doctor`, and the rest of the 51-skill Commander catalog.
- **Specialist agent bench:** 17 role-based agents for architecture, building, review, debugging, security, QA, devops, design, performance, data, content, technical writing, and fleet work.
- **Cross-platform plugin core:** the same Commander methodology runs on Claude Code and Codex, with a Codex-native manifest, TOML agents, Codex model mappings, and documented hook differences.

## Install

```bash
codex plugin marketplace add KevinZai/commander
codex plugin install commander
```

## Technical Overview

Commander is a PM layer for Codex sessions. It reads the shape of the project, routes the user into a concrete workflow, and uses `ask_user_question`-style choices where the platform supports them. The main entry point is `/ccc`; the highest-leverage command is `/ccc-suggest`, which scans project state and returns one recommended next step with reasoning. From there, Commander can move into planning, implementation, review, release prep, diagnostics, Linear-style task work, or parallel agent fleets.

The Codex build is generated from the existing Commander plugin source. All 51 `SKILL.md` files follow the shared Agent Skills spec and port directly. The build translates `.claude-plugin/plugin.json` into `.codex-plugin/plugin.json`, emits 17 Codex TOML agents, remaps Claude model IDs to Codex models, and preserves the credential-free MCP baseline: `context7` and `sequential-thinking`, with 16 optional connectors available through `/ccc-connect`. The source package has 8 lifecycle hook events and 16 handlers; Codex v4.2 maps the compatible events and documents the three Claude-only gaps: Notification, PreCompact, and SubagentStop. Commander is MIT licensed and free forever.
