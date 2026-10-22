---
description: "Scan installed skills for principles that recur across them and propose them as rules, writing only what you approve. Use when skills repeat the same guidance or the rules directory has drifted from them."
---

# /ccc-rules-distill — turn repeated skill guidance into rules

**CC Commander** · /ccc-rules-distill · a reviewed list of cross-cutting principles, promoted into rule files you approve.

## What happens

1. Load the `rules-distill` skill with the Skill tool and follow its workflow. It is an opt-in skill, absent by default. If it is not listed in this session, say so and continue with steps 2 to 6, which are the minimal version of the same workflow.
2. Inventory the sources. List skill files and existing rules, and report which paths were found:

   ```bash
   ls -d ~/.claude/skills/*/SKILL.md .claude/skills/*/SKILL.md 2>/dev/null
   ls ~/.claude/rules .claude/rules 2>/dev/null
   ```

   If no skills are found, say so and stop.
3. Read each skill and extract principles: imperative guidance that is not specific to that skill's domain (for example "validate input at boundaries", "verify before reporting done").
4. Keep a principle only when it appears in two or more skills. For each, record the skills that state it (`path:line`) and whether an existing rule already covers it. Drop candidates an existing rule already states; link to that rule instead.
5. Present the candidates as a table: principle, source skills, proposed rule file, new or amend. Then ask with AskUserQuestion (Codex: a plain-text question):

   - 🟢 Write approved rules — add or amend only the rows the user keeps
   - Show the evidence — print the quoted lines for each candidate first
   - Save the report only — write nothing to the rules directory
   - Cancel — nothing is written

6. For each approved row, write or amend one rule file per topic (short, one topic, no restating another rule). Then verify: read each file back, and run `git diff --stat` when the rules live in a git repository. Report the files changed.

## Done when

Every proposed rule names at least two source skills, and every written rule file has been read back and listed in the report.

## Guardrails

- Never edit a skill file during distillation; this command only writes rules.
- Never write a rule the user did not approve in the picker.
- Never duplicate a rule that already exists; amend or link instead.

## See also

`/ccc-evolve` · `/ccc-skill-health` · `/ccc-skill-create`
