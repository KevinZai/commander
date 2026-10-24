---
name: ccc-yolo-setup
description: "Cut approval prompts safely: keep auto permission mode, add a vetted read-only allowlist plus secret deny rules, back up settings, and set bypassPermissions only with explicit consent. Use when the user says yolo setup, reduce prompts, fewer approvals, or skip permissions."
allowed-tools:
  - Read
  - Edit
  - Bash
  - AskUserQuestion
argument-hint: "[conservative | balanced | aggressive-safe | revert]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-yolo-setup — safe YOLO permissions

**CC Commander** · $ccc-yolo-setup · fewer prompts on safe operations, the auto-mode classifier on everything else, and a backup to roll back to.

Interactive Claude Code sessions start in **auto permission mode** when no mode is configured: a classifier approves routine actions and denies risky ones without a prompt. Safe-YOLO builds on that default. It adds a vetted allowlist of read-only and non-destructive commands, adds deny rules for secret files, and leaves risky work (writes outside scope, deletes, deploys, force-push, network mutations) to the classifier or a prompt. Plan mode stays available on request for risky changes.

## When to use / when not to

- Use when routine reads, git/gh reads or cloud describes keep prompting.
- Use `/fewer-permission-prompts` (built in) to mine the user's own transcripts for further safe entries.
- Do not use to approve writes, deletes, deploys or cloud mutations; those stay gated.
- `revert` jumps to [Reverse it](#reverse-it).

## What happens

### 1. Read the current state

```bash
for f in ~/.claude/settings.json .claude/settings.local.json .claude/settings.json; do
  [ -f "$f" ] && node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const p=s.permissions||{};console.log(process.argv[1]+": defaultMode="+(p.defaultMode||"unset (auto)")+" allow="+(p.allow||[]).length+" deny="+(p.deny||[]).length)' "$f"
done
```

Report each line. A parse error means the file is already invalid JSON: stop and show the error; do not write to it.

### 2. Pick a profile

Ask with AskUserQuestion (Codex: plain-text question):

```
question: "How much should safe-YOLO auto-approve?"
header: "Profile"
options:
  - label: "🟢 Balanced"
    description: "Reads, git/gh reads, read-only cloud describes, and this repo's test/lint/build scripts."
  - label: "Conservative"
    description: "Reads and git/gh read-only only. Everything else goes to auto mode or a prompt."
  - label: "Aggressive-safe"
    description: "Balanced plus file edits scoped to this repo. Still no deletes, deploys, force-push or network mutations."
```

Profile entries: [references/allowlists.md](references/allowlists.md).

### 3. Pick the scope

```
question: "Where should the rules apply?"
header: "Scope"
options:
  - label: "🟢 This project (.claude/settings.local.json)"
    description: "Only this repo; gitignored, so it does not ship to collaborators."
  - label: "Global (~/.claude/settings.json)"
    description: "Every project and Desktop. Suits a single-user workstation."
```

### 4. Back up, merge, validate

1. Back up the target (skip if it does not exist yet):
   ```bash
   f=<settings-file>; [ -f "$f" ] && cp "$f" "$f.backup-$(date +%Y%m%d-%H%M%S)" && ls "$f".backup-* | tail -1
   ```
2. Merge entries without removing any existing ones. Run once with `allow` and the profile's entries, and once with `deny` and the deny rules from the reference:
   ```bash
   node -e '
   const fs=require("fs"); const [file,key,...add]=process.argv.slice(1);
   const s=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{};
   s.permissions=s.permissions||{}; const set=new Set(s.permissions[key]||[]); const n=set.size;
   add.forEach(e=>set.add(e)); s.permissions[key]=[...set];
   fs.mkdirSync(require("path").dirname(file),{recursive:true});
   fs.writeFileSync(file,JSON.stringify(s,null,2)+"\n"); console.log(key+": +"+(set.size-n));
   ' <settings-file> allow 'Bash(git status:*)' 'Bash(git log:*)'
   ```
3. Leave `permissions.defaultMode` as it is. If it is set to something other than `auto` and the user wants fewer prompts, ask: 🟢 "Set it to auto" / "Keep it". Change it only on "Set it to auto".
4. Re-run step 1 and confirm the file parses and the counts rose by the reported amounts.

### 5. bypassPermissions — only with explicit consent

Offer this only when the user explicitly asks to skip all permission checks. Explain that `bypassPermissions` runs every tool call, including deletes and network writes, with no classifier and no prompt. Then ask:

```
question: "Turn off all permission checks for this project?"
header: "Bypass"
options:
  - label: "🟢 No, stay in auto mode"
    description: "Keeps the classifier and the allowlist. Recommended."
  - label: "Yes, this project only"
    description: "Sets permissions.defaultMode to bypassPermissions in .claude/settings.local.json. Use only in a disposable container or worktree."
```

On "Yes", back up and set `defaultMode` in the project-local file only, never globally, then re-run step 1. Consent applies to this request only. The `ccc` CLI's own YOLO loop asks separately with a typed `yes`, and `CCC_DISABLE_SKIP_PERMISSIONS=1` disables that path.

## Audit trail

The plugin's hooks log permission decisions and auto-mode denials to `<config dir>/commander/analytics/permission-gate.jsonl` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`); review them with `$ccc-safety`. Calls that match an allowlist entry are approved by Claude Code itself and are not logged one by one.

## Reverse it

Restore the newest backup (`cp <settings-file>.backup-<stamp> <settings-file>`), or remove the added entries from `permissions.allow` and `permissions.deny` with the Edit tool. Re-run step 1 to confirm.

## Done when

- A backup path was printed (or the file was new).
- Step 1 re-runs cleanly on the target file and shows the added allow and deny counts.
- `defaultMode` is reported, and it is `bypassPermissions` only if the user chose "Yes, this project only" in step 5.

## Guardrails

- Never add interpreters (`python`, `node`, `bash`, `npx`) or `gh api *` to the allowlist; that is arbitrary code execution.
- Never auto-approve writes outside the repo, deletes, deploys, force-pushes or network mutations.
- Never set `bypassPermissions` without the step 5 consent, and never in global settings.
- Never remove existing entries, skip the backup, or skip the re-validation.
- Never print secret-bearing settings values; report counts and modes only.

## See also

- `$ccc-nightwatch` — approve risky calls from a phone during unattended runs.
- `$ccc-night-mode` — the autonomous build these settings support.
- `$ccc-safety` — review permission decisions.
- `$ccc-settings` — other Claude Code settings.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
