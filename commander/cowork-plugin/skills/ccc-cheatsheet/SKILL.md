---
name: ccc-cheatsheet
description: "Live map of Commander: reads the installed plugin's skills, workflows, menus, agents, hooks and MCP servers from disk and renders a Mermaid flow plus a navigator picker, with an optional HTML export. Use when the user types /ccc-cheatsheet or asks for a command map or everything Commander offers."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Skill
  - AskUserQuestion
  - Artifact
argument-hint: "[skill or workflow name to drill into, e.g. plan | codex | fleet | audit] [--html]"
model: sonnet
effort: low
---

# /ccc-cheatsheet — the live Commander map

**CC Commander** · /ccc-cheatsheet · a flow diagram and skill index built from the plugin directory in this turn, never from a remembered list.

The filesystem is the only source. Skill names come from `${CLAUDE_PLUGIN_ROOT}/skills/*/`, descriptions from each SKILL.md frontmatter, the tree from `${CLAUDE_PLUGIN_ROOT}/menus/*.json`, and plugin workflows from `${CLAUDE_PLUGIN_ROOT}/workflows/*.workflow.js`. When a skill is added or removed, the map changes with it.

## When to use / when not to

- Use for "show me everything", "what commands are there?", "map of Commander", or a drill-down on one workflow (`/ccc-cheatsheet codex`).
- Use `/ccc-browse` for a searchable, filterable catalog and `/ccc` to start working.
- Do not quote counts from `CLAUDE.md`, the README, the banner or memory; they drift.

## What happens

### 1. Read the inventory

Run in one Bash call. `R` falls back to the repository path when the plugin root is unset:

```bash
R="${CLAUDE_PLUGIN_ROOT:-commander/cowork-plugin}"
node -e 'console.log("version\t" + require(process.argv[1] + "/.claude-plugin/plugin.json").version)' "$R"
for d in "$R"/skills/*/; do
  f="${d}SKILL.md"; [ -f "$f" ] || continue
  desc=$(sed -n 's/^description: *//p' "$f" | head -1 | sed 's/^"//; s/"$//' | cut -c1-90)
  printf 'skill\t%s\t%s\n' "$(basename "$d")" "$desc"
done
for w in "$R"/workflows/*.workflow.js; do [ -f "$w" ] && printf 'workflow\t/commander:%s\n' "$(basename "$w" .workflow.js)"; done
for m in "$R"/menus/*.json; do [ -f "$m" ] && printf 'menu\t%s\n' "$(basename "$m" .json)"; done
printf 'agents\t%s\n' "$(ls "$R"/agents/*.md 2>/dev/null | wc -l | tr -d ' ')"
node -e 'const fs=require("fs"),R=process.argv[1];const n=(p,k)=>{try{const j=JSON.parse(fs.readFileSync(R+p,"utf8"));return Object.keys(k?j[k]||{}:j).length}catch{return "—"}};console.log("hookEvents\t"+n("/hooks/hooks.json","hooks"));console.log("mcpServers\t"+n("/.mcp.json","mcpServers"))' "$R"
```

Each output row is tab-separated: `version`, one `skill` row per skill directory (name, truncated description), one `workflow` row per plugin workflow, one `menu` row per menu file, then `agents`, `hookEvents`, `mcpServers`. A failed probe prints nothing or `—`; keep going and show `—`.

### 2. Header and stats

```
**CC Commander** · v<version> · Cheatsheet
```

> 📦 <skill rows> skills (<rows starting with ccc-> `/ccc-*` workflows) · <workflow rows> plugin workflows · <agents> agents · <hookEvents> hook events · <mcpServers> bundled MCP servers · <menu rows> menu trees

Every number is a count of step 1's rows from this turn. Link the plugin overview once: [README](../../README.md).

### 3. Argument drill-down (skip when no argument)

