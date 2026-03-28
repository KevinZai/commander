# Claude Code Kit v1.3 — Competitive Scan Report

**Date:** 2026-03-28
**Methodology:** GitHub search across 10 query patterns, README analysis of top repos
**Analyst:** Claude Opus 4.6

---

## Executive Summary

- **55 repos evaluated** with 1,000+ stars in the Claude Code ecosystem
- **12 features identified** for inclusion in v1.3
- **8 features** we already cover well
- **3 critical competitive threats** — official plugin ecosystem (anthropics/claude-plugins-official), Hermes Agent (NousResearch), and NanoClaw as an OpenClaw competitor

The Claude Code ecosystem has exploded. The official Anthropic plugin system (`/plugin marketplace`) is now the dominant distribution channel, with 15K+ stars on the official directory alone. Our install.sh approach still works but we should consider publishing as a plugin too.

---

## Repos Evaluated (sorted by stars, 1000+ only)

### 1. system-prompts-and-models-of-ai-tools — 133,486 stars
- **URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools
- **What:** Collection of leaked system prompts from all major AI tools including Claude Code
- **Key features:** Reference material, not a toolkit
- **Our coverage:** N/A (different category)
- **Action:** Skip — reference repo, not a competitor

### 2. Everything Claude Code (ECC) — 113,028 stars
- **URL:** https://github.com/affaan-m/everything-claude-code
- **What:** Agent harness performance optimization system with skills, instincts, memory, security, and research-first development
- **Key features:** Instinct system (learned behavioral patterns), continuous learning observer, security reviewer agent, build error resolver
- **Our coverage:** Full — we include ECC integration and have equivalent features (continuous-learning-v2, corrective-framing, operationalize-fixes)
- **Action:** Skip — we already integrate with ECC and match its core features

### 3. anthropics/claude-code — 83,680 stars
- **URL:** https://github.com/anthropics/claude-code
- **What:** Official Claude Code CLI from Anthropic
- **Key features:** Plugin system (`/plugin marketplace`), native statusline API, agent teams experimental feature
- **Our coverage:** Partial — we use hooks/skills but haven't published as an official plugin
- **Action:** **Add** — Publish claude-code-kit as an installable plugin via `/plugin marketplace add k3v80/claude-code-kit`

### 4. ui-ux-pro-max-skill — 52,972 stars
- **URL:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **What:** AI skill for design intelligence, building professional UI/UX across multiple platforms
- **Key features:** Platform-specific design patterns, accessibility-first, responsive design templates
- **Our coverage:** Partial — we have frontend-design, design-review skills but not this depth of UI/UX
- **Action:** Skip — niche skill, not core toolkit

### 5. gstack (Garry Tan) — 52,849 stars
- **URL:** https://github.com/garrytan/gstack
- **What:** 15 opinionated tools serving as CEO, Designer, Eng Manager, Release Manager, Doc Engineer, and QA
- **Key features:** Role-based agent personas, opinionated workflow, celebrity endorsement factor
- **Our coverage:** Full — our c-level-pack, engineering-pack, design-review, and delegation-templates cover same ground with more depth
- **Action:** Skip — we already have superior coverage. Keep gstack-upgrade skill for compatibility.

### 6. Composio awesome-claude-skills — 48,603 stars
- **URL:** https://github.com/ComposioHQ/awesome-claude-skills
- **What:** Curated skills list + connect-apps plugin enabling Claude to interact with 500+ external apps (email, Slack, Jira, etc.)
- **Key features:** connect-apps plugin for 500+ app integrations via Composio platform, action-oriented skills (not just text generation)
- **Our coverage:** None for app integrations — our skills are config/workflow focused
- **Action:** **Evaluate** — External app integration is a major gap. Consider a bridge skill or partnership reference.

### 7. oh-my-openagent (omo) — 44,233 stars
- **URL:** https://github.com/code-yeongyu/oh-my-openagent
- **What:** Best agent harness — multi-model orchestration, ralph loop (autonomous coding), interview-me prompt
- **Key features:** Multi-model orchestration (Claude + GPT + Gemini + Kimi), ralph autonomous loop, discipline agent pattern, no vendor lock-in
- **Our coverage:** Partial — we have model-route skill but not true multi-model consensus execution
- **Action:** **Add** — Multi-model consensus skill (query 2-3 models, synthesize). This is our #1 feature gap.

