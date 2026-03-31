# Acknowledgments

CC Commander is built on the shoulders of the Claude Code community. We aggregate, orchestrate, and auto-update the best tools in the ecosystem — giving you every Claude Code tool in one install.

## How It Works

CC Commander includes upstream packages as git submodules in `vendor/`. This means:
- Each package maintains its own license and copyright
- Updates flow in automatically via `git submodule update --remote`
- No code is modified — packages are used as-is
- CC Commander's value-add is the orchestration layer that picks the best tool for each job

## Vendor Packages

| Package | Author | Stars | License | What CCC Orchestrates |
|---------|--------|-------|---------|----------------------|
| oh-my-claudecode | Yeachan-Heo | 17K+ | MIT | Team orchestration, multi-agent pipeline |
| claude-code-best-practice | shanraisshan | 26K+ | MIT | Reference architecture, workflow patterns |
| everything-claude-code (ECC) | affaan-m | 120K+ | MIT | Lifecycle hooks, agents, security modules |
| Superpowers | obra (Jesse Vincent) | 29K+ | MIT | TDD enforcement, code review, verification |
| Claude HUD | jarrodwatts | 15K+ | MIT | Real-time status display, context tracking |
| Caliber AI Setup | caliber-ai-org | 300+ | MIT | Config scoring, drift detection |
| gstack | garrytan (Garry Tan) | 58K+ | MIT | Decision layer, office hours, QA |
| Compound Engineering | EveryInc | 11.5K+ | MIT | Knowledge compounding, deep review |
| claude-reflect | BayramAnnakov | 860+ | MIT | Self-improving skills, correction capture |
| RTK (Rust Token Killer) | rtk-ai | 14.6K+ | MIT | Token optimization (60-90% reduction) |
| acpx | openclaw | 1.8K+ | MIT | ACP protocol client, structured agent communication |

## Pattern Inspirations

These projects inspired CC Commander's design but are not included as submodules:

- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — Community resource directory
- [SuperClaude Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) — Multi-platform agent config
- [claude-squad](https://github.com/smtg-ai/claude-squad) — Git worktree isolation patterns
- [planning-with-files](https://github.com/OthmanAdi/planning-with-files) — Manus-style persistent planning
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — Self-improving agent loops

## Excluded (License Incompatible)

| Package | License | Reason |
|---------|---------|--------|
| oh-my-openagent | SUL-1.0 | Not MIT/Apache/BSD compatible |

## Note on Attribution

This section lists projects whose work we acknowledge and orchestrate. These authors did not contribute directly to CC Commander — they built independent tools that we integrate via git submodules with full license compliance. We are grateful for their work and encourage you to star their repos.

---

*CC Commander — Every Claude Code tool. One install. Auto-updated.*
