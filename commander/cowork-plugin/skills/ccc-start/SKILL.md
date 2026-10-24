---
name: ccc-start
description: "First-run Commander onboarding: detects the setup live, offers new-project, import, tour or skip pickers, writes a start plan file and marks onboarding complete. Use when the user just installed Commander, types /ccc-start, or asks how to get started."
allowed-tools:
  - Read
  - Write
  - Bash
  - Skill
  - AskUserQuestion
  - ExitPlanMode
argument-hint: "[new | existing | tour | skip]"
model: sonnet
effort: low
---

# /ccc-start — oriented in ninety seconds

**CC Commander** · /ccc-start · a live setup summary, one picker, and a start plan file you can open.

The whole flow is at most six turns: banner, context and picker; the user's pick; up to three follow-up pickers; the plan file; the hand-off. The plan file is the proof that onboarding landed. The user's selected model and permission mode are preserved.

On Codex, AskUserQuestion becomes a plain-text question with the same options, skills are invoked as `$ccc-<name>`, and ExitPlanMode is skipped.

## When to use / when not to

- Use on first install, when `/ccc` routes here because onboarding is not complete, or when the user asks how to start.
- Use `/ccc` for the main hub once onboarding is done, `/ccc-onboard` to onboard a contributor to a repository, and `/ccc-adopt` to merge Commander conventions into an existing project's CLAUDE.md.

## What happens

### 1. Arguments

- `skip` → run step 8 (mark complete), then invoke the `ccc` skill. No picker.
- `new` / `existing` / `tour` → run steps 2 and 3, skip the step 4 picker, and go to the matching branch in step 5.
- No argument → steps 2 to 4.

### 2. Banner

Read `${CLAUDE_PLUGIN_ROOT}/lib/banner.txt` and `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. Replace `{{VERSION}}` in the banner with the manifest's `version` and render it in a fenced code block. Never write the version from memory. Then one line:

> **Welcome to CC Commander** — let's get you oriented in under 90 seconds.

### 3. Context strip

Run every check in one Bash call. Each one is silent on failure, and every count is computed here, never typed:

```bash
echo "plugins=$(ls ~/.claude/plugins/*/plugin.json 2>/dev/null | wc -l | tr -d ' ')"
echo "plans=$(ls ~/.claude/plans/ 2>/dev/null | wc -l | tr -d ' ')"
echo "repo=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null)"
echo "claude_md=$(test -f CLAUDE.md && echo yes || echo no)"
echo "code=$(ls package.json pyproject.toml requirements.txt Cargo.toml go.mod Gemfile composer.json pom.xml build.gradle 2>/dev/null | tr '\n' ' ')"
echo "agents=$(ls "${CLAUDE_PLUGIN_ROOT}"/agents/*.md 2>/dev/null | wc -l | tr -d ' ')"
echo "skills=$(ls -d "${CLAUDE_PLUGIN_ROOT}"/skills/*/ 2>/dev/null | wc -l | tr -d ' ')"
echo "mcps=$(node -e "console.log(Object.keys(require(process.argv[1]).mcpServers||{}).length)" "${CLAUDE_PLUGIN_ROOT}/.mcp.json" 2>/dev/null || echo 0)"
```

Render one line from the output:

> 🎯 Setup: `<plugins>` plugins installed · `<plans>` existing plans · repo: `<repo or "none">` · agents available: `<agents>` · skills: `<skills>` · MCPs: `<mcps>` bundled (more opt-in via /ccc-connect)

If there are no plugins, no plans and no repo, render instead: "🎯 Fresh install — let's set you up in under 2 minutes."

For update status, point to `/ccc-update`; do not compare versions over the network here.

### 4. Intent picker

Never render a numbered list or ask the user to type a number. Call AskUserQuestion with these four options. Exactly one option carries 🟢 and it goes first. The YAML below shows the no-repo case; when the strip says otherwise, move the matching option to the top and move the 🟢 to it:

- Repo with code files (`code` non-empty) and `claude_md=no` → recommend "Import existing project".
- No repo → recommend "Set up a new project".
- Repo with `claude_md=yes` → recommend "Just show me around".

```yaml
question: "How do you want to start?"
header: "Onboarding"
multiSelect: false
options:
  - label: "🟢 🚀 Set up a new project"
    description: "Blank canvas — scaffold a web app, API, CLI, or mobile app and write the first plan file together."
    preview: "Three quick questions, then /ccc-build scaffolds. About 90 seconds."
  - label: "📦 Import existing project"
    description: "Scan this repo, merge Commander conventions into CLAUDE.md, and recommend agents for the stack."
    preview: "Runs /ccc-adopt (diff preview and approval first), then writes a start plan."
  - label: "💡 Just show me around"
    description: "Tour the agents, plugin skills and bundled MCP servers (live counts from the strip). No commitment."
    preview: "Routes to /ccc-browse."
  - label: "⏭️ Skip — I know what I'm doing"
    description: "Drop me at the main /ccc hub. No onboarding."
    preview: "Jumps straight to the top-level picker."
