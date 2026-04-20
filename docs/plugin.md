# CC Commander — Desktop Plugin Install Guide

> **The recommended path.** Click-first, GUI-only, zero terminal required. For everyone using Claude Cowork Desktop or Claude Code Desktop.

**Version:** v4.0.0-beta.7 · **Target audience:** novices + developers using Anthropic's desktop clients.

---

## 30-second install

1. Open **Claude Cowork Desktop** or **Claude Code Desktop**
2. Go to **Settings → Plugin Marketplace**
3. Click **Add from GitHub** → enter **`KevinZai/commander`** → **Add**
4. Find the **`commander`** plugin card → click **Install**
5. **Cmd+Q** fully quit the app, then reopen (the autocomplete cache needs a fresh session to pick up the skills)
6. Type **`/ccc`** — you should see a visual chip picker with 6 options

**That's it.** 28 plugin skills, 15 specialist agents, 8 MCP servers, and 6 lifecycle hooks are now active. Zero config. Zero API keys. Free in beta.

---

## First 60 seconds — what to try

1. 🌟 **Type `/ccc-suggest`** — the **beginner headline**. Scans your project and recommends ONE starred next step with reasoning. Always safe. Always smart.
2. **Type `/ccc`** — the main hub. Click **Build** or **Review** based on what your context strip suggests.
3. **Type `/ccc-start`** — first-run onboarding. Detects your project, introduces the 15 agent personas, writes a starter plan file.
4. **Type `/ccc-cheatsheet`** — live Mermaid map of the whole plugin. Great orientation in one screen.
5. **Type `/ccc-browse`** — visual catalog of everything the plugin ships. Great for discovery.
6. **Type `/ccc-plan "build a REST API with Stripe billing"`** — spec interview cascades, produces a plan file.
7. **Type `/ccc-review`** — audit your current branch in the background.

Every click maps to a native AskUserQuestion chip picker. No typing numbers, no memorizing syntax.

---

## The 15 workflow commands

| Command | Primary action | When to use |
|---|---|---|
| `/ccc` | Main hub — 6 intent tiles | Starting a session, unsure where to begin |
| `/ccc-suggest` 🌟 | **Intelligence layer — recommends ONE starred next step** | Always safe to run. Opus-class reasoning picks the best move for your current state. |
| `/ccc-cheatsheet` | Live Mermaid map of the plugin | Want to see everything at a glance, filesystem-backed |
| `/ccc-start` | First-run onboarding + plan file | Brand new to the plugin, want a tour |
| `/ccc-browse` | Searchable catalog | Exploring what's available |
| `/ccc-plan` | Spec interview → plan file | Starting a new feature with unknowns |
| `/ccc-build` | Scaffold a project | Greenfield or new feature in existing repo |
| `/ccc-review` | Branch audit | Before opening a PR; after a big change |
| `/ccc-ship` | Pre-flight + deploy | About to release |
| `/ccc-design` | UI/UX workflow | Design critique, polish pass, Figma→code |
| `/ccc-learn` | Skill discovery | Looking for a specific skill across 11 domains |
| `/ccc-xray` | Project health scorecard | Onboarding to an existing repo; periodic health |
| `/ccc-linear` | Linear board integration | Managing issues without leaving Claude |
| `/ccc-fleet` | Multi-agent orchestration (git worktrees) | Parallel work, FOR/AGAINST review, fan-out |
| `/ccc-connect` | Opt-in MCP connector | Adding Notion/Zapier/Supabase/Slack/GDrive/Figma |

---

## What makes this different from other plugins

Every other Claude Code plugin solves one slice — memory, structured thinking, token savings, UI polish. CC Commander is the **guided PM layer that orchestrates all of them.** When another plugin is the right tool, `/ccc-suggest` names it.

- 🖱️ **Click-first UX, everywhere.** Every menu is a native `AskUserQuestion` chip picker. No typing. No numbered menus. No ASCII prompts. Works identically in Cowork Desktop, Code Desktop, and the CLI.
- 🧠 **`/ccc-suggest` kills info-paralysis.** Opus-class real-time recommendation. 3 reasoning tiers: strong signals → stack signals → user intent. Returns ONE starred move with plain-English reasoning + named 3rd-party plugins.
- 🧩 **15 plain `/ccc-*` workflows.** No `commander:` prefix. Skill-based architecture, 100% `claude plugin validate` pass.
- 🎭 **15 specialist agents with persona voices.** Each agent loads a role-specific voice layer — architect speaks in mermaid + tradeoffs, designer leads with screenshots + contrast ratios, debugger follows the four-phase Iron Law.
- 🔌 **8 core MCP servers pre-wired + 5 more opt-in.** Tavily, Context7, Firecrawl, Exa, GitHub, Figma, Playwright, claude-mem ship hot. `/ccc-connect` adds Notion / Zapier / Supabase / Slack / GDrive in one click.
- 🗺️ **`/ccc-cheatsheet` is filesystem-backed.** Live Mermaid diagram that reads the plugin on every invocation. Never drifts.
- 🔄 **Weekly vendor auto-sync.** 20 vendor submodules refresh via GitHub Actions — your ecosystem stays current without touching a config.
- 🌐 **One license, every client.** Cowork Desktop, Code Desktop, Code CLI, Cursor, Windsurf, Cline, Continue, Codex, mobile (hosted MCP).
- 🚁 **`/ccc-fleet` runs parallel git worktrees.** True isolation for fan-out, pipeline, FOR/AGAINST, and background modes.
- 🆓 **Free in beta.** No credit card. 1,000 hosted-MCP calls/month + one skippable survey per session.
- 🧬 **Plugin + CLI share a brain.** Same intelligence layer, same 502-skill catalog, same personas. Install either, get both.
- 🎯 **Plugins-name-plugins.** `/ccc-suggest` calls out `claude-mem`, `superpowers`, `caveman`, `impeccable`, `graphify`, `claude-reflect`, `repomix`, `claude-hud`, and others by name when they're the right tool. You learn the whole ecosystem through one install.
- 📖 **The Kevin Z Method ships with the plugin.** `BIBLE.md` — 7 rules, 200+ sources, 14 months of production methodology.
- 📚 **502+ skills across 11 CCC domains** — design (39), marketing (45), saas (21), devops (21), seo (20), testing (15), security (8), data (8), research (8), mobile (8), makeover (3).

