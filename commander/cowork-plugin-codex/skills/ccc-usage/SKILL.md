---
name: ccc-usage
description: "Usage and cost deck: estimated savings from routing to cheaper models, cost per day and cost by app, narrated here or published as a private snapshot page after consent. Use when the user asks what agent work costs, how much was saved, or types $ccc-usage."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - Artifact
argument-hint: "[status | open | snapshot]"
model: sonnet
effort: low
disable-model-invocation: true
---

# $ccc-usage — what the work cost

**CC Commander** · $ccc-usage · estimated savings, spend per day and spend per app from local logs.

Sources: `<config dir>/commander/savings.json` (`~/.claude/commander/savings.json` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) (estimated savings versus an all-Opus baseline) and `<config dir>/commander/mission-control/metrics.jsonl` (cost per app per day). These are estimates from per-model rates, not a bill; say so whenever you quote a number.

## When to use / when not to

- Use for "what did this cost?", "how much did delegation save?", or a shareable cost page.
- Use `$ccc-console usage` for the same tab inline beside the other tabs. For an actual bill, use the provider's billing page; this deck only estimates.

## What happens

### 1. Pick the output

With no argument, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Plain-English status — the headline numbers here, nothing leaves the machine
- Publish the deck — a private claude.ai page; asks before uploading
- Show it inline — runs `$ccc-console usage`

`status` goes to step 2. `open` or `snapshot` goes to step 3.

If `savings.json` and `metrics.jsonl` are both missing or empty, say "No cost data logged yet. Run some agents (`$ccc-fleet`, `$ccc-spawn`) and this deck fills in." and stop. That is not an error.

### 2. Plain-English status

```bash
node --input-type=module -e "
const { readUsageModel } = await import('${CLAUDE_PLUGIN_ROOT}/lib/usage-snapshot.js');
const m = await readUsageModel({});
console.log(JSON.stringify({ saved: m.totalSavedUsd, dispatches: m.totalDispatches, byApp: m.costByApp }));
"
```

Narrate it in two sentences: "You saved about $X by letting cheaper models do N jobs. Most of the spend is <app>." Call the figures estimates.

### 3. Publish the deck (consent-gated)

1. First publish this session: ask with AskUserQuestion.
   - Question: "Publish the Usage & Cost deck as a private claude.ai page? Dollar estimates, the per-app split and dates leave this machine."
   - 🟢 Publish — create or update the private page
   - Narrate here instead — nothing uploads
   - Cancel
   Publish only on an explicit yes. Running `$ccc-usage` again later in this session is the refresh consent.
2. Build the Usage tab of the console onto this deck's fixed path:
   ```bash
   mkdir -p "<scratchpad>"
   if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
     node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
       --surface artifact --tab usage --out <scratchpad>/ccc-usage-live.html
   else
     node commander/cowork-plugin/scripts/build-console.mjs \
       --surface artifact --tab usage --out <scratchpad>/ccc-usage-live.html
   fi
   ```
   Exit 0 and `build-console: wrote …` on stderr mean the page is ready. The page carries the Commander decks strip and a line pointing to `$ccc-console`.
3. Publish with the Artifact tool:
   - Already published from this path in this session: publish the same `file_path`; omit `icon`.
   - Otherwise: `action: "list"`, find "Commander Usage & Cost", `action: "read"` its `url`, then publish `file_path` with that `url`. If none exists, publish `file_path` with `icon: "chart"` and `description: "Estimated agent spend, savings from model routing, and cost by app."`.
   - On Codex or without the Artifact tool: give the user the HTML file path.
4. Reply with the page title, the URL, and the headline "$X saved across N dispatches (estimate)".

## Done when

- Status: the numbers you narrated came from the step 2 command output in this turn.
- Publish: the build exited 0 and the Artifact tool returned a URL, which you reported.

## Guardrails

- Never publish without the step 3 consent, and never on a schedule or as a side effect.
- Never present the figures as billing.
- Keep the path `<scratchpad>/ccc-usage-live.html`; a new path is a new URL.
- The published page is a snapshot: it changes only when republished and cannot send prompts into the session.

## See also

- `$ccc-console` — this tab inline, with the prompt bar
- `$ccc-safety` — what the hooks blocked
- `$ccc-mission-control` — who is working on what

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