```

### 5. Handle the selection

**New project.** Ask three AskUserQuestion pickers, one at a time, four options each. The first option listed is the default: put it first and prefix its label with 🟢; the other options carry no 🟢:

1. "What are you building?" → 🟢 Web app / API / CLI / Mobile
2. "Who's the audience?" → 🟢 Solo or team / SMB / Enterprise / Public
3. "What's the first milestone?" → 🟢 MVP demo / First paying user / Open-source launch / Internal tool

Write the plan file (step 6), run step 7, then invoke the `ccc-build` skill with the matching template argument (`web-app`, `api`, `cli`, or `mobile`). Run step 8 before handing over.

**Import existing.** Invoke the `ccc-adopt` skill. It owns every CLAUDE.md write: diff preview, approval picker, backup, delimited block. Never write CLAUDE.md from this skill. When adopt finishes (applied or cancelled), use its detected stack to write the plan file (step 6), run steps 7 and 8, and return a one-line summary plus the plan path.

**Show around.** Run step 8, then invoke the `ccc-browse` skill. It handles category pickers from there.

**Skip.** Run step 8, then invoke the `ccc` skill with no wrapping text.

### 6. Write the start plan

1. If the system reminder carries a plan-mode "Plan File Info" block, write to that path and call ExitPlanMode afterwards so the plan appears in the Desktop Plan pane.
2. Otherwise run `mkdir -p ~/.claude/plans` and Write `~/.claude/plans/ccc-start-<YYYY-MM-DD>.md`. Do not enter plan mode just to write this file.
3. Fill the template in [references/start-plan-template.md](references/start-plan-template.md). Pick three agents with [references/agent-matrix.md](references/agent-matrix.md), checked against the live files in `${CLAUDE_PLUGIN_ROOT}/agents/`.
4. Confirm the file exists: `test -s "<path>" && echo ok`.

### 7. Optional follow-ups (non-blocking, after the plan file)

**Answer-first output.** Ask once (this step runs on the new and import paths only). Answer-first is the 🟢 recommendation.

```yaml
question: "Want answer-first output? (optional — skip if you prefer)"
header: "Output style"
multiSelect: false
options:
  - label: "🟢 🎯 Answer-first output"
    description: "The fix is always the first line; command and file:line follow, context last."
    preview: "Based on ayghri/i-have-adhd (MIT). Writes {\"adhd\": true} to ~/.claude/commander/output-mode.json. Toggle anytime with /ccc-adhd off."
  - label: "📝 Keep the normal style"
    description: "Standard Commander voice — context and reasoning woven in."
    preview: "No change."
  - label: "📦 Answer-first, compressed too"
    description: "Answer-first ordering and far fewer output tokens (stacks with caveman mode)."
    preview: "Writes {\"adhd\": true, \"stackCaveman\": true}."
  - label: "⏭️ Decide later"
    description: "Run /ccc-adhd anytime to turn it on."
    preview: "No change."
