---
description: "List, load, inspect and alias saved Claude Code sessions in ~/.claude/sessions/, with branch and worktree per session. Use when the user wants to find an earlier session, name one, or tell parallel worktree runs apart."
---

# /ccc-sessions — find and name saved sessions

**CC Commander** · /ccc-sessions · saved-session history with dates, branches, worktrees and aliases.

Sessions are markdown files in `~/.claude/sessions/`; aliases live in `~/.claude/session-aliases.json`. The scripts below use the session library that ships with the Everything Claude Code toolkit (`scripts/lib/session-manager.js` and `scripts/lib/session-aliases.js`), an opt-in install that is absent by default.

## Arguments

`$ARGUMENTS`:

| Form | Does |
|---|---|
| empty, or `list [--limit <n>] [--date <YYYY-MM-DD>] [--search <pattern>]` | List sessions (default limit 20) |
| `load <id\|alias\|date>` | Show a session's metadata and content |
| `info <id\|alias>` | Show detailed statistics for a session |
| `alias <id> <name>` | Create an alias |
| `alias --remove <name>` or `unalias <name>` | Remove an alias |
| `aliases` | List all aliases |
| `help` | Print this table |

Session ids can be shortened; the first 4 to 8 characters are usually unique. Sessions without an id are addressed by date.

## What happens

1. Locate the session library. Run:

   ```bash
   for d in "${CLAUDE_PLUGIN_ROOT:-}" "$HOME/.claude" "$HOME"/.claude/plugins/cache/everything-claude-code/*/*; do
     [ -n "$d" ] && [ -f "$d/scripts/lib/session-manager.js" ] && { echo "$d"; break; }
   done
   ```

   The printed directory is `ECC_ROOT` for every script below; pass it inline as `ECC_ROOT="<printed path>"` because shell state does not persist between calls. If nothing prints, say "The session library is not installed" and stop.

2. Parse `$ARGUMENTS` into the subcommand and its values, then run the matching script from the sections below, passing each value as its own quoted argument. On a non-zero exit, show the script's message and stop.

3. Show the output as printed. For `load`, also read the session file at the printed path with the Read tool and summarise its content: title, completed and in-progress items, and the last recorded next step.

4. For `alias`, `alias --remove` and `unalias`, verify by running the `aliases` script and confirming the name is present or gone.

### list

```bash
ECC_ROOT="<path>" node -e '
const sm = require(process.env.ECC_ROOT + "/scripts/lib/session-manager");
const aa = require(process.env.ECC_ROOT + "/scripts/lib/session-aliases");
const path = require("path");
const args = process.argv.slice(1);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const result = sm.getAllSessions({ limit: Number(opt("--limit")) || 20, date: opt("--date"), search: opt("--search") });
const aliasMap = {};
for (const a of aa.listAliases()) aliasMap[a.sessionPath] = a.name;
console.log("Sessions (showing " + result.sessions.length + " of " + result.total + "):\n");
console.log("ID        Date        Time     Branch       Worktree           Alias");
for (const s of result.sessions) {
  const m = sm.parseSessionMetadata(sm.getSessionContent(s.sessionPath));
  const id = s.shortId === "no-id" ? "(none)" : s.shortId.slice(0, 8);
  const time = s.modifiedTime.toTimeString().slice(0, 5);
  const branch = (m.branch || "-").slice(0, 12);
  const wt = m.worktree ? path.basename(m.worktree).slice(0, 18) : "-";
  console.log(id.padEnd(8) + " " + s.date + "  " + time + "   " + branch.padEnd(12) + " " + wt.padEnd(18) + " " + (aliasMap[s.filename] || ""));
}
' [--limit <n>] [--date <YYYY-MM-DD>] [--search <pattern>]
```

If the library ignores `date` or `search`, filter the printed rows yourself and say so.

### load and info

Both resolve an alias first, then print the session's metadata and statistics. `info` adds the id, filename and modified time.

