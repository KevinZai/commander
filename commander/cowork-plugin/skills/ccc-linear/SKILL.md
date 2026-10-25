---
name: ccc-linear
description: "View your open Linear issues, pick one to work on (moves it to In Progress and creates a branch), create a new issue, or see a board overview, all from pickers. Use when the user types /ccc-linear, asks for their Linear issues or tickets, or wants to start work from a ticket."
allowed-tools:
  - Read
  - Bash
  - Grep
  - ToolSearch
  - AskUserQuestion
argument-hint: "[view | pick | create | board]"
disable-model-invocation: true
---

# /ccc-linear — Linear issues in chat

**CC Commander** · /ccc-linear · see, pick, create and summarize Linear issues without leaving the session

## When to use / when not to

- Use to list your open issues, start work on one (state change plus branch), file a new issue, or get a quick board roll-up.
- For a shareable Kanban page that refreshes in place, use `/ccc-linear-board`.
- For personal tracking without a service, use `/ccc-tasks`.
- Linear is opt-in and absent by default. In Codex, ask each picker below as a plain-text question with the same options.

## What happens

### 1. Detect the access path

Run in one Bash call from the repo root; never print the key:

```bash
grep -Eo '\b[A-Z][A-Z0-9]{1,4}-[0-9]+\b' CLAUDE.md 2>/dev/null | head -1
test -d .linear && echo "linear-config: present" || echo "linear-config: none"
test -n "$LINEAR_API_KEY" && echo "key: set" || echo "key: missing"
```

