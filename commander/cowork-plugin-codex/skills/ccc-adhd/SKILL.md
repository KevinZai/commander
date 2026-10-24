---
name: ccc-adhd
description: "Answer-first output: the fix, then command, then file:line, context last. Toggle on, off or status; stacks with caveman. Based on ayghri/i-have-adhd (MIT). Use when the user wants the answer first."
allowed-tools:
  - Read
  - Write
  - Bash
  - Skill
  - AskUserQuestion
argument-hint: "[on | off | status]"
model: haiku
effort: low
---

# $ccc-adhd — answer-first output mode

**CC Commander** · $ccc-adhd · every response leads with the answer, follows with the reasoning, and stops when the answer is done.

This reorders priority; it does not compress tokens. For fewer words, stack it with caveman mode (see "Stacking with caveman").

## When to use / when not to

- Turn it on when the user keeps scrolling past preamble to find the command, in fast debugging loops, or when pairing with someone who needs "what do I run right now".
- Leave it off for architecture discussions, design reviews, or first-time walkthroughs where the reasoning is the deliverable.

## What happens

### 1. Route the argument

| `$ARGUMENTS` | Action |
|---|---|
| empty | Read the state (step 2), report it in one line, then show the picker (step 3) |
| `on` | Write `on` (step 4), confirm in one line, apply the contract from the next sentence |
| `off` | Write `off` (step 4), confirm in one line, return to the normal shape immediately |
| `status` | Read and report the state (step 2); no picker, no write |

### 2. Read the state

