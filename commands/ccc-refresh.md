---
description: "Deprecated alias for /ccc-init: compare an existing CLAUDE.md with the Commander template and merge missing or updated sections after confirmation, preserving custom ones. Use /ccc-init instead; this alias runs the same refresh path."
---

# /ccc-refresh — deprecated alias for /ccc-init

**CC Commander** · /ccc-refresh · the CLAUDE.md refresh path of [`/ccc-init`](./ccc-init.md), kept for backward compatibility.

> ⚠️ Deprecated. Use [`/ccc-init`](./ccc-init.md), which detects whether to scaffold a new CLAUDE.md or refresh an existing one. Print this notice once, then run the steps below; the behavior matches the `/ccc-init` refresh path.

## When to use

- After upgrading Commander.
- When the `claude-md-staleness` hook reports that CLAUDE.md is missing, its template version is behind the installed Commander version, it has not changed in over 30 days, or key sections (Workflow, Core Principles) are missing.
- After `/ccc-makeover` on a project.

If CLAUDE.md does not exist, stop and point to `/ccc-init`, which scaffolds it.

## What happens

1. **Read the current file.** Use the project `CLAUDE.md` when present, otherwise `~/.claude/CLAUDE.md`; say which one. Extract the leading HTML version comment (if any), every H2 (`## `) header with its content, and the user's name from the H1 line.
2. **Read the template.** Read `CLAUDE.md.template` at the root of the Commander checkout the toolkit was installed from (the directory that also holds Commander's `package.json`). If it cannot be found, ask the user for its path in plain text and stop. Parse it into the same H2 structure, and read the installed Commander version from that `package.json`.
3. **Classify each section** (header match is case-insensitive):
   - **MATCH** — in both files. Compare content; when the template adds subsections or rules, mark it **UPDATE**.
   - **MISSING** — in the template only; mark it **ADD**.
   - **CUSTOM** — in the user's file only; mark it **KEEP** and never touch it.
4. **Present the merge plan:**

   ```text
   | Action | Section       | Reason                          |
   |--------|---------------|---------------------------------|
   | ADD    | <section>     | In template, missing from file  |
   | UPDATE | <section>     | <what the template adds>        |
   | KEEP   | <section>     | Custom (not in template)        |
   ```

5. **Decide.** Ask with AskUserQuestion (Codex: plain-text question):
   - 🟢 **Apply all** — add and update the listed sections; custom sections stay as they are.
   - **Show the diff first** — print each change as a diff block, then ask again.
   - **Cancel** — change nothing.
6. **Apply** after "Apply all":
   - Insert ADD sections with the marker `<!-- Added by CC Commander v<installed version> -->`.
   - Replace UPDATE sections with the template version, keeping any user lines the template lacks.
   - Keep the user's name; never replace it with a template placeholder.
   - Set the top comment to `<!-- CC Commander Template v<installed version> | Generated: <YYYY-MM-DD> -->` so the staleness hook can read it.
7. **Verify.** Re-read the file and confirm every planned ADD/UPDATE header is present and every KEEP section is byte-identical to before. Show `git diff --stat -- <file>` when the file is tracked.

## Done when

The re-read matches the approved plan and every custom section is unchanged, or the user cancelled and the file is untouched.

## Guardrails

- Write only after the "Apply all" answer, and only to the one CLAUDE.md named in step 1.
- Never delete or rewrite a CUSTOM section.
- Replace `<installed version>` with the value read from `package.json`; never hardcode one.

## See also

`/ccc-init` · `/ccc-makeover` · `/ccc-claudemd`
