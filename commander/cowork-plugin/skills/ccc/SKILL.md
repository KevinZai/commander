---
name: ccc
description: "Commander's click-first home: reads the project context, then routes to build, review, ship or the More menu (plan, x-ray, Codex CLI, fleet, connectors, plugin audit workflows) in one or two clicks. Use when the user types /ccc, opens the Commander menu, or asks where to start."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
argument-hint: "[build | review | ship | design | learn | more | plan | xray | codex | fleet | workflows]"
model: sonnet
effort: low
---

# /ccc — one click to the right workflow

**CC Commander** · /ccc · a banner, a one-line context strip, and a four-option picker that dispatches to the matching `/ccc-*` skill.

The hub is a thin control plane: it detects context, offers a choice, and hands off. Substantive work runs in the target skill or a plugin workflow (see [workflow-first](../../rules/workflow-first.md)). The user's selected model is preserved; the hub never switches models.

## When to use / when not to

- Use for "open Commander", "what can I do here?", "where do I start?", or a bare `/ccc`.
- Use the argument form (`/ccc review`, `/ccc codex`) when the user already named the intent; the hub skips the picker.
- Do not use for the full catalog: that is `/ccc-browse` (searchable) or `/ccc-cheatsheet` (live map).

## What happens

### 1. Onboarding gate

Run first:

```bash
STATE="$HOME/.claude/commander/state.json"
if [ ! -f "$STATE" ] || ! grep -q '"onboardingCompleted": *true' "$STATE" 2>/dev/null; then
  echo "ONBOARDING_NEEDED"
fi
```

- Output contains `ONBOARDING_NEEDED`: reply with one line, "Welcome to CC Commander. First run, so starting the guided setup.", invoke the `ccc-start` skill with the Skill tool, and stop. Do not show the hub picker on first run.
- Otherwise continue to step 2.
- Bash unavailable: skip the gate and continue; do not guess onboarding state.

### 2. Argument shortcut

If `$ARGUMENTS` matches a row below, invoke that skill with the Skill tool and stop. Do not render the banner or picker.

| Argument | Skill |
|---|---|
| `build` · `review` · `ship` · `design` · `learn` | `ccc-build` · `ccc-review` · `ccc-ship` · `ccc-design` · `ccc-learn` |
| `more` | `ccc-more` |
| `plan` · `xray` · `linear` · `fleet` · `connect` · `tuneup` · `browse` | `ccc-more` with the same argument (it dispatches directly) |
| `codex` | `ccc-codex` (Codex CLI: doctor, models, plugins, mcp, agents, cloud, remote, review, update, import, config) |
| `workflows` · `audit` · `deep-review` · `migrate` · `prompt-audit` · `release-audit` | `ccc-more` with the same argument (plugin workflows page) |
| `cheatsheet` · `start` · `doctor` · `update` | `ccc-cheatsheet` · `ccc-start` · `ccc-doctor` · `ccc-update` |

Any other argument: keep it, continue to step 3, and echo it in the context strip as "You said: `<arg>` — pick the closest intent."

### 3. Banner

Read `${CLAUDE_PLUGIN_ROOT}/lib/banner.txt` and `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. Replace `{{VERSION}}` with the manifest `version`. Render the banner alone in a ```` ```text ```` block. Never type a version from memory.

### 4. Context strip

