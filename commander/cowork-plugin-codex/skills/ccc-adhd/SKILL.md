---
name: ccc-adhd
description: "Answer-first output: fix, then command, then file:line — context last. Based on ayghri/i-have-adhd (MIT). Toggle: $ccc-adhd [on | off | status]. Stacks with caveman."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[on | off | status]"
---

# $ccc-adhd — Answer-first output mode

Most output buries the fix under three paragraphs of throat-clearing. This mode inverts that: **the answer leads, the reasoning follows, and it stops when the answer is done.** Same information, reordered for a reader who wants to act, not read.

> This reorders **priority**, not tokens — it is not a compression mode. It complements `caveman` (which cuts tokens) rather than replacing it; see "Stacking with caveman" below.

## How it routes

| Argument | What happens |
|---|---|
| *(none)* | Show current state (on/off, stacked with caveman or not), then offer the 4-option picker below |
| `on` | Persist `{"adhd": true}` to `~/.claude/commander/output-mode.json`, confirm in one line |
| `off` | Persist `{"adhd": false}`, confirm in one line, return to normal shape immediately |
| `status` | Read and report the current state — no picker, no mutation |

### The picker (no argument)

```
question: "Answer-first output mode?"
header: "CC Commander — $ccc-adhd"
multiSelect: false
options:
  - label: "⚡ Turn on"
    description: "Every response leads with the fix. Great for beginners — the answer is always the first line."
    preview: "Writes {\"adhd\": true} to ~/.claude/commander/output-mode.json"
  - label: "⚡ + 🗿 On, stacked with caveman"
    description: "Answer-first ordering AND ~75% fewer output tokens. Reorder + compress."
    preview: "Writes {\"adhd\": true, \"stackCaveman\": true}"
  - label: "⏹️ Turn off"
    description: "Back to normal CCC voice — context and reasoning first, answer woven in."
    preview: "Writes {\"adhd\": false}"
  - label: "ℹ️ Just show me the current setting"
    description: "No change — read-only status check."
    preview: "Reads ~/.claude/commander/output-mode.json, reports state"
```

## The contract (what changes about every response)

While active, shape every response — not just this one — around these rules:

1. **Lead with the fix.** First line is the command, the file:line, or the one-sentence answer. Not scene-setting, not "let's look at your code." If the reader read only line one, they'd know what to do.
2. **Number multi-step work.** More than one step → a numbered list, one bounded action per step. Fold trivial steps into the one before rather than pad the count.
3. **End with one concrete next action.** Something doable in under two minutes. "Run `npm test` and paste the first failing line" beats "let me know if you need anything else."
4. **Suppress tangents.** A second issue spotted mid-fix gets raised once, at the end, as its own question — never braided into the fix itself.
5. **Restate state every turn.** Multi-step work: say what step you're on ("3 of 5 done: schema updated. Next: backfill.") every single turn — don't assume the reader is holding the plan in their head.
6. **Give concrete time estimates.** "About 15 minutes" beats "a bit of work." Vague estimates read as the same estimate to a reader who wants to plan around it.
7. **Make wins visible.** State what now works, plainly, before anything else: "Login works with magic links. Try `npm run dev`."
8. **Errors get stated matter-of-factly.** Cause, then fix. No "uh oh," no "there seems to be an issue."
9. **Cap lists at five.** Past five, split into do-now vs. later, or must vs. nice-to-have.
10. **No preamble, no recap, no sign-off.** No "Great question," no "I've now done X, Y, and Z," no "Hope this helps." Start with the answer, stop when it's done.

**Exceptions — the shape yields to the task, never the other way:**
- User asks to "explain" or "walk me through" → explain in full, still no preamble/closer, headers so they can skim.
- A destructive action is queued (force push, `rm -rf`, migration) → confirm before acting. Safety outranks brevity.
- Three straight turns of "still broken" → stop iterating, name the assumption that might be wrong, ask one diagnostic question instead of another guess.
- Real ambiguity in the request → one short clarifying question beats a confident wrong guess.
- "What are my options" style requests → the options ARE the answer; give 2-4 ranked with the recommendation first, not a single forced path.
- CCC's own harness requirements (tool-call announcements, `AskUserQuestion` pickers, plan-mode artifacts) always win over the shape — the constraint stays, the ordering principle stays, but never at the cost of breaking the harness contract.

