---
name: ccc-changelog
description: "Summarize what changed in the latest CC Commander release, or a named version, from CHANGELOG.md in a short scan-friendly digest. Use when asking what's new, what changed, show the changelog, release notes, or after the SessionStart update nudge."
model: sonnet
effort: medium
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[version]"
---

# /ccc-changelog — What's new, briefly

**CC Commander** · /ccc-changelog · the latest release notes in thirty lines or fewer

## When to use / when not to

- Use when the user asks what changed, or after the SessionStart hook's version-transition nudge points here.
- Pass a version (`/ccc-changelog 8.0.0`) to summarize that release instead of the newest.
- Not for updating the plugin; use `/ccc-update`. Not for writing changelog entries; release tooling owns that.

## What happens

1. **Locate CHANGELOG.md.** Try, in order, and use the first that exists:
   1. Read `${CLAUDE_PLUGIN_ROOT}/../../CHANGELOG.md` (repository layout).
   2. Run `test -f "$(git rev-parse --show-toplevel 2>/dev/null)/CHANGELOG.md" && test -f "$(git rev-parse --show-toplevel)/commander/contract.json" && echo "$(git rev-parse --show-toplevel)/CHANGELOG.md"` (working inside a Commander checkout).
   3. Run `find "$HOME/.claude/plugins" -maxdepth 6 -name CHANGELOG.md -path "*commander*" 2>/dev/null | head -1` (installed plugin cache).

   If none is found, say: "CHANGELOG.md not found. Release notes are at https://commanderplugin.com." and stop.
2. **List release headers.** `grep -n '^## \[' <path> | head -20`. Each header looks like `## [<version>] — <date> — <headline>`.
3. **Pick the section.** With no argument, take the first header. With `$ARGUMENTS`, take the header that contains that version string; if none matches, ask the picker below. The section runs from its header up to, not including, the next `## [` header. Read only that line range.
4. **Render the digest** in exactly this shape:
   ```
   ## CC Commander [VERSION] — [DATE]

   **[Headline from the header if present, else the first sentence of the first paragraph]**

   [Changes grouped by the section's ### sub-headers]

   ---
   Full notes: CHANGELOG.md
   ```
   Grouping rules:
   - Keep each `###` sub-header (for example `### Security`, `### Tests`, `### New skills`) as a bold label.
   - Under each label, at most 5 bullets, each one fact in 15 words or fewer.
   - More than 5 items: append `…and N more — see CHANGELOG.md`.
   - Skip labels with no bullets left.
   - At most 30 lines below the header.
5. **Footer.** End with: ``Run `/ccc` to get started or `/ccc-browse` to explore every plugin skill.``

## Decision points

When the requested version has no section, ask with AskUserQuestion (in Codex, a plain-text question), using real headers from step 2:

- 🟢 **Latest release (`<first header version>`)** — summarize the newest section.
- **`<closest matching version>`** — summarize the nearest version string found (offer up to two).
- **Cancel** — stop without output.

## Done when

- The version and date in the digest header match the chosen `## [` line in CHANGELOG.md.
- The digest is 30 lines or fewer below its header and ends with the footer line.

## Guardrails

- Read-only: never edits CHANGELOG.md or any other file.
- Never dumps the raw file; always summarize.
- Never cuts a sentence mid-way; compress instead.
- Bullets only, no numbered lists, no sign-off line.
- Never invents changes that are not in the chosen section.

## See also

- `/ccc-update` — update Commander and see what changed between versions
- `/ccc-doctor` — check the install after an update
- `/ccc-browse` — explore the skills

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
