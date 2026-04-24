# Screenshot Status — CC Commander v4.0 (Updated 2026-04-24)

Tracks which of the 7 scaffold slots are filled and which bonus shots landed beyond the scaffold.

## ✅ Scaffold (3 of 7 filled)

| Slot | File | Status | Notes |
|------|------|--------|-------|
| 01 | `01-install-marketplace.png` | ✅ | Add marketplace dialog, `kevinzai/commander` typed |
| 02 | `02-plugin-installed.png` | ✅ | Plugin page, Update toggle ON, v4.0.0-beta.11 |
| 03 | `03-ccc-hub-menu.png` | ❌ MISSING | Need `/ccc` with AskUserQuestion chip picker |
| 04 | `04-ccc-browse-catalog.png` | ✅ | Full 30-skill catalog grid |
| 05 | `05-ccc-plan-in-action.png` | ❌ MISSING | Need `/ccc-plan` with Plan pane visible |
| 06 | `06-ccc-fleet-parallel.png` | ❌ MISSING | Need `/ccc-fleet` with 3 background sub-agent chips |
| 07 | `07-ccc-start-onboarding.png` | ❌ MISSING | Need `/ccc-start` with ASCII CCC banner |

## 🎁 Bonus shots landed

| File | What | Use for |
|------|------|---------|
| `02b-plugin-installed-agents-view.png` | Plugin page, Agents tab highlighted | Alternate for 02 showing agents catalog entry point |
| `08-agents-catalog.png` | Full 17-agent grid with descriptions | README agent section + mintlify docs |
| `09-skill-detail-ccc-build.png` | `/ccc:build` skill detail page | Docs — how skills render in Desktop |
| `10-agent-detail-architect.png` | Architect agent detail page | Docs — agent persona rendering |
| `11-marketplace-code-tab.png` | Marketplace → Code tab with commander-hub visible | Install alternate-path docs |
| `12-personal-marketplace.png` | Marketplace → Personal tab with commander | Install alternate-path docs |
| `13-plugin-options-menu.png` | Plugin gear menu (Sync / Check for updates / Remove) | Update workflow docs |

## 🚦 Next steps

Capture the 4 missing scaffold shots:
- **03-ccc-hub-menu.png** — type `/ccc` in input bar, let chip picker appear, screenshot
- **05-ccc-plan-in-action.png** — run `/ccc-plan` with a dummy feature, let plan file render in Plan pane, screenshot both panes
- **06-ccc-fleet-parallel.png** — run `/ccc-fleet` with 3 agents, screenshot the sidebar with task chips visible
- **07-ccc-start-onboarding.png** — run `/ccc-start` on a fresh state, screenshot the ASCII banner

After all 7 land → README.md + BIBLE.md + mintlify docs can weave them in as Wave 7 of the Codex docs-sweep.
