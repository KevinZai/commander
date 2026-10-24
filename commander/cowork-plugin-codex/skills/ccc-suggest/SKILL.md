---
name: ccc-suggest
description: "Reads project state and recent activity, then recommends one next $ccc-* workflow, skill or plugin with named reasons and picker alternatives; also runs as a standing PM loop. Use when the user asks what next, which tool to use, or is stuck."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[loop | loop status | loop stop | --history | --tune | --level=N --force | <situation in plain English>]"
model: opus
effort: medium
---

# $ccc-suggest — the next best move

**CC Commander** · $ccc-suggest · one concrete recommendation for what to run next, with the signals behind it and ranked alternatives.

Two surfaces share one brain:

- **Explicit run** (`$ccc-suggest`): a full scan and reasoning pass, then one recommendation and a picker.
- **Ambient ticker**: `hooks/suggest-ticker.js` (UserPromptSubmit) runs a lightweight pass every turn and injects at most one suggestion at the current involvement level. Levels, overrides and the hook's chip format: [references/involvement-levels.md](references/involvement-levels.md).

## When to use / when not to

- Use when the user asks "what next", "which tool", "help me decide", "I'm stuck", or describes a task without naming a workflow.
- Use `loop` when the user wants a standing PM advisor for the session.
- Do not use it to execute the recommendation's work; hand off to the chosen skill.
- Do not run the full explicit pass on every message; the ticker covers ambient turns.

## What happens

### 1. Route the argument

| `$ARGUMENTS` | Action |
|---|---|
| empty or plain-English situation | Steps 2 to 5 |
| `loop` / `loop status` / `loop stop` | PM loop, step 6 |
| `--history` | Print the last 10 lines of `<config dir>/commander/suggest-log.jsonl` (`~/.claude/commander/suggest-log.jsonl` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) as a table (time, pick, picked or not); say so if the file is absent |
| `--tune` | Picker for the preferred level (see the reference), then give the exact `CCC_SUGGEST_LEVEL=<n>` line to set; this skill does not edit shell profiles or settings |
| `--level=N --force` | Run steps 2 to 5 at level N for this turn only |

### 2. Scan the project in one Bash call

Open with the header line `**CC Commander Suggest** · reading your project state…`, then run:

```bash
bash <<'SCAN'
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
echo "branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo none)"
base=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
echo "behind/ahead $base: $(git rev-list --left-right --count "$base"...HEAD 2>/dev/null || echo n/a)"
echo "dirty files: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "recent commits:"; git log --oneline -5 2>/dev/null
echo "project signals: $(ls CLAUDE.md AGENTS.md package.json pyproject.toml Cargo.toml go.mod 2>/dev/null | tr '\n' ' ')"
[ -f package.json ] && node -e 'const p=require("./package.json");console.log("js deps: "+Object.keys({...p.dependencies,...p.devDependencies}).slice(0,20).join(" "))' 2>/dev/null
echo "open tasks: $(ls tasks/todo.md tasks/plan-*.md 2>/dev/null | tr '\n' ' ')"
echo "loop state: $(ls .claude/loop-state/*.json 2>/dev/null | tr '\n' ' ')"
echo "last session: $(ls -t ~/.claude/sessions/*.tmp 2>/dev/null | head -1)"
echo "installed plugins: $(ls ~/.claude/plugins/cache/*/*/*/.claude-plugin/plugin.json 2>/dev/null | wc -l | tr -d ' ')"
command -v claude >/dev/null && echo "connected MCPs: $(claude mcp list 2>/dev/null | grep -c 'Connected')" || echo "connected MCPs: unknown"
echo "ci: $(gh run list --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null || echo unknown)"
state=$(ls -d "$CCC_STATE"/projects/"$(basename "$PWD")"-* 2>/dev/null | head -1)
[ -n "$state" ] && cat "$state/project-state.json" 2>/dev/null
SCAN
```

The heredoc runs under bash so unmatched globs stay quiet in zsh. Every line degrades to `none`, `n/a` or `unknown` when a tool is missing; never stop the scan for one. The cached `project-state.json` may be stale; its schema and signal sources are in [references/project-state.md](references/project-state.md). When the cache and the live scan disagree, the live scan wins.

Show a short context card of what was detected (branch, ahead/behind, dirty count, stack, CI, open tasks, connected MCPs).