### 8. Get Shit Done (GSD) — 43,570 stars
- **URL:** https://github.com/gsd-build/get-shit-done
- **What:** Lightweight meta-prompting and spec-driven development system
- **Key features:** Context engineering, spec-driven development, minimal footprint
- **Our coverage:** Full — our evals-before-specs, spec-interviewer, and plan skills provide equivalent spec-driven workflow
- **Action:** Skip

### 9. claude-mem — 41,685 stars
- **URL:** https://github.com/thedotmack/claude-mem
- **What:** Persistent memory compression system — captures everything Claude does, compresses with AI, injects into future sessions
- **Key features:** AI-powered session compression using Agent SDK, automatic context injection, cross-session memory persistence, v6.5 mature
- **Our coverage:** Partial — we have save-session/resume-session, strategic-compact, and para-memory-files but NOT AI-powered compression
- **Action:** **Add** — AI-powered memory compression skill. Our save-session is file-based; claude-mem uses the Agent SDK to intelligently compress. This is a significant quality gap.

### 10. learn-claude-code — 41,101 stars
- **URL:** https://github.com/shareAI-lab/learn-claude-code
- **What:** Educational — build a nano Claude Code agent from scratch in bash
- **Key features:** Educational content, not a toolkit
- **Our coverage:** N/A
- **Action:** Skip — educational repo

### 11. cc-switch — 34,593 stars
- **URL:** https://github.com/farion1231/cc-switch
- **What:** Cross-platform desktop app for switching between Claude Code, Codex, OpenCode, OpenClaw, Gemini CLI
- **Key features:** GUI for managing multiple AI coding tools, session switching
- **Our coverage:** None — we're CLI-only and Claude-specific
- **Action:** Skip — different category (GUI app manager)

