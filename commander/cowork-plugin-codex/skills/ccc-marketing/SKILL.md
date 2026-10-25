---
name: ccc-marketing
description: "Marketing router: brand context, content, CRO, email and ads, growth experiments, competitor intel, pricing, launches. Use for marketing campaigns."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - WebFetch
  - AskUserQuestion
argument-hint: "[what you want, in plain words]"
model: sonnet
effort: medium
---

# $ccc-marketing — route the marketing job

**CC Commander** · $ccc-marketing · one pick from intent to the right marketing method, grounded in one shared brand context file.

The user's selected model is preserved unless they choose otherwise. Marketing sub-skills (`marketing-context`, `content-production`, `page-cro` and the rest) ship with the Commander CLI toolkit under `skills/ccc-marketing/<name>/`. Invoke one with the Skill tool when it is listed in this session; otherwise apply its one-line method from [references/routing.md](references/routing.md). Sub-skills that ship Python helpers run them with `python3` from their own `scripts/` directory; they use the standard library only.

Codex: ask pickers as plain-text questions with the same options, and read a sub-skill's `SKILL.md` directly instead of using the Skill tool.

## When to use / when not to

- Use for marketing strategy and execution: brand context, content plans, landing-page and funnel conversion, email sequences, paid ads, cold email, A/B tests, referral programs, competitor pages, pricing, and launches.
- Use `$ccc-content` for a single quick draft, `$ccc-seo` for technical SEO, AI-search optimization and keyword briefs, and `$ccc-design` for the page's visual build.

## What happens

### 1. Context strip

Run in one Bash call, silent on failure:

```bash
ls marketing-context.md .agents/marketing-context.md 2>/dev/null
ls seo-context.md Design.md 2>/dev/null
git log -1 --format=%cr -- marketing-context.md .agents/marketing-context.md 2>/dev/null
```

Render one line:

> 🎯 Marketing context: <found at path, updated N ago | missing> · SEO context <yes | no> · Design.md <yes | no>

If a context file exists, Read it before any routed work; every sub-skill depends on it.

### 2. Route by intent, or ask

When the request already names the job, route straight to it with the intent table in [references/routing.md](references/routing.md) and skip the picker.

Otherwise ask with AskUserQuestion (header "Marketing", question "What marketing work?"). Put the recommended option first, marked 🟢:

- 🧠 Set up brand context — a guided interview that writes `marketing-context.md`; every other method reads it. Recommend first when step 1 found no context file.
- 📝 Content — plan, produce, edit and humanize content.
- 📊 Conversion — page, signup, onboarding, form, popup and paywall optimization.
- 🔄 More — growth, channels, intelligence, pricing, launch, SEO.

When context exists, the 🟢 default is Content.

On "More", ask a second picker, question "Which area?":

- 🟢 Channels and growth — email sequences, paid ads, cold email, A/B tests, referral, churn.
- 🚀 Launch and pricing — launch plan, Product Hunt, pricing strategy.
- 🔬 Intelligence — competitor pages, positioning, marketing psychology, campaign analytics.
- 🌐 SEO — hand off to `$ccc-seo`.

Dispatch the selection immediately; do not re-prompt.

### 3. Run the routed method

1. If brand context is missing and the routed method is not `marketing-context`, run `marketing-context` first or ask the user for audience, positioning and voice in three lines.
2. Invoke the routed sub-skill with the Skill tool, passing the user's request and the context file path. If it is not listed, follow its row in [references/routing.md](references/routing.md).
3. For a multi-step pipeline (for example `content-strategy` → `content-production` → `content-humanizer`), run the stages in order and show each stage's output before the next.
4. Write deliverables (plans, copy, test designs) to files only when the user asks or the sub-skill's method says to; prefer `output/marketing/YYYY-MM-DD-<slug>.md` in the project.

## Done when

Run before reporting, and report the actual result:

- Context capture: `grep -c '^## ' marketing-context.md` (or the `.agents/` path) shows the sections the method defines.
- Copy or content: delivered in the conversation, and any saved file exists (`ls -la <path>`).
- Code changed (tracking snippet, page copy in a repo): the project's build or typecheck exits 0 and `git status --short` lists only the intended files.
- Calculators and analyzers: the `python3` command exited 0 and its numbers are quoted from the output, not estimated.

## Guardrails

- Never list every sub-skill as a menu; pickers have two to four options.
- Never send email, publish posts, launch ads, change pricing or post on a launch platform from this skill; draft only, and hand any external write to the connector flow in `$ccc-content`, which asks per item.
- Never invent statistics, testimonials, customer logos or competitor claims; mark unsourced claims `[source needed]`.
- Never put credentials or private customer data into marketing context or copy.
- Cold outreach follows the recipient's local anti-spam rules; the skill drafts, the user sends.

## See also

- `$ccc-content` — a quick draft with optional per-item scheduling
- `$ccc-seo` — technical SEO, AI search and keyword briefs
- `$ccc-design` — landing-page visual build
- `$ccc-research` — market and competitor research

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