Then check whether a Linear connector is available in this session. Connector tool names vary by install (for example `mcp__linear__list_issues`, or a claude.ai Linear connector's `list_issues`). In Claude Code, deferred connector tools appear by name only; load them with `ToolSearch` query `+linear issues`.

Render one line:

```markdown
Team: `<detected key prefix or unknown>` · connector: <connected | not connected> · key: <set | missing>
```

- Connector available: use the connector tools for every step.
- Key set, no connector: use the GraphQL calls in [references/linear-api.md](references/linear-api.md).
- Neither: go to "Not connected" below and stop.

### 2. Resolve the team

On first use in a session, list teams (connector `list_teams`, or the `teams` query in the reference) and cache the team id. Never hardcode a team slug. If the detected key prefix matches one team, use it; if several teams exist and none matches, ask with AskUserQuestion (up to 4 teams, the most recently active first and marked 🟢).

### 3. Action picker — `AskUserQuestion`

Skip this picker when `$ARGUMENTS` is `view`, `pick`, `create` or `board`; run that action directly.

```yaml
question: "What do you want to do in Linear?"
header: "Linear"
multiSelect: false
options:
  - label: "🟢 Pick one to work on"
    description: "Moves the chosen issue to In Progress and creates its branch."
    preview: "Ticket to branch in one step. Writes one state change to Linear."
  - label: "View my open issues"
    description: "Up to 10 issues assigned to you, grouped by status. Read-only."
  - label: "Create a new issue"
    description: "Pick a kind, give a title, confirm, and it is filed in the team."
  - label: "Board overview"
    description: "Counts per column and a progress bar for the team. Read-only."
```

If the user has zero open issues, put "🟢 Create a new issue" first instead and drop the mark from "Pick one to work on".

### 4a. View my open issues

1. List issues with assignee = me and state type in (`started`, `unstarted`), at most 10 per call.
2. Render titles and identifiers only, never full descriptions:

   ```markdown
   ### My open issues

   **🔄 In Progress (2)**
   - ENG-61 · <title>
   - ENG-62 · <title>

   **⏳ Todo (3)**
   - ENG-48 · <title>
   ```

3. Give one recommendation with its reason (for example, the in-progress issue that blocks a release), then offer the step 4b issue picker.

### 4b. Pick one to work on

1. List up to 4 issues, In Progress first, then Todo.
2. Ask with AskUserQuestion: one option per issue (`<ID> · <title>`), the recommended one first and marked 🟢, each description saying "Moves to In Progress, creates branch `<branch>`".
3. Check the tree before branching:

   ```bash
   git status --short
   git rev-parse --abbrev-ref HEAD
   ```

   Uncommitted changes present: ask "🟢 Stop — I'll commit or stash first" or "Branch anyway (changes carry over)". Do not continue without an answer.
4. Move the issue to the team's `started` state (connector `save_issue` / update tool, or `issueUpdate` in the reference). Read the response; on failure, report the error and stop before branching.
5. Create the branch from the issue identifier, lowercased, plus a short slug of the title:

   ```bash
   git switch -c <team-key>-<number>-<slug>
   ```

   Example: `ENG-62 README overhaul` becomes `eng-62-readme-overhaul`. Follow the project's own branch convention if its CLAUDE.md names one. If the branch exists, `git switch <branch>` instead.
6. Echo: "Branch `<branch>` created and `<ID>` is In Progress. I'll work from the issue description — confirm the scope?"

### 4c. Create a new issue

1. Ask with AskUserQuestion: "What kind?" Put the kind inferred from the user's request first and mark it 🟢; with no signal, the default order is below. The kind maps to a team label of that name if one exists; never create a label silently.

   ```yaml
   question: "What kind of issue?"
   header: "Kind"
   multiSelect: false
   options:
     - label: "🟢 Feature"
       description: "New or changed behavior. Applies the Feature label if the team has one."
     - label: "Bug"
       description: "Something broken. Applies the Bug label if the team has one."
     - label: "Chore"
       description: "Maintenance with no user-visible change. Applies the Chore label if present."
     - label: "Spike / investigation"
       description: "Time-boxed research that ends in a finding, not shipped code."
   ```
2. Ask in plain chat for the title and an optional one-paragraph description. AskUserQuestion has no free-text field.
3. Show the draft (team, label, title, description) and ask: "🟢 Create it", "Edit title", "Cancel".
4. On create, call the connector's save/create issue tool (or `issueCreate`) with `teamId` passed explicitly. Echo the returned identifier and URL.

### 4d. Board overview

Fetch the team's issues (connector list, or the board query in the reference), group by state type, and render:

```markdown
### Board — <team name>

████████████████░░░░░░ 18/24 done (75%)

**🔄 In Progress (2)** · **⏳ Todo (3)** · **📦 Backlog (1)** · **✅ Done (18)**
```

For a shareable page version, point to `/ccc-linear-board`.

### Not connected

```markdown
### ⚠️ Linear not connected

1. Recommended: run `/ccc-connect`, pick Productivity, then Linear (OAuth).
2. Manual: set `LINEAR_API_KEY` in your shell (key from linear.app/settings/api), then run `/ccc-linear` again. If you keep the key as `LINEAR_API_KEY_PERSONAL`, run `export LINEAR_API_KEY="$LINEAR_API_KEY_PERSONAL"` first.
```

Ask with AskUserQuestion: "🟢 Run /ccc-connect now", "Show manual setup", "Skip for now".

## Decision points

- Step 2 team picker (only when ambiguous).
- Step 3 action picker.
- Step 4b issue picker and the dirty-tree check.
- Step 4c kind picker and the create confirmation.

## Done when

- View / board: the rendered list came from a real fetch in this turn, with counts that match the response.
- Pick: the Linear response shows the issue in the started state, and `git rev-parse --abbrev-ref HEAD` prints the new branch.
- Create: the tool returned an identifier and URL, shown to the user.
- On any failure, the report names the failed call and its error text.

## Guardrails

- Linear writes (state changes, new issues) need the user's choice in this conversation: the pick picker and the create confirmation are that authorization. Never write to Linear outside them.
- Never create a branch before the state change succeeds; the two must stay consistent.
- Never fetch more than 10 issues per list call in view or pick; page if more are needed.
- Never print full issue descriptions or `LINEAR_API_KEY`.
- Never create issues without an explicit `teamId`, and never create labels silently.
- Never offer a typed-number menu; every choice is a picker.

## See also

- `/ccc-linear-board` — publish the team's board as a private page
- `/ccc-tasks` — markdown tracking with no service
- `/ccc-standup` — standup from commits and tracker activity
- `/ccc-connect` — connect Linear

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