Run the probes in one Bash call; each is silent on failure:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null
git status --porcelain 2>/dev/null | wc -l | tr -d ' '
BASE=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo main); git rev-list --count "$BASE"..HEAD 2>/dev/null
test -f CLAUDE.md && head -1 CLAUDE.md
test -f tasks/todo.md && grep -c '^- \[ \]' tasks/todo.md
ls -t "$HOME"/.claude/sessions/*.tmp 2>/dev/null | head -1
ls "$HOME/.claude/skills" 2>/dev/null | wc -l | tr -d ' '
claude mcp list 2>/dev/null | grep -c '^  '
```

Render one line:

> 🎯 Branch `<branch>` · project `<CLAUDE.md first line or directory name>` · <n> open tasks · last session <age> · <x> user skills · <y> MCPs connected

Drop any field whose probe printed nothing. No git repo and no `CLAUDE.md`: "🎯 No project detected — pick an intent and Commander sets one up." Bash unavailable: use Glob for `CLAUDE.md` and `tasks/todo.md` and render what it finds.

### 5. Picker

Call AskUserQuestion once (Codex: ask the same four choices as a plain-text question and accept the name). Four options, the recommended one first and marked 🟢, each `preview` one line of context from step 4:

```
question: "What's the move?"
header: "CC Commander"
multiSelect: false
options:
  - label: "🏗️ Build something"
    description: "Scaffold a project or feature: web, API, CLI, mobile."
  - label: "🔬 Review my work"
    description: "Review the branch, security or performance, or run a full x-ray."
  - label: "🚀 Ship it"
    description: "Pre-flight checks, then tag, push, release or deploy, each confirmed."
  - label: "⏭️ More tools"
    description: "Plan, x-ray, Codex CLI, fleet, Linear, connectors, plugin workflows."
```

Recommendation, first match wins (move that option to the top and prefix 🟢):

1. No git repo, an empty repo, or no `CLAUDE.md` → Build.
2. Uncommitted changes in the working tree → Review.
3. Clean tree and commits ahead of the base branch → Ship.
4. Otherwise → Review in a git repo, Build outside one.

Give the recommended option's `preview` a "Recommended because …" line.

### 6. Dispatch

Invoke the picked skill with the Skill tool immediately; do not ask again.

| Pick | Skill |
|---|---|
| Build something | `ccc-build` |
| Review my work | `ccc-review` |
| Ship it | `ccc-ship` |
| More tools | `ccc-more` |

Say one line before the hand-off, for example "Loading `ccc-build` — one more click picks web, API, CLI or mobile." The target skill owns its own picker and its menu file in `${CLAUDE_PLUGIN_ROOT}/menus/`.

## What sits behind More tools

`/ccc-more` carries the long tail, so the hub stays at four options:

- `/ccc-plan`, `/ccc-xray`, `/ccc-linear` (opt-in Linear connector), `/ccc-fleet`, `/ccc-connect`, `/ccc-tuneup`, `/ccc-browse`.
- `/ccc-codex` — Codex CLI management: doctor, models, plugins, mcp, agents, cloud, remote, review, update, import, config.
- Plugin workflows, run through the Workflow tool: `/commander:ccc-audit`, `/commander:ccc-deep-review`, `/commander:ccc-fleet-run`, `/commander:ccc-migrate`, `/commander:ccc-prompt-audit`, `/commander:ccc-release-audit`. What each returns, its arguments and its fallback are in [plugin-workflows.md](../ccc-more/references/plugin-workflows.md).

`references/main-menu.json` and `references/build-something.json` beside this file are the CLI menu trees; the Desktop hub does not load them.

## Done when

- First run: `ccc-start` was invoked and no picker was shown.
- Argument path: the mapped skill was invoked in this turn.
- Picker path: one AskUserQuestion call with exactly four options, one marked 🟢, and the pick dispatched to its skill.
- The version in the banner came from `plugin.json` read in this turn.

## Guardrails

- Never render a numbered or lettered menu or ask the user to type a number; the choice is always AskUserQuestion (or the plain-text Codex fallback).
- Never put more than four options in one picker or unroll the catalog here.
- Never hardcode a version, skill count, agent count or connector count; read them or leave them out.
- Never output raw HTML expecting it to render as an interactive menu; Desktop shows it as code.
- Never mention the npm `ccc` CLI binary in this flow; the audience is the plugin.
- The hub itself changes no state. If the banner version is older than the user expects, say "⚠️ Plugin v<x> loaded — run `/ccc-update` to check for a newer release" rather than guessing.

## See also

- `/ccc-more` — the second-page menu and plugin workflows
- `/ccc-start` — first-run onboarding
- `/ccc-cheatsheet` — live map of every skill and workflow
- `/ccc-browse` — searchable catalog

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
