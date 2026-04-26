# Tweet Thread - Kevin @kzic

1/ CC Commander v4.2 is the Codex launch: the first PM-layer plugin to ship on both Claude Code AND Codex. Same repo. Same 51 skills. Same guided workflow. Different agent runtime. 🧭

2/ Demo flow: run `/ccc`, pick Build / Review / Ship / Design / Learn, then let `/ccc-suggest` read the repo and choose one next step. No menu archaeology, no prompt catalog scavenger hunt.

3/ On Codex, Commander brings 51 skills, 17 specialist agents, and the PM brain/hands pattern: planner stays in control, builder/reviewer/security/debugger agents do the focused work.

4/ Why it worked: OpenAI and Anthropic converged on the Agent Skills spec in Dec 2025. Our `SKILL.md` files port 1:1. The rest is mechanical: plugin manifest, agent TOML, model IDs, hooks.

5/ Honest caveat: Codex does not have Claude's Notification, PreCompact, or SubagentStop hooks. v4.2 drops/remaps those. Core planning, skills, agents, MCPs, and review/build workflows still work.

6/ Install on launch day:

`codex plugin marketplace add KevinZai/commander`
`codex plugin install commander`

Repo: https://github.com/KevinZai/commander

Free forever. Feedback welcome.
