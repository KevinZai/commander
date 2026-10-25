---
name: ccc-prompt-fix
description: "Diagnose a prompt against the six prompt-quality patterns and return a tighter rewrite with the reason for each change, a 0-6 score, or the best matching prompt from the Commander prompt library. Use when the user asks to fix, sharpen, improve or score a prompt, or wants a prompt for a task."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[<your prompt> | last | for <task> | score <prompt>]"
disable-model-invocation: true
---

# /ccc-prompt-fix — a sharper prompt, with reasons

**CC Commander** · /ccc-prompt-fix · a rewrite that names each pattern it applied, so the next prompt is better without help.

Grounded in the Commander prompt library: `${CLAUDE_PLUGIN_ROOT}/lib/prompts-data/ccc-library.json` (`prompts[]` with `id`, `sdlc`, `cat`, `title`, `prompt`, `why`, `makeItStick`; `patterns[]`), compiled from `skills/claude-code-library/PROMPT-LIBRARY.md` and adapted from Anthropic's published Claude Code prompt library.

## When to use / when not to

- Use on demand to fix one prompt, score it, or find a library prompt for a task.
- Skip it when the prompt is already tight and the task is trivial; do not gold-plate a one-liner.
- The automatic per-turn nudge is the suggest engine's job (`/ccc-suggest`); this is the deliberate pass.
- To audit a whole instruction file (CLAUDE.md, a skill, an agent) for older-model prompting patterns, use `/doctor prompt-audit` or `/ccc-claudemd`.

## Modes

| Argument | Mode | Returns |
|---|---|---|
| `<your prompt>` | Fix | diagnosis + rewrite + reasons |
| `last` | Fix | the same, for the user's message immediately before this invocation, taken from the conversation; if there is none, ask the user to paste it |
| `for <task>` | Suggest | the best library prompt verbatim, its `why`, and its SDLC phase |
| `score <prompt>` | Score | the 0-6 tally and the single highest-leverage missing pattern |
| none | ask | the mode picker |

## The rubric — six patterns

Diagnose every prompt against these. Not every prompt needs all six; each absent one is a question to ask, not an automatic fix.

1. **Outcome, not steps** — says what, lets the model find how. ❌ "open X, change Y, then Z" ✅ "add rate limiting to the public API; keep existing tests green"
2. **A way to check its own work** — run, test, compare or verify, so it iterates instead of stopping when it looks done. ✅ "write the migration, run it against dev, confirm the schema matches"
3. **A reference to match** — names an existing file, test or pattern. ✅ "add a settings page following the profile page's layout"
4. **A measurable target** — metric and threshold, so done is unambiguous. ✅ "get the bundle under 200KB and show me what you cut"
5. **The artifact, pasted** — errors, logs, screenshots or `@file` instead of a description. ✅ "why is the build failing? @build.log"
6. **How to answer** — format, length, audience. ✅ "explain the retry logic as an HTML page with a diagram, then open it"

Once a prompt works, make it repeatable: save it as a skill, record the convention in CLAUDE.md, or enforce it with a hook. Say so when a prompt looks reusable.

## What happens

### Fix (and `last`)

1. Take the target prompt verbatim.
2. Mark each pattern ✅ present or ❌ absent, then judge which absent ones this task actually needs.
3. Rewrite to add only the load-bearing missing patterns. Keep the user's intent; if the rewrite is longer than about 1.5× the original, cut it back.
4. Where a pattern needs a fact the user did not give (a threshold, a reference file, an artifact), put a bracketed placeholder such as `[target p95 in ms]` and say so. Never invent the value.
5. Write one reason line per added pattern.
6. If the prompt looks reusable, ask the make-it-stick picker.

Output:

```
🔧 Prompt fix

Original:
  "<verbatim>"

Diagnosis (6 patterns):
  ✅ outcome  ❌ self-check  ✅ reference  ❌ measurable  ❌ artifact  ❌ format

Sharper:
  "<the rewrite>"

Why:
  + self-check: added "run the tests and confirm they pass" so it closes its own loop
  + measurable: pinned "[p95 target]" so done is unambiguous (fill in your number)
  💡 Reusable? Save it as a skill or record it in CLAUDE.md.
```

