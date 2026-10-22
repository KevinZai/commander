---
name: ccc-more
description: "Commander's second-page menu: plan, x-ray, Codex CLI management, fleet, Linear, connectors, tune-up, catalog browse and the plugin audit workflows, one click each. Use when the user picks More tools in /ccc, types $ccc-more, or asks what else Commander can do."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Skill
  - Workflow
  - AskUserQuestion
argument-hint: "[plan | xray | codex | fleet | linear | connect | tuneup | browse | workflows | audit | deep-review | migrate | prompt-audit | release-audit | back]"
model: sonnet
effort: low
---

# $ccc-more — the rest of Commander

**CC Commander** · $ccc-more · cascading pickers for everything that is not build, review or ship, including Codex CLI management and the plugin workflows.

Choices come from `${CLAUDE_PLUGIN_ROOT}/menus/ccc-more.json` plus the plugin workflows in `${CLAUDE_PLUGIN_ROOT}/workflows/`. If the menu file lists a tool this page does not, add it to the page with a free slot or say it exists; never drop it silently.

## When to use / when not to

- Use after "More tools" in `/ccc`, for `$ccc-more`, or for "what else can Commander do?".
- Use the argument form (`$ccc-more codex`) to skip every picker.
- Do not use for a searchable catalog (`$ccc-browse`) or a live map of every skill (`$ccc-cheatsheet`).

## What happens

### 1. Argument shortcut

If `$ARGUMENTS` names a tool, dispatch it with step 5's table and stop. Accepted: `plan`, `xray`, `codex`, `fleet`, `linear`, `connect`, `tuneup`, `browse`, `workflows`, `audit`, `deep-review`, `migrate`, `prompt-audit`, `release-audit`, `back`.

### 2. Header and context strip

Render one header line:

```
**CC Commander · More** · [all commands](https://commanderplugin.com/commands)
```

Probe in one Bash call (each silent on failure):

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null
git ls-files 2>/dev/null | wc -l | tr -d ' '
test -f CLAUDE.md && echo has-claude-md
test -f tasks/todo.md && grep -c '^- \[ \]' tasks/todo.md
git worktree list 2>/dev/null | wc -l | tr -d ' '
git status --porcelain 2>/dev/null | head -1 | grep -q . && echo dirty
git rev-list --count @{upstream}..HEAD 2>/dev/null
claude mcp list 2>/dev/null | grep -ci linear
test -f .linear/config.json && echo linear-config
command -v codex >/dev/null 2>&1 && echo codex-installed
{ test -f AGENTS.md || test -d .codex; } && echo codex-project
```

Render one line:

> 🎯 Branch `<branch>` · <n> open tasks · Linear `<connected | not set up>` · Codex `<installed | not installed>`

Little context: "🎯 Empty-ish project — plan a feature or run an x-ray to get signal."

### 3. Page 1 picker

AskUserQuestion, four options, recommended first with 🟢 (Codex: the same choices as a plain-text question):

```
question: "Which tool?"
header: "CC Commander · More"
multiSelect: false
options:
  - label: "📝 Plan a feature"
    description: "Spec interview, implementation plan file, review checkpoint."
  - label: "🔬 Project x-ray"
    description: "Scorecard across code, docs, tests, deps and CI with fixes."
  - label: "⌨️ Codex CLI"
    description: "Doctor, models, plugins, MCP, agents, cloud, remote, review, update, import, config."
  - label: "⏭️ Even more…"
    description: "Fleet, Linear, connectors, plugin workflows, tune-up, catalog."
