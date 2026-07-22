---
name: ccc-usage
description: "Usage & Cost deck: what your agent work costs, and what delegating to cheaper models saved you. A self-contained artifact — burn, savings, cost by app."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[open | status]"
---

# /ccc-usage — Usage & Cost

The money deck. CC Commander already logs your model routing to `~/.claude/commander/` — `savings.json` (what delegating to cheaper models saved vs an all-Opus baseline) and `mission-control/metrics.jsonl` (cost per app per day). This turns those into one page: cumulative savings, saved/day + cost/day trends, and a cost-by-app split.

> 🔒 Privacy: the numbers are read locally. Publishing the artifact uploads it (dollar figures, per-app split, dates) to your private claude.ai artifact URL — private to your account, but it leaves the machine. Always ask before publishing; never publish automatically.

> ⚠️ Honesty: these are **estimates** (rough per-model rates vs an all-Opus baseline, not your actual bill). Say so on the page. Never present them as billing.

## How it routes

On `$ccc-usage` with no argument, open a click-first picker:

```
AskUserQuestion:
  question: "Usage & Cost — how do you want it?"
  options:
    - 🛰️ Publish the deck — a living Usage & Cost artifact you can keep beside your chat
    - 🗣️ Plain-English status — narrate the headline numbers here, no jargon
```

`$ccc-usage open` (or `snapshot`) → publish the deck. `$ccc-usage status` → narrate.

**Zero-state:** if `savings.json` and `metrics.jsonl` are both missing/empty, say so plainly — "No cost data logged yet — run some agents (`$ccc-fleet`, `$ccc-spawn`) and this deck fills in." Never render an error for an empty deck.

### 🛰️ Publish the deck

**LIVING PATTERN:** always render to the SAME file path (`scratchpad/ccc-usage-live.html`), then republish that same path with the Artifact tool — same path means same URL, so it updates one living page instead of a trail of copies.

Build the self-contained HTML with the plugin's own library (no server needed):

```bash
mkdir -p scratchpad
node --input-type=module -e "
import { readUsageModel, buildUsageHtml } from '${CLAUDE_PLUGIN_ROOT}/lib/usage-snapshot.js';
import { writeFile } from 'node:fs/promises';
const now = Date.now();
const html = buildUsageHtml(await readUsageModel({ now }), { now });
await writeFile('scratchpad/ccc-usage-live.html', html);
console.log('wrote scratchpad/ccc-usage-live.html');
"
```

**First publish this session** → ask before publishing ($ figures leave the machine for your private artifact URL). **Every later run of `$ccc-usage`** → invoking the skill again IS the refresh consent: republish the same file path to the same URL without re-asking. Publish `scratchpad/ccc-usage-live.html` with the Artifact tool (favicon 💰). End with the artifact title + the headline: "$X saved across N dispatches." To refresh later: run `$ccc-usage` again — same URL updates in place; viewers reload.

### 🗣️ Plain-English status

Run `readUsageModel({})` and read `model.totalSavedUsd` / `model.totalDispatches` / `model.costByApp`, then narrate caveman-simple: "You saved about $X by letting cheaper models do N jobs. Most of your spend is <app>." No jargon, no tables.

## The deck also links the others

The published artifact carries the shared **Commander decks** strip at the top — one click (copy) away from the Cockpit, Mission Control, and Safety decks. Users always know the other decks exist.

> **On Codex:** some panels may be empty on Codex today — Safety's failure hotspots, Mission Control's agent roster, and Usage's savings hero are fed from Claude-only hooks right now. A follow-up workstream wires the matching Codex telemetry.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
