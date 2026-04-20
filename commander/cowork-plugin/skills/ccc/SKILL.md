---
name: ccc
description: "CC Commander main hub — click-first menu that detects your project context and routes to 12 specialist workflows (plan, build, review, ship, design, learn, xray, linear, fleet, connect). Use when the user types /ccc, says 'open commander', 'what should I work on', 'start commander', or wants a guided entry point."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
argument-hint: "[intent keyword: build | review | ship | design | learn | more]"
---

# /ccc — CC Commander Hub

Click-first entry point to the whole CC Commander surface (23 ccc-* skills, 15 specialist agents, 8 MCP servers). The user types `/ccc` and gets a native visual picker — no typing, no menus, no ASCII banners.

## Response shape (EVERY time)

Output exactly four sections in order: **1) brand header, 2) context strip, 3) picker (AskUserQuestion), 4) dispatch on selection**. Sections 1-3 are rendered up front; section 4 fires after the user clicks.

### 1. Brand header (one line, markdown)

```
**CC Commander** · v{VERSION} · Guided AI PM · [Desktop plugin](https://cc-commander.com)
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` via a single Read call.

### 2. Context strip (one paragraph, markdown)

Detect project context with **four quick reads** (cheap, silent on failure):
- `git rev-parse --abbrev-ref HEAD` → current branch
- Presence of `CLAUDE.md` in CWD → project recognition
- Presence of `tasks/todo.md` → active work
- `ls -t ~/.claude/sessions/*.tmp 2>/dev/null | head -1` → recent session

Render a one-line summary:
> 🧭 Context: `<branch>` · project: `<name from CLAUDE.md first line or CWD basename>` · <N> open tasks · last session: <age>

If no context detected (not in a project): "🧭 No project detected — pick an intent below, I'll set one up."

### 3. The picker — `AskUserQuestion` with 4 intents

**Never render a numbered list, never tell the user to "type a number".** Always call `AskUserQuestion` with these 4 options. The `preview` field gets rich context per option.

```
question: "What's the move?"
header: "CC Commander"
multiSelect: false
options:
  - label: "🔨 Build something"
    description: "Scaffold a project or feature — web, API, CLI, mobile."
    preview: "(per-context note — see rules below)"
  - label: "🔍 Review my work"
    description: "Audit current branch, security, perf, or run full x-ray."
    preview: "(per-context note)"
  - label: "🚀 Ship it"
    description: "Pre-flight checks + deploy. Tests, tag, push, release."
    preview: "(per-context note)"
  - label: "⋯ More tools"
    description: "Plan, design, learn, x-ray, Linear, fleet, connect apps."
    preview: "27 more skills — click to expand"
```

**Recommendation logic** (prepend ⭐ to the label of ONE option based on context):
- Branch has uncommitted changes + recent diff → ⭐ "Review my work"
- Tests green + branch ahead of main → ⭐ "Ship it"
- Empty repo OR no CLAUDE.md → ⭐ "Build something"
- Session recent and file changes in `tasks/` → context-specific preview text

### 4. Handle the selection

Based on user pick, invoke the matching skill. Do NOT prompt again; dispatch immediately:

- **Build** → invoke `ccc-build` skill
- **Review** → invoke `ccc-review` skill
- **Ship** → invoke `ccc-ship` skill
- **More** → invoke `ccc-more` skill (which presents the second-page picker)

Each target skill handles its own sub-picker. Never unroll all 27+ options in one `/ccc` call — that's anti-pattern (burns context, overwhelming UX).

## Anti-patterns — DO NOT do these

- ❌ Render a numbered list "1. Build, 2. Review, ..." and tell the user to type a number
- ❌ Output raw HTML in fenced code blocks expecting it to render as an interactive artifact — Cowork Desktop shows HTML as literal code
- ❌ Render ASCII banners with box-drawing characters — waste of tokens, ugly in Desktop
- ❌ Render more than 4 options in a single `AskUserQuestion` — not supported (max 4)
- ❌ Load `references/main-menu.json` and dump 18 options — nested flow is required
- ❌ Reference legacy `/commander:ccc` namespace — the plugin now ships `/ccc` as a plain skill

## Dispatching after selection

When the user picks an option, use the `SendMessage` pattern by invoking the target skill inline. Example for "Build":

> Loading the build workflow — `ccc-build` routes you to web / API / CLI / mobile / from-spec with one more click.

Then proceed as if the user had invoked `/ccc-build` directly. Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-build.json` for its options and call `AskUserQuestion` with them.

## When user passes an argument

If `/ccc build` → skip the root picker, invoke `ccc-build` directly.
If `/ccc review` / `ship` / `design` / `more` → same.
If `/ccc <anything else>` → show the root picker with the argument echoed in the context strip: "🧭 You said: `<arg>` — picking an intent below to route you."

## Plugin detection (for context strip)

Scan quickly (parallel Bash calls with timeouts):
- `ls ~/.claude/skills/ | wc -l` — skill count
- `claude mcp list 2>/dev/null | grep -c '^  '` — connected MCPs

If either >0, include in context strip: "🧰 X skills · Y MCPs connected".

## Brand rules

- **Always read `VERSION` from plugin.json** — never hardcode.
- **Emoji-forward, concise** (PM Consultant voice): decision up front, reasoning terse.
- **Never mention the CLI (`ccc` npm binary)** in `/ccc` flow — this is the Desktop-plugin audience.
- **Recommended option** gets ⭐ and a one-line "Recommended because …" in its preview field.

## Tips for the agent executing this skill

1. The whole flow is ≤4 Claude turns: banner+picker → user clicks → dispatch → target skill runs. Don't overthink.
2. If Cowork Desktop caches the marketplace and the version strip shows an old version, that's a client cache issue — not our problem. Note it in the context strip: "⚠️ Plugin v<X> detected; latest on GitHub is <Y> — click Update in marketplace".
3. For `ls` / `git` / file-check operations, run in parallel in a single Bash call (`cmd1 && cmd2 && cmd3`) to save turns.

---

**Bottom line:** three elements — header, context, picker — in that order. User clicks. We route. No typing, no text menus, ever.
