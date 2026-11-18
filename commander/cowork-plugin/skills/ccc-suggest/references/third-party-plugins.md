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
| Design | `diagram-design` | A real diagram (architecture, flow, sequence, ER, timeline) as one HTML+SVG file; pairs with `/ccc-cheatsheet` | opt-in ([upstream](https://github.com/cathrynlavery/diagram-design); toolkit guide `skills/diagram-design` when the CLI toolkit is installed) |
| Memory | `claude-mem` | Session memory and context injection across sessions | opt-in, external (Apache-2.0 since 2026, earlier AGPL; not bundled) |
| Memory | `hindsight` | Agent memory that learns from past work | opt-in |
| Memory | `beads` | Issue-graph memory for coding agents | opt-in |
| Memory | `mempalace` | Searchable verbatim memory of past sessions; the MIT alternative to `claude-mem` | opt-in MCP ([upstream](https://github.com/MemPalace/mempalace); toolkit guide `skills/mempalace` when the CLI toolkit is installed, `/ccc-connect`) |
| Memory | `qmd` | Local search over notes, docs and `memory/` files; backs `/ccc-recall` | opt-in MCP ([upstream](https://github.com/tobi/qmd); toolkit guide `skills/qmd` when the CLI toolkit is installed, `/ccc-connect`) |
| Research | `last30days-skill` | Multi-source recent research (forums, video, news, web) | opt-in |
| Research | `context7` | Current library documentation | bundled MCP |
| Research | `claude-video` | The user shares a video or screen recording; `/watch` gives frames and a transcript (Code sessions, not Cowork) | opt-in ([upstream](https://github.com/bradautomates/claude-video); toolkit guide `skills/claude-video` when the CLI toolkit is installed) |
| Code map | `codebase-memory-mcp` | Unfamiliar or large repo, call tracing, change impact, test selection; preferred over graphify when connected | opt-in MCP ([upstream](https://github.com/DeusData/codebase-memory-mcp); toolkit guide `skills/codebase-memory-mcp` when the CLI toolkit is installed, `/ccc-connect`) |
| Browsing | `dev-browser` | A real browser for agents | opt-in |
| Planning | `planning-with-files` | Persistent markdown planning; complements `/ccc-plan` | opt-in |
| Planning | `bmad-method` | Agile-style multi-role planning | opt-in |
| Orchestration | `wshobson/agents` | A large library of specialist subagents | opt-in |
| Orchestration | `superpowers` | Agentic skills framework | vendored (`vendor/superpowers`) |
| Tokens | `caveman` | Compressed output prose | toolkit skill (`skills/caveman`) |
| Code size | `ponytail` | Over-engineered diffs, wrappers and options nobody asked for | toolkit skill and mode ([upstream](https://github.com/DietrichGebert/ponytail); toolkit guide `skills/ponytail` when the CLI toolkit is installed) |
| Quality | `everything-claude-code` | Harness optimization patterns | vendored (`vendor/everything-claude-code`) |
| Quality | `claude-task-master` | Task management drop-in | opt-in |
| Quality | `promptfoo` | Prompt tests and red-teaming | opt-in |
| Domains | `marketingskills` | CRO, copywriting, growth; overlaps `ccc-marketing` | opt-in |
| Domains | `pm-skills` | Product-management skill pack | opt-in |
| Domains | `andrej-karpathy-skills` | LLM coding guidance | opt-in |
| Visibility | `claude-hud` | Status bar and tool tracking | vendored (`vendor/claude-hud`) |
| Visibility | `visual-explainer` | Rich HTML or slide diagrams; pairs with `/ccc-cheatsheet` | opt-in |
| Design | `taste-skill` | Art-directed marketing sites with real photos and a browser check; overlaps `ui-ux-pro-max-skill` and `/ccc-design`, so name it only for a site that must not look generic. Needs Node 22 and Chrome | opt-in; install per the upstream README reviewed at [`f6b7657`](https://github.com/Leonxlnx/taste-skill/tree/f6b76575f949707b4e3c37cd86cb44b0b98643e8#readme), from that repository's own marketplace or package, and say if upstream has moved since |
| Domains | `claude-seo` | A full technical SEO and AI-search audit with specialist agents; overlaps `skills/ccc-seo`, so name it for a one-shot site audit | opt-in; install per the upstream README reviewed at [`468ed5b`](https://github.com/AgriciDaniel/claude-seo/tree/468ed5b0d9e3249394783710e54abb02837e326b#readme), from that repository's own marketplace or package, and say if upstream has moved since |
| Planning | `spec-kit` | Spec-driven development with a `specify` CLI; overlaps `/ccc-plan`, so name it when a team already writes specs | opt-in; install per the upstream README reviewed at [`59d61c5`](https://github.com/github/spec-kit/tree/59d61c59630c3bd5a294f4c23e43a60d8ab98d02#readme), from that repository's own marketplace or package, and say if upstream has moved since; the CLI comes from that repository, not a same-named PyPI package |
| Orchestration | `ruflo` | Swarm harness with its own MCP server; overlaps `/ccc-fleet` and `/ccc-orchestrate`, so name it only when the user asks for ruflo or claude-flow | opt-in; install per the upstream README reviewed at [`edf7ddb`](https://github.com/ruvnet/ruflo/tree/edf7ddb3fefa15bca87986225b5a5ef7d4d059e5#readme), from that repository's own marketplace or package, and say if upstream has moved since |
| Catalogs | `claude-code-templates` | Browse and install single agents, commands, hooks or MCPs from a large catalog; install one item at a time, never the whole registry | opt-in (`npx claude-code-templates@1.33.1`, the version reviewed on 2026-11-18; check upstream before a newer one) |
| Catalogs | `agentic-awesome-skills` | Search a 2,900+ skill index for one niche skill; never install wholesale | opt-in, index only ([sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills)) |
| Authoring | `book-to-skill` | Turn a PDF book into a skill; a one-off authoring tool, not a runtime skill | opt-in; install per the upstream README reviewed at [`e7bb659`](https://github.com/virgiliojr94/book-to-skill/tree/e7bb659d3261491c8b28793dcb9102fa64a46c22#readme), from that repository's own marketplace or package, and say if upstream has moved since |
| Cost | `ccusage` | Token and cost reports from local Claude Code logs, per day, session or block; complements `/ccc-usage`, which estimates routing savings | opt-in (`npx ccusage@20.0.51`, the version reviewed on 2026-11-18; check upstream before a newer one) |
| Routing | `claude-code-router` | Route Claude Code requests to other model providers; infra, so name it only when the user asks for multi-provider routing | opt-in (`npm install -g @musistudio/claude-code-router@3.1.5`, the version current on 2026-11-18; check upstream before a newer one) |
| Media | `slopcore` | Music-video generation; niche | opt-in; install per the upstream README reviewed at [`2d026ec`](https://github.com/obie/slopcore/tree/2d026ecd999b0543ada360dd006faa6cb8cc4d15#readme), from that repository's own marketplace or package, and say if upstream has moved since |