- `$ARGUMENTS` is `--html` or `export`: go to step 7.
- Otherwise resolve it against step 1: `plan` → `ccc-plan`, `ccc-plan` → `ccc-plan`, `audit` → `/commander:ccc-audit`. No match: say "No skill or workflow named `<arg>` in this plugin" and continue with the full map.
- Skill match: Read `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md`. Render its `description` and `argument-hint` verbatim, then a small Mermaid tree from `menus/<name>.json` when that file exists, otherwise from the skill's `##` and `###` headings. Then go to step 6.
- Workflow match: Read the workflow file's `meta` block and render its `description` and `whenToUse` verbatim, plus how to run it (`/commander:<name>`, or `/ccc-more workflows`). Then go to step 6.

### 4. Build the diagram

Read every menu file listed in step 1 (one Read per file, or one `cat` in Bash). Build one Mermaid `graph TD` block following [diagram-template.md](references/diagram-template.md): root choices become intents, each menu's choices become leaves, and the workflow rows become leaves under a `plugin workflows` node. A menu file that fails to parse is left out and noted: "⚠️ `ccc-<id>.json` — parse error, omitted." Run the template's validity checks before output; if unsure, simplify the diagram rather than ship a broken block.

### 5. Skill index

Under the diagram, list every skill row from step 1 that the diagram does not show, as one comma-separated line of `/name` entries headed "Also installed:". Together, the diagram and this line cover every skill directory. Use names exactly as listed; never add one that step 1 did not print.

### 6. Navigator picker

AskUserQuestion (Codex: the same choices as a plain-text question):

```
question: "Where next?"
header: "Navigate"
multiSelect: false
options:
  - label: "🟢 📦 Show me everything"
    description: "Open /ccc-browse: searchable grid of every skill, workflow and agent."
  - label: "🏗️ Build"
    description: "Open /ccc-build: pick web, API, CLI or mobile, then a short spec."
  - label: "🔬 Review"
    description: "Open /ccc-review: branch, security, performance or full x-ray."
  - label: "⏭️ Done"
    description: "Close the cheatsheet and return to the current task."
```

On a pick, invoke `ccc-browse`, `ccc-build` or `ccc-review` with the Skill tool, or stop on Done. Do not ask again.

### 7. HTML export (only on `--html`, `export`, or an explicit request)

1. Target is `docs/cheatsheet.html` in the current project. If it exists, ask "🟢 Overwrite `docs/cheatsheet.html`" / "Write `docs/cheatsheet-new.html` instead" / "Cancel".
2. Render one HTML fragment per menu from step 1:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT:-commander/cowork-plugin}/lib/menu-render.js" <menu-id>
   ```
3. Write a standalone page with the Write tool: `<!doctype html>`, a `<title>`, the header and stats from step 2, the Mermaid source in a `<pre>` block, a table of every skill row (name and description), and the menu fragments.
4. Verify: `test -s docs/cheatsheet.html && echo ok`. Report the path only after `ok`.
5. Offer sharing with AskUserQuestion: "🟢 Keep it local" / "Publish as a private claude.ai page". Publish only on an explicit yes, with the Artifact tool (`icon: "map"`), following that tool's page contract. On Codex or without the Artifact tool, give the file path.

## Done when

- The stats line, diagram nodes and skill index all come from step 1 and the menu files read in this turn.
- Every skill directory from step 1 appears either in the diagram or in "Also installed:".
- The Mermaid block passed the template's validity checks.
- Export: `test -s` printed `ok` for the written file, and a published page has a URL from the Artifact tool.

## Guardrails

- Never hardcode a skill list, a count or a version; scan the plugin in this turn.
- Never paraphrase a description in a drill-down; quote the frontmatter.
- Never render the catalog as a numbered list or ask the user to type a number; the map is the diagram and the choice is the picker.
- Skills are plain `/ccc-*` commands; only plugin workflows use the `/commander:<name>` form. Never invent a `/ccc:x` form.
- Write only the export file chosen in step 7. Never publish without the step 7 consent.
- Keep the response short: header, stats, diagram, index, picker.

## See also

- `/ccc-browse` — searchable catalog
- `/ccc` — the hub
- `/ccc-more` — the second-page menu and plugin workflows
- `/ccc-learn` — skill domains

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
