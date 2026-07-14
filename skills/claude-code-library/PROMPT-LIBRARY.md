# Claude Code Prompt Library

> 52 copy-paste prompts for Claude Code, organized by software-development lifecycle (SDLC) phase and task. Each prompt shows an example filled-in version, why it works, and a "make it stick" follow-up that turns a one-off prompt into a repeatable skill/hook/rule.

**Source & attribution:** ripped 2026-07-14 from Anthropic's official Claude Code prompt library (`code.claude.com/docs/en/prompt-library`), which compiles patterns from [Common workflows], [Best practices], the [How Anthropic teams use Claude Code] blog series, and the *Scaling agentic coding* guide. These are published as starting points to copy into Claude Code. **Licensing note:** fine to use as-is in a personal/internal library; if these are placed into a *commercial resale* product (e.g. ReadyIQ's Template Library), reframe them and confirm licensing — the existing `ccc-seed` category is explicitly "no external license needed," so verbatim Anthropic prompts would break that stance.

**How to read a prompt:** `{curly braces}` mark fill-in slots. The version shown is pre-filled with a realistic example so you can copy it and edit. The core pattern is what transfers to your own tasks.

---

## 🔍 DISCOVER — get oriented, understand the code

### Onboard
**Get oriented in a new repository**
`give me an overview of this codebase: architecture, key directories, and how the pieces connect`
*Why:* describe what you want to know, not which files to read — Claude explores and summarizes how it fits together. *Make it stick:* run `/init` to write a `CLAUDE.md` so Claude remembers this every session.

### Understand
**Explain unfamiliar code**
`explain what src/scheduler/queue.ts does and how data flows through it. write it up as an HTML page with a diagram, then open it in my browser`
*Why:* name the file and say what output format you want (diagram, bullets, whatever fits how you learn). *Make it stick:* set an output style so Claude always explains in your preferred format.

**Find where something happens**
`where do we validate uploaded file types?`
*Why:* search by behavior, not filename — works even when you don't know the file name or directory.

**Check what breaks before you delete**
`what would break if I deleted the retryWithBackoff helper?`
*Why:* ask before you remove anything; the list of callers tells you whether it's a one-line cleanup or a coordinated change.

**Trace how code evolved**
`look through the commit history of internal/auth/session.go and summarize how it evolved and why`
*Why:* point at commit history when the question is *why*, not *what* — Claude reads the log/blame and explains the decisions behind the current code.

**Scope a change before you start**
`which files would I need to touch to add a dark mode toggle to settings?`
*Why:* size the work before committing it to a roadmap — the file list reveals one-component vs. cross-cutting. *(roles: PM, Design)*

**Ask the codebase a product question**
`I am a PM. walk me through what happens when a user clicks Export to PDF, from the UI down to the result`
*Why:* state your role so the answer is pitched at the right level; Claude explains what the product actually does from source. *(roles: PM)*

---

## 📐 DESIGN — plan and prototype

### Plan
**Plan a multi-file change before touching code**
`plan how to refactor the payment module to support multiple currencies. list the files you would change, but don't edit anything yet`
*Why:* "don't edit yet" separates exploration from changes so you see the approach first. Shift+Tab enters plan mode to make this the default.

**Draft a spec by interview**
`I want to build per-workspace rate limits. interview me about implementation, UX, edge cases, and tradeoffs until we have covered everything, then write the spec to SPEC.md`
*Why:* ask to be interviewed instead of writing the spec yourself — Claude surfaces things you hadn't considered. *Make it stick:* save your interview questions as a `/spec` skill. *(roles: PM)*

**Turn a meeting into tickets**
`read @meeting-notes.md and write up the action items, then create a Linear ticket for each with acceptance criteria`
*Why:* skip the transcription step — Claude pulls action items and writes them straight into your tracker via MCP. *Make it stick:* save as a `/tickets` skill. *(needs: issue tracker via MCP)*

