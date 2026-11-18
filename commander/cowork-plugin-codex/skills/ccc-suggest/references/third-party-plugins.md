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
| Design | `diagram-design` | A real diagram (architecture, flow, sequence, ER, timeline) as one HTML+SVG file; pairs with `/ccc-cheatsheet` | opt-in (`skills/diagram-design`) |
| Memory | `claude-mem` | Session memory and context injection across sessions | opt-in, external (AGPL; never bundled) |
| Memory | `hindsight` | Agent memory that learns from past work | opt-in |
| Memory | `beads` | Issue-graph memory for coding agents | opt-in |
| Memory | `mempalace` | Searchable verbatim memory of past sessions; the MIT alternative to `claude-mem` | opt-in MCP (`skills/mempalace`, `/ccc-connect`) |
| Memory | `qmd` | Local search over notes, docs and `memory/` files; backs `/ccc-recall` | opt-in MCP (`skills/qmd`, `/ccc-connect`) |
| Research | `last30days-skill` | Multi-source recent research (forums, video, news, web) | opt-in |
| Research | `context7` | Current library documentation | bundled MCP |
| Research | `claude-video` | The user shares a video or screen recording; `/watch` gives frames and a transcript (Code sessions, not Cowork) | opt-in (`skills/claude-video`) |
| Code map | `codebase-memory-mcp` | Unfamiliar or large repo, call tracing, change impact, test selection; preferred over graphify when connected | opt-in MCP (`skills/codebase-memory-mcp`, `/ccc-connect`) |
| Code map | `understand-anything` | An interactive knowledge-graph dashboard and guided tour of a codebase or docs folder, for onboarding a person rather than the agent; overlaps codebase-memory-mcp and graphify, so name it only when the user wants a visual tour. Its analysis runs through the agent's own model | opt-in (`/plugin marketplace add Egonex-AI/Understand-Anything`, then `/plugin install understand-anything@understand-anything`) |
| Browsing | `dev-browser` | A real browser for agents | opt-in |
| Planning | `planning-with-files` | Persistent markdown planning; complements `/ccc-plan` | opt-in |
| Planning | `bmad-method` | Agile-style multi-role planning | opt-in |
| Orchestration | `wshobson/agents` | A large library of specialist subagents | opt-in |
| Orchestration | `superpowers` | Agentic skills framework | vendored (`vendor/superpowers`) |
| Tokens | `caveman` | Compressed output prose | toolkit skill (`skills/caveman`) |
| Code size | `ponytail` | Over-engineered diffs, wrappers and options nobody asked for | toolkit skill and mode (`skills/ponytail`) |
| Quality | `everything-claude-code` | Harness optimization patterns | vendored (`vendor/everything-claude-code`) |
| Quality | `claude-task-master` | Task management drop-in | opt-in |
| Quality | `promptfoo` | Prompt tests and red-teaming | opt-in |
| Domains | `marketingskills` | CRO, copywriting, growth; overlaps `ccc-marketing` | opt-in |
| Domains | `pm-skills` | Product-management skill pack | opt-in |
| Domains | `andrej-karpathy-skills` | LLM coding guidance | opt-in |
| Visibility | `claude-hud` | Status bar and tool tracking | vendored (`vendor/claude-hud`) |
| Visibility | `visual-explainer` | Rich HTML or slide diagrams; pairs with `/ccc-cheatsheet` | opt-in |
