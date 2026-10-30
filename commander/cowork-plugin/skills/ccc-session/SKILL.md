---
name: ccc-session
description: "Alias that routes session work to the canonical skills: save the current session with /ccc-save-session, or reload a saved one with /ccc-resume-session. Use when the user says resume session, continue where I left off, save this session, or types /ccc-session."
allowed-tools:
  - Bash
  - Skill
  - AskUserQuestion
argument-hint: "[resume | review | history | save | export]"
disable-model-invocation: true
---

# /ccc-session — save or resume, routed

**CC Commander** · /ccc-session · one picker, then the canonical session skill does the work.

This is an alias kept so `/ccc-session` and older references still resolve. It holds no session logic of its own: `/ccc-save-session` writes the handoff, `/ccc-resume-session` loads it.

On Codex, AskUserQuestion becomes a plain-text question and skills are invoked as `$ccc-save-session` / `$ccc-resume-session`.

## When to use / when not to

- Use when the user asks to save, resume, review or browse sessions without naming the exact skill.
- Use `/ccc-handoff` instead when context is large mid-task and work should continue in a fresh chat.

## What happens

1. Route by argument:
   - `save` or `export` → invoke the `ccc-save-session` skill.
   - `resume` or `review` → invoke the `ccc-resume-session` skill with no argument (most recent session).
   - `history` → step 2.
   - No argument → ask with AskUserQuestion:

     ```yaml
     question: "What do you want to do with this session?"
     header: "Session"
     multiSelect: false
     options:
       - label: "🟢 Resume the last session"
         description: "Load the most recent saved session and brief before any work."
       - label: "Save this session"
         description: "Write a dense reloadable summary of decisions, files, failures and the next step."
       - label: "Pick from history"
         description: "List recent saved sessions and choose one to load."
     ```

2. History: list recent saved sessions.

   ```bash
   ls -t ~/.claude/sessions/*.tmp 2>/dev/null | head -4
   ```

   Empty output → say "No saved sessions yet. Run /ccc-save-session at the end of a working session." and stop. Otherwise offer the files (up to four) in an AskUserQuestion picker, newest first with 🟢, and invoke `ccc-resume-session` with the chosen path.

## Done when

- The routed skill was invoked, or the history listing was empty and reported as such.

## Guardrails

- Never write, move or delete a session file here; the canonical skills own those files.
- Never summarize a session from memory; load it through `/ccc-resume-session`.

## See also

- `/ccc-save-session` — compress the current session into a reloadable file
- `/ccc-resume-session` — load a saved session and orient before working
- `/ccc-handoff` — hand off to a fresh chat before context degrades

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
