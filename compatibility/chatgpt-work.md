# ChatGPT Work / Codex Quick Setup

Hands-on setup for using CC Commander from OpenAI surfaces: ChatGPT Work (desktop/web),
Codex CLI, and the IDE extension. Full compat matrix + tracked gaps:
`docs/compat/chatgpt-work.md`.

## 1. Install the plugin locally (Codex CLI + ChatGPT desktop)

This repo ships a local plugin marketplace at `.agents/plugins/marketplace.json`:

```bash
git clone https://github.com/KevinZai/commander
codex plugin marketplace add commander
# pick "commander" in the plugin picker; ChatGPT desktop: restart the app to load it
```

The installed plugin is the codex mirror (`commander/cowork-plugin-codex/`):
72 skills (byte-identical to the Claude tree), 22 TOML agent personas, the
Codex-supported hook subset, and 2 credential-free MCP servers.

## 2. Cherry-pick skills (no plugin)

Skills follow the Agent Skills open standard (`SKILL.md`) and load from `.agents/skills`:

```bash
# user-level — every project
mkdir -p ~/.agents/skills
cp -r commander/cowork-plugin-codex/skills/ccc-plan ~/.agents/skills/ccc-plan

# repo-level — shared with your team
mkdir -p .agents/skills
cp -r commander/cowork-plugin-codex/skills/ccc-review .agents/skills/ccc-review
```

Invoke with `$ccc-plan` or via `/skills` in Codex; ChatGPT Work picks skills implicitly
by task match.

## 3. AGENTS.md

Codex/ChatGPT Work read `AGENTS.md` from the repo root down to your cwd (global:
`~/.codex/AGENTS.md`; 32 KiB combined default cap). The codex mirror ships a generated
`commander/cowork-plugin-codex/AGENTS.md`. For a CCC-adopted project:

```bash
# simplest: one source of truth
ln -s CLAUDE.md AGENTS.md
```

## 4. Local MCP skill bridge (Codex CLI)

CC Commander's local MCP server exposes the skill catalog as tools. Wire it into
`~/.codex/config.toml`:

```toml
[mcp_servers.commander]
command = "node"
args = ["/absolute/path/to/commander/commander/mcp-server/index.js"]
```

## 5. Hosted MCP as a ChatGPT Work connector — not yet

The hosted server (`https://mcp.commanderplugin.com`) still speaks `/v1` + SSE with a
static Bearer key. ChatGPT's connector flow requires a public streamable-HTTP `/mcp`
endpoint with OAuth. Tracked as gap **G2** in `docs/compat/chatgpt-work.md` — do not
attempt to add it via Developer mode yet.

## 6. Validate

```bash
node scripts/check-compat.js   # manifests, pointers, AGENTS.md size, marketplace paths
```