The state file is `<config dir>/commander/output-mode.json` (`~/.claude/commander/output-mode.json` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`). Until the lane has its own copy, read the `~/.claude/commander/` copy; writes go to the lane.

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"; F="$CCC_STATE/output-mode.json"; [ -e "$F" ] || F="$HOME/.claude/commander/output-mode.json"
cat "$F" 2>/dev/null || echo '{}'
```

Report `adhd` (true/false) and `stackCaveman`. Default is OFF: a missing, empty or malformed file means normal Commander voice.

### 3. The picker (no argument)

Ask with AskUserQuestion (Codex: ask the same question in plain text):

```
question: "Answer-first output mode?"
header: "Output mode"
multiSelect: false
options:
  - label: "🟢 Turn on"
    description: "Every response leads with the fix; the answer is always the first line."
    preview: "Writes {\"adhd\": true} to <config dir>/commander/output-mode.json"
  - label: "🎯 On, stacked with caveman"
    description: "Answer-first ordering and far fewer output words: reorder plus compress."
    preview: "Writes {\"adhd\": true, \"stackCaveman\": true}"
  - label: "Turn off"
    description: "Back to the normal voice: context and reasoning first, answer woven in."
    preview: "Writes {\"adhd\": false}"
  - label: "Show the current setting"
    description: "No change; read-only status check."
    preview: "Reads <config dir>/commander/output-mode.json"
```

Map the picks to step 4 modes `on`, `stack`, `off`, or step 2.

### 4. Write the state

Merge into the file; never replace it, and stop on a parse error rather than overwriting. Pass `on`, `stack` or `off`:

```bash
node -e 'const fs=require("fs"),path=require("path"),os=require("os");const m=process.argv[1];if(!["on","stack","off"].includes(m)){console.error("usage: on|stack|off");process.exit(2)}const dir=path.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),".claude"),"commander"),p=path.join(dir,"output-mode.json"),legacy=path.join(os.homedir(),".claude","commander","output-mode.json");let s={};try{s=JSON.parse(fs.readFileSync(fs.existsSync(p)?p:legacy,"utf8"))}catch(e){if(e.code!=="ENOENT"){console.error("output-mode.json is unreadable ("+e.message+"); not overwriting it");process.exit(1)}}if(typeof s!=="object"||s===null||Array.isArray(s)){console.error("output-mode.json is not a JSON object; not overwriting it");process.exit(1)}s.adhd=m!=="off";s.stackCaveman=m==="stack";s.updatedAt=new Date().toISOString();fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(p,JSON.stringify(s,null,2)+"\n");console.log("adhd mode: "+(s.adhd?"on":"off")+(s.stackCaveman?" (stacked with caveman)":""))' on
```

For `stack`, also apply caveman mode for the session (invoke `/caveman` if it is installed; otherwise compress prose yourself and say caveman is not installed). On a non-zero exit, report the error verbatim and do not claim the mode changed.

The user can also turn it off with `$ccc-adhd off`, the picker's "Turn off", or by saying "stop adhd mode" or "normal mode". Honor that immediately for the rest of the session, then persist it with `off`.

## The contract (every response while on)

1. **Lead with the fix.** The first line is the command, the file:line, or the one-sentence answer. Someone who reads only line one knows what to do.
2. **Number multi-step work.** One bounded action per step; fold trivial steps into the previous one.
3. **End with one concrete next action** doable in under two minutes ("Run `npm test` and paste the first failing line").
4. **Suppress tangents.** A second issue spotted mid-fix is raised once, at the end, as its own question.
5. **Restate state every turn** during multi-step work ("3 of 5 done: schema updated. Next: backfill.").
6. **Give concrete time estimates** ("about 15 minutes", not "a bit of work").
7. **Make wins visible first** ("Login works with magic links. Try `npm run dev`.").
8. **State errors matter-of-factly:** cause, then fix.
9. **Cap lists at five.** Past five, split into do-now and later.
10. **No preamble, no recap, no sign-off.** Start with the answer; stop when it is done.

Exceptions, where the shape yields to the task:

- "Explain" or "walk me through" → explain in full, still without preamble or closer, with headers to skim.
- A destructive action is queued (force push, recursive delete, migration) → confirm before acting. Safety outranks brevity.
- Three straight turns of "still broken" → stop iterating, name the assumption that might be wrong, and ask one diagnostic question.
- Real ambiguity → one short clarifying question beats a confident wrong guess.
- "What are my options" → the options are the answer: 2–4 ranked, recommendation first.
- Harness requirements (AskUserQuestion pickers, plan-mode output, tool-call conventions) always win over the shape.

The contract governs conversational prose only, not code blocks, commit messages or PR descriptions.

## Stacking with caveman

- `$ccc-adhd` decides what comes first: answer → command → file:line → context.
- caveman decides how many words it takes: compressed prose, technical content untouched.

Both on gives the fix on line one in as few words as it takes. `$ccc-adhd` alone changes the order but keeps full sentences. The picker's stacked option sets both; `$ccc-adhd on` followed by `/caveman` does the same in two steps.

## Done when

- `on` / `off` / `stack`: the step 4 command printed `adhd mode: on`, `adhd mode: off` or `adhd mode: on (stacked with caveman)`; report that line.
- `status`: the step 2 output is what you reported.
- The next response (for `on`) visibly leads with the answer.

## Guardrails

- Default is off; never enable it silently on a fresh install.
- Never overwrite `output-mode.json` wholesale or delete it; merge the `adhd`, `stackCaveman` and `updatedAt` keys only.
- Never skip the destructive-action or debug-spiral exceptions to stay on-shape.
- Never treat this as compression; token savings come from stacking caveman.

## See also

- `$ccc-console` — the sibling state-file toggle this persistence pattern copies.
- `$ccc-start` — offers this mode during onboarding.
- `$ccc-settings` — other Commander preferences.

The toolkit's `mode-switcher` skill lists `adhd` among its workflow modes.

## Attribution

Based on [i-have-adhd](https://github.com/ayghri/i-have-adhd) by Ayghri, MIT license. The ten-rule contract adapts that project's ADHD-friendly output shape into Commander's voice; upstream credits *The Adult ADHD Tool Kit* by J. Russell Ramsay and Anthony L. Rostain as its inspiration, adapted for how an LLM responds rather than how a person plans a day.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
