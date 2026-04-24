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

## 🚦 Capture Recipe for the 4 remaining shots (Kevin at keyboard)

> Note: computer-use attempt on 2026-04-24 could not drive Desktop reliably — screenshot filter hid the app's windows despite access grant. These 4 need a human at the keyboard. Each takes ~60 seconds.

All shots: Desktop window full-frame, dark mode preferred, Cmd+Shift+4 then Space to capture just the window (macOS auto-crops to window bounds).

### 03-ccc-hub-menu.png (30 sec)
1. Open any Desktop chat session with CC Commander plugin active
2. Click in the input bar, type `/ccc` (don't press Enter)
3. Wait for AskUserQuestion chip picker to render with 6 intent chips (Plan/Build/Review/Ship/Learn/Fleet)
4. Cmd+Shift+4 → Space → click window → save as `03-ccc-hub-menu.png`
5. Press Escape in Desktop to dismiss the picker without firing

### 07-ccc-start-onboarding.png (30 sec, lowest-cost)
1. Open any Desktop chat session
2. Type `/ccc-start` and press Enter
3. Wait for ASCII CCC banner + onboarding prompt to render (~5 sec)
4. Cmd+Shift+4 → Space → click window → save as `07-ccc-start-onboarding.png`

### 05-ccc-plan-in-action.png (90 sec)
1. Open any Desktop chat session
2. Type `/ccc-plan add dark-mode toggle to marketing site` and press Enter
3. Answer the 3-5 spec interview questions with quick one-word answers
4. Wait until the right-side Plan pane populates with the generated plan file
5. Cmd+Shift+4 → Space → click window → save as `05-ccc-plan-in-action.png` (make sure both chat and plan pane are visible)

### 06-ccc-fleet-parallel.png (90 sec, highest-cost)
1. Open any Desktop chat session
2. Type `/ccc-fleet audit this repo for dead code, unused deps, and stale docs` and press Enter
3. Wait for 3 background sub-agent chips to appear in the sidebar
4. Cmd+Shift+4 → Space → click window → save as `06-ccc-fleet-parallel.png`
5. Press Esc or cancel the agents if you don't want them to run to completion

## 📥 Save location

Drop the 4 PNGs into `docs/screenshots/` in the `festive-montalcini-794ab0` worktree, then:
```bash
cd /Users/ai/clawd/projects/cc-commander/.claude/worktrees/festive-montalcini-794ab0
git add docs/screenshots/0{3,5,6,7}-*.png docs/screenshots/STATUS.md
git commit -m "docs(screenshots): CC-413 complete — add remaining 4 scaffold shots"
git push origin claude/festive-montalcini-794ab0 && git push origin claude/festive-montalcini-794ab0:main
```

After all 7 land → README.md + BIBLE.md + mintlify docs can weave them in as Wave 7 of the Codex docs-sweep.