```

For either answer-first option, run the command in step "4. Write the state" of `${CLAUDE_PLUGIN_ROOT}/skills/ccc-adhd/SKILL.md`: pass `on` for "Answer-first output" and `stack` for "Answer-first, compressed too" (only `stack` sets `stackCaveman: true`). On a non-zero exit, report the error and do not claim the mode changed. On success, confirm in one line: "Answer-first mode on — the fix leads from here." Otherwise write nothing.

**Connect your stack (affiliate-supported, opt-in).** Ask once with `multiSelect: true`. Skip is the 🟢 default; no partner is recommended over another. If Skip is picked alongside a partner, treat the partner picks as the answer:

```yaml
question: "Want to connect your stack? (optional — skip if you prefer)"
header: "Connect"
multiSelect: true
options:
  - label: "🟢 ⏭️ Skip for now"
    description: "Connect nothing now; run /ccc-connect whenever you are ready."
    preview: "No change."
  - label: "Supabase — managed Postgres and auth"
    description: "Database-as-a-service with built-in authentication and real-time."
    preview: "[Sign up free](https://supabase.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=supabase-auth)"
  - label: "Vercel — deployment and serverless"
    description: "Deploy the app in one step. Fits Next.js and Node."
    preview: "[Sign up free](https://vercel.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=vercel-deploy)"
  - label: "Cloudflare — edge network and workers"
    description: "Global CDN, edge functions, and real-time messaging."
    preview: "[Sign up free](https://www.cloudflare.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-start&utm_content=cloudflare-edge)"
```

If any are picked: "Those are partner sign-up links. Connect each one later with `/ccc-connect`." If skipped: "No problem — connect tools anytime via `/ccc-connect`." Nothing is signed up or connected from here.

Close the tour once with the funding note in [references/sustain.md](references/sustain.md), never as a paywall and never blocking flow.

Session tip, once: run `/ccc-save-session` before closing a working session and `/ccc-resume-session` at the start of the next one.

### 8. Mark onboarding complete (on every path)

Run this on every path, including skip and tour, before handing over to another skill. The `/ccc` gate reads the flag.

```bash
node -e "
  const fs=require('fs'); const os=require('os'); const path=require('path');
  const dir=path.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'commander');
  const p=path.join(dir,'state.json'); const legacy=path.join(os.homedir(),'.claude','commander','state.json');
  let s={}; try{s=JSON.parse(fs.readFileSync(fs.existsSync(p)?p:legacy,'utf8'));}catch(e){}
  s.onboardingCompleted=true;
  s.completedAt=new Date().toISOString();
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(p,JSON.stringify(s,null,2));
  console.log('onboarding marked complete');
"
```

Expect `onboarding marked complete`, then reply: "✅ Onboarding complete. Next time you run `/ccc`, you go straight to the main menu." If the command fails, report the error and do not claim completion.

## Done when

- The context strip numbers came from the step 3 output in this turn.
- New and import paths: `test -s "<plan path>"` printed `ok`, and the path was reported.
- Step 8 printed `onboarding marked complete`.

## Guardrails

- Never write CLAUDE.md here; `/ccc-adopt` owns that surface.
- Never hardcode a version or an agent, skill or MCP count; compute them in step 3.
- Never render a numbered or typed-letter menu; pickers only.
- Never dump HTML expecting it to render; Desktop shows it as code.
- Never mention the legacy `ccc` npm CLI or its modes; this audience is the plugin.
- Never sign the user up for a partner, connect a service, or write anything beyond the plan file, `output-mode.json` (on opt-in) and `state.json`.

## See also

- `/ccc` — main hub
- `/ccc-browse` — every skill and agent by category
- `/ccc-adopt` — merge Commander conventions into an existing project
- `/ccc-build` — scaffold a new project

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
