---
name: ccc-safety
description: "Safety deck: dangerous actions Commander's hooks blocked, auto-fixes applied, and the tools that fail most, narrated here or published as a private snapshot page after consent. Use when the user asks what the guardrails caught, why tools fail, or types $ccc-safety."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - Artifact
argument-hint: "[status | open | snapshot]"
model: sonnet
effort: low
---

# $ccc-safety — what the guardrails caught

**CC Commander** · $ccc-safety · blocked actions, auto-fixes and failure hotspots from local logs.

Sources: `<config dir>/commander/analytics/permission-gate.jsonl` (`~/.claude/commander/analytics/permission-gate.jsonl` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) (every permission decision) and `<config dir>/commander/tool-failures.jsonl` (every tool failure). Error text is redacted (`sk-`, `Bearer`, token patterns become `[redacted]`) before it reaches any output.

## When to use / when not to

- Use for "what did the hooks stop?", "why does Bash keep failing?", or a shareable guardrail page.
- Use `$ccc-console safety` for the same tab inline; `$ccc-doctor` when hooks seem not to be running at all.

## What happens

### 1. Pick the output

With no argument, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Plain-English status — the headline numbers here, nothing leaves the machine
- Publish the deck — a private claude.ai page; asks before uploading
- Show it inline — runs `$ccc-console safety`

`status` goes to step 2. `open` or `snapshot` goes to step 3.

If both logs are missing or empty, say "No guardrail activity logged yet. The hooks fill this in as you work." and stop. That is not an error.

### 2. Plain-English status

```bash
node --input-type=module -e "
const { readSafetyModel } = await import('${CLAUDE_PLUGIN_ROOT}/lib/safety-snapshot.js');
const m = await readSafetyModel({});
console.log(JSON.stringify({ decisions: m.decisions.counts, failures: m.toolFailures.total, byTool: m.toolFailures.byTool.slice(0, 3) }));
"
```

Narrate it in two sentences: "Commander stopped N risky actions and auto-fixed M. Bash fails most, usually on timeouts." Sum the `blocked` kinds for N and the `autofixed` kind for M.

### 3. Publish the deck (consent-gated)

1. First publish this session: ask with AskUserQuestion.
   - Question: "Publish the Safety deck as a private claude.ai page? Decision counts, tool names and redacted error signatures leave this machine."
   - 🟢 Publish — create or update the private page
   - Narrate here instead — nothing uploads
   - Cancel
   Publish only on an explicit yes. Running `$ccc-safety` again later in this session is the refresh consent.
2. Build the Safety tab of the console onto this deck's fixed path:
   ```bash
   mkdir -p "<scratchpad>"
   if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
     node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
       --surface artifact --tab safety --out <scratchpad>/ccc-safety-live.html
   else
     node commander/cowork-plugin/scripts/build-console.mjs \
       --surface artifact --tab safety --out <scratchpad>/ccc-safety-live.html
   fi
   ```
   Exit 0 and `build-console: wrote …` on stderr mean the page is ready. The page carries the Commander decks strip and a line pointing to `$ccc-console`.
3. Publish with the Artifact tool:
   - Already published from this path in this session: publish the same `file_path`; omit `icon`.
   - Otherwise: `action: "list"`, find "Commander Safety", `action: "read"` its `url`, then publish `file_path` with that `url`. If none exists, publish `file_path` with `icon: "shield"` and `description: "Actions Commander's hooks blocked or auto-fixed, and where tools fail most."`.
   - On Codex or without the Artifact tool: give the user the HTML file path.
4. Reply with the page title, the URL, and the headline "blocked N risky actions, auto-fixed M".

## Done when

- Status: the numbers you narrated came from the step 2 command output in this turn.
- Publish: the build exited 0 and the Artifact tool returned a URL, which you reported.

## Guardrails

- Never publish without the step 3 consent, and never on a schedule or as a side effect.
- Never quote unredacted error text; use the model's redacted samples only.
- Keep the path `<scratchpad>/ccc-safety-live.html`; a new path is a new URL.
- The published page is a snapshot: it changes only when republished and cannot send prompts into the session.
- On Codex, failure hotspots can be thin: they are fed by Claude-side hooks.

## See also

- `$ccc-console` — this tab inline, with the prompt bar
- `$ccc-usage` — what the work cost
- `$ccc-doctor` — verify the hooks are wired

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
