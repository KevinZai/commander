# Reddit Launch Copy

## r/ChatGPTCoding

**Title:** I ported CC Commander to Codex: 51 skills + 17 coding agents in one plugin

**Body:**

I have been building CC Commander as a PM layer for coding agents: not another model wrapper, but a guided workflow that helps you decide what to do next.

The v4.2 Codex build is the first version that ships on both Claude Code and Codex. Same repo, same 51 skills, same 17 specialist agents, with a Codex-native plugin manifest and TOML agent definitions.

[GIF placeholder: `/ccc-suggest` in Codex reads a repo, recommends `/ccc-plan`, then routes work to builder + reviewer agents]

What is useful here:

- `/ccc-suggest` reads project state and gives one recommended next step
- `/ccc-plan`, `/ccc-build`, `/ccc-review`, `/ccc-ship`, `/ccc-fleet` cover the normal software loop
- 17 agents include architect, builder, reviewer, debugger, security-auditor, QA, devops, designer, technical-writer, and more
- 2 credential-free MCP servers ship bundled, with 16 more opt-in through `/ccc-connect`
- Free forever, no hosted account required for the local plugin

Install on launch day:

```bash
codex plugin marketplace add KevinZai/commander
codex plugin install commander
```

Repo: https://github.com/KevinZai/commander

Honest notes: the Codex listing is landing with v4.2. Three Claude-specific hook events do not exist in Codex, so Notification, PreCompact, and SubagentStop are dropped or remapped. The core skills and agent workflows are the point of the port.

The surprising part was how mechanical the port was. OpenAI and Anthropic converged on Agent Skills in Dec 2025, so the `SKILL.md` files move over directly. Most of the work is manifest translation, agent TOML output, model ID remaps, and hook mapping.

## r/programming

**Title:** Porting a Claude Code plugin to Codex was about 85% mechanical

**Body:**

I maintain CC Commander, a workflow/PM plugin for coding agents. The next release adds a Codex build alongside the existing Claude Code plugin.

[GIF placeholder: Codex loading Commander, listing skills, then running `/ccc-review` on a branch]

The interesting engineering detail is that this was not a rewrite. Codex's plugin surface is close enough to Claude Code's that most of the port is translation:

- `SKILL.md` files carry over directly via the shared Agent Skills spec
- `.claude-plugin/plugin.json` becomes `.codex-plugin/plugin.json`
- Markdown/YAML agents become Codex TOML agents
- Claude model IDs map to Codex model IDs
- hooks mostly map, with three Claude-only events dropped or remapped
- MCP config remains close enough to pass through

What Commander ships:

- 51 plugin skills
- 17 specialist agents
- 8 lifecycle hooks in the source package, 16 handlers total
- 2 bundled credential-free MCP servers, plus 16 opt-in connectors
- workflow commands like `/ccc-plan`, `/ccc-build`, `/ccc-review`, `/ccc-ship`, `/ccc-fleet`

Install on launch day:

```bash
codex plugin marketplace add KevinZai/commander
codex plugin install commander
```

Repo: https://github.com/KevinZai/commander

Limits: the Codex listing is pending the v4.2 build. Codex does not expose Claude's Notification, PreCompact, or SubagentStop hooks, so those behaviors are documented as gaps. Hosted MCP for Cursor/Windsurf-style use is separate work and not part of this launch.

Compatibility notes: https://github.com/KevinZai/commander/blob/main/docs/codex-compatibility-2026-04-24.md
