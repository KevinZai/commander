# Commander prompt standard (v8)

Applies to every prompt surface this repository ships: plugin skills
(`commander/cowork-plugin/skills/*/SKILL.md`), agents
(`commander/cowork-plugin/agents/*.md`), rules and personas
(`commander/cowork-plugin/rules/**`), menus, the Codex mirror, toolkit
commands (`commands/*.md`), prompt templates (`prompts/*`), `CLAUDE.md.template`
and `AGENTS.md`. The reader is Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5 /
Fable 5.1 or GPT-6 via Codex: capable models that follow precise instructions
and over-comply with vague emphasis. Write for them.

Facts (model ids, hook events, frontmatter keys) come from
`docs/reference/platform-facts-2026-10.md`. Do not invent any.

## 1. Shape of a skill

```markdown
---
name: ccc-example
description: "<What it does, in one sentence a user would search for>. Use when <trigger phrases or situations>."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[subcommand | --flag]"
model: sonnet          # alias only: haiku | sonnet | opus | fable | inherit
effort: medium         # low | medium | high | xhigh | max (levels depend on the model)
disable-model-invocation: true   # ONLY for side-effecting workflows (deploy, ship, rollback, publish, yolo)
---

# /ccc-example — <four-word promise>

**CC Commander** · /ccc-example · <one line: what the user gets>

## When to use / when not to
## What happens (numbered steps, each with the exact command or tool call)
## Decision points (AskUserQuestion chips, 2–4 options, one 🟢 recommended)
## Done when (observable check the skill runs before reporting)
## Guardrails (what this skill never does)
## See also (2–4 related /ccc-* skills)
```

Rules:

1. **Frontmatter is the contract.** `name` equals the directory name. `description` is ≤ 300 characters, starts with the outcome, and ends with the trigger ("Use when …"). `allowed-tools` is a permission grant, not a tool list: every listed tool runs without a prompt during the turn the skill is invoked, workspace trust does not gate it, and unlisted tools stay callable under the user's permission settings. List only what must run unprompted, scoped where possible (`Bash(git status *)`); a skill Claude can invoke on its own (no `disable-model-invocation`) never grants bare `Bash`, `Write` or `Edit`. `model` uses an alias, never a dated or full id. `effort` is present. Side-effecting skills set `disable-model-invocation: true`. Read-heavy audits may set `context: fork` + `agent:`; routers and reference skills never do.
2. **Body under 400 lines** (hard platform limit is 500). Reference tables, long checklists and examples move to `references/*.md` beside the skill and are linked by relative path. The first 5,000 tokens must carry the whole operating procedure, because compaction re-attaches only that much.
3. **Lead with the procedure, not the pitch.** No marketing paragraphs, no "Why this matters" essays, no competitor comparisons inside skills. One header line names the product; the rest is instruction.
4. **Numbered steps with exact commands.** Each step says what to run (fenced command, with the plugin-root form `node "${CLAUDE_PLUGIN_ROOT}/…"` and the repo fallback where the skill needs a script), what output to look for, and what to do on failure. Never "run the tests" without naming the command.
5. **Choices are AskUserQuestion pickers.** 2 to 4 options, the recommended one first and marked 🟢, each with a one-line consequence. `header` is at most 12 characters ("Memory", "More (2/3)"; branding goes in the question text). Options use only `label`, `description` and, where a visual comparison helps, `preview`; free text is built in, so never add `autocomplete`, `value` or a hand-made "Other". Never a typed-letter menu ("Reply A/B/C"), never a table pretending to be a menu.
6. **Counts and versions are never literals.** Say "every plugin skill" or read `commander/contract.json`; never write "82 skills" or "v7.4.2" inside a skill body. Historical release notes belong in `CHANGELOG.md`, not in skills.
7. **Models by role, not by nostalgia.** Name the tier (`fable`/`opus`/`sonnet`/`haiku`; Codex `gpt-6-astra`/`gpt-6.1-sol`/`gpt-6-sol`/`gpt-6-luna`) only where the skill actually routes work. State that the user's selected model is preserved unless they choose otherwise. No "Opus 5", "Fable 5", "GPT-5.6", "Sol/Terra", "Haiku 4.5" anywhere.
8. **Verification before "done".** Every skill that changes state ends with the check it runs (test command, `git status`, curl of the live URL, `claude plugin validate`) and reports the actual result. A self-report is a claim; load-bearing claims get a fresh-context verifier (Fable Method pillar 2).
9. **Authorization is explicit.** Publishing, deploying, posting, deleting, paying, pushing, and writing to trackers each need authorization in the current request or conversation. The skill says so once, in Guardrails, and asks with a picker at the exact moment, not at the start.
10. **No persona theater.** No "You are a world-class…", no ALL-CAPS emphasis, no exclamation marks, no emoji outside the fixed semantic palette (🎯 💡 🚀 📊 💰 ✅ ❌ 🔄 ⏭️ ⏳ 🔒 🟢 🟡 🔴 ⚠️ 🎉 🏗️ 🔧 🧪 📝 🎨 🔐 🤖 🔬 🧠 📦 🌐 ⌨️). Instructions are imperative sentences.
11. **Platform-current.** Where a skill touches a surface that changed, use the current primitive: Agent tool `effort`, `isolation: worktree`; Workflow tool and `/workflows`; `/effort ultracode`; Routines (`/schedule`) and `/loop`; Artifact tool (`publish`, `capabilities`, ArtifactData `db`, comments); `claude plugin validate --strict`, `claude plugin details`, `claude plugin eval`, `/doctor prompt-audit`; auto permission mode; Codex `exec --json`, `review --uncommitted`, `cloud exec`, `doctor --json`, `agents`, `plugin`, `remote-control`.
12. **Privacy and portability.** No personal paths (`/Users/<name>`), hostnames, agent rosters, private services (OpenClaw, Hermes, Paperclip) or credentials. Only `claude-code` and `codex` are first-class sources. Anything optional (claude-mem, Linear, connectors) is described as opt-in and absent-by-default.
13. **The Fable contract footer.** Every plugin SKILL.md ends with exactly one copy of this line, verbatim (the audit in `commander/tests/audit-fable-contract.test.js` pins the wording; `node scripts/add-fable-contract.js` re-adds a missing one and `--check` reports them):

    `> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md``

## 2. Shape of an agent

```markdown
---
name: reviewer
description: "<When to delegate to it, in one sentence with trigger words>"
model: opus            # alias; fable only for architect/security-auditor-class work
effort: high
tools:
  - Read
  - Grep
  - Glob
  - Bash
