---
name: content
description: "\"Create content — blog posts, social media, emails, marketing copy, or docs. Use when: 'create content', 'write post', 'blog', 'social media', 'email campaign', 'write a tweet', 'LinkedIn post', 'newsletter', 'marketing copy'.\" [Commander]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<content type and topic>"
---

# /ccc:content

> Placeholders like ~~social media and ~~email refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Create any type of content — from a single tweet to a full email sequence. Quick Mode produces a draft in under 3 questions. Power Mode runs the full pipeline: draft → review → schedule.

## Quick Mode (default)

Ask three questions — use `AskUserQuestion` for Questions 1 and 3 (chip pickers). Question 2 is free-text (topic is inherently open-ended).

**Question 1 — Content type:**

Use `AskUserQuestion` with these chips (max 4; "Something else" covers remaining types):
```
question: "What kind of content are we creating?"
options:
  - label: "📝 Blog post or article"
    description: "Long-form — tutorial, opinion, how-to, case study."
  - label: "📱 Social media posts"
    description: "Twitter/X thread, LinkedIn post, Instagram caption."
  - label: "📧 Email campaign or newsletter"
    description: "Drip sequence, announcement, nurture, transactional."
  - label: "💼 Something else"
    description: "Marketing copy, landing page, docs, ads — describe in chat."
```

If user picks "Something else", ask one follow-up in chat: "Describe what you need — I'll produce it."

**Question 2 — Topic (free-text — open-ended by nature):**
Ask in chat: "What's this about? One sentence is enough."

**Question 3 — Audience:**

Use `AskUserQuestion` with these chips:
```
question: "Who is this for?"
options:
  - label: "👩‍💻 Developers"
    description: "Engineers, technical founders, devtools users."
  - label: "🚀 Founders / executives"
    description: "Decision-makers, C-suite, startup founders."
  - label: "🛒 Consumers"
    description: "End users, general public, non-technical audience."
  - label: "🏢 Internal team"
    description: "Colleagues, employees, internal stakeholders."
```

Draft the content immediately. For social posts, generate platform-specific variations.

## Power Mode

Activate by passing `--power` or `detailed`.

Full content pipeline:
1. **Brief** — target audience, tone, CTA, keywords, word count
2. **Draft** — full content with formatting
3. **Review pass** — clarity, tone consistency, CTA strength
4. **Variations** — A/B options for headlines and CTAs
5. **Schedule** — via ~~social media or ~~email connectors

## Content Templates

### Blog Post
```
- Hook (problem or surprising stat)
- Context (why this matters now)
- Main sections (H2s with substance)
- Practical takeaways
- CTA
Target: 800-2000 words
```

### Twitter/X Thread
```
- Tweet 1: Hook (bold claim or question)
- Tweets 2-8: One point per tweet, concrete
- Tweet 9: Summary
- Tweet 10: CTA
Format: each tweet ≤280 chars, emoji optional
```

### Email Campaign
```
Subject line (A/B options)
Preview text
Body: hook → value → proof → CTA
Unsubscribe footer
```

### Landing Page Copy
```
Hero headline + subheadline
3 value props (feature → benefit → proof)
Social proof section
FAQ
CTA section
```

## If Connectors Available

If **~~social media** is connected (Typefully):
- After drafting, offer to schedule the post via Typefully
- Set optimal posting time based on your audience
- Track engagement after posting

If **~~files** (Google Drive) is connected:
- Pull existing brand voice docs, style guides, or content calendars
- Reference prior content for consistency
- Save drafts directly to Drive folders

If **~~email** is connected (Gmail):
- Draft email campaigns directly as Gmail drafts
- Preview rendering before send
- Schedule send time

## Output

Content is written directly to the conversation for immediate review and editing. In Power Mode, also saved to `output/<business-unit>/content/YYYY-MM-DD-<slug>.md`.

## Tips

1. **Give a URL for repurposing** — paste a blog post URL and ask for 5 tweet variations; it works.
2. **Specify tone** — "casual and direct" vs. "professional and formal" makes a big difference.
3. **Request variations** — always ask for 2-3 headline options; pick your favorite.
4. **Schedule beats manual** — with ~~social media connected, schedule a week of posts in one session.
