---
name: ccc-content
description: "Draft blog posts, social threads, email campaigns, landing-page copy and docs in three questions, with an optional brief, review and scheduling pipeline. Use when the user asks to write a post, thread, newsletter, email campaign or marketing copy, repurpose a URL, or types $ccc-content."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebFetch
  - AskUserQuestion
argument-hint: "[blog | social | email | landing | docs] [topic] [--power]"
model: inherit
effort: medium
---

# $ccc-content — draft it in three questions

**CC Commander** · $ccc-content · a ready-to-edit draft in the conversation; Power Mode adds a brief, a fresh-context review, variations and optional scheduling.

The user's selected model is preserved. Placeholders such as `~~social media`, `~~email` and `~~files` mean whatever connector the user enabled through `$ccc-connect`; see [CONNECTORS.md](../../CONNECTORS.md). Every connector is opt-in and absent by default.

Codex: ask each picker as a plain-text question with the same options, and run the review pass inline when the Agent tool is unavailable.

## When to use / when not to

- Use for one piece of content or a small set: a blog post, a thread or LinkedIn post, an email or short sequence, landing-page copy, a doc page, or repurposing a pasted URL.
- Use `$ccc-marketing` for strategy, positioning, CRO or a multi-channel campaign, `$ccc-seo` for keyword briefs and technical SEO, and `$ccc-broadcast` for automated team status updates.

## What happens

### 1. Context strip

Run in one Bash call, silent on failure, so drafts match the existing voice:

```bash
ls marketing-context.md .agents/marketing-context.md Design.md 2>/dev/null
ls content blog posts docs 2>/dev/null | head -5
```

If a marketing context file exists, Read it and apply its voice, audience and banned phrases. If `~~files` is connected, offer to pull a brand voice doc or style guide from it.

### 2. Quick Mode (default)

Skip any question the argument already answers. Ask at most three:

**Question 1 — Content type.** AskUserQuestion, header "CC Commander · Content", question "What kind of content are we creating?". Put the best match for the request first, marked 🟢 (default: blog post; a pasted URL means social repurposing):

- 📝 Blog post or article — long form: tutorial, opinion, how-to, case study.
- 🌐 Social posts — X thread, LinkedIn post, Instagram caption, with per-platform variants.
- 🎯 Email campaign or newsletter — announcement, nurture, drip sequence, transactional.
- 🔧 Something else — landing page, docs, ads or other copy; described in chat.

On "Something else", ask once in chat: "Describe what you need; I'll produce it."

**Question 2 — Topic.** Free text in chat: "What's this about? One sentence is enough." If the user pasted a URL, fetch it with WebFetch and use it as the source instead of asking.

**Question 3 — Audience.** AskUserQuestion, question "Who is this for?", recommended first and marked 🟢 (from the marketing context when present; otherwise Developers):

- Developers — engineers, technical founders, devtools users.
- Founders and executives — decision-makers and budget owners.
- Consumers — end users and a non-technical public.
- Internal team — colleagues and stakeholders.

Then draft immediately using the matching structure in [references/templates.md](references/templates.md). For social, produce one variant per platform. Offer two or three headline or hook options.

### 3. Power Mode (`--power` or "detailed")

1. **Brief** — state audience, tone, CTA, keywords and target length in five lines; confirm or adjust in chat.
2. **Draft** — the full piece with formatting, from the template.
3. **Review pass** — call the Agent tool (`description: "Review content draft"`, `effort: medium`) with the brief and the draft, asking it to refute clarity, tone consistency, factual claims and CTA strength and to return a numbered list of fixes. The drafter is not the reviewer. Apply the fixes it supports with evidence.
4. **Variations** — A/B options for headline, hook and CTA.
5. **Save** — Write the final draft to `output/content/YYYY-MM-DD-<slug>.md` in the project (use `output/<brand>/content/` when the project already keeps per-brand folders).
6. **Schedule or draft in a connector (optional)** — see step 4.

### 4. Connectors (only when connected)

Check the session's tool list for a `~~social media`, `~~email` or `~~files` connector before offering any of these. Nothing leaves the conversation without the picker below, asked at the moment of the write and per item:

AskUserQuestion, question "Send this draft to <connector>?":

- 🟢 Keep it here — no external write; the draft stays in the conversation and the saved file.
- Save as a draft in <connector> — Typefully/Buffer draft, Gmail draft or Drive file; nothing is published or sent.
- Schedule it — queue for a time the user names; the connector publishes or sends then.

- `~~social media`: create the draft or scheduled post; suggest a posting time from the audience; afterwards, read engagement through the connector when it exposes analytics.
- `~~email`: create the campaign as an email draft and show the rendered preview before any scheduled send.
- `~~files`: save the draft to the folder the user names; reference earlier content there for consistency.

## Done when

Run before reporting, and report the actual result:

- Draft delivered in the conversation, matching the chosen type and audience.
- Social: every post is within its platform limit. When a file was saved, check X posts with `awk 'length > 280 {print NR": "length}' <file>` and report any line it prints.
- Power Mode: `wc -w output/content/<file>.md` is within the brief's target range, and each reviewer fix is listed as applied or declined with a reason.
- Connector write: the connector returned a draft or schedule id; quote it. No id means it did not happen; say so.

## Guardrails

- Never publish, schedule, send or upload without the per-item picker in step 4 and the user's choice in this conversation.
- Never invent statistics, quotes, customer names or results; mark any claim that needs a source as `[source needed]`.
- Never copy a fetched URL's text verbatim beyond short quotes; repurpose, attribute and link.
- Never put credentials, private customer data or internal-only details into public copy.
- Never overwrite an existing file in `output/` without asking; write a new dated file instead.

## See also

- `$ccc-marketing` — strategy, CRO, campaigns and launches
- `$ccc-seo` — keyword briefs, content clusters and technical SEO
- `$ccc-connect` — enable `~~social media`, `~~email` or `~~files`
- `$ccc-broadcast` — automated status updates to a team channel

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
