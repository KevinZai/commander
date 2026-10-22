---
name: ccc-doc-sync
description: "Sync skill, agent and hook-handler counts and the version string across Commander docs from contract.json and package.json, with a --check drift gate for CI. Use when counts or the version changed, after adding a skill, agent or handler, or when a doc-count check fails."
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[--check | --apply]"
model: sonnet
effort: low
---

# $ccc-doc-sync — One source for counts

**CC Commander** · $ccc-doc-sync · every count and version string in the docs matches the canonical sources

## When to use / when not to

- Use inside the Commander repository after a change to `commander/contract.json` (`plugin_skills`, `specialist_agents`, `hook_handlers`) or to `package.json` `version`, or when `npm run docs:sync:check` fails.
- Do not hand-edit counts in docs; add or fix a pattern in `patterns.json` instead.
- Not for prose drift in a project's CLAUDE.md; use `$ccc-claudemd`.
- The script resolves the project root four levels above its own directory, so it runs only from a Commander repository checkout, not from an installed plugin cache.

## How it works

| File | Role |
|---|---|
| `sync.js` | Runner: loads sources, applies patterns, prints drift, sets the exit code. Holds no counts. |
| `patterns.json` | Declarative per-file regex replacements (the contract). |
| `commander/contract.json` | Canonical `plugin_skills`, `specialist_agents`, `hook_handlers`. |
| `package.json` | Canonical `version`. |

Templates use `${plugin_skills}`, `${specialist_agents}`, `${hook_handlers}` and `${version}`; any other variable is an error. The run is idempotent: a second `--apply` changes nothing.

## What happens

1. **Confirm the repo root.** Run `git rev-parse --show-toplevel` and check that `commander/contract.json` and `commander/cowork-plugin/skills/ccc-doc-sync/sync.js` exist there. If not, stop and say the skill needs a Commander checkout.
2. **Show the canonical values.**
   ```bash
   node -p "const c=require('./commander/contract.json'),p=require('./package.json');JSON.stringify({plugin_skills:c.plugin_skills,specialist_agents:c.specialist_agents,hook_handlers:c.hook_handlers,version:p.version})"
   ```
3. **List covered files** (never quote a fixed list; read it):
   ```bash
   node -p "require('./commander/cowork-plugin/skills/ccc-doc-sync/patterns.json').patterns.map(p=>p.file).join('\n')"
   ```
4. **Check for drift.**
   ```bash
   node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check   # same as: npm run docs:sync:check
   ```
   Exit codes: `0` in sync, `1` drift found (file names printed), `2` regex or file error. On `2`, read the error, fix the pattern or missing path in `patterns.json`, and rerun; do not apply.
5. **Decide.** If `$ARGUMENTS` is `--check`, report the result and stop. If it is `--apply`, go to step 6. Otherwise, on drift, ask the picker below.
6. **Apply.**
   ```bash
   node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --apply   # same as: npm run docs:sync
   git diff --stat
   ```
   Review the diff: only numbers and version strings should change. If a replacement touched historical text (a dated changelog entry, an old version reference), revert that hunk with Edit and narrow the regex in `patterns.json`.
7. **Verify** with the commands in Done when.

## Decision points

On drift, ask with AskUserQuestion (in Codex, ask the same choices as a plain-text question):

- 🟢 **Apply the sync** — rewrite the drifted files from the canonical values, then show `git diff --stat`.
- **Show the drift only** — list stale files and stop; nothing is written.
- **Cancel** — do nothing.

## Adding a file

Edit `patterns.json` only; no code change:

```json
{
  "file": "path/to/new-file.md",
  "replacements": [
    { "regex": "(Some prefix\\s*)\\d+( skills)", "flags": "g", "template": "$1${plugin_skills}$2" }
  ]
}
```

Anchor every regex on surrounding words so it cannot match version history or unrelated numbers. Rerun step 4 to confirm the new entry parses and matches.

## Done when

- `node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check` exits `0`.
- The other doc-count gates also pass, because CI runs them separately: `node bin/doc-sync.js` and `node scripts/audit-counts.js --check`. Report each exit code; if one fails, its own message names the file to fix.
- `git diff --stat` shows only the files the sync touched.

## Guardrails

- Never writes without `--apply` or the 🟢 picker answer; `--check` is read-only.
- Never invents a count; values come only from `contract.json` and `package.json`.
- Never rewrites historical version references or changelog entries; narrow the pattern instead.
- Never commits, pushes or publishes; that needs separate authorization in the conversation.

## See also

- `$ccc-claudemd` — audit a CLAUDE.md against the real tree
- `$ccc-changelog` — summarize the latest release notes
- `$ccc-ship` — release pre-flight, which expects these gates green

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
