---
name: ccc-marketing
description: "Route marketing work to the right sub-skill: content, SEO and AI search, conversion optimization, email and paid channels, growth loops, competitive intelligence, pricing and launches, with stdlib-only Python scoring tools. Use when the user needs marketing strategy, copy, SEO, CRO or campaign help."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[content | seo | cro | channels | growth | intel | launch | pricing]"
model: inherit
effort: medium
license: MIT
---

# /ccc-marketing — marketing work, routed

**CC Commander** · ccc-marketing · one router over the marketing pods, a shared context file, and scoring tools that need no installs.

Each sub-skill lives in its own directory beside this file. Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (on Codex, the same path relative to this file) and follow it. `marketing-ops` is the in-domain router: its routing matrix, cross-domain hand-offs and campaign sequences are canonical, so this file does not repeat them. The user's selected model is preserved.

Codex: ask each picker as a plain-text question; to start headless, run `codex exec "Read skills/ccc-marketing/marketing-ops/SKILL.md, then <task>"` from the repository root.

## Sub-skills

| Pod | Sub-skills |
|---|---|
| Foundation | `marketing-context` (brand voice, audience, competitors; every other sub-skill reads it), `marketing-ops` (router and campaign orchestration) |
| Content | `content-strategy`, `content-production`, `copywriting`, `copy-editing`, `content-humanizer`, `social-content`, `marketing-ideas`, `content-creator` (deprecated; redirects to `content-production` or `content-strategy`) |
| SEO | `seo-audit`, `ai-seo`, `schema-markup`, `site-architecture`, `programmatic-seo`, `seo-content-production` |
| CRO | `page-cro`, `form-cro`, `signup-flow-cro`, `onboarding-cro`, `popup-cro`, `paywall-upgrade-cro` |
| Channels | `email-sequence`, `cold-email`, `paid-ads`, `ad-creative`, `social-media-manager`, `influencer-outreach`, `marketing-demand-acquisition` |
| Growth | `ab-test-setup`, `referral-program`, `free-tool-strategy`, `churn-prevention` |
| Intelligence | `campaign-analytics`, `analytics-tracking`, `competitor-alternatives`, `marketing-psychology`, `social-media-analyzer` |
| Sales and GTM | `pricing-strategy`, `launch-strategy`, `product-hunt-launch`, `marketing-strategy-pmm` |
| Standalone | `app-store-optimization`, `brand-guidelines`, `prompt-engineer-toolkit` |

Python tools by sub-skill, with usage: [references/tools.md](references/tools.md).

## When to use / when not to

- Use for content plans and production, page and funnel conversion, SEO and AI-search visibility, email and paid campaigns, referral and retention programs, competitor pages, pricing and launches.
- Use `ccc-seo` for a site-wide technical SEO workflow, `ccc-design` for the visual build of a page, `ccc-data` for analytics pipelines and dashboards.

## What happens

1. **Load context.** Run `ls .agents/marketing-context.md marketing-context.md .claude/product-marketing-context.md 2>/dev/null`. Read the first file found. When none exists and the task is more than a one-off edit, ask with AskUserQuestion (header "Context"): 🟢 Create it first with `marketing-context` (one guided interview, reused by every sub-skill) · Skip and use only what is in this conversation.

2. **Route.** An argument or a clear intent picks the sub-skill from the table above, using the routing matrix in `marketing-ops/SKILL.md` to separate near neighbours (copywriting vs copy-editing, email-sequence vs cold-email, page-cro vs form-cro). A multi-skill campaign follows the matching sequence in `marketing-ops/SKILL.md`. Otherwise ask with AskUserQuestion (header "Marketing"), recommended first:

   - 🟢 Content — plan, write, edit or humanize content (`content-strategy`, `content-production`, `copywriting`)
   - SEO and AI search — audits, AI citation, schema, site structure (`seo-audit`, `ai-seo`)
   - Conversion — pages, forms, signup, onboarding, popups, paywalls (the CRO pod)
   - Something else — a follow-up picker with channels, growth, intelligence, and pricing and launch

3. **Load and run.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` and follow it. Write deliverables to files the user can review (for example `marketing/<topic>.md`), not only to chat.

4. **Score the output when a tool exists.** Run the matching script from [references/tools.md](references/tools.md), for example:

   ```bash
   python3 "${CLAUDE_SKILL_DIR}/content-production/scripts/content_scorer.py" marketing/post.md
   python3 "${CLAUDE_SKILL_DIR}/content-humanizer/scripts/humanizer_scorer.py" marketing/post.md
   ```

   Report the score it prints. When a score is below the sub-skill's bar, revise and re-run once before reporting.

## Done when

- Routing only: the sub-skill file was read in this turn and the user knows which one ran.
- A deliverable was written: `test -s <file> && echo ok` printed `ok`, and any scoring script that applies ran in this turn with its result reported.
- A context file was created: `python3 "${CLAUDE_SKILL_DIR}/marketing-context/scripts/context_validator.py" <file>` ran and its score is reported.

## Guardrails

- Never post, send, schedule or publish content, email a prospect or influencer, or change ad spend without authorization in this conversation; ask with a picker at that step.
- Never invent statistics, testimonials, reviews, customer names or competitor claims; mark anything unverified for the user to confirm.
- Never put customer personal data into prompts, scripts or committed files.
- Never route new work to `content-creator`; it is deprecated.

## See also

- `ccc-seo` — site-wide SEO workflow
- `ccc-design` — landing page and visual build
- `ccc-data` — analytics pipelines and dashboards
