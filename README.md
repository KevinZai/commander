<p align="center">
  <img src="docs/assets/github-banner.png" alt="CC Commander, the guided AI PM for Claude Code" width="100%">
</p>

# CC Commander

A guided AI project manager for Claude Code. `/ccc` reads your project, recommends one next step and offers the alternatives as a click-first menu. Specialist agents do the work; lifecycle hooks keep state, guard secrets and check results.

[![v8.1.3](https://img.shields.io/badge/v8.1.3-4F46E5?style=for-the-badge)](./CHANGELOG.md) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

| What ships in v8.1.3 | Count |
|---|---|
| Plugin skills (`/ccc-*`) | 84: 32 model-visible, 52 on demand |
| Specialist agents | 22 |
| Lifecycle hooks | 30 hook events, 52 handlers |
| Bundled MCP servers | 2 bundled MCP (`context7`, `sequential-thinking`), +16 opt-in via `/ccc-connect` |
| Plugin workflows / evals | 6 / 8 |
| Ecosystem catalog | 467 skills across 11 CCC domains |

Counts come from the filesystem: `node scripts/check-parity.js` fails the build when any doc disagrees with disk.

## Install

Claude Code CLI 2.1.292 or later (local hooks need Node.js 20.19+ or 22.12+):

```
/plugin install commander --marketplace KevinZai/commander
```

That installs `commander@commander-hub`. On older builds:

```bash
/plugin marketplace add KevinZai/commander
/plugin install commander
```

Claude Code Desktop: **Settings → Plugin Marketplace → Add from GitHub** → `KevinZai/commander` → install `commander`, then quit and reopen.

Codex CLI:

```bash
codex plugin marketplace add KevinZai/commander
codex plugin add commander@commander-hub
```

Codex treats plugin hooks as untrusted until you review them with `/hooks` inside Codex; the one-time steps are in [dual-host hooks](docs/reference/dual-host-hooks.md#codex-one-time-hook-trust).

Once the Anthropic plugin directory lists it, the same plugin installs as `cc-commander@claude-community`.

Update with `claude plugin marketplace update commander-hub && claude plugin update commander`, then restart. `/ccc-update` walks through it and `/ccc-doctor` diagnoses stale installs.

## Example prompts

```
/ccc what should I do first in this repo?
/ccc-review review this branch against main before I open the PR
/ccc-plan turn this Linear issue into a plan with acceptance criteria
/ccc-doctor
```

## Load on demand

Claude sees 32 skills: the 12 core skills (`ccc`, `ccc-build`, `ccc-review`, `ccc-research`, `ccc-security`, `ccc-plan`, `ccc-testing`, `ccc-suggest`, `ccc-systematic-debugging`, `ccc-design`, `ccc-qa`, `ccc-save-session`) plus the skills their menus open. The other 52 set `disable-model-invocation: true`: their descriptions stay out of Claude's context, and you open any of them by typing `/ccc-<name>`. When a prompt matches an on-demand skill, the router offers it as a menu choice instead of invoking it.

Session-start context, measured in CC-2112 with js-tiktoken cl100k as a proxy:

| | Before | After |
|---|---|---|
| Skill listing | 22,643 chars, 283% of the 8,000-char budget, truncated | 7,266 chars, 90.8%, no truncation (`npm run measure:listing`) |
| Session-start total | about 6,700 tokens | about 2,900 tokens |

## The Commander Method

Twelve enforceable gates that any model can be checked against: plan before build, verifier separate from worker, prove before alarm, loops need gates, leave durable state, and seven more. `/ccc-fable on` arms them for a session; the doctrine is in [`rules/fable-method.md`](commander/cowork-plugin/rules/fable-method.md).

## What's inside

- **Skills:** the full generated table of all 84, with which ones Claude sees, is in [SKILLS-INDEX.md](SKILLS-INDEX.md#the-84-plugin-skills).
- **Agents:** architect, reviewer, builder, security-auditor, debugger, designer, qa-engineer and more, on model aliases (`fable`, `opus`, `sonnet`). Your selected session model is kept; only delegated agents use their own alias.
- **Hooks:** session state, intent routing, secret-leak guard, config protection, permission gate, knowledge capture. The cost ceiling is off unless you set `CCC_COST_CEILING`. The voice layer is off unless you set `CCC_VOICE=1`.
- **Workflows and evals:** `/commander:ccc-deep-review`, `ccc-audit`, `ccc-release-audit` and three more; `claude plugin eval` cases for the core flows.
- **Commander HUD mod:** an observe-only band above the prompt; `/ccc-hud` toggles it.

## Data & network

Commander runs locally and reads no credentials. Outbound calls:

| Call | Default | Control |
|---|---|---|
| Anonymous usage events to `mcp.commanderplugin.com` | Off | Opt in with `CCC_TELEMETRY=1` |
| Update check (GET of the public `plugin.json` on GitHub) at session start | On | `CCC_OFFLINE=1` |
| CI status via your own `gh` login | Off | Opt in with `CCC_CI_TICKER=1` |
| Bundled MCP servers: `npx` fetches each package from the npm registry when Claude Code first starts it | On | Remove the server from `.mcp.json` |
| Context7 queries `context7.com` | Only when a skill uses it | Remove the server |

`CCC_OFFLINE=1` blocks every call Commander makes itself; `ccc doctor` prints the current mode; `"disableAllHooks": true` in `settings.json` turns every hook off. The hosted server is a separate service covered by the [privacy policy](https://commanderplugin.com/privacy).

## Mirrors

- `commander/cowork-plugin/` is the source plugin.
- `commander/cowork-plugin-codex/` is generated by `node scripts/build-codex.js`; never edit it by hand.
- The Anthropic directory listing is built from the source by `node scripts/build-directory-mirror.js` as `cc-commander`; see [docs/DIRECTORY.md](docs/DIRECTORY.md).

## Docs

[BIBLE.md](BIBLE.md) (guide) · [CHEATSHEET.md](CHEATSHEET.md) (daily reference) · [SKILLS-INDEX.md](SKILLS-INDEX.md) (all skills) · [plugin README](commander/cowork-plugin/README.md) · [CHANGELOG.md](CHANGELOG.md) · [docs.commanderplugin.com](https://docs.commanderplugin.com)

## Support, security, contributing

Bugs and questions: [GitHub issues](https://github.com/KevinZai/commander/issues). Vulnerabilities: [SECURITY.md](SECURITY.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. The Intelligence Layer (4 files) adds a [Commons Clause](docs/LICENSE-INTELLIGENCE.md). The 20 vendor packages under `vendor/` keep their upstream licenses.

Built by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic)).