### Suggest (`for <task>`)

Rank the library by keyword overlap with the task:

```bash
LIB="${CLAUDE_PLUGIN_ROOT:-commander/cowork-plugin}/lib/prompts-data/ccc-library.json"
node -e '
const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const words=String(process.argv[2]||"").toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2);
const score=p=>{const h=[p.title,p.cat,p.sdlc,p.prompt,p.why].join(" ").toLowerCase();return words.filter(w=>h.includes(w)).length};
const top=d.prompts.map(p=>[score(p),p]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,3);
if(!top.length)console.log("NO-MATCH");
for(const [s,p] of top)console.log(JSON.stringify({score:s,id:p.id,sdlc:p.sdlc,cat:p.cat,title:p.title,prompt:p.prompt,why:p.why,makeItStick:p.makeItStick}));
' "$LIB" "TASK"
```

- A file-not-found error: say the library is not available in this install and fall back to writing a prompt from the rubric.
- `NO-MATCH`: write a prompt from the rubric and say no library prompt matched.
- Otherwise return the top match's `prompt` verbatim, its `why`, its `sdlc` phase and `makeItStick` note. Show the other two titles as alternatives. When the top two scores tie, ask which fits with a picker of the tied titles.

### Score (`score <prompt>`)

Return `Score: <n>/6`, the six ✅/❌ marks, and one line naming the highest-leverage missing pattern for this task. No rewrite.

### Make it stick

On **Save as a project skill**:

1. Propose a kebab-case slug and run `test -e ".claude/skills/<slug>" && echo EXISTS`. On `EXISTS`, ask for another slug.
2. Write `.claude/skills/<slug>/SKILL.md` with frontmatter `name: <slug>` and `description: "<one sentence>. Use when <trigger>."`, and the sharper prompt as the body. Where the task-specific part goes, write the platform's argument placeholder: a dollar sign followed by `ARGUMENTS` (spelled out here so it is not substituted while this skill loads).
3. Verify with `head -4 ".claude/skills/<slug>/SKILL.md"` and report the path and the `/<slug>` command.

On **Record in CLAUDE.md**, ask the user to type `/ccc-memory` (it is not invocable from here); it shows the change before writing.

## Decision points

Mode (no argument):

```
question: "What should I do with your prompt?"
header: "Prompt fix"
multiSelect: false
options:
  - label: "🟢 🔧 Fix a prompt"
    description: "Paste it; get a diagnosis, a sharper rewrite and the reason for each change."
  - label: "Fix my last prompt"
    description: "Uses the message you sent just before this one."
  - label: "Suggest a library prompt"
    description: "Describe the task; get the closest field-tested prompt and why it works."
  - label: "📊 Score a prompt"
    description: "0-6 on the patterns plus the one fix that matters most. No rewrite."
```

Make it stick (after a fix that looks reusable):

- 🟢 Done — use the sharper prompt now.
- Save as a project skill — writes `.claude/skills/<slug>/SKILL.md`, invoked as `/<slug>`.
- Record in CLAUDE.md — ask the user to type `/ccc-memory`.

## Done when

- Fix: the reply shows the verbatim original, all six marks, the rewrite, and one reason per added pattern; every unknown value is a visible placeholder.
- Suggest: the returned prompt is quoted from the command's output, not paraphrased.
- Save as skill: the `head -4` check printed the new frontmatter.

## Guardrails

- Never change what the user asked for; the rewrite only makes it checkable and precise.
- Never fabricate a target, file, metric or artifact. A made-up measurable target is worse than an absent one; use a placeholder and ask.
- Never write a file except the project skill the user picked, and never overwrite an existing skill directory.
- Codex: ask each picker as a plain-text question with the same options; `last` uses the previous user message in the thread.

## See also

- `/ccc-suggest` — automatic next-step nudges, including the vague-prompt hint
- `/ccc-claudemd` — audit CLAUDE.md against the codebase
- `/ccc-memory` — record a convention in CLAUDE.md
- `/ccc-agent-writing` — sharpen a spec or PR description instead of a prompt

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