### 12. awesome-claude-code — 33,405 stars
- **URL:** https://github.com/hesreallyhim/awesome-claude-code
- **What:** Curated list of skills, hooks, slash-commands, agent orchestrators, applications, and plugins
- **Key features:** Community directory — lists us and competitors
- **Our coverage:** N/A (we're listed here)
- **Action:** Ensure we maintain our listing. Submit PR if not already featured.

### 13. wshobson/agents — 32,421 stars
- **URL:** https://github.com/wshobson/agents
- **What:** Intelligent automation and multi-agent orchestration for Claude Code
- **Key features:** Agent orchestration patterns, automated task routing
- **Our coverage:** Full — our orchestrate, delegation-templates, dispatching-parallel-agents, and agency-orchestrator skills
- **Action:** Skip

### 14. claude-code-router — 30,572 stars
- **URL:** https://github.com/musistudio/claude-code-router
- **What:** Use Claude Code as foundation, route to different models while getting Anthropic updates
- **Key features:** Model routing layer, use any model through Claude Code infrastructure
- **Our coverage:** Partial — model-route skill exists but doesn't provide a proxy layer
- **Action:** Skip — infrastructure project, not a skill/config kit

### 15. antigravity-awesome-skills — 27,955 stars
- **URL:** https://github.com/sickn33/antigravity-awesome-skills
- **What:** 1,326+ installable agentic skills with installer CLI, bundles, workflows
- **Key features:** Installer CLI, bundles, cross-platform (Codex, Gemini CLI, Cursor), massive skill library
- **Our coverage:** Partial — we have 280+ skills but no bundle/package system
- **Action:** **Evaluate** — Consider skill bundles concept (install groups of related skills at once)

### 16. ruflo — 27,591 stars
- **URL:** https://github.com/ruvnet/ruflo
- **What:** Agent orchestration platform for Claude — multi-agent swarms, RAG integration
- **Key features:** Distributed swarm intelligence, enterprise-grade architecture, RAG integration
- **Our coverage:** Partial — we have orchestration but not swarm patterns or RAG integration
- **Action:** Skip — enterprise platform, different category

### 17. NanoClaw — 25,751 stars
- **URL:** https://github.com/qwibitai/nanoclaw
- **What:** Lightweight OpenClaw alternative that runs agents in containers for security
- **Key features:** Container isolation (Docker/Apple Container), fork-and-customize model, skills-over-features philosophy, Agent Vault credential security
- **Our coverage:** N/A — not a competitor to our kit; competitor to OpenClaw
- **Action:** Skip — different category. But note: their philosophy of "skills over features" validates our approach.

### 18. vibe-kanban — 23,939 stars
- **URL:** https://github.com/BloopAI/vibe-kanban
- **What:** Kanban board for planning/reviewing coding agent work — agents execute in isolated workspaces
- **Key features:** Kanban issue planning, isolated git workspaces per agent, inline diff review, built-in preview browser, 10+ agent support (Claude, Codex, Gemini, etc.)
- **Our coverage:** None — we don't have project management or visual diff review
- **Action:** Skip — different category (visual GUI tool)

### 19. claude-code-templates — 23,717 stars
- **URL:** https://github.com/davila7/claude-code-templates
- **What:** CLI tool for configuring and monitoring Claude Code
- **Key features:** Template-based configuration, monitoring dashboard
- **Our coverage:** Full — our install.sh, templates/, and configure-ecc cover this
- **Action:** Skip

### 20. claude-code-best-practice — 22,742 stars
- **URL:** https://github.com/shanraisshan/claude-code-best-practice
- **What:** Best practices guide for Claude Code
- **Key features:** Documentation/educational content
- **Our coverage:** Full — BIBLE.md is more comprehensive
- **Action:** Skip

### 21. serena — 22,199 stars
- **URL:** https://github.com/oraios/serena
- **What:** Powerful coding agent toolkit with semantic retrieval and editing (MCP server)
- **Key features:** Semantic code retrieval, structural editing, language-aware navigation
- **Our coverage:** None — we don't provide semantic code understanding
- **Action:** Skip — MCP server, different category

### 22. SuperClaude Framework — 21,995 stars
- **URL:** https://github.com/SuperClaude-Org/SuperClaude_Framework
- **What:** Configuration framework with 30 commands, 20 agents, 7 modes, 8 MCP integrations
- **Key features:** Cognitive personas, mode system, PyPI/npm installable, SuperGemini/SuperQwen variants
- **Our coverage:** Full — we have 88+ commands, 9 modes, 4 themes, 35+ agents. We're bigger.
- **Action:** Skip — we're the larger framework. Note their multi-platform (Gemini/Qwen) ports.

### 23. opcode — 21,152 stars
- **URL:** https://github.com/winfunc/opcode
- **What:** Tauri-based GUI desktop app for Claude Code — session management, custom agents, usage analytics, MCP management
- **Key features:** Visual project browser, session history, usage analytics dashboard, background agent execution, MCP server management, CLAUDE.md management, checkpoint timeline
- **Our coverage:** Partial — we have CLI equivalents but no GUI. Their usage analytics and checkpoint timeline are unique.
- **Action:** Skip — GUI app, different category. But note: usage analytics dashboard is interesting.

### 24. CLIProxyAPI — 20,748 stars
- **URL:** https://github.com/router-for-me/CLIProxyAPI
- **What:** Wraps CLI agents as OpenAI/Gemini/Claude compatible API services
- **Key features:** Free model access through CLI wrappers
- **Our coverage:** N/A — infrastructure/proxy, not config toolkit
- **Action:** Skip

### 25. AionUi — 20,338 stars
- **URL:** https://github.com/iOfficeAI/AionUi
- **What:** Free, local 24/7 Cowork app for multiple CLI agents
- **Key features:** 24/7 cowork mode, multi-agent support, open-source OpenClaw alternative
- **Our coverage:** Partial — we have cowork-bible and cowork-plugin-builder skills
- **Action:** Skip — GUI cowork app

### 26. Beads (steveyegge) — 19,854 stars
- **URL:** https://github.com/steveyegge/beads
- **What:** Distributed graph issue tracker for AI agents, powered by Dolt (version-controlled SQL)
- **Key features:** Dolt-powered persistent structured memory, dependency-aware task graph, hierarchical IDs (epics/tasks/subtasks), semantic memory decay/compaction, hash-based IDs for zero-conflict multi-agent, messaging system with threading, stealth mode for shared repos
- **Our coverage:** None — we use markdown-based planning, not graph-based task tracking
- **Action:** **Evaluate** — Graph-based task tracking is a strong concept. Consider a beads-integration skill that bridges our planning skills with Beads for persistent tracking.

### 27. planning-with-files — 17,488 stars
- **URL:** https://github.com/OthmanAdi/planning-with-files
- **What:** Manus-style persistent markdown planning as a Claude Code skill
- **Key features:** File-based planning with persistence, the pattern behind the $2B Manus acquisition
- **Our coverage:** Full — our writing-plans, executing-plans, and spec-interviewer skills cover this pattern
- **Action:** Skip

### 28. marketingskills — 17,060 stars
- **URL:** https://github.com/coreyhaines31/marketingskills
- **What:** Marketing skills for Claude Code — CRO, copywriting, SEO, analytics, growth engineering
- **Key features:** Specialized marketing domain skills
- **Our coverage:** Full — our mega-marketing skill with 10+ sub-skills, plus individual marketing skills (seo-optimizer, content-strategy, cold-email, etc.)
- **Action:** Skip

### 29. n8n-mcp — 16,708 stars
- **URL:** https://github.com/czlonkowski/n8n-mcp
- **What:** MCP server for Claude to build n8n workflows
- **Key features:** n8n workflow creation via AI
- **Our coverage:** N/A — MCP server, we reference n8n in our docs
- **Action:** Skip

### 30. happy — 16,457 stars
- **URL:** https://github.com/slopus/happy
- **What:** Mobile and web client for Codex and Claude Code with realtime voice and encryption
- **Key features:** Mobile access, voice interaction, encryption
- **Our coverage:** N/A — different category (mobile app)
- **Action:** Skip

### 31. awesome-claude-code-subagents — 15,410 stars
- **URL:** https://github.com/VoltAgent/awesome-claude-code-subagents
- **What:** 100+ specialized Claude Code subagents
- **Key features:** Community subagent collection
- **Our coverage:** Full — we have 35+ agents plus delegation-templates for creating custom ones
- **Action:** Skip

### 32. claude-plugins-official (Anthropic) — 15,065 stars
- **URL:** https://github.com/anthropics/claude-plugins-official
- **What:** Official Anthropic-managed plugin directory with standardized plugin structure
- **Key features:** Standard plugin format (.claude-plugin/plugin.json, .mcp.json, commands/, agents/, skills/), official quality/security review, `/plugin marketplace` integration
- **Our coverage:** None — we don't publish as an official plugin
- **Action:** **Add** — This is CRITICAL. We need to publish claude-code-kit as an official plugin. The `.claude-plugin` format is the new standard. Create plugin.json metadata, restructure for compatibility.

### 33. Hermes Agent (NousResearch) — 14,770 stars
- **URL:** https://github.com/NousResearch/hermes-agent
- **What:** Self-improving AI agent with built-in learning loop, multi-platform messaging, skill creation from experience
- **Key features:** Closed learning loop (auto-creates skills from experience), autonomous skill improvement during use, FTS5 session search with LLM summarization, dialectic user modeling (Honcho), scheduled automations, multi-model support, six terminal backends (local, Docker, SSH, Daytona, Singularity, Modal), OpenClaw migration path
- **Our coverage:** Partial — we have continuous-learning-v2, but their self-improving skills and Honcho user modeling are more sophisticated
- **Action:** **Evaluate** — Their "skills self-improve during use" pattern is compelling. Consider enhancing our continuous-learning-v2 to auto-evolve SKILL.md files.

### 34. RTK (Rust Token Killer) — 14,605 stars
- **URL:** https://github.com/rtk-ai/rtk
- **What:** CLI proxy that reduces LLM token consumption by 60-90% on common dev commands
- **Key features:** Rust binary, zero dependencies, <10ms overhead, filters/compresses CLI output before it reaches LLM context, 80% savings on ls/grep/git, 90% on test output
- **Our coverage:** None — we don't optimize token consumption at the CLI output level
- **Action:** **Add** — Create an rtk-integration skill or hook. Token optimization is a major cost concern. At minimum, document RTK as a recommended companion tool.

### 35. Claude HUD — 14,403 stars
- **URL:** https://github.com/jarrodwatts/claude-hud
- **What:** Plugin showing context usage, active tools, running agents, and todo progress on the statusline
- **Key features:** Real-time context health bar, tool activity tracking, agent status monitoring, todo progress, git branch display, usage rate limits
- **Our coverage:** Partial — we have lib/statusline.sh but it's simpler (context gauge, model, cost, tokens)
- **Action:** **Enhance** — Upgrade our statusline to match Claude HUD's features: tool activity tracking, agent status, todo progress bar.

### 36. oh-my-claudecode — 14,201 stars
- **URL:** https://github.com/Yeachan-Heo/oh-my-claudecode
- **What:** Multi-agent orchestration for Claude Code — team mode, deep interview, autopilot
- **Key features:** Team mode (staged pipeline: plan->prd->exec->verify->fix loop), deep interview with Socratic questioning, tmux CLI workers for Codex/Gemini, autopilot mode, zero learning curve design
- **Our coverage:** Partial — we have orchestrate, delegation-templates, and spec-interviewer but not the team pipeline or autopilot
- **Action:** **Evaluate** — Their team pipeline (plan->prd->exec->verify->fix) is a strong workflow pattern. Consider as enhancement to our orchestrate skill.

### 37. open-saas (Wasp) — 13,669 stars
- **URL:** https://github.com/wasp-lang/open-saas
- **What:** Free SaaS boilerplate with Claude Code plugin support
- **Key features:** SaaS template with built-in AI agent configuration
- **Our coverage:** N/A — different category (SaaS template)
- **Action:** Skip

### 38. awesome-agent-skills (VoltAgent) — 13,119 stars
- **URL:** https://github.com/VoltAgent/awesome-agent-skills
- **What:** 1000+ agent skills from official dev teams and community, cross-platform
- **Key features:** Cross-platform compatibility (Codex, Antigravity, Gemini CLI, Cursor)
- **Our coverage:** Partial — we have 280+ skills but are Claude Code focused
- **Action:** Skip — curated list, not a toolkit

### 39. last30days-skill — 13,059 stars
- **URL:** https://github.com/mvanhorn/last30days-skill
- **What:** Research skill that scans Reddit, X, YouTube, HN, Polymarket, then synthesizes
- **Key features:** Multi-source real-time research aggregation
- **Our coverage:** Full — we have the /last30days plugin integrated
- **Action:** Skip — already integrated

### 40. context-engineering-intro — 12,966 stars
- **URL:** https://github.com/coleam00/context-engineering-intro
- **What:** Guide to context engineering for AI coding assistants
- **Key features:** Educational content
- **Our coverage:** Full — BIBLE.md covers context engineering extensively
- **Action:** Skip

### 41. ccusage — 12,040 stars
- **URL:** https://github.com/ryoppippi/ccusage
- **What:** CLI tool for analyzing Claude Code usage from local JSONL files
- **Key features:** Usage analytics, cost tracking from local session data, detailed breakdowns
- **Our coverage:** Partial — we have cost-alert hook and context-budget skill, but not detailed analytics from JSONL
- **Action:** **Evaluate** — Consider a usage-analytics skill that reads JSONL session data for insights

### 42. humanizer — 11,365 stars
- **URL:** https://github.com/blader/humanizer
- **What:** Claude Code skill that removes AI-generated writing markers
- **Key features:** De-AI-ification of text output
- **Our coverage:** None as a dedicated skill
- **Action:** Skip — niche single-purpose skill

### 43. pal-mcp-server — 11,329 stars
- **URL:** https://github.com/BeehiveInnovations/pal-mcp-server
- **What:** MCP server connecting Claude/Gemini/Codex to any model provider
- **Key features:** Multi-model access through one MCP server
- **Our coverage:** N/A — MCP server
- **Action:** Skip

### 44. Compound Engineering Plugin (Every Inc) — 11,303 stars
- **URL:** https://github.com/EveryInc/compound-engineering-plugin
- **What:** Official compound engineering plugin for Claude Code
- **Key features:** Plan-first development, compound task management
- **Our coverage:** Full — we have /ce:plan, /ce:work, /ce:brainstorm commands integrated
- **Action:** Skip — already integrated

### 45. Agent-Reach — 11,007 stars
- **URL:** https://github.com/Panniantong/Agent-Reach
- **What:** Give AI agents eyes to see the internet — read/search Twitter, Reddit, YouTube, GitHub
- **Key features:** Zero API fee web scraping for agents
- **Our coverage:** Partial — we have browse, web-scraper, firecrawl-scraper skills
- **Action:** Skip

### 46. cmux — 10,985 stars
- **URL:** https://github.com/manaflow-ai/cmux
- **What:** Ghostty-based macOS terminal with vertical tabs and notifications for AI coding agents
- **Key features:** Custom terminal for AI coding, agent-specific notifications
- **Our coverage:** N/A — terminal app
- **Action:** Skip

### 47. Claude Code System Prompts — 6,888 stars
- **URL:** https://github.com/Piebald-AI/claude-code-system-prompts
- **What:** All parts of Claude Code's system prompt, updated per version
- **Key features:** System prompt documentation, sub-agent prompts
- **Our coverage:** N/A — reference material
- **Action:** Skip — but useful reference for keeping our hooks/skills aligned

### 48. Claude Code Game Studios — 6,869 stars
- **URL:** https://github.com/Donchitos/Claude-Code-Game-Studios
- **What:** 48 AI agents and 36 workflow skills for game development
- **Key features:** Game dev studio simulation, full studio hierarchy
- **Our coverage:** None — game dev is not in our scope
- **Action:** Skip

### 49. claude-squad — 6,673 stars
- **URL:** https://github.com/smtg-ai/claude-squad
- **What:** Terminal app managing multiple Claude Code/Codex/Gemini agents in separate workspaces
- **Key features:** Background task completion (yolo mode), isolated git workspaces per task, multi-instance management, review diffs before applying, Go binary
- **Our coverage:** Partial — we have devfleet, dmux-workflows, and claude-peers integration but not isolated git worktrees per task
- **Action:** **Evaluate** — Their isolated git workspace per task pattern is strong. Consider a git-worktree-isolation skill.

### 50. arscontexta — 2,876 stars
- **URL:** https://github.com/agenticnotetaking/arscontexta
- **What:** Plugin that generates individualized knowledge systems from conversation — a second brain
- **Key features:** Cognitive architecture derivation from conversation, knowledge graph vault in plain markdown, processing pipeline, 249 research claims, auto-commit hooks
- **Our coverage:** Partial — we have para-memory-files and context-hub but not AI-derived knowledge system generation
- **Action:** Skip — interesting but niche

### 51. Plugins + Skills Marketplace (Tons of Skills) — 1,733 stars
- **URL:** https://github.com/jeremylongshore/claude-code-plugins-plus-skills
- **What:** 415 plugins, 2,811 skills, 154 agents with ccpi CLI package manager
- **Key features:** ccpi CLI for plugin management, marketplace website (tonsofskills.com), plugin bundles, weekly featured skills, community contributions
- **Our coverage:** None — we don't have a package manager or marketplace
- **Action:** **Evaluate** — The ccpi CLI concept (search, install, update plugins) is the future distribution model. Consider submitting our skills as individual packages.

### 52. Trail of Bits claude-code-config — 1,685 stars
- **URL:** https://github.com/trailofbits/claude-code-config
- **What:** Opinionated defaults, documentation, and workflows from Trail of Bits security team
- **Key features:** Security-focused config, enterprise-grade defaults
- **Our coverage:** Full — we have security hooks, mega-security skill, and harden skill
- **Action:** Skip — but note their security reputation adds credibility

### 53. tweakcc (Piebald AI) — 1,457 stars
- **URL:** https://github.com/Piebald-AI/tweakcc
- **What:** CLI tool to customize Claude Code system prompts, themes, toolsets, input highlighters
- **Key features:** System prompt customization, custom themes with color picker, custom thinking verbs/spinners, session naming (/title), input pattern highlighters, AGENTS.md support patch, session memory unlock, MCP startup optimization, auto-accept plan mode
- **Our coverage:** Partial — we have mode-switcher and terminal art, but not system prompt patching or theme customization
- **Action:** Skip — deep Claude Code internals patching, different approach than our config/skills model

### 54. claude-code-hooks-multi-agent-observability — 1,306 stars
- **URL:** https://github.com/disler/claude-code-hooks-multi-agent-observability
- **What:** Real-time monitoring for Claude Code agents through hook event tracking
- **Key features:** Agent observability dashboard, event stream monitoring
- **Our coverage:** Partial — we have the dashboard/ directory but their hook-based observability is more focused
- **Action:** Skip — we have equivalent in our dashboard

### 55. claude-reflect — 860 stars (below threshold but critical feature)
- **URL:** https://github.com/BayramAnnakov/claude-reflect
- **What:** Self-learning system that captures corrections and discovers workflow patterns, syncs to CLAUDE.md
- **Key features:** Correction capture via hooks (100% reliable), skill discovery from session history analysis, multi-language correction understanding, skill self-improvement (corrections during /deploy improve the deploy skill)
- **Our coverage:** Partial — continuous-learning-v2 captures learnings but doesn't auto-evolve skills or discover workflow patterns from history
- **Action:** **Add** — Self-evolving skills is the #1 learning/reflection feature gap. Corrections should feed back into SKILL.md files.

### 56. adversarial-spec — 516 stars (below threshold but critical concept)
- **URL:** https://github.com/zscole/adversarial-spec
- **What:** Multi-model debate for spec refinement until consensus
- **Key features:** Multiple LLMs critique in parallel, loop until ALL models agree, Claude as active participant (not just orchestrator), supports 10+ model providers
- **Our coverage:** Partial — our dialectic-review has FOR/AGAINST/Referee pattern but single-model, not multi-model consensus
- **Action:** **Add** — Upgrade dialectic-review to support multi-model consensus when API keys available. This is the multi-model consensus feature we were looking for.

---

## Features to Add (Priority Order)

### P0 — Critical (v1.3 must-haves)

1. **Official Plugin Format** — Publish as `.claude-plugin` compatible package for `/plugin marketplace add k3v80/claude-code-kit`. Create `plugin.json`, restructure commands/skills/agents for plugin compatibility. This is how the ecosystem distributes now.
   - *Source:* anthropics/claude-plugins-official (15K stars)
   - *Implementation:* New `.claude-plugin/plugin.json` manifest + restructure

2. **AI-Powered Memory Compression** — Replace file-based save-session with Agent SDK-powered intelligent compression. Compress session context with AI before saving, inject relevant compressed context into future sessions.
   - *Source:* claude-mem (41.6K stars)
   - *Implementation:* New skill `memory-compress` + enhance save-session/resume-session hooks

3. **Multi-Model Consensus** — Query 2-3 models in parallel for spec review, architecture decisions, and code review. Loop until consensus. Upgrade dialectic-review.
   - *Source:* adversarial-spec (516 stars concept), oh-my-openagent (44K stars execution)
   - *Implementation:* Enhance `dialectic-review` skill + new `multi-model-consensus` skill using litellm

### P1 — High Priority

4. **Self-Evolving Skills** — When corrections happen during skill execution, automatically update the SKILL.md file with learned improvements. Skills get better through use.
   - *Source:* claude-reflect (860 stars), Hermes Agent (14.7K stars)
   - *Implementation:* New PostToolUse hook + enhance `continuous-learning-v2` to write back to SKILL.md

5. **Token Optimization Integration** — RTK-style CLI output compression to reduce token consumption 60-90%. At minimum, document RTK as companion tool; ideally, create a hook that filters verbose CLI output.
   - *Source:* RTK (14.6K stars)
   - *Implementation:* New `token-optimizer` hook (PreToolUse) + documentation

6. **Enhanced Statusline** — Match Claude HUD's feature set: tool activity tracking, agent status, todo progress bar, git branch, usage rate limits.
   - *Source:* Claude HUD (14.4K stars)
   - *Implementation:* Upgrade `lib/statusline.sh` with tool activity and agent tracking

### P2 — Nice to Have

7. **Team Pipeline Workflow** — Staged pipeline: plan -> PRD -> execute -> verify -> fix (loop). Agent teams with automatic handoffs.
   - *Source:* oh-my-claudecode (14.2K stars)
   - *Implementation:* New `team-pipeline` skill or enhance `orchestrate`

8. **Session History Pattern Discovery** — Analyze past sessions to find repeating tasks, suggest creating commands/skills for them.
   - *Source:* claude-reflect (860 stars)
   - *Implementation:* New `pattern-discovery` skill

9. **Beads Integration** — Bridge to Beads graph-based task tracker for persistent, dependency-aware project tracking across sessions.
   - *Source:* Beads (19.8K stars)
   - *Implementation:* New `beads-integration` skill

10. **Cross-Platform Skill Compatibility** — Add frontmatter to SKILL.md files for cross-platform activation (Codex, Gemini CLI, Cursor, Antigravity).
    - *Source:* antigravity-awesome-skills (27.9K stars), awesome-agent-skills (13.1K stars)
    - *Implementation:* Update SKILL.md template with platform-agnostic frontmatter

### P3 — Future Consideration

11. **Usage Analytics from JSONL** — Read local session JSONL files to provide detailed cost/token/usage breakdowns.
    - *Source:* ccusage (12K stars)
    - *Implementation:* New `usage-analytics` skill

12. **Skill Package Manager** — npm-like CLI for searching, installing, updating individual skills from a registry.
    - *Source:* Tons of Skills / ccpi (1.7K stars)
    - *Implementation:* Major new feature — `cckit` CLI tool

---

## Features We Already Cover Well

1. **Skills System** — 280+ skills vs closest competitor at 30 commands (SuperClaude). We're the largest skill library that ships as one installable kit.

2. **Hook Lifecycle** — 18 kit-native hooks covering context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach, status-reporter, openclaw-sync, etc. More comprehensive than any competitor.

3. **Workflow Modes** — 9 modes (normal, design, saas, marketing, research, writing, night, yolo, unhinged) vs SuperClaude's 7.

4. **Spec-Driven Development** — evals-before-specs, spec-interviewer, four-question-validation provide end-to-end spec workflow.

5. **Agent Orchestration** — agency-orchestrator, delegation-templates, dispatching-parallel-agents, orchestrate, devfleet, task-commander, claude-peers integration.

6. **Security** — mega-security skill, harden, guard, pentest-checklist, plus ECC integration with security hooks.

7. **Marketing/Business Pack** — mega-marketing, c-level-pack, business-pack, finance-pack — no competitor matches this breadth.

8. **Interactive Installer** — Matrix rain, ASCII art, progress bars, dry-run mode, verify mode. Most competitors use plain `cp` scripts.

---

## Competitive Landscape Summary

| Tier | Repo | Stars | Threat Level |
|------|------|-------|--------------|
| **Ecosystem** | anthropics/claude-plugins-official | 15K | HIGH — new distribution standard |
| **Config Kit** | ECC | 113K | LOW — we integrate with it |
| **Config Kit** | gstack | 53K | LOW — less depth than us |
| **Config Kit** | SuperClaude | 22K | MEDIUM — multi-platform ports |
| **Config Kit** | GSD | 44K | LOW — lighter weight |
| **Memory** | claude-mem | 42K | HIGH — AI compression we lack |
| **Orchestration** | oh-my-openagent | 44K | MEDIUM — multi-model execution |
| **Orchestration** | oh-my-claudecode | 14K | MEDIUM — team pipeline |
| **Tools** | RTK | 15K | MEDIUM — token optimization |
| **Tools** | Beads | 20K | LOW — different category |
| **Tools** | Claude HUD | 14K | MEDIUM — better statusline |
| **Learning** | claude-reflect | 860 | HIGH — self-evolving skills |
| **Platform** | Hermes Agent | 15K | LOW — different category |
| **Platform** | NanoClaw | 26K | LOW — OpenClaw competitor |

---

## Key Takeaways

1. **The plugin system is the new standard.** Publishing as a `.claude-plugin` is non-negotiable for v1.3 distribution. The ecosystem has moved to `/plugin marketplace`.

2. **AI-powered memory compression is table stakes.** claude-mem at 42K stars proves the demand. Our file-based save/resume is outdated.

3. **Multi-model consensus is the frontier.** adversarial-spec and oh-my-openagent show the pattern: query multiple models, synthesize, iterate to consensus. Our dialectic-review is single-model.

4. **Self-improving skills differentiate.** claude-reflect and Hermes Agent's learning loops mean skills get better through use. Our skills are static after installation.

5. **Token optimization matters.** RTK at 15K stars shows developers care deeply about cost. A simple hook or integration would add significant value.

6. **We're still the most comprehensive single-install kit.** No competitor matches our breadth (280+ skills, 88+ commands, 18 kit-native hooks, 9 modes, 4 themes, 36+ templates). Our moat is comprehensiveness + curation quality.
