# Course: Claude Code Best Practices — From First Session to Agent Orchestration

**Format:** 7 modules, beginner → advanced. Each module: learning objectives · key practices · hands-on exercise. ~3–4 hours total; each module stands alone.
**Sources:** Anthropic's *Best practices for Claude Code* (`code.claude.com/docs/en/best-practices`) + the CC Commander (CCC) *bible-guide* skill. Vanilla Claude Code practice is the spine; a **"CCC fast-track"** call-out in each module maps the practice to a CC Commander command/mode.
**Reader:** any dev using Claude Code, from first-timer to parallel-session power user.

---

## The one idea the whole course hangs on

> **Claude's context window is the fundamental constraint, and performance degrades as it fills.**

Every practice below is downstream of that single fact: verification exists so you don't re-read work to check it; `/clear` and subagents exist to keep context clean; a tight `CLAUDE.md` exists so rules don't get lost in noise. Teach this first — the rest becomes obvious.

**Also foundational:** Claude stops when the work *looks* done. Without a check it can run, "looks done" is the only signal — and *you* become the verification loop. The whole craft is (1) keep context clean and (2) give Claude a way to close its own loop.

---

## Module 0 — Orientation: how Claude Code actually works
**Objective:** understand the agentic loop and why it changes how you work.
- Claude Code isn't a chatbot — it reads files, runs commands, makes changes, and works through problems autonomously while you watch, redirect, or step away.
- The shift: you **describe what you want**; Claude explores, plans, and implements. You stop writing code and reviewing Claude's; you specify outcomes and verify results.
- The two constraints that drive everything: **context fills fast** and **"looks done" ≠ done**.

**🧭 CCC fast-track:** the 4 essential commands cover ~80% of daily use — `/init` (set up project + CLAUDE.md), `/plan` (plan before coding), `/verify` (prove it works), `/cc` (command center when unsure).

**Exercise:** open a repo you don't know and ask *"give me an overview of this codebase: architecture, key directories, and how the pieces connect."* Notice you named zero files.

---

## Module 1 — The core loop: verify + explore-plan-code
**Objective:** run the fundamental Claude Code workflow with a closing verification loop.

