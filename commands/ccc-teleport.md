---
description: "Move work between devices: pull a Claude Code on the web session into this terminal with teleport, or keep a local session controllable from the web or mobile app with Remote Control. Use when switching device, monitoring a long task from a phone, or resuming a cloud session locally."
---

# /ccc-teleport — continue on another device

**CC Commander** · /ccc-teleport · picks the right handoff primitive (teleport or Remote Control), runs it, and tells the user what does not carry over.

## The two primitives

| Goal | Primitive | Command |
|---|---|---|
| Resume a Claude Code on the web (cloud) session in a local terminal | Teleport | `claude --teleport` (picker) or `claude --teleport <session-id>`; `/teleport` inside a session where available |
| Keep a local session running here and drive or watch it from claude.ai/code or the Claude mobile app | Remote Control | `/remote-control` inside the session, or start a new one with `claude --remote-control [name]` |

Confirm both flags exist in the installed CLI before relying on them:

```bash
claude --help | grep -E -- '--teleport|--remote-control'
```

If either is missing, tell the user which Claude Code feature is unavailable in their version and suggest `/ccc-update`.

## Arguments

`$ARGUMENTS`:

- empty: ask which goal applies (picker below);
- a session id: teleport that session into this terminal;
- `remote` or `remote-control`: enable Remote Control for the current session.

## What happens

1. **Pick the goal.** AskUserQuestion (plain-text question where it is unavailable):
   - 🟢 Watch or drive this session from another device: enables Remote Control; work keeps running on this machine.
   - Pull a web session into this terminal: runs teleport; the cloud session continues here.
   - Hand the work to a teammate: sessions are tied to the signed-in account, so share the branch or a `/ccc-save-session` handoff instead.

2. **Remote Control path.**
   1. Run `/remote-control` (or tell the user to restart with `claude --remote-control <name>` when the slash command is not available in their version).
   2. Report the session name and where it appears (the claude.ai/code session list and the Claude mobile app).
   3. Remind the user that the session runs on this machine: it stops if the machine sleeps, the terminal closes or the network drops.

3. **Teleport path.**
   1. Check the local tree: `git status --short`. Teleport checks out the web session's branch, so uncommitted local changes can block it. If the tree is dirty, ask before doing anything: 🟢 Commit the changes first · Stash them (`git stash push -m "pre-teleport"`) · Cancel.
   2. Confirm the terminal is in a clone of the same repository the web session used (`git remote -v`).
   3. Run `claude --teleport` (or with the session id from `$ARGUMENTS`) and let the user pick the session.
   4. After it resumes, run `git status --short` and `git log --oneline -3` and report the branch and latest commit.

4. **Tell the user what does not carry over.** Environment variables, running processes (dev servers, watchers, `/loop` timers on the old device) and MCP connections stay on the original device; restart or reconnect them on the new one (`/mcp` to check). Conversation context and the git branch do carry over.

## Common pairings

- Start a long task with `/loop` or a Workflow run, then enable Remote Control to watch it from a phone.
- Start work in a cloud session on the web, then teleport it into a local terminal to run tests against local services.

## Done when

- Remote Control: the session name is reported and the user confirms it is visible on the other device.
- Teleport: `git status --short` and `git log --oneline -3` output from the resumed session is reported.

## Guardrails

- Never stash, commit or discard local changes without the user's choice at that moment.
- Never paste session ids, URLs or tokens into shared channels; they belong to the signed-in account.
- Do not state expiry times, encryption properties or observer permissions; point the user to the Claude Code documentation for those.

## See also

`/ccc-save-session` · `/ccc-resume-session` · `/ccc-loop` · `/ccc-update`