```bash
ECC_ROOT="<path>" node -e '
const sm = require(process.env.ECC_ROOT + "/scripts/lib/session-manager");
const aa = require(process.env.ECC_ROOT + "/scripts/lib/session-aliases");
const id = process.argv[1];
if (!id) { console.log("Usage: /ccc-sessions load|info <id|alias>"); process.exit(1); }
const resolved = aa.resolveAlias(id);
const session = sm.getSessionById(resolved ? resolved.sessionPath : id, true);
if (!session) { console.log("Session not found: " + id); process.exit(1); }
const st = sm.getSessionStats(session.sessionPath);
const md = session.metadata;
const aliases = aa.getAliasesForSession(session.filename).map(a => a.name);
console.log("Session:      " + session.filename);
console.log("Path:         ~/.claude/sessions/" + session.filename);
console.log("ID:           " + (session.shortId === "no-id" ? "(none)" : session.shortId));
console.log("Date:         " + session.date);
console.log("Modified:     " + session.modifiedTime.toISOString().slice(0, 19).replace("T", " "));
if (md.title) console.log("Title:        " + md.title);
if (md.started) console.log("Started:      " + md.started);
if (md.lastUpdated) console.log("Last updated: " + md.lastUpdated);
console.log("Project:      " + (md.project || "-"));
console.log("Branch:       " + (md.branch || "-"));
console.log("Worktree:     " + (md.worktree || "-"));
console.log("Lines: " + st.lineCount + "  Items: " + st.totalItems + "  Completed: " + st.completedItems + "  In progress: " + st.inProgressItems + "  Size: " + sm.getSessionSize(session.sessionPath));
if (aliases.length) console.log("Aliases:      " + aliases.join(", "));
' "<id|alias>"
```

### alias

```bash
ECC_ROOT="<path>" node -e '
const sm = require(process.env.ECC_ROOT + "/scripts/lib/session-manager");
const aa = require(process.env.ECC_ROOT + "/scripts/lib/session-aliases");
const [sessionId, aliasName] = process.argv.slice(1);
if (!sessionId || !aliasName) { console.log("Usage: /ccc-sessions alias <id> <name>"); process.exit(1); }
const session = sm.getSessionById(sessionId);
if (!session) { console.log("Session not found: " + sessionId); process.exit(1); }
const r = aa.setAlias(aliasName, session.filename);
if (!r.success) { console.log("Error: " + r.error); process.exit(1); }
console.log("Alias created: " + aliasName + " -> " + session.filename);
' "<id>" "<name>"
```

### alias --remove and unalias

```bash
ECC_ROOT="<path>" node -e '
const aa = require(process.env.ECC_ROOT + "/scripts/lib/session-aliases");
const name = process.argv[1];
if (!name) { console.log("Usage: /ccc-sessions unalias <name>"); process.exit(1); }
const r = aa.deleteAlias(name);
if (!r.success) { console.log("Error: " + r.error); process.exit(1); }
console.log("Alias removed: " + name);
' "<name>"
```

### aliases

```bash
ECC_ROOT="<path>" node -e '
const aa = require(process.env.ECC_ROOT + "/scripts/lib/session-aliases");
const list = aa.listAliases();
console.log("Session aliases (" + list.length + "):\n");
if (!list.length) { console.log("No aliases found."); process.exit(0); }
console.log("Name          Session file                    Title");
for (const a of list) {
  const file = a.sessionPath.length > 30 ? a.sessionPath.slice(0, 27) + "..." : a.sessionPath;
  console.log(a.name.padEnd(12) + "  " + file.padEnd(30) + "  " + (a.title || ""));
}
'
```

## Examples

```
/ccc-sessions list --limit 10
/ccc-sessions alias 2026-02-01 today
/ccc-sessions load today
/ccc-sessions info today
/ccc-sessions unalias today
```

## Operator notes

- Session headers record `Project`, `Branch` and `Worktree`, so `info` tells parallel tmux or worktree runs apart.
- For a command-center view of parallel work, combine `/ccc-sessions info`, `git diff --stat` in each worktree, and `/ccc-cost`.

## Done when

The requested listing or session details printed from the library, or an alias change was confirmed by the `aliases` listing.

## Guardrails

- Only alias commands write, and only to `~/.claude/session-aliases.json`. Never edit or delete session files.
- Never print secrets that appear in a session's content; summarise around them.

## See also

`/ccc-checkpoint` · `/ccc-cost` · `/ccc-spawn`