### 3. Reason over the signals

Evaluate in this order and pick the strongest signal.

**Tier 0 — the three PM lenses (every pass).** SCOPE outranks IMPROVE when both fire. The advisor must be willing to say "stop building, scope this first."

1. **SCOPE:** no plan file, vague acceptance criteria, or the diff ballooning past the stated goal → `$ccc-plan` or `spec-interviewer`. Name the scope creep explicitly.
2. **IMPROVE:** missing tests → `$ccc-review` with TDD emphasis; generic UI → `$ccc-design`; slow feedback → a `$ccc-loop` recipe; a fix or check done twice → encode it as a skill or hook.
3. **AUDIT:** branch ahead with no review → `$ccc-review`; dependencies unaudited → `$ccc-security`; docs drifted → `$ccc-doc-sync`; tests green but coverage dropped → `$ccc-qa`.

**Tier 1 — strong signals (drive the pick).**

- Substantive task (multi-file, research, audit, migration, repo-wide) → run it workflow-first: the Workflow tool, `$ccc-fleet` or `$ccc-ultracode`, with agents returning conclusions. See [rules/workflow-first.md](../../rules/workflow-first.md).
- Isolated or parallel work ("handle this separately", "while I'm away", an unrelated task) → offer its own session (spawn_task chip in Cowork, `/spawn quick <task>` in the CLI). Never spawn without the user's go-ahead.
- Branch ahead + tests present → `$ccc-review diff`.
- Branch ahead + no tests → `$ccc-build` with TDD emphasis, or `$ccc-plan` if the spec is unclear.
- No CLAUDE.md and an empty or README-only repo → `$ccc-start`.
- CLAUDE.md missing in an existing codebase → `$ccc-adopt`; CLAUDE.md older than 30 days → `$ccc-claudemd`.
- CLAUDE.md + active `tasks/todo.md` → continue the open work (`$ccc-plan` to resume a plan, `$ccc-build` to resume a build).
- Last session interrupted → `$ccc-resume-session`.
- Tests green + branch ahead + CHANGELOG staged → `$ccc-ship preflight`.
- CI red or lint failing → `$ccc-review` with a fix-first focus before new features.
- Dependency audit flagged vulnerabilities → `$ccc-review security` before shipping.

**Tier 2 — stack signals (shape the tool list).** Next.js / React / Vite → `$ccc-design`; Postgres or Supabase → `$ccc-saas`; GitHub Actions → `$ccc-devops`; Python ML imports → `$ccc-research`; monorepo or multi-repo → `$ccc-fleet`.

**Tier 3 — explicit intent (overrides the scan).** A described task maps to its workflow ("audit security" → `$ccc-review security`); a domain question routes to that `ccc-<domain>` router with its sub-skills named.

Name a third-party plugin only when a signal calls for it, with its install step: [references/third-party-plugins.md](references/third-party-plugins.md).

**Confidence.** HIGH: several tier-1 signals agree and the stack confirms. MEDIUM: one tier-1 signal plus compatible intent. LOW: no tier-1 signal and ambiguous intent; then show three alternatives in the picker instead of forcing one pick.

### 4. Write the recommendation

Exactly one recommendation, in this shape:

```markdown
## 🎯 Recommended next step

**`$ccc-<workflow>`** — <one-line purpose>

**Why this, now:** <3–5 sentences citing specific scan signals, and the alternatives considered and rejected.>

**Tools you'll use:**
- 🔧 **<primary skill or agent>** — <why it fits>
- 📦 **<secondary skill, agent or MCP>** — <why it complements>
- 🌐 **<optional third-party plugin>** — <when it matters, plus install step>

**Estimated time:** <~15 min / ~1 hour>
**Cost:** <rough estimate when multi-agent or hosted work is involved; omit otherwise>
**Confidence:** <HIGH / MEDIUM / LOW, with the reason>

🟢 **My call:** <one decisive line>
```

If the scan shows no actionable signal, say so and recommend `$ccc-start`.

### 5. Offer the alternatives

Ask with AskUserQuestion (Codex: ask the same question in plain text with the options numbered):

```
question: "Go with the recommendation?"
header: "Next step"
multiSelect: false
options:
  - label: "🟢 Run $ccc-<workflow>"
    description: "<the reason in one line>"
  - label: "Runner-up: $ccc-<alt-1>"
    description: "<when this would be the better choice>"
  - label: "Deeper: $ccc-<alt-2>"
    description: "<more investment, potentially more value>"
  - label: "Browse every option"
    description: "Opens $ccc-browse with the full skill picker."
```

