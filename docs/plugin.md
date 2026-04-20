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

1. **Type `/ccc`** — the main hub. Click **Build** or **Review** based on what your context strip suggests.
2. **Type `/ccc-start`** — first-run onboarding. Detects your project, introduces the 15 agent personas, writes a starter plan file.
3. **Type `/ccc-browse`** — visual catalog of everything the plugin ships. Great for discovery.
4. **Type `/ccc-plan "build a REST API with Stripe billing"`** — spec interview cascades, produces a plan file.
5. **Type `/ccc-review`** — audit your current branch in the background.

Every click maps to a native AskUserQuestion chip picker. No typing numbers, no memorizing syntax.

---

## The 12 workflow commands

| Command | Primary action | When to use |
|---|---|---|
| `/ccc` | Main hub — 6 intent tiles | Starting a session, unsure where to begin |
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
| `/ccc-fleet` | Multi-agent orchestration | Parallel work, FOR/AGAINST review, fan-out |
| `/ccc-connect` | Opt-in MCP connector | Adding Notion/Zapier/Supabase/Slack/GDrive/Figma |

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