**Map edge cases before building**
`list the error states, empty states, and edge cases for the file upload flow that the design needs to cover`
*Why:* ask for what's missing, not what's there — the states a happy-path design tends to skip. *(roles: Design, PM)*

### Prototype
**Turn a mockup into a working prototype**
*(paste/drag/@-mention your mockup image, then:)* `here is a mockup. build a working prototype I can click through, matching the layout and states shown`
*Why:* a clickable prototype answers questions a static mockup can't — hand working code to engineering. *(roles: Design, PM, Marketing)*

**Implement from a screenshot and self-check**
*(paste your design image, then:)* `implement this design, then take a screenshot of the result, compare it to the original, and fix any differences`
*Why:* gives Claude a verification loop — it renders, compares, and iterates without you pointing out each gap. *Make it stick:* use `/goal` to keep it iterating until the screenshots match. *(needs: browser/screenshot tool)*

---

## 🔨 BUILD — implement, test, refactor, review, steer

### Implement
**Follow an existing pattern**
`look at how the GitHub webhook handler is implemented to understand the pattern, then build a Stripe webhook handler the same way`
*Why:* point at code you already like — without a reference Claude defaults to generic best practices; with one it matches your conventions. *Make it stick:* have Claude write the pattern into `CLAUDE.md`.

**Generate docs for undocumented code**
`find the public functions in src/auth/ without JSDoc comments and add them, matching the style already used in the file`
*Why:* name the scope and format; Claude matches the existing comment style. *(roles: Docs)*

**Add a small, well-defined feature**
`add a /health endpoint that returns the app version and uptime`
*Why:* state inputs and outputs, not how to build it — Claude finds where similar code lives and adds yours alongside.

**Build a small internal tool from scratch**
`create a drag-and-drop Kanban board with three columns using HTML, CSS, and vanilla JavaScript, then open it in my browser`
*Why:* no project, framework, or build step needed — describe the tool and see it working immediately. *(roles: PM, Design, Marketing, Docs)*

**Work an issue end to end**
`read issue #312, implement the fix, and run the tests`
*Why:* give the issue number, not a summary — Claude reads the full ticket so requirements you'd forget come through, and it validates before reporting. *(needs: gh CLI)*

**Find and update copy across the codebase**
`find every place we say "Sign up free" or a close variant, show me each one in context, then update them all to "Start free trial". leave tests and the changelog alone`
*Why:* ask for variants and say what to skip — catches phrasings a literal search misses, leaves fixtures/history alone. *(roles: Design, Docs, Marketing)*

**Draft a document from past examples**
`read the privacy impact assessments in legal/pia/ to learn the structure and voice, then draft a new one for the new analytics integration`
*Why:* point at a folder of finished work instead of describing your style — the first draft reads like one of yours. *Make it stick:* save the voice as a skill. *(roles: Docs, Marketing, PM)*

### Test
**Write tests, run them, fix failures**
`write tests for app/parsers/feed.py, run them, and fix any failures`
*Why:* ask for write + run + fix together so Claude iterates without stopping for instructions. *Make it stick:* run `/init` so Claude learns your test command.

**Drive implementation from tests**
`write tests for the password reset flow first, then implement it until they pass`
*Why:* TDD — the tests define "done" and Claude iterates until they pass.

**Fill gaps from a coverage report**
`read coverage/coverage-summary.json and add tests for the lowest-covered files until each is above 80%`
*Why:* point at the actual coverage numbers instead of guessing what's untested. *Make it stick:* set as a `/goal` so it keeps writing tests until coverage hits the target.

### Refactor
**Migrate a pattern across the codebase**
`migrate everything from the old logging API to the structured logger: identify every place that needs to change, then make the changes`
*Why:* describe old → new and ask Claude to identify every call site first, so nothing is missed.

**Port code to another language**
`port this Python module to Rust, keeping the same public API and test behavior`
*Why:* say what to preserve, not just the target language — naming the contract gives Claude something to check the port against.

**Optimize against a measurable target**
`optimize the search query to bring p95 latency from 2s down to under 500ms`
*Why:* stating metric + target gives a clear definition of done. *Make it stick:* set as a `/goal` so it keeps measuring until it hits the number. *(roles: Data)*