On a pick, invoke the chosen skill with the Skill tool. Append one JSON line to `<config dir>/commander/suggest-log.jsonl` only if the file already exists (the ticker owns its creation):

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
[ -f "$CCC_STATE/suggest-log.jsonl" ] && node -e 'require("fs").appendFileSync(process.argv[3],JSON.stringify({ts:new Date().toISOString(),source:"explicit",pick:process.argv[1],chosen:process.argv[2]})+"\n")' "/ccc-<workflow>" "<chosen option>" "$CCC_STATE/suggest-log.jsonl"
```

The log line is best-effort telemetry and never blocks the hand-off. When the append ran, confirm it with `tail -n 1 "$CCC_STATE/suggest-log.jsonl"` and check that the line shows `"source":"explicit"` and the pick; if it is missing, say the log was not written and continue.

When a hook injected suggestion chips this turn, render them exactly as the hook names them (formats in [references/involvement-levels.md](references/involvement-levels.md)); that is the chip contract. Never offer choices as a typed-letter list.

### 6. PM loop mode

- `loop`: start `/loop $ccc-suggest` (self-paced) or `/loop <interval> $ccc-suggest` when the user gives one. For a loop that survives the laptop closing, point to `/schedule` via `$ccc-loop`.
- Each tick runs steps 2 and 3 and surfaces at most one recommendation through the current level. A tick with nothing new stays silent.
- State lives in `.claude/loop-state/ccc-suggest.json` (`iteration`, `lastRun`, `attempted`, `dismissed`, `history`; schema in [references/project-state.md](references/project-state.md)). Read it first; write it back after each tick with the updated `iteration`, `lastRun` and any new `attempted` or `dismissed` entry.
- A suggestion in `dismissed` is never re-surfaced unless its signal changed materially.
- `loop status`: print iteration, last run, last recommendation and the dismissed list from the state file.
- `loop stop`: stop the `/loop` (Cowork stop button or `Ctrl+C`) or tell the user how to turn off the Routine; leave the state file in place.

The loop passes the should-loop gate: it recurs every turn, its verifier is deterministic project state (git, CI, todos), each tick is cheap, and it uses real tools.

### Deep-reasoning nudge

When the session is strongly deep-reasoning (two or more of: architecture, redesign, migration, threat model, system design, entire refactor, roadmap; or a prompt over ~800 characters with planning verbs), add once: "🧠 Deep-reasoning session detected — consider `/model fable` (Fable 5.1, 1M context). Commander routes subagents cost-efficiently either way." The `intent-classifier.js` hook already does this automatically at most once per day (marker `<config dir>/commander/fable-nudge-<date>`); in an explicit run, skip it if that marker exists for today. Never block or delay the answer for it.

## Done when

- The scan output was shown as a context card and every reason in the recommendation cites a line from it.
- Exactly one recommendation carries the 🎯 header and one 🟢 call.
- The picker was shown, or the user picked; a pick invoked the chosen skill.
- When `suggest-log.jsonl` existed and the user picked, `tail -n 1 "$CCC_STATE/suggest-log.jsonl"` shows the new explicit entry.
- In loop mode, `.claude/loop-state/ccc-suggest.json` exists and its `iteration` advanced (`cat` it to confirm).

## Guardrails

- One recommendation per pass; never two starred or 🟢 picks.
- No recommendation without the scan; no generic "you could try X".
- Concrete time estimates only ("~15 min"), never "a while".
- A third-party plugin is never named without its install step, and never installed without the user's go-ahead.
- Autopilot runs only read-only work, only under the conditions in the reference. Anything that writes to disk, a remote, a tracker or the network goes through a picker.
- Never spawn a session, start a Routine, or edit settings or shell profiles without the user's explicit choice in this conversation.

## See also

- `$ccc-browse` — the full skill picker.
- `$ccc-fable` — arms the same three lenses as a session contract.
- `$ccc-loop` — loop types, gates and state files.
- `$ccc-plan` — when SCOPE fires.

Voice: the semantic palette in [rules/common/response-style.md](../../rules/common/response-style.md); end with a decisive call, not a hedge.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