## Stacking with caveman

`$ccc-adhd` and `/caveman` answer different questions and compose cleanly:

- **`$ccc-adhd`** — *what comes first.* Reorders: answer → command → file:line → context last.
- **`caveman`** — *how many words it takes to say it.* Compresses prose ~65-75%, technical content untouched.

Turn both on and you get the fix on line one, in as few words as it takes. Turn on `$ccc-adhd` alone and the ordering changes but sentences stay full CCC voice. The picker's second option (`⚡ + 🗿`) sets both flags in one step; you can also run `$ccc-adhd on` then `/caveman` separately.

## State persistence

Same pattern as `$ccc-console`'s `console.json` — a small JSON file under `~/.claude/commander/`, read at the top of a response and written only on an explicit toggle.

**Read:**
```bash
cat ~/.claude/commander/output-mode.json 2>/dev/null || echo '{}'
```

**Write (`on`, optionally with `stackCaveman`):**
```bash
node -e "
  const fs=require('fs'); const os=require('os');
  const dir=os.homedir()+'/.claude/commander';
  const p=dir+'/output-mode.json';
  let s={}; try{s=JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){}
  s.adhd=true;
  s.updatedAt=new Date().toISOString();
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(p,JSON.stringify(s,null,2));
  console.log('adhd mode: on' + (s.stackCaveman ? ' (stacked with caveman)' : ''));
"
```

**Write (`off`):** same shape, `s.adhd=false` — preserve any other keys already in the file (never overwrite the whole object).

**Default is OFF.** Unlike `console.json`'s auto-open (safe to default on — it only reads local logs), a missing or malformed `output-mode.json` must resolve to normal CCC voice. This mode changes the shape of every response; it must be an explicit opt-in, never a silent default.

Turning it off, any of these:
- `$ccc-adhd off`
- The picker's "Turn off" option
- Saying "stop adhd mode" or "normal mode" in conversation — honor it immediately for the rest of the session even before the state file catches up, then persist the change

## When to toggle it on

- You want the fix first, every time, without asking for it — this is the default worth reaching for if you find yourself scrolling past preamble to find the command.
- Pairing with a junior teammate or in a fast debugging loop where "what do I run right now" matters more than the narrative.
- Any session where `caveman` already feels good but responses still open with three sentences before the actual command.

## When to leave it off

- Architecture discussions, design reviews, or anything where the reasoning IS the deliverable (the "explain" exception already covers this mid-session, but if that's most of what you're doing, don't toggle on in the first place).
- Onboarding or first-time walkthroughs where a beginner needs the "why," not just the "what."

## Anti-patterns — DO NOT

- ❌ Treat this as a compression mode — it reorders, it does not shrink. Token savings come from stacking `caveman`, not from this skill alone.
- ❌ Silently default to on for a fresh install — `output-mode.json` missing means normal voice, full stop.
- ❌ Apply the rules to code blocks, commit messages, or PR descriptions — the contract governs conversational prose only, same carve-out `caveman` uses.
- ❌ Skip the destructive-action and debug-spiral exceptions to "stay on-brand" — safety and correctness outrank the shape every time.

## Attribution

Based on [i-have-adhd](https://github.com/ayghri/i-have-adhd) by Ayghri, MIT license. The ten-rule contract above adapts that project's ADHD-friendly output shape into CC Commander's own voice; upstream credits *The Adult ADHD Tool Kit* by J. Russell Ramsay and Anthony L. Rostain as its own inspiration, adapted for how an LLM responds rather than how a person plans a day.

## Related

- `/caveman` — token compression (stacks with this skill; see "Stacking with caveman" above)
- `$ccc-console off` / `on` — the sibling state-file toggle pattern this skill's persistence copies
- `skills/mode-switcher` — `adhd` is listed there as one of the 11 workflow modes

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
