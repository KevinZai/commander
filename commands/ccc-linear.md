---
description: "Show the Linear project board by status with a progress bar, pick an issue to start work on, or create a new issue, with every Linear write confirmed first. Use when you want to see or act on your Linear project from the session or the ccc CLI."
---

# /ccc-linear — Linear board

**CC Commander** · /ccc-linear · the project board by status, issue pickup and quick issue creation. Linear is opt-in and absent by default.

## Usage

```
/ccc-linear              # open the board
ccc > Linear Board       # same board in the ccc CLI menu
```

## What happens

1. **Detect the access path.** Run in one Bash call; never print the key:

   ```bash
   test -n "${LINEAR_API_KEY_PERSONAL:-$LINEAR_API_KEY}" && echo "key: set" || echo "key: missing"
   command -v ccc >/dev/null && echo "ccc: installed" || echo "ccc: missing"
   ```

   Then check whether a Linear connector is exposed in this session (load deferred tools with `ToolSearch` query `+linear issues`).

   - Connector available: use its list, update and create tools for every step.
   - Key set and `ccc` installed: use the CLI integration in step 2.
   - Neither: go to "Setup" and stop.

2. **Load the board.** With the CLI integration, resolve the install and read the configured project (set in `ccc` > Settings > Linear Setup):

   ```bash
   CCC_ROOT="$(cd "$(dirname "$(realpath "$(command -v ccc)")")/.." && pwd)"
   node -e 'const l=require(process.argv[1]+"/commander/integrations/linear");l.getIssuesByStatus().then(g=>console.log(JSON.stringify(Object.fromEntries(Object.entries(g).map(([k,v])=>[k,v.map(i=>({id:i.id,identifier:i.identifier,title:i.title}))])))),e=>{console.error(e.message);process.exit(1)})' "$CCC_ROOT"
   ```

   A non-zero exit means no auth or no configured project; report the error text and point to "Setup". Four empty lists with the key set usually means no project is configured; point to Setup step 3. Shell state does not carry between Bash calls, so repeat the `CCC_ROOT=` line at the top of the step 5 and step 6 commands.

3. **Render the board** from the fetched data, counts computed from the response:

   ```
   ─── Linear Board ───────────────────
   ████████████████░░░░░░ 18/24 done

   In Progress (2)
     ENG-61 Hero video
     ENG-62 README overhaul
   Todo (3)
     ENG-48 Foundation
   Backlog (1)
     ENG-50 CLI UI
   Done: 18 issues
   ```

   Show identifiers and titles only, never full descriptions.

4. **Pick an action.** Ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Pick an issue to work on — assigns it to you and moves it to In Progress
   - Create an issue — title and optional description, added to the configured project
   - Refresh — reload the board (step 2)

5. **Pick an issue.** Ask with AskUserQuestion: up to 4 issues, In Progress first, the recommended one marked 🟢, each description saying "Assigns to you, moves to In Progress". Then apply the change with the connector's update tool, or the CLI integration:

   ```bash
   node -e 'const l=require(process.argv[1]+"/commander/integrations/linear");(async()=>{const id=process.argv[2];await l.assignIssueToMe(id);const s=await l.findStateId("started");if(!s)throw new Error("no started state");await l.updateIssue(id,{stateId:s});console.log("ok")})().catch(e=>{console.error(e.message);process.exit(1)})' "$CCC_ROOT" "<issue-id>"
   ```

   Report `ok` or the error text. Then work from the issue title and description, confirming scope with the user first.

6. **Create an issue.** Ask for the title and optional description in plain chat, show the draft, and ask: 🟢 Create it · Edit title · Cancel. On create, use the connector, or:

   ```bash
   node -e 'const l=require(process.argv[1]+"/commander/integrations/linear");l.quickCreateIssue(process.argv[2],process.argv[3]).then(i=>console.log(i.identifier+" "+i.url),e=>{console.error(e.message);process.exit(1)})' "$CCC_ROOT" "<title>" "<description>"
   ```

   Echo the returned identifier and URL.

7. **Verify.** After any write, reload the board (step 2) and confirm the issue shows in its new column, or that the new identifier is listed. Report what the reload shows.

## Session integration (ccc CLI)

When a `ccc` session is started from a picked issue, the CLI links the session to that issue, posts progress and a session summary as comments, moves the issue to Done on completion, and records cost and duration. Those writes happen only for sessions the user starts from an issue in the CLI.

## Setup

1. Create a Linear API key at linear.app/settings/api.
2. Export it in your shell profile as `LINEAR_API_KEY_PERSONAL` (or `LINEAR_API_KEY`).
3. Run `ccc`, open Settings > Linear Setup, and choose your team and project.
4. Run `/ccc-linear` again; the board loads from that project.

With the Commander plugin installed, `/ccc-connect` can add a Linear connector instead, which needs no key.

## Guardrails

- Linear writes (assign, state change, new issue) happen only after the step 5 or step 6 picker answer in this conversation.
- Never print `LINEAR_API_KEY_PERSONAL`, `LINEAR_API_KEY` or full issue descriptions.
- Never claim a write succeeded without the step 7 reload.

## See also

- `/ccc-status` — session and project status
- `/ccc-feature-start` — branch and plan from an issue
- `/ccc-linear-board` — publish the board as a private page (Commander plugin)
