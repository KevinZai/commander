# Tool-Search Loading Tier

> CC Commander · Context Discipline · [Docs](https://commanderplugin.com)

**Tool search** is the *tool-side* counterpart to CC Commander's tiered **skill** loading. Skills tier *which instructions* load into context; tool search tiers *which tool schemas* load into context. Both serve one goal: a slim lead context that holds only what the current task needs.

Modeled on **Hermes Tool Search** (OpenClaw's deferred-tool-loading pattern), tool search keeps a session's tool surface small by default and pulls in tool definitions on demand — only when a task actually needs them.

---

## The problem: tool schemas are context

Every connected tool ships a JSON schema (name, description, parameters). With 16 opt-in MCP connectors plus the bundled servers, eagerly loading every tool can burn tens of thousands of tokens *before the user types a word*. A Slack server alone can add 20+ tools; a Linear server, 50+. Most of them are irrelevant to any given task.

That cost compounds against CC Commander's **workflow-first** doctrine: the lead session is a control plane and should stay slim (`commander/cowork-plugin/rules/workflow-first.md`). A bloated tool surface is the same anti-pattern as dumping raw file contents into the lead context — noise that crowds out reasoning.

---

## How tool search works

Two pieces work together:

1. **`ENABLE_TOOL_SEARCH`** — the harness flag that switches tools from *eager* to *deferred*. When set, most tool schemas are **not** loaded at session start. Instead, the session sees a lightweight list of tool *names* only.
2. **`ToolSearch`** — the one tool that *is* always loaded. It takes a query, matches it against the deferred tool list, and returns the full JSON schemas for the matched tools. Once a tool's schema is fetched, it is callable exactly like any eagerly-loaded tool.

```
session start
  └─ ToolSearch loaded (always)
  └─ deferred tools: names only, no schemas  ←  cheap
        │
        │  task needs Slack
        ▼
  ToolSearch("slack send")  →  returns slack_send_message schema
        │
        ▼
  slack_send_message(...)   →  now callable
```

### Query forms

| Form | Example | Use when |
|------|---------|----------|
| Direct select | `select:Read,Edit,Grep` | You know the exact tool names |
| Keyword search | `slack send message` | You know the capability, not the name |
| Scoped search | `+slack send` | Require `slack` in the name, rank the rest |

Load in **bulk**, not one-by-one. For a whole toolkit (e.g. all computer-use tools), a single keyword query returns every match — far cheaper than one `select:` round-trip per tool.

---

## The three tool-loading postures

Tool search introduces a tier model that mirrors `skills/_tiers.json`. Choose the posture that matches the session's scope:

| Posture | `ENABLE_TOOL_SEARCH` | Tool surface at start | Best for |
|---------|----------------------|-----------------------|----------|
| **Eager** | off | All schemas loaded | Few tools; short sessions where every tool is likely used |
| **Deferred** (recommended) | on | Names only + `ToolSearch` | Many connectors; long sessions; workflow-first lead contexts |
| **Pinned + deferred** | on | A small allowlist eager, the rest deferred | You always use 3-4 tools but occasionally reach for the long tail |

**Recommended default for CC Commander sessions: Deferred.** With 16 opt-in MCP connectors available via `/ccc-connect`, eager loading is rarely justified.

---

## Relationship to tiered skill loading

CC Commander already tiers *skills* via `skills/_tiers.json` — `essential` (~37) → `recommended` (~60) → `domain` (11 routers) → `full` (500+). Tool search applies the same principle one layer down:

| Layer | What tiers | Mechanism | Config |
|-------|-----------|-----------|--------|
| **Skills** | Which instructions/SKILL.md files install | install tier | `skills/_tiers.json` |
| **Tools** | Which tool schemas load into context | deferred loading | `ENABLE_TOOL_SEARCH` + `ToolSearch` |

Both answer the same question — *"load only what this task needs"* — at different altitudes. A lean install (skill tier) plus deferred tools (tool search) compounds: the lead context starts small and stays small.

---

## Why this serves workflow-first

The workflow-first doctrine keeps the lead session as a **control plane** — decisions and delegations, not raw doing. Tool search reinforces that:

- **Slim lead context.** Deferred tools mean the lead session is not pre-loaded with schemas for tools it may never call.
- **Subagents pull their own tools.** A delegated agent can `ToolSearch` for exactly the tools its slice needs, keeping the lead context unaware of that tool surface entirely.
- **On-demand, not just-in-case.** Loading a schema is a deliberate act tied to a task — the same discipline as referencing code by `path:line` instead of re-reading whole files.

The net effect: more of the context budget is spent on reasoning, less on tool inventory.

---

## Modeled on Hermes Tool Search

The pattern originates in **Hermes Tool Search** — OpenClaw's approach to keeping agents with large tool catalogs context-efficient. Hermes agents can be bound to dozens of channels and connectors; loading every tool eagerly would dominate their context. Hermes instead defers tool schemas and resolves them on demand at call time. CC Commander adopts the same mechanism for Claude Code sessions: a single always-on search tool, a deferred catalog, and bulk-load queries.

---

## Quick reference

```bash
# Enable deferred tool loading for a session
export ENABLE_TOOL_SEARCH=1

# Inside the session, load tool schemas on demand:
#   ToolSearch("select:Read,Edit,Grep")   ← exact names
#   ToolSearch("slack send message")       ← by capability
#   ToolSearch("+linear issue")            ← scoped + ranked
```

---

**Bottom line:** tool search is the tool-layer twin of tiered skill loading. Defer by default, load in bulk on demand, and keep the lead context spent on thinking — not on tool schemas it will never call.
