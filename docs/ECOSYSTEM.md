# Claude Code Ecosystem Directory

> Maintained by CC Commander. Last updated: 2026-03-31. 42+ repos ranked by impact.

CC Commander aggregates the best Claude Code tools into one install. This directory tracks the entire ecosystem.

## How to Add a Repo

```bash
# As vendor submodule (if MIT/Apache/BSD, high quality):
git submodule add --depth 1 https://github.com/owner/repo vendor/repo-name
# Update this file + docs/ACKNOWLEDGMENTS.md
# Run: node commander/vendor-scanner.js --rescan

# As reference only:
# Add entry to appropriate tier below
```

---

## Tier 1: Critical Integrations (Vendor Submodules)

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 120K+ | MIT | Agent harness optimization, 28 agents, 119 skills, security modules | Vendor submodule |
| [gstack](https://github.com/garrytan/gstack) | 58K+ | MIT | 15 opinionated tools — CEO, Designer, Eng Manager, QA personas | Vendor submodule |
| [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 17K+ | MIT | Teams-first multi-agent orchestration, staged pipeline | Vendor submodule |
| [Superpowers](https://github.com/obra/superpowers) | 29K+ | MIT | TDD enforcement, subagent-driven dev, code review | Vendor submodule |
| [Claude HUD](https://github.com/jarrodwatts/claude-hud) | 15K+ | MIT | Real-time status display, context tracking, tool activity | Vendor submodule |
| [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) | 11.5K+ | MIT | Knowledge compounding, deep review workflow | Vendor submodule |
| [Caliber AI Setup](https://github.com/caliber-ai-org/ai-setup) | 300+ | MIT | Config scoring, drift detection, freshness checks | Vendor submodule |
| [claude-reflect](https://github.com/BayramAnnakov/claude-reflect) | 860+ | MIT | Self-improving skills, correction capture, CLAUDE.md sync | Vendor submodule |
| [RTK](https://github.com/rtk-ai/rtk) | 14.6K+ | MIT | Token optimization, 60-90% cost reduction on CLI output | Vendor submodule |
| [acpx](https://github.com/openclaw/acpx) | 1.8K+ | MIT | ACP protocol client, structured agent communication, queue management | Vendor submodule |
| [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | 26K+ | MIT | Reference architecture, orchestration patterns, tutorial | Vendor submodule |

## Tier 2: High-Value Features (Reference)

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) | 44K+ | SUL-1.0 | Multi-model orchestration (Claude+GPT+Gemini), autonomous loops | Reference only (license) |
| [claude-mem](https://github.com/thedotmack/claude-mem) | 43K+ | Other | AI-powered session compression, automatic context injection | Evaluate for integration |
| [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 34K+ | Other | Community directory of skills, hooks, commands, orchestrators | Monitor for trends |
| [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | 29K+ | MIT | 1,326+ installable skills, bundles, cross-platform | Reference |
| [claude-code-router](https://github.com/musistudio/claude-code-router) | 30K+ | MIT | Route requests to different models, cost optimization | Reference |
| [planning-with-files](https://github.com/OthmanAdi/planning-with-files) | 17K+ | MIT | Manus-style persistent markdown planning | Reference |
| [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) | 17K+ | MIT | MCP for building n8n workflows from Claude Code | Reference |

## Tier 3: Skills & Specialized Domains

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [marketingskills](https://github.com/coreyhaines31/marketingskills) | 17K+ | MIT | CRO, copywriting, SEO, analytics, growth engineering | Covered by ccc-marketing |
| [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 15K+ | MIT | 100+ specialized subagents | Reference |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 13K+ | MIT | 1000+ agent skills, cross-platform | Reference |
| [claude-skills](https://github.com/alirezarezvani/claude-skills) | 8K+ | MIT | 192+ skills across engineering, marketing, product, compliance | Reference |
| [Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) | 7.5K+ | MIT | 48 AI agents & 36 workflow skills for game development | Niche - reference |
| [Understand-Anything](https://github.com/Lum1104/Understand-Anything) | 7K+ | MIT | Codebase → interactive knowledge graph | Reference |
| [Trail of Bits skills](https://github.com/trailofbits/skills) | 4K+ | CC-BY-SA | Security research, vulnerability detection, audit workflows | Reference |

## Tier 4: Hooks & Infrastructure

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3) | 3.6K+ | MIT | Context management, ledger hooks, MCP isolation | Reference |
| [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | 3.4K+ | — | Educational guide to mastering hooks | Reference |
| [claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | 1.3K+ | — | Real-time monitoring for multi-agent systems | Reference |
| [cc-hooks-ts](https://github.com/sushichan044/cc-hooks-ts) | 37 | MIT | TypeScript DSL for defining hooks | Niche |

## Tier 5: Agent Orchestration

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [agents](https://github.com/wshobson/agents) | 32K+ | MIT | Multi-agent orchestration framework | Reference |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | 14K+ | — | Self-improving AI agent, closed learning loop | Reference |
| [claude-squad](https://github.com/smtg-ai/claude-squad) | 6.6K+ | — | Multiple agents in isolated git worktrees | Reference |
| [clawport-ui](https://github.com/JohnRiceML/clawport-ui) | 784 | MIT | Agent command center UI (OpenClaw) | Reference |
| [agent-flow](https://github.com/patoles/agent-flow) | 524 | Apache 2.0 | Real-time visualization of agent orchestration | Reference |

## Tier 6: Plugins & Marketplaces

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | 15K+ | — | Official Anthropic plugin directory | Publish CCC here |
| [humanizer](https://github.com/blader/humanizer) | 11K+ | MIT | Remove AI writing markers from text | Reference |
| [claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills) | 1.7K+ | Other | 340 plugins + 1,367 skills, CCPI package manager | Reference |
| [superpowers-marketplace](https://github.com/obra/superpowers-marketplace) | 767 | MIT | Curated plugin marketplace | Reference |
| [awesome-claude-code-plugins](https://github.com/ccplugins/awesome-claude-code-plugins) | 657 | Apache 2.0 | Curated plugin/command list | Reference |

## Tier 7: Self-Improvement & Learning

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [get-shit-done](https://github.com/gsd-build/get-shit-done) | 45K+ | MIT | Meta-prompting, context engineering, spec-driven dev | Philosophically aligned |
| [SuperClaude Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) | 22K+ | MIT | 30 commands, 20 agents, 7 modes, multi-platform ports | Competitive reference |
| [Claude-Code-Everything-You-Need](https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know) | 1.4K+ | MIT | All-in-one guide, tutorials, BMAD method | Educational reference |

## Tier 8: Token Optimization & Cost

| Repo | Stars | License | Description | CCC Status |
|------|-------|---------|-------------|------------|
| [ccusage](https://github.com/ryoppippi/ccusage) | 12K+ | Other | CLI for analyzing Claude Code usage from JSONL files | Reference |
| [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) | 2.5K+ | MIT | Token-optimized fork of oh-my-opencode | Reference |

---

## Excluded Repos

| Repo | Reason |
|------|--------|
| oh-my-openagent | SUL-1.0 license (not MIT compatible) |
| system-prompts-and-models-of-ai-tools | Reference material, not toolkit |
| learn-claude-code | Educational, not toolkit |
| cc-switch | GUI app, different category |

---

*To request additions: open an issue or PR on [KevinZai/cc-commander](https://github.com/KevinZai/cc-commander)*
