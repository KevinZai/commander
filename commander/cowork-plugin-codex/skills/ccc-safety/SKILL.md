---
name: ccc-safety
description: "Safety deck: what Commander's hooks caught for you — dangerous actions blocked, auto-fixes applied, and where your tools fail most. A self-contained artifact."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[open | status]"
---

# /ccc-safety — Safety

The guardrails deck. CC Commander's hooks already journal every permission decision (`~/.claude/commander/analytics/permission-gate.jsonl`) and every tool failure (`~/.claude/commander/tool-failures.jsonl`). This turns them into one page: how many dangerous actions got blocked, how many were auto-fixed, and which tools/errors trip you up most (a Sniffly-style breakdown).

> 🔒 Privacy: read locally. Publishing uploads the artifact (counts, tool names, redacted error signatures) to your private claude.ai artifact URL — private to your account, but it leaves the machine. Always ask before publishing; never publish automatically. Error text is redacted (sk-/Bearer/token patterns → [redacted]) before it ever reaches the page.

## How it routes

On `$ccc-safety` with no argument, open a click-first picker:

```
AskUserQuestion:
  question: "Safety — how do you want it?"
  options:
    - 🛰️ Publish the deck — a living Safety artifact: blocked actions, auto-fixes, failure hotspots
    - 🗣️ Plain-English status — narrate the headline numbers here, no jargon
```

`$ccc-safety open` (or `snapshot`) → publish the deck. `$ccc-safety status` → narrate.

**Zero-state:** if `permission-gate.jsonl` and `tool-failures.jsonl` are both missing/empty, say so plainly — "No guardrail activity logged yet — the hooks fill this in as you work." Never render an error for an empty deck.

### 🛰️ Publish the deck

**LIVING PATTERN:** always render to the SAME file path (`scratchpad/ccc-safety-live.html`), then republish that same path with the Artifact tool — same path, same URL, one living page.

Build the self-contained HTML with the plugin's own library:

```bash
mkdir -p scratchpad
node --input-type=module -e "
import { readSafetyModel, buildSafetyHtml } from '${CLAUDE_PLUGIN_ROOT}/lib/safety-snapshot.js';
import { writeFile } from 'node:fs/promises';
const now = Date.now();
const html = buildSafetyHtml(await readSafetyModel({ now }), { now });
await writeFile('scratchpad/ccc-safety-live.html', html);
console.log('wrote scratchpad/ccc-safety-live.html');
"
```

Then **ask before publishing**, and publish `scratchpad/ccc-safety-live.html` with the Artifact tool (favicon 🛡️). Republish the same path to the same URL if you've published it before. End with the artifact title + the headline: "blocked N dangerous actions, auto-fixed M."

### 🗣️ Plain-English status

Run `readSafetyModel({})` and read the decision counts + top failing tool, then narrate caveman-simple: "Commander stopped N risky actions and quietly fixed M. Your Bash commands fail most — usually timeouts." No jargon.

## The deck also links the others

The published artifact carries the shared **Commander decks** strip at the top — one click (copy) away from the Cockpit, Mission Control, and Usage & Cost decks. Users always know the other decks exist.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