---

## Updating (no uninstall needed)

When beta.8+ ships:

1. **Settings → Plugin Marketplace → commander-hub** (the marketplace, not the plugin)
2. Click **Refresh** / **Check for updates**
3. On the `commander` plugin card, click **Update**
4. **Cmd+Q** + reopen for the cache to refresh

If the Update button stays greyed at "On latest version" even though GitHub has a newer version:
- Remove the marketplace via GUI
- **Cmd+Q** + reopen
- Re-add `KevinZai/commander` → re-install

---

## Troubleshooting

### `/ccc` shows as `commander:ccc` in autocomplete

You have a stale version cached. beta.7+ ships `/ccc` as a plain slash skill (no `commander:` prefix). Update to beta.7+ via the GUI flow above.

### `/ccc` tooltip shows raw `<example>` XML tags

Stale install. beta.7 cleaned XML leakage from all ccc-* domain skills. Update.

### The "Update" button is greyed out

Cowork Desktop cached an older copy of `marketplace.json` on your machine. Remove + re-add the marketplace via GUI.

### "Failed to install plugin" error

You may have a legacy v1.x-era CLI install conflicting. Run the one-shot diagnostic + reset:

```bash
# Read-only diagnostic — tells you what's stale:
bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/diagnose-ccc-sources.sh)

# Preview the full clean (no writes):
bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/reset-commander-install.sh) --full --dry-run

# Apply the clean:
bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/reset-commander-install.sh) --full
```

Then Cmd+Q, reopen, re-install via GUI.

### I see two `commander` plugins in the marketplace

Legacy `ccc-marketplace` or `commander-marketplace` registration. The reset script above handles this.

---

## FAQ

**Q: How does CC Commander know what tool to recommend?**
A: `/ccc-suggest` runs three reasoning tiers in order. **Tier 1 — strong signals** reads hard state: open PRs, failing tests, dirty worktrees, mid-plan sessions, new Linear tickets, secrets in git. **Tier 2 — stack signals** detects your project shape from `package.json`, `Dockerfile`, `go.mod`, `.github/workflows/` and maps to the right CCC domain. **Tier 3 — user intent** pattern-matches your last 5 prompts against the 502-skill catalog and the 7-day trending window. The highest-priority hit wins — one starred move, with reasoning + named 3rd-party plugins as alternatives. When `claude-mem`, `superpowers`, `caveman`, `impeccable`, or `graphify` is the right tool, it says so by name. CC Commander doesn't hoard workflows — it's a guided PM that delegates.

**Q: Do I need to install the CLI (`npm install -g cc-commander`)?**
A: No. The plugin is self-contained. The CLI is a separate, power-user tool for terminal workflows. See [docs/cli.md](./cli.md) if you want it.

**Q: Does this work in Claude.ai web / iPad / mobile?**
A: Partial. The plugin's skills work in any Claude Code or Cowork session. The hosted MCP server makes most skills available in Claude.ai via a URL + license key (see [mintlify-docs/features/browse-modes.mdx](../mintlify-docs/features/browse-modes.mdx)).

**Q: What do the 15 specialist agents do?**
A: Each is a persona-driven Sonnet/Opus subagent — `architect`, `security-auditor`, `performance-engineer`, `designer`, `product-manager`, `content-strategist`, `data-analyst`, `technical-writer`, `devops-engineer`, `qa-engineer`, `reviewer`, `builder`, `researcher`, `debugger`, `fleet-worker`. CC Commander auto-routes to the right one based on your task. See `commander/cowork-plugin/rules/personas/` for voice details.

**Q: What's the business model?**
A: Free during beta with 1000 hosted-MCP calls/mo + mandatory feedback survey. Post-beta: Pro $15/mo unlimited + Commander Hub marketplace (80/20 creator rev-share).

**Q: MIT licensed?**
A: Yes. See [LICENSE](../LICENSE).

---

## Next

- Full skills catalog: [SKILLS-INDEX.md](../SKILLS-INDEX.md)
- Ecosystem + contribution protocol: [docs/ECOSYSTEM.md](./ECOSYSTEM.md)
- CLI install (power users): [docs/cli.md](./cli.md)
- The Kevin Z Method: [BIBLE.md](../BIBLE.md)
- CHANGELOG: [CHANGELOG.md](../CHANGELOG.md)
