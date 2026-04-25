---
name: ccc-cheatsheet
description: "CC Commander interactive discovery tool. Renders a live flow diagram of every /ccc-* workflow by reading the plugin directly as single source of truth. Use when the user asks 'what can /ccc do', 'show me the commands', 'cheatsheet', 'help', 'overview', or is new to the plugin. Pairs a Mermaid tree diagram with an AskUserQuestion navigator to drill into any workflow."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
# Bash retained: cheatsheet scans filesystem live for counts (ls/wc) + parallel JSON reads
# via single bash call — it's documented in the "Tips for execution" section.
argument-hint: "[workflow name to drill into: plan | build | review | ship | design | learn | xray | linear | fleet | connect | start | browse]"
---

# /ccc-cheatsheet — Interactive Discovery Tool

Live, always-in-sync visual reference for the entire CC Commander plugin surface. Reads the plugin directly — no hardcoded skill list, no stale counts. Renders a Mermaid flow diagram (which Claude Desktop natively renders inline) + an AskUserQuestion navigator to drill into any workflow.

This is the single-source-of-truth discovery primitive. Every time the plugin adds or removes a skill, this cheatsheet updates automatically — no doc maintenance needed.

## Response shape

Four sections in order:

### 1. Brand header

```
**CC Commander** · v{VERSION} · Interactive Cheatsheet · [docs/plugin.md](../../docs/plugin.md)
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

### 2. Live stats line

Compute by scanning plugin directories:

- **Skills:** `ls ${CLAUDE_PLUGIN_ROOT}/skills | wc -l` total; `ls -d ${CLAUDE_PLUGIN_ROOT}/skills/ccc-* | wc -l` specialist workflows
- **Agents:** `ls ${CLAUDE_PLUGIN_ROOT}/agents/*.md | wc -l`
- **Hooks:** count events in `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json` → `.hooks` object
- **MCPs:** count keys in `${CLAUDE_PLUGIN_ROOT}/.mcp.json` → `.mcpServers` if present, else count entries in `${CLAUDE_PLUGIN_ROOT}/MCP.md` headings
- **Menu trees:** `ls ${CLAUDE_PLUGIN_ROOT}/menus/*.json | wc -l`

Render:

> 🧰 **{N} skills** ({M} `/ccc-*` workflows) · **{agents} agents** · **{hooks} lifecycle hooks** · **{mcps} MCP servers** · **{menus} menu trees**

### 3. The Mermaid flow diagram

Claude Desktop renders inline ```mermaid code blocks as SVG diagrams. This is the interactive visual primitive.

Output this exact structure, with real names discovered from the plugin:

````
```mermaid
graph TD
    START([/ccc]) --> INTENT{Pick an intent}
    INTENT -->|🔨| BUILD[/ccc-build]
    INTENT -->|🔍| REVIEW[/ccc-review]
    INTENT -->|🚀| SHIP[/ccc-ship]
    INTENT -->|🎨| DESIGN[/ccc-design]
    INTENT -->|📚| LEARN[/ccc-learn]
    INTENT -->|⋯| MORE[/ccc-more]

    BUILD --> B1[web-app]
    BUILD --> B2[api]
    BUILD --> B3[cli]
    BUILD --> B4[mobile]
    BUILD --> B5[from spec → /ccc-plan]

    REVIEW --> R1[diff vs main]
    REVIEW --> R2[security OWASP]
    REVIEW --> R3[performance]
    REVIEW --> R4[full x-ray → /ccc-xray]

    SHIP --> S1[preflight]
    SHIP --> S2[release]
    SHIP --> S3[deploy]
    SHIP --> S4[rollback]

    DESIGN --> D1[landing]
    DESIGN --> D2[components]
    DESIGN --> D3[polish]
    DESIGN --> D4[figma→code]

    LEARN --> L1[design]
    LEARN --> L2[marketing]
    LEARN --> L3[saas]
    LEARN --> L4[more domains]

    MORE --> M1[/ccc-plan]
    MORE --> M2[/ccc-xray]
    MORE --> M3[/ccc-linear]
    MORE --> M4[/ccc-fleet]
    MORE --> M5[/ccc-connect]
    MORE --> M6[/ccc-browse]

    classDef entry fill:#7c3aed,color:#fff,stroke:#5b21b6
    classDef workflow fill:#1e3a8a,color:#fff,stroke:#1e40af
    classDef leaf fill:#0f172a,color:#cbd5e1,stroke:#334155
    class START entry
    class BUILD,REVIEW,SHIP,DESIGN,LEARN,MORE workflow
    class B1,B2,B3,B4,B5,R1,R2,R3,R4,S1,S2,S3,S4,D1,D2,D3,D4,L1,L2,L3,L4,M1,M2,M3,M4,M5,M6 leaf
```
````

**Before rendering:** verify the tree against actual menu JSONs. Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-root.json`, `ccc-build.json`, `ccc-review.json`, `ccc-ship.json`, `ccc-design.json`, `ccc-learn.json`, `ccc-more.json`. If any menu has added / removed options, update the Mermaid to match. The diagram MUST reflect the real plugin state.

### 4. Navigator picker

Use `AskUserQuestion` with these options:

```
question: "Drill into a workflow?"
header: "Navigate"
multiSelect: false
options:
  - label: "🔨 Build — web/API/CLI/mobile"
    description: "Scaffold a new project or feature. Cascades into spec interview."
    preview: "Next click: pick project type → 3-question spec → background agent spawns"
  - label: "🔍 Review — diff/security/perf/x-ray"
    description: "Audit the current branch. Writes findings to tasks/reviews/."
    preview: "Next click: pick audit type → specialist agent runs in background"
  - label: "🗺️ Show me everything"
    description: "Open /ccc-browse — filterable catalog of all 51 plugin skills + 17 agents."
    preview: "Cascades: Domains (11) / Workflows (13) / Agents (17) / Full grid"
  - label: "👋 Skip — I've got this"
    description: "Close the cheatsheet, return to whatever I was doing."
    preview: "No action — acknowledge and exit."
```

On pick, dispatch to the named skill. Don't ask again.

## If user passes an argument

If `/ccc-cheatsheet plan` → skip the picker, show the Mermaid + drill directly into `ccc-plan` details. Render a mini-tree for just that workflow (read `${CLAUDE_PLUGIN_ROOT}/skills/ccc-<arg>/SKILL.md` + the corresponding menu JSON).

Same for: `build`, `review`, `ship`, `design`, `learn`, `xray`, `linear`, `fleet`, `connect`, `start`, `browse`.

## Special: generate a static HTML export

If user says "export" or passes `--html`, render the same diagram + tables as standalone HTML (using the `menu-render.js` helper if useful) and save to `docs/cheatsheet.html`. This becomes embeddable in the marketing site hero, Notion, or Slack — anywhere a PNG/SVG of the command tree would be useful.

## Anti-patterns

- ❌ Hardcode a skill list — ALWAYS scan the plugin dir, that's the point of this tool
- ❌ Paraphrase descriptions — read directly from SKILL.md frontmatter so descriptions stay canonical
- ❌ Output a numbered list of commands — use the Mermaid diagram, that's the visual
- ❌ Include legacy `/ccc:X` or `/commander:ccc` namespace — the plugin now ships plain `/ccc-*`
- ❌ Show counts from CLAUDE.md or README — those drift; always count from the filesystem

## Brand rules

- **Live, not cached.** Every invocation re-reads the plugin. Kevin's principle: single source of truth = the filesystem.
- **Click-first.** Mermaid + AskUserQuestion. No typing, no menus.
- **Emoji-forward.** Match the PM Consultant voice. Recommended tiles get ⭐.
- **Always link to docs/plugin.md** at the top for users who want more depth.

## Tips for the agent executing this skill

1. Read 3–5 files in parallel via a single Bash call (`cat a b c | head -1000`) to save turns.
2. If a menu JSON is malformed, skip it gracefully and note in the output ("⚠️ `ccc-X.json` — parse error, omitted from diagram").
3. The Mermaid diagram must be valid — test before output. A broken Mermaid block ruins the whole response. If unsure, simplify.
4. For the stats line: if a command fails (e.g. `.mcp.json` doesn't exist), substitute "—" and keep going. Never block the response on missing data.
5. Keep the response SHORT. Users hit this for quick discovery, not a wall of text. Four sections, Mermaid is the star.

---

**Bottom line:** this skill is the always-fresh, Kevin-Z-Method-compliant visual map of CC Commander. Every time the plugin grows, the cheatsheet grows with it — zero maintenance.