### 1.1 Give Claude a way to verify its work
- The check is anything returning a pass/fail Claude can read: a test suite, a build exit code, a linter, a diff-against-fixture, a browser screenshot compared to a design.
- **Four ways to gate the stop, weakest → strongest:**
  1. **In one prompt** — "run the tests after implementing and iterate until they pass."
  2. **Across a session** — a `/goal` condition; a separate evaluator re-checks after every turn.
  3. **Deterministic gate** — a **Stop hook** blocks the turn from ending until your check passes.
  4. **Second opinion** — a verification **subagent** or workflow where a fresh model tries to refute the result (the agent doing the work isn't the one grading it).
- Always have Claude **show evidence** (test output, the command + result, a screenshot) rather than assert success.

### 1.2 Explore → Plan → Code → Commit
- **Explore** (plan mode): "read /src/auth and understand how we handle sessions and login." No changes.
- **Plan**: "I want to add Google OAuth. What files change? What's the session flow? Create a plan." (`Ctrl+G` opens the plan in your editor.)
- **Implement**: switch out of plan mode; "implement the OAuth flow from your plan. write tests for the callback handler, run the suite, fix failures."
- **Commit**: "commit with a descriptive message and open a PR."
- **When to skip planning:** if you could describe the diff in one sentence (typo, log line, rename), just ask Claude to do it. Plan when the approach is uncertain, the change spans files, or the code is unfamiliar.

**🧭 CCC fast-track:** `/plan` structures explore→plan; `/verify` is the built-in verification loop; `/cc mode night` runs the loop autonomously with checkpoints.

**Exercise:** pick a small feature. Do the full four-phase loop. Require Claude to run a check and show you the output before it says "done."

---

## Module 2 — Prompting for precision
**Objective:** write prompts that need fewer corrections.

### 2.1 Provide specific context
| Instead of… | Write… |
|---|---|
| "add tests for foo.py" | "write a test for foo.py covering the logged-out edge case. avoid mocks." |
| "why is this API weird?" | "look through ExecutionFactory's git history and summarize how its api came to be" |
| "add a calendar widget" | "look at how existing widgets work (HotDogWidget.php is a good example); follow that pattern; no new libraries" |
| "fix the login bug" | "login fails after session timeout. check src/auth/ token refresh. write a failing test that reproduces it, then fix it" |

### 2.2 Provide rich content
`@`-reference files · paste/drag images · give doc URLs (allowlist via `/permissions`) · pipe data (`cat error.log | claude`) · or tell Claude to fetch context itself.

### 2.3 The 6 transferable patterns
Outcome-not-steps · give-it-a-check · point-at-a-reference · measurable-target · give-it-the-artifact · say-how-you-want-the-answer. *(See the Prompt Library for a worked example of each.)*

**🧭 CCC fast-track:** `/cc prompts` browses 36+ battle-tested prompt templates by category.

**Exercise:** take 3 vague prompts you've used and rewrite each with a named file, a constraint, and a verification step.

---

## Module 3 — Configure your environment (the force multiplier)
**Objective:** set up CLAUDE.md, permissions, and extensions so every future session is better.

### 3.1 Write an effective CLAUDE.md
- Loaded every session — include only what applies broadly. For each line ask: *"Would removing this cause Claude to make mistakes?"* If not, cut it. **Bloated CLAUDE.md → Claude ignores your actual rules.**
- **Include:** bash commands Claude can't guess · code style that differs from defaults · test instructions · repo etiquette (branch/PR conventions) · project-specific architecture · env quirks · non-obvious gotchas.
- **Exclude:** anything Claude can read from code · standard conventions · detailed API docs (link instead) · things that change often · "write clean code."
- Emphasis ("IMPORTANT", "YOU MUST") improves adherence. Imports via `@path/to/import`. Locations: `~/.claude/CLAUDE.md` (global), `./CLAUDE.md` (team, checked in), `./CLAUDE.local.md` (personal, gitignored), parent/child dirs (monorepos).
- **Treat it like code:** review when things go wrong, prune regularly, test by watching whether behavior actually shifts.

### 3.2 Configure permissions (reduce interruptions, keep control)
- **Auto mode** — a classifier blocks only risky actions (scope escalation, unknown infra, hostile-content-driven).
- **Allowlists** — permit known-safe tools (`npm run lint`, `git commit`).
- **Sandboxing** — OS-level filesystem/network isolation.

### 3.3 Use CLI tools + MCP
- CLI tools (`gh`, `aws`, `gcloud`, `sentry-cli`) are the most context-efficient way to hit external services. Install `gh` first. Claude can learn unknown CLIs: *"use 'foo --help' to learn it, then do X."*
- MCP servers connect Notion, Figma, your DB, issue trackers: `claude mcp add`.

### 3.4 Set up hooks (deterministic guarantees)
- Unlike CLAUDE.md (advisory), **hooks run a script every time with zero exceptions.** "Write a hook that runs eslint after every file edit" or "blocks writes to the migrations folder."

### 3.5 Skills, subagents, plugins
- **Skills** (`.claude/skills/*/SKILL.md`) — domain knowledge + reusable `/command` workflows, loaded on demand (keeps CLAUDE.md lean). Use `disable-model-invocation: true` for side-effecting workflows you trigger manually.
- **Subagents** (`.claude/agents/*.md`) — specialized assistants in their own context with their own tools (e.g. a security-reviewer on Opus).
- **Plugins** (`/plugin`) — bundle skills/hooks/subagents/MCP into one installable unit.

**🧭 CCC fast-track:** CCC ships 450+ skills, 11 CCC domains (load one to get 8–46 specialists behind a router), 28 hooks (context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach), and 9 workflow modes — all on top of these primitives.

**Exercise:** run `/init`, then prune the generated CLAUDE.md against the include/exclude table. Add one hook and one skill.

---

## Module 4 — Communicate effectively + manage the session
**Objective:** steer Claude and keep context clean over long work.

### 4.1 Communicate
- **Ask codebase questions** like you'd ask a senior engineer: "how does logging work?", "what edge cases does CustomerOnboardingFlowImpl handle?"
- **Let Claude interview you** for larger features: *"I want to build [X]. Interview me in detail using the AskUserQuestion tool… keep interviewing until we've covered everything, then write a complete spec to SPEC.md."* Then start a **fresh session** to execute the spec. The best specs are self-contained: name the files/interfaces, state what's out of scope, end with an end-to-end verification step.

### 4.2 Manage your session (conversations are persistent + reversible)
- **Course-correct early:** `Esc` to stop and redirect (context preserved); `Esc Esc` / `/rewind` to restore prior conversation+code; "undo that"; `/clear` between unrelated tasks.
- **After two failed corrections on the same issue, `/clear`** and rewrite the prompt with what you learned. A clean session + better prompt beats a long session with accumulated failed approaches.
- **Manage context aggressively:** `/clear` between tasks; `/compact <instructions>` for focused compaction; `Esc Esc` → summarize-from/​up-to a checkpoint; `/btw` for side questions that never enter history.
- **Use subagents for investigation:** *"use subagents to investigate how our auth handles token refresh"* — they explore in a separate context and report a summary, keeping your main window clean.
- **Rewind with checkpoints:** every prompt is a checkpoint; try something risky, rewind if it fails. *(Caveat: checkpoints track only Claude's file edits, not Bash/external changes — not a git replacement.)*
- **Resume:** `claude --continue` / `--resume`; name sessions (`/rename oauth-migration`) and treat them like branches.

**🧭 CCC fast-track:** modes swap the whole persona (`/cc mode research|design|marketing|saas`); auto-checkpoint + context-guard hooks do 4.2 for you.

**Exercise:** start a feature with the interview prompt → write SPEC.md → `/clear` → execute the spec in a clean session.

---

## Module 5 — Automate + scale (one human, many Claudes)
**Objective:** multiply output with non-interactive mode and parallel sessions.

### 5.1 Non-interactive (headless) mode
`claude -p "prompt"` for CI, pre-commit hooks, scripts. Output formats: plain, `--output-format json`, `--output-format stream-json --verbose` for real-time parsing.

### 5.2 Run multiple sessions
- **Worktrees** — isolated git checkouts so edits don't collide.
- **Desktop app** — manage parallel sessions visually, each in its own worktree.
- **Claude Code on the web** — sessions on Anthropic-managed cloud VMs.
- **Agent teams** — automated coordination with shared tasks, messaging, and a team lead.
- **Writer/Reviewer pattern:** Session A implements; Session B (fresh context, unbiased) reviews; feed B's findings back to A. Same idea with tests: one Claude writes tests, another writes code to pass them.

### 5.3 Fan out across files
For large migrations: (1) have Claude list all files; (2) loop `claude -p "migrate $file… return OK or FAIL" --allowedTools "Edit,Bash(git commit *)"`; (3) test on 2–3 files, refine the prompt, then run at scale. Pipe JSON output into your own tooling.

### 5.4 Autonomous runs + adversarial review
- **Auto mode:** `claude --permission-mode auto -p "fix all lint errors"` — a classifier gates each command; `-p` runs abort if repeatedly blocked (no human to fall back to).
- **Add an adversarial review step:** before "done," have a subagent review the diff in a fresh context against your plan. Run the bundled `/code-review` skill, or write your own: *"review the rate-limiter diff against PLAN.md. Check every requirement is implemented, listed edge cases have tests, nothing out of scope changed. Report gaps, not style."*
- ⚠️ **Reviewer caveat:** a reviewer told to find gaps will usually report some even when the work is sound. Tell it to flag only gaps affecting correctness or stated requirements — chasing every finding leads to over-engineering.

**🧭 CCC fast-track:** `/cc mode night` (autonomous overnight with recovery), dialectic-review (FOR/AGAINST/Referee), and delegation templates operationalize 5.2–5.4; the ultracode posture fans out a verified multi-agent workflow by default for migrations/audits.

**Exercise:** run a 3-file migration with the fan-out loop, then have a fresh subagent adversarially review the result against a one-line plan.

---

## Module 6 — Avoid failure patterns + develop intuition
**Objective:** recognize the five common failures early, and know when to break the rules.

| Failure pattern | Fix |
|---|---|
| **Kitchen-sink session** — unrelated tasks pile up, context full of noise | `/clear` between unrelated tasks |
| **Correcting over and over** — context polluted with failed approaches | after 2 failed corrections, `/clear` + a better initial prompt |
| **Over-specified CLAUDE.md** — rules lost in the noise, half ignored | ruthlessly prune; convert repeat rules to hooks |
| **Trust-then-verify gap** — plausible code that misses edge cases | always provide verification; if you can't verify it, don't ship it |
| **Infinite exploration** — "investigate X" unscoped, hundreds of files read | scope narrowly or use subagents |

**Develop your intuition:** the patterns are starting points, not laws. Sometimes you *should* let context accumulate (deep in one problem), skip planning (exploratory task), or use a vague prompt (to see how Claude frames it). Pay attention to what works: when output is great, notice the prompt structure, context, and mode you used; when Claude struggles, ask whether the context was too noisy, the prompt too vague, or the task too big for one pass.

---

## Capstone project
Ship one real feature end-to-end, using every layer:
1. **Spec by interview** → `SPEC.md` (Module 4).
2. **`/clear` → fresh session → explore → plan** (Modules 1–2).
3. **Implement with an in-loop verification gate** — tests run and pass, evidence shown (Module 1).
4. **Adversarial subagent review** against SPEC.md; fix only correctness/requirement gaps (Module 5).
5. **Commit + PR** with a generated message (Ship).
6. **Operationalize:** capture what recurred into a `/skill`, a `CLAUDE.md` rule, and a hook (Module 3 + "capture what to remember" prompt).

**You've graduated when** the feature shipped with a check *you didn't have to run yourself*, and the next session starts smarter because of what you captured.

---

## Appendix — Vanilla Claude Code → CCC map (quick reference)
| Best-practice | Vanilla CC | CC Commander |
|---|---|---|
| Set up project + CLAUDE.md | `/init` | `/init` (stack detect + modes) |
| Plan before coding | plan mode (Shift+Tab) | `/plan` |
| Verify work | in-prompt / `/goal` / Stop hook | `/verify` |
| Not sure what to run | — | `/cc` (command center) |
| Swap workflow persona | manual context | `/cc mode design\|saas\|marketing\|research\|night\|yolo` |
| Load a whole domain | assemble skills yourself | `use ccc-saas` (8–46 specialists behind a router) |
| Reusable prompts | your own skills | `/cc prompts` (36+ templates) |
| Guaranteed automation | write hooks | 28 kit-native hooks (auto-checkpoint, context-guard, cost-alert…) |
| Multi-agent | worktrees / agent teams | dialectic-review · delegation-templates · ultracode |