```

Recommendation, first match wins:

1. Linear connected (either Linear probe printed) and the branch looks like an issue branch (`<letters>-<digits>-…`) → 🟢 Linear board. Put Linear in Codex's slot on page 1 and Codex in Linear's slot on page 2.
2. No `tasks/todo.md` and no `CLAUDE.md` → 🟢 Plan a feature.
3. More than 500 tracked files → 🟢 Project x-ray.
4. `codex-installed` and `codex-project` both printed → 🟢 Codex CLI.
5. Otherwise → 🟢 Plan a feature.

### 4. Cascade pages

"Even more…" on page 1 opens page 2; "Even more…" on page 2 opens page 3. Each is one AskUserQuestion call with four options.

Page 2 — header "CC Commander · More · 2":

- 🤖 Fleet (parallel agents) — parallel agents in isolated worktrees with progress cards
- 📊 Linear board — view, pick or create issues (opt-in Linear connector)
- 🌐 Connect apps — enable Notion, Zapier, Supabase, Slack, Google Drive and other connectors
- ⏭️ Even more… — plugin workflows, tune-up, catalog

Page 2 🟢, first match wins: more than one worktree or at least one open task → Fleet; Linear connected and still on this page → Linear board; otherwise → Connect apps.

Page 3 — header "CC Commander · More · 3":

- 🧪 Plugin workflows — audit, deep review, release audit, fleet, migrate, prompt audit
- 🔧 Tune-up setup — audit and safely optimize the local Commander install; read-only by default
- 📦 Browse catalog — searchable grid of every `$ccc-*` command and installed skill
- 🔄 Back to /ccc — return to the hub

Page 3 🟢: Plugin workflows.

Plugin workflows page — header "Plugin workflows" (details: [plugin-workflows.md](references/plugin-workflows.md)):

- 📊 Repo audit — `/commander:ccc-audit`: scorecard per dimension, findings verified
- 🔬 Deep branch review — `/commander:ccc-deep-review`: diff against the base ref, findings refuted or confirmed
- ✅ Release audit — `/commander:ccc-release-audit`: every release gate, go or no-go (Commander repository only)
- ⏭️ More workflows — `/commander:ccc-fleet`, `/commander:ccc-migrate`, `/commander:ccc-prompt-audit`

Plugin workflows page 🟢: `dirty` printed or a non-zero commits-ahead count → Deep branch review; otherwise → Repo audit.

"More workflows" opens one last picker with those three (Fleet run, Migrate, Prompt audit); 🟢 Fleet run.

### 5. Dispatch

Dispatch immediately on a pick; do not ask again.

| Pick or argument | Action |
|---|---|
| Plan · `plan` | Skill `ccc-plan` |
| X-ray · `xray` | Skill `ccc-xray` |
| Codex CLI · `codex` | Skill `ccc-codex` |
| Fleet · `fleet` | Skill `ccc-fleet` |
| Linear · `linear` | Linear connected: Skill `ccc-linear`. Not connected: picker "🟢 Connect Linear now (`$ccc-connect linear`)" / "Back to More"; never call Linear tools that are absent |
| Connect · `connect` | Skill `ccc-connect` |
| Tune-up · `tuneup` | Skill `ccc-tuneup` |
| Browse · `browse` | Skill `ccc-browse` |
| Plugin workflows · `workflows` | Plugin workflows page |
| Back · `back` | Skill `ccc` |
| Repo audit · `audit` | Workflow `ccc-audit` with `args: { target: "." }`; on a repo with more than 500 tracked files, first ask "🟢 Whole repo" / "One directory" and pass the directory as `target` |
| Deep review · `deep-review` | Workflow `ccc-deep-review` with `args: { base: "<origin/HEAD short name, else main>" }` |
| Release audit · `release-audit` | Only when `commander/contract.json` and `scripts/build-codex.js` exist in the working directory: Workflow `ccc-release-audit` with `args: {}`. Elsewhere, say it audits the Commander repository and does not apply here |
| Prompt audit · `prompt-audit` | Same repository check, then Workflow `ccc-prompt-audit` with `args: {}` |
| Fleet run · Migrate · `migrate` | Skill `ccc-fleet`; it collects `mode`/`tasks` or `pattern`/`transform` and starts `ccc-fleet` or `ccc-migrate` |

Run a workflow as:

```
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/<name>.workflow.js", args: { … } })
```

Say one line first: "Starting `/commander:<name>` — parallel agents, one verified result back here." Without the Workflow tool (Codex, older clients), run the fallback skill from [plugin-workflows.md](references/plugin-workflows.md) and say which one.

## Done when

- Argument path: the mapped skill or workflow was invoked in this turn.
- Picker path: every picker had at most four options with exactly one 🟢, and the final pick was dispatched.
- Workflow path: the Workflow tool returned, and you reported its verdict or the error it raised, not a summary from memory.

## Guardrails

- Never put more than four options in one picker, render a numbered list, or ask the user to type a number.
- Never call Linear or another connector's tools without confirming the connector is present; Linear and every connector are opt-in.
- Never run `ccc-release-audit` or `ccc-prompt-audit` outside the Commander repository.
- Workflows report; they never commit, tag, push or publish from this menu. Any follow-up write goes through its own skill and its own confirmation.
- Never re-introduce Commander or repeat the hub banner; the user came from `/ccc`.
- The session model is preserved; workflows use their own routing unless `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` is set.

## See also

- `/ccc` — the hub
- `$ccc-codex` — Codex CLI management
- `$ccc-fleet` — guided multi-agent runs
- `$ccc-browse` — searchable catalog

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)

> (The Workflow(...) tool is not available on Codex — run the steps sequentially.)