**Fix a precise visual bug**
`the login button extends 20px beyond the card border on mobile. fix it.`
*Why:* precise visual feedback (element, measurement, viewport) gets a precise fix. *Make it stick:* add a preview tool so Claude screenshots and verifies. *(roles: Design)*

### Review
**Review your changes before you commit**
`review my uncommitted changes and flag anything that looks risky before I commit`
*Why:* Claude reads the changed files in full, not just diff lines, so it spots issues a quick self-review misses. *Make it stick:* run `/code-review` for the same check in one command.

**Review a pull request**
`review PR #247 and summarize what changed, then list any concerns`
*Why:* Claude reviews with the whole codebase in context, not just the diff. *Make it stick:* turn on Code Review for every PR. *(needs: gh CLI)*

**Review infrastructure changes before applying**
*(paste your Terraform plan output, then:)* `what is this going to do, and is anything here going to cause problems?`
*Why:* plan output is dense — pasting it gets a plain-language summary before you apply. *(roles: Security, Ops)*

**Run a security review with a subagent**
`use a subagent to review src/api/ for security issues and report what it finds`
*Why:* a subagent runs the audit in its own context and reports a summary, so a long review doesn't fill your main session. *Make it stick:* set up a dedicated security-review subagent. *(roles: Security)*

**Catch issues before formal review**
`review launch-post.md for unsupported claims, missing attributions, and brand-guideline issues and list anything I should fix before it goes to legal`
*Why:* get a focused first pass before a human spends time on it. *Make it stick:* capture your review checklist as a team skill. *(roles: Marketing, Docs)*

### Steer
**Course-correct a wrong approach**
`that is not right: the function signature needs to stay backward-compatible. try a different approach`
*Why:* name the constraint Claude missed, not just that it's wrong — a specific reason beats "guess again." *Make it stick:* `Esc Esc` to rewind code + conversation so the retry starts clean.

**Narrow the scope of a change**
`that is too much. keep only the changes to the validation logic in src/forms/ and undo your other edits`
*Why:* when the direction is right but the change went too broad, keep part of it instead of rewinding everything.

**Turn a correction into a rule**
`you keep using default exports when this project uses named exports. add a rule to CLAUDE.md so this stops happening`
*Why:* a chat correction isn't shared; a `CLAUDE.md` rule is read at the start of every session (and shared once committed). *Make it stick:* open `/memory` to review what Claude wrote.

---

## 🚢 SHIP — git and release

### Git
**Resolve merge conflicts**
`resolve the merge conflicts in this branch and explain what you kept from each side`
*Why:* say what state you want, not which markers to keep — asking for the reasoning makes the merge reviewable.

**Commit with a generated message**
`commit these changes with a message that summarizes what I did`
*Why:* Claude derives the message from the diff and matches your repo's existing commit style.

**Open a pull request from a ticket**
`find the Linear ticket about the login timeout and open a PR that implements it`
*Why:* one prompt reads the spec, makes the change, and opens the PR — no context switch between tracker, editor, and GitHub. *(needs: issue tracker via MCP)*

### Release
**Draft release notes from git history**
`compare v2.3.0 to v2.4.0 and draft release notes grouped by feature, fix, and breaking change`
*Why:* give two reference points and the structure — Claude reads the commit log between them. *Make it stick:* save as a `/changelog` skill. *(roles: PM, Docs, Marketing)*

**Write a CI workflow**
`write a GitHub Actions workflow that runs the tests and deploys to staging on every push to main`
*Why:* describe when it runs and what it does; the YAML is generated, matched to your build/test commands. *(roles: Ops)*

---

## 🛠️ OPERATE — debug, incident, data, automate

### Debug
**Find and fix a failing test**
`the UserAuth test is failing, find out why and fix it`
*Why:* describe the symptom — you don't need to know which file is broken; Claude runs the test, traces into source, and fixes.

