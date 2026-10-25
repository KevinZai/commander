---
name: ccc-browse
description: "Browse every Commander skill, agent and domain: a searchable catalog or pickers four at a time, then launch one. Use when asked what Commander can do."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Artifact
  - Agent
  - AskUserQuestion
argument-hint: "[cockpit | domains | workflows | agents | all]"
model: sonnet
effort: low
---

# /ccc-browse — the Commander catalog

**CC Commander** · /ccc-browse · find a skill or agent by clicking, then run it without leaving the flow.

## When to use / when not to

- Use when the user asks what Commander can do, wants to find a skill or agent, or wants the Cockpit page.
- Use `/ccc-console` for live agent, cost and safety numbers; `/ccc-suggest` when the user wants a recommendation rather than a catalog.

## What happens

### 1. Header and live counts

Run one Bash call and read every number from it; never type a count from memory:

```bash
R="${CLAUDE_PLUGIN_ROOT:-commander/cowork-plugin}"
node -p "JSON.parse(require('fs').readFileSync('$R/.claude-plugin/plugin.json','utf8')).version"
ls -d "$R"/skills/*/ | wc -l
ls "$R"/agents/*.md | wc -l
ls -d "$R"/skills/ccc-*/ | wc -l
```

Print one line: `**CC Commander** · v<version> · Browser · <skills> skills · <agents> agents`, then one sentence inviting a pick.

### 2. Root picker

An argument skips it: `cockpit` (step 3), `domains`, `workflows`, `agents` (step 4), `all` (step 5). Otherwise ask with AskUserQuestion (Codex: a plain-text numbered question):

- 🟢 Open the Commander Cockpit — the whole catalog as one searchable private page
- Domains — the big topic routers (design, marketing, devops, …)
- Workflows — plan, build, review, ship and the other click-first flows
- Agents — the specialist agents you can delegate to

Recommend the Cockpit when the user asked for the full, visual or searchable catalog; recommend Workflows on a first visit; recommend Domains when the user came from `/ccc-start`. Put the recommended option first. After any cascade, offer "Show everything as a table" (step 5) as a follow-up.

### 3. Commander Cockpit (consent-gated publish)

1. First publish this session: ask with AskUserQuestion.
   - Question: "Publish the Cockpit as a private claude.ai page? Skill and agent names, plus the local usage counts the page bakes in, leave this machine."
   - 🟢 Publish — create or update the private page
   - Browse here instead — pickers only, nothing uploads
   - Cancel
   Publish only on an explicit yes. Running `/ccc-browse` again later in this session is the refresh consent.
2. Build onto the shared Commander path (`/ccc-console publish` writes this same path, so both keep one URL):
   ```bash
   mkdir -p "<scratchpad>"
   if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-cockpit.mjs" ]; then
     node "${CLAUDE_PLUGIN_ROOT}/scripts/build-cockpit.mjs" --out <scratchpad>/commander-cockpit.html
   else
     node scripts/build-cockpit.mjs --out <scratchpad>/commander-cockpit.html
   fi
   ```
   A marketplace-only install builds the plugin catalog without the repo's ecosystem catalog; that is expected. If neither builder exists, say so and continue with step 4.
3. Publish with the Artifact tool and `capabilities: {"downloads": true}` (the agent manager's "save as file" button; the page hides it where the viewer cannot save files):
   - Already published from this path in this session: publish the same `file_path`; omit `icon` and `capabilities`.
   - Otherwise: `action: "list"`, find "Commander Cockpit", `action: "read"` its `url`, then publish `file_path` with that `url` and the `capabilities`. If none exists, publish `file_path`, the `capabilities`, `icon: "dashboard"` and `description: "Every Commander skill, agent, idea and prompt pattern, searchable and offline."`.
   - On Codex or without the Artifact tool: give the user the HTML file path.
4. Reply with the title, the URL, and one line: the page runs entirely in the browser; copy buttons put a command on the clipboard to paste here, because a published page cannot send prompts into the session.

### 4. Cascades: domains, workflows, agents

Follow [references/cascades.md](references/cascades.md). In short: read names and descriptions from disk, show four per AskUserQuestion with "Next" and "Back" options, and on a pick offer to run it now.

### 5. Everything as a table

One markdown table sorted by name: `| Type | Name | One-liner |`, built from the same frontmatter reads as step 4. Then ask with AskUserQuestion:

- 🟢 Launch one — name it and it runs now
- Filter by keyword
- Browse by category — back to step 2
- Done

### 6. Dispatch a pick

Read the picked skill's `SKILL.md` frontmatter (or the agent's `.md`), say in one sentence what will happen, then run it in place: invoke the skill, or delegate with the Agent tool for an agent after asking for the task. A skill with `disable-model-invocation: true` can't be invoked by Claude: tell the user to type its `/` command instead. Otherwise the user never has to retype a command.

## Done when

- Cockpit: the builder exited 0 and the Artifact tool returned a URL, which you reported.
- Cascade: the user's pick was dispatched, or they chose Done.
- Every count you showed came from the step 1 command output.

## Guardrails

- Never publish without the step 3 consent, and never move `<scratchpad>/commander-cockpit.html`.
- Never dump a long list and ask the user to type a name; never put more than four options in a cascade picker.
- Never hardcode a version, skill count, agent count or sub-skill count.
- Read agent files on drill-in, not all up front.

## See also

- `/ccc-console` — live agents, cost and safety, inline
- `/ccc-start` — first-run onboarding
- `/ccc-suggest` — the next best action

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
