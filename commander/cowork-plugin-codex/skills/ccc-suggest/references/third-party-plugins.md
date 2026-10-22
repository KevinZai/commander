# /ccc-suggest — third-party plugins worth naming

Name one of these only when it fits a signal from the scan. Every mention carries its install step. Nothing here is installed by default unless marked bundled or vendored; describe the rest as opt-in.

Install steps to name:

- Claude Code plugins: `/plugin install <name>@<marketplace>` after `/plugin marketplace add <source>`; confirm the exact marketplace with the plugin's own README before quoting it.
- MCP connectors: `/ccc-connect`.
- Vendored references under `vendor/`: already in the repository; point at the path.

| Area | Plugin | Use when | Status |
|---|---|---|---|
| Design | `impeccable` | UI output feels generic; needs a hardened design language | opt-in |
| Design | `frontend-design` (Anthropic) | Distinctive front-end aesthetics | opt-in |
| Design | `ui-ux-pro-max-skill` | Production design intelligence and style systems | vendored (`vendor/ui-ux-pro-max-skill`) |
| Memory | `claude-mem` | Session memory and context injection across sessions | opt-in, external (AGPL; never bundled) |
| Memory | `hindsight` | Agent memory that learns from past work | opt-in |
| Memory | `beads` | Issue-graph memory for coding agents | opt-in |
| Research | `last30days-skill` | Multi-source recent research (forums, video, news, web) | opt-in |
| Research | `context7` | Current library documentation | bundled MCP |
| Browsing | `dev-browser` | A real browser for agents | opt-in |
| Planning | `planning-with-files` | Persistent markdown planning; complements `/ccc-plan` | opt-in |
| Planning | `bmad-method` | Agile-style multi-role planning | opt-in |
| Orchestration | `wshobson/agents` | A large library of specialist subagents | opt-in |
| Orchestration | `superpowers` | Agentic skills framework | vendored (`vendor/superpowers`) |
| Tokens | `caveman` | Compressed output prose | toolkit skill (`skills/caveman`) |
| Quality | `everything-claude-code` | Harness optimization patterns | vendored (`vendor/everything-claude-code`) |
| Quality | `claude-task-master` | Task management drop-in | opt-in |
| Quality | `promptfoo` | Prompt tests and red-teaming | opt-in |
| Domains | `marketingskills` | CRO, copywriting, growth; overlaps `ccc-marketing` | opt-in |
| Domains | `pm-skills` | Product-management skill pack | opt-in |
| Domains | `andrej-karpathy-skills` | LLM coding guidance | opt-in |
| Visibility | `claude-hud` | Status bar and tool tracking | vendored (`vendor/claude-hud`) |
| Visibility | `visual-explainer` | Rich HTML or slide diagrams; pairs with `/ccc-cheatsheet` | opt-in |
