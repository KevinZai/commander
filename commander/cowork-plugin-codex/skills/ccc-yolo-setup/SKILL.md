---
name: ccc-yolo-setup
description: "One-click safe-YOLO + Plan mode — auto-approve read-only/safe ops via a vetted allowlist, keep Plan mode for risky changes. Use when: 'yolo setup', 'reduce prompts', 'fewer approvals'."
allowed-tools:
  - Read
  - Edit
  - Bash
  - AskUserQuestion
---

# /ccc-yolo-setup — Safe YOLO + Plan Mode

Reduce approval friction **without** going recklessly permissive. Safe-YOLO auto-approves a **vetted allowlist of read-only / non-destructive** operations, keeps **Plan mode** for anything that writes, deletes, or hits the network, and **logs every auto-approval** so the trail is auditable.

**CC Commander** · Reduce Approval Friction · [Docs](https://commanderplugin.com)

---

## What it does

1. **Allowlists safe, recurring commands** — reads, `git status/log/diff/show`, `gh pr/issue/run view|list`, `ls/grep/find/cat/head/tail`, read-only cloud describes/gets. No prompts for these.
2. **Keeps Plan mode the default** — risky changes (writes, deletes, deploys, force-push, network mutations) still surface a plan + approval.
3. **Audit logging** — every auto-approved call is appended to `~/.claude/commander/auto-approve-log.jsonl` so you can review what ran unattended.

## What it does NOT do

- ❌ It never enables blanket `--dangerously-skip-permissions`.
- ❌ It never auto-approves writes, deletes, `rm`, `git push --force`, deploys, or money/cloud-mutating commands.
- ❌ It never touches secrets-printing commands.

## Pick a profile (click-first)

Call `AskUserQuestion`:

```
question: "How aggressive should safe-YOLO be?"
header: "Safe-YOLO"
multiSelect: false
options:
  - label: "🟢 Conservative"
    description: "Auto-approve reads + git/gh read-only only. Everything else prompts. Safest."
  - label: "🟡 Balanced (recommended)"
    description: "Reads + git/gh reads + read-only cloud describes/gets + safe build/test. Plan mode for writes."
  - label: "🔴 Aggressive-safe"
    description: "Balanced + scoped writes inside the repo worktree. Still no deletes/deploys/force-push/network mutations."
```

Then ask **where** to apply:

```
question: "Apply to which scope?"
header: "Scope"
options:
  - label: "🌐 Global (~/.claude/settings.json)"
    description: "Every project + Desktop. Best for a single-user workstation."
  - label: "📁 This project (.claude/settings.local.json)"
    description: "Only this repo; gitignored so it doesn't ship to collaborators."
```

## Apply

1. **Back up first:** `cp <settings> <settings>.backup-$(date +%Y%m%d-%H%M%S)`.
2. Merge the profile's patterns into `permissions.allow` (de-dupe; never remove existing entries).
3. Ensure Plan mode stays the default (do **not** disable it).
4. Ensure the audit-log directory exists: `mkdir -p ~/.claude/commander`.
5. Re-read the file and confirm valid JSON before reporting success.

### Vetted allowlist seed (Balanced)

```
Bash(git status:*) Bash(git log:*) Bash(git diff:*) Bash(git show:*)
Bash(gh pr view:*) Bash(gh pr list:*) Bash(gh run view:*) Bash(gh run list:*)
Bash(ls:*) Bash(grep:*) Bash(find:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(wc:*)
Bash(aws sts get-caller-identity:*) Bash(aws s3 ls:*) Bash(aws ec2 describe-instances:*)
```

(Most of these are already auto-allowed by Claude Code; this skill adds the gaps + cloud read-only describes/gets. See `/fewer-permission-prompts` to mine your own transcripts for more.)

## Reverse it

Restore the backup, or remove the added entries from `permissions.allow`. Plan mode is unaffected.

## Anti-patterns — DO NOT

- ❌ Add interpreters (`python`, `node`, `bash`, `npx`) or `gh api *` to the allowlist — that's arbitrary code execution, not safe-YOLO.
- ❌ Auto-approve any write/delete/deploy/force-push/network-mutation.
- ❌ Disable Plan mode to "go faster" — safe-YOLO keeps the plan gate for risky work on purpose.
- ❌ Skip the backup or the JSON re-validation.

---

**Bottom line:** fewer prompts on the safe stuff, a plan gate on the risky stuff, an audit trail on all of it. Pair with `/fewer-permission-prompts` to extend the allowlist from your real usage.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