disallowedTools:
  - Write
maxTurns: 30
memory: project
skills:
  - ccc-review          # preloaded skills, ≤ 32
color: blue
persona: personas/reviewer   # Commander convention, ignored by the platform
---

# <Role> agent

One paragraph: what it owns and what it returns.

## Protocol — numbered, tool-exact steps
## Output contract — the exact shape returned to the caller (headings or JSON)
## Never — three to six hard limits
```

- Drop fields the platform ignores for plugin subagents (`hooks:`, `permissionMode:`, `mcpServers:`, `initialPrompt:`).
- Verifier agents are prompted to refute, not confirm, and default to "refuted" when uncertain.
- Agents return data to the caller, not chat prose: findings as `path:line` + severity + fix, plans as numbered steps, decisions with the 🟢 call and rationale.

## 3. Rules and personas

Rules are short (≤ 120 lines), one topic per file, no duplicates across files; link to the canonical file instead of restating. Personas define voice and limits in ≤ 40 lines and never carry model, cost, quota or tool-access claims.

## 4. Codex mirror

The Codex plugin is generated by `scripts/build-codex.js`; never hand-edit `commander/cowork-plugin-codex/`. Skill bodies must read correctly for GPT-6 as well as Claude: use "the assistant" or imperative voice, never "Claude will", and name Claude-only tools (AskUserQuestion, Workflow, Agent, Artifact) with the Codex equivalent or fallback stated once (plain-text question, `codex exec`, `codex cloud exec`, file output).

## 5. Checklist a verifier runs on every rewritten file

- [ ] Frontmatter parses; `name` matches directory; every tool used is allowed; `model` is an alias; `effort` set.
- [ ] Under 400 lines (SKILL.md) / 120 lines (agent) / 120 lines (rule).
- [ ] No stale model name (grep: `Fable 5\b`, `Opus 5\b`, `Sonnet 5\b`, `Haiku 4\.5`, `claude-fable-5\b`, `claude-opus-5\b`, `claude-sonnet-5\b`, `claude-haiku-4-5`, `GPT-5\.`, `gpt-5\.`, `Terra`, `\bSol\b` without `6.1`/`GPT-6`).
- [ ] No count or version literal (`\b\d{2,3} (skills|agents|handlers|hooks)\b`, `v?7\.\d\.\d`).
- [ ] No typed-letter menu, no marketing prose, no persona theater.
- [ ] Relative links and script paths resolve inside the repo.
- [ ] No PII, private hostnames, personal paths, or private service names.
- [ ] Every state-changing step names its verification command.
- [ ] `node scripts/audit-frontmatter.js --check` passes for the file's tree.
