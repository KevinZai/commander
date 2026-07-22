---
name: ccc-prompt-fix
description: "Fix and sharpen a prompt. Diagnoses it against the 6 prompt-quality patterns, returns a tightened rewrite with the reasoning, and suggests the right library prompt for your task."
allowed-tools:
  - Read
  - AskUserQuestion
argument-hint: "[<your prompt> | last | for <task> | score <prompt>]"
---

# /ccc-prompt-fix — Auto Prompt Fixer

Take a rough prompt and hand back a sharper one — with the *why*, so you learn the pattern instead of just copying the fix. Grounded in the **Claude Code prompt library** (`skills/claude-code-library/`): 52 field-tested prompts + the 6 patterns behind all of them.

> **This is a coach, not a black box.** Every rewrite names which pattern it applied, so the next prompt you write yourself is already better.

## Modes

| You type | It does |
|----------|---------|
| `$ccc-prompt-fix <your prompt>` | **Fix** — diagnose + rewrite that prompt |
| `$ccc-prompt-fix last` | Fix the **last prompt you sent** this session (read from the transcript) |
| `$ccc-prompt-fix for <task>` | **Suggest** — pull the best matching prompt from the library for that task |
| `$ccc-prompt-fix score <prompt>` | **Score** — rate 0–6 on the patterns, no rewrite (quick gut-check) |
| `$ccc-prompt-fix` (no args) | Ask (via AskUserQuestion) which of the above you want |

## The rubric — the 6 patterns (from the library)

Diagnose every prompt against these. A missing pattern is a fix opportunity; not every prompt needs all six, but each *absent* one is a question to ask.

1. **Outcome, not steps** — says *what*, lets Claude find the *how*. ❌ "open X, change Y, then Z" ✅ "add rate limiting to the public API; keep existing tests green"
2. **A way to check its own work** — includes run/test/compare/verify so it iterates instead of stopping at *looks done*. ✅ "write the migration, run it against dev, confirm the schema matches"
3. **A reference to match** — names an existing file/test/pattern. ✅ "add a settings page following the profile page's layout"
4. **A measurable target** — metric + threshold so "done" is unambiguous. ✅ "get the bundle under 200KB and show me what you cut"
5. **The artifact, pasted** — errors/logs/screenshots or `@file` instead of description. ✅ "why is the build failing? @build.log"
6. **How to answer** — format, length, audience. ✅ "explain the retry logic as an HTML page with a diagram, then open it"

**The through-line:** once a prompt works, make it *repeatable* — save it as a skill/`/command`, record it in CLAUDE.md, or enforce it with a hook. The fixer says so when a prompt looks reusable.

## How it works (the FIX flow)

1. **Read** the target prompt (arg, or the last user turn for `last`).
2. **Diagnose** — mark each of the 6 patterns present ✅ / absent ⬜. Absent ≠ always wrong — judge which ones this task actually needs.
3. **Rewrite** — produce a tightened version that adds the *load-bearing* missing patterns, without bloating (a fix that doubles the length isn't a fix).
4. **Explain** — one line per pattern you added, so the reasoning transfers.
5. **Offer to make it stick** — if the prompt is one you'll reuse, offer `$ccc-claudemd` (record the convention) or a `/command` skill.

## Output format

```
🔧 Prompt fix

Original:
  "<verbatim>"

Diagnosis (6 patterns):
  ✅ outcome  ⬜ self-check  ✅ reference  ⬜ measurable  ⬜ artifact  ⬜ format

Sharper:
  "<the rewrite>"

Why:
  + self-check: added "run the tests and confirm they pass" so it closes its own loop
  + measurable: pinned "p95 under 200ms" so "done" is unambiguous
  💡 Reusable? Save as a /command or record in CLAUDE.md (via /ccc-claudemd).
```

For **suggest** mode, return the matching library prompt verbatim + its *why it works* note (cite the SDLC phase). For **score** mode, return just the 0–6 tally + the single highest-leverage missing pattern.

## When NOT to use

- The prompt is already tight and the task is trivial — don't gold-plate a one-liner.
- You want the *automatic* nudge on every turn — that's the suggest engine's job; this is the on-demand deep pass.

## Grounding & honesty

- The rubric and catalog come from `skills/claude-code-library/` (adapted from Anthropic's published, copy-paste-intended Claude Code docs). If a rewrite is ever uncertain, show the diagnosis and *ask* rather than inventing a target the user didn't give — a fabricated "measurable target" is worse than an absent one (Pillar 4).
- Never silently change the user's intent. The rewrite preserves what they asked for; it only makes it *checkable and precise*.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