**Investigate a reported error**
`users are seeing 500 errors on /api/settings. investigate and tell me what is going on`
*Why:* describe symptom + location; Claude reads the relevant path and traces likely causes. *Make it stick:* put a deeplink in your runbook that opens Claude with this pre-filled. *(roles: Ops)*

**Fix a build error at the root**
*(paste the build error, then:)* `fix the root cause and verify the build succeeds`
*Why:* asking for root cause + verification prevents surface patches that just suppress the error. *(roles: Ops)*

### Incident
**Investigate a production incident**
`the checkout endpoint started returning 500s an hour ago. check the logs, recent deploys, and config changes, then tell me the most likely cause`
*Why:* list the evidence sources to correlate, not the steps to take — Claude reads logs, git history, and config together. *Make it stick:* connect Sentry/log store via MCP. *(roles: Ops, Security)*

**Diagnose from a console screenshot**
*(paste a screenshot of the console, then:)* `walk me through why this pod is failing and give me the exact commands to fix it`
*Why:* cloud consoles show the problem but not the fix — Claude translates the dashboard into kubectl/gcloud/aws commands. *(roles: Ops, Data)*

**Query logs in plain English**
`show me all failed logins for the auth service over the past 24 hours. write the query, run it, and tell me what stands out`
*Why:* ask the question instead of writing SQL — Claude builds the query, runs it, and shows both query and result. *(needs: data/log store via MCP)*

### Data
**Analyze a data file**
`read @reports/q1-signups.csv, summarize the key patterns, and write the results to an HTML page with charts, then open it in my browser`
*Why:* a one-off question doesn't need a one-off script — point at a file and Claude reads it directly. *Make it stick:* connect the data source via MCP instead of exporting files. *(roles: Data, PM, Marketing)*

**Generate variations from performance data**
`read @ads-performance.csv, find the underperforming headlines, and generate 20 new variations that stay under 90 characters`
*Why:* state the constraint up front so generation stays within the limit. *Make it stick:* connect the ad platform via MCP. *(roles: Marketing, Data)*

### Automate
**Turn a recurring task into a skill**
`create a /ship skill for this project that runs the linter and tests, then drafts a commit message`
*Why:* name the steps once, reuse them as a command — Claude writes a skill anyone on your team can run.

**Add a hook for repeat behavior**
`write a hook that runs prettier after every edit to a .ts or .tsx file`
*Why:* hooks make a behavior automatic instead of something you must remember to ask for.

**Connect a tool with MCP**
`set up the Sentry MCP server so you can read my error reports directly`
*Why:* connect the source once instead of pasting data every session.

**Capture what to remember for next time**
`summarize what we did this session and suggest what to add to CLAUDE.md`
*Why:* Claude knows what it had to figure out this session and proposes `CLAUDE.md` entries so the next session starts with that context. *(roles: PM, Docs)*

---

## The 6 patterns behind every prompt

Recognizing these lets you adapt any prompt (or write your own):

1. **Describe the outcome, not the steps.** Say what you want; let Claude find the files. *`add rate limiting to the public API and make sure existing tests still pass`*
2. **Give it a way to check its own work.** Ask for run/test/compare/verify in the same prompt so it iterates instead of stopping. *`write the migration, run it against the dev database, and confirm the schema matches`*
3. **Point at a reference.** Name an existing file/test/pattern to match. *`add a settings page that follows the same layout as the profile page`*
4. **State the measurable target.** Give the metric and threshold so "done" is unambiguous. *`get the bundle size under 200KB and show me what you removed`*
5. **Give it the artifact.** Paste errors/logs/screenshots or `@`-mention files instead of describing them. *`why is the build failing? @build.log`*
6. **Say how you want the answer.** Name format, length, or audience. *`explain how the payment retry logic works as an HTML page with a diagram, then open it in my browser`*

**The through-line:** once a prompt works, make it *repeatable* — save it as a **skill** (`/command`), record the convention in **CLAUDE.md**, or enforce it with a **hook**. That's how a good prompt compounds into a workflow.
