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
| Memory | `claude-mem` | Session memory and context injection across sessions | opt-in, external (Apache-2.0 since 2026, earlier AGPL; not bundled) |
| Memory | `hindsight` | Agent memory that learns from past work | opt-in |
| Memory | `beads` | Issue-graph memory for coding agents | opt-in |
| Memory | `mempalace` | Searchable verbatim memory of past sessions; the MIT alternative to `claude-mem` | opt-in MCP (`skills/mempalace`, `/ccc-connect`) |
| Memory | `qmd` | Local search over notes, docs and `memory/` files; backs `/ccc-recall` | opt-in MCP (`skills/qmd`, `/ccc-connect`) |
| Research | `last30days-skill` | Multi-source recent research (forums, video, news, web) | opt-in |
| Research | `context7` | Current library documentation | bundled MCP |
| Research | `claude-video` | The user shares a video or screen recording; `/watch` gives frames and a transcript (Code sessions, not Cowork) | opt-in (`skills/claude-video`) |
| Code map | `codebase-memory-mcp` | Unfamiliar or large repo, call tracing, change impact, test selection; preferred over graphify when connected | opt-in MCP (`skills/codebase-memory-mcp`, `/ccc-connect`) |
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
| Design | `taste-skill` | Art-directed marketing sites with real photos and a browser check; overlaps `ui-ux-pro-max-skill` and `/ccc-design`, so name it only for a site that must not look generic. Needs Node 22 and Chrome | opt-in (`/plugin marketplace add Leonxlnx/taste-skill`, then `/plugin install taste-skill@taste-skill`) |
| Domains | `claude-seo` | A full technical SEO and AI-search audit with specialist agents; overlaps `skills/ccc-seo`, so name it for a one-shot site audit | opt-in (`/plugin marketplace add AgriciDaniel/claude-seo`, then `/plugin install claude-seo@agricidaniel-claude-seo`) |
| Planning | `spec-kit` | Spec-driven development with a `specify` CLI; overlaps `/ccc-plan`, so name it when a team already writes specs | opt-in (`uv tool install specify-cli`) |
| Orchestration | `ruflo` | Swarm harness with its own MCP server; overlaps `/ccc-fleet` and `/ccc-orchestrate`, so name it only when the user asks for ruflo or claude-flow | opt-in (`/plugin marketplace add ruvnet/ruflo`, then `/plugin install ruflo-core@ruflo`) |
| Catalogs | `claude-code-templates` | Browse and install single agents, commands, hooks or MCPs from a large catalog; install one item at a time, never the whole registry | opt-in (`npx claude-code-templates@latest`) |
| Catalogs | `agentic-awesome-skills` | Search a 2,900+ skill index for one niche skill; never install wholesale | opt-in, index only |
| Authoring | `book-to-skill` | Turn a PDF book into a skill; a one-off authoring tool, not a runtime skill | opt-in (`npx skills add virgiliojr94/book-to-skill`) |
| Cost | `ccusage` | Token and cost reports from local Claude Code logs, per day, session or block; complements `/ccc-usage`, which estimates routing savings | opt-in (`npx ccusage@latest`) |
| Routing | `claude-code-router` | Route Claude Code requests to other model providers; infra, so name it only when the user asks for multi-provider routing | opt-in (`npm install -g @musistudio/claude-code-router`) |
| Media | `slopcore` | Music-video generation; niche | opt-in (`/plugin marketplace add obie/slopcore`, then `/plugin install slopcore@slopcore`) |
