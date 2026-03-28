---
name: email-campaign
category: marketing
skills: [email-systems, email-capture, content-strategy]
mode: code
estimated_tokens: 600
---

# Email Campaign Design

## When to Use
When designing an email campaign — welcome sequence, product launch, re-engagement, or nurture flow. This template covers strategy, copy, and technical implementation.

## Template

```
Design an email campaign for the following goal. Include strategy, copy for each email, and technical setup.

**Campaign goal:**
{{what_the_campaign_should_achieve — signups, activations, upsells, re-engagement}}

**Audience:**
{{who_receives_these_emails — new signups, trial users, churned users, etc.}}

**Email platform:**
{{SendGrid|Resend|Postmark|Mailchimp|other — or say "recommend one"}}

**Trigger:**
{{what_triggers_the_sequence — signup, trial start, inactivity, purchase}}

**Step 1: Sequence design**
Plan the email flow:

| # | Timing | Subject | Goal | CTA |
|---|---|---|---|---|
| 1 | Day 0 | Welcome to {{product}} | Confirm signup, set expectations | Get started |
| 2 | Day 1 | {{value_prop_1}} | Educate on key feature | Try it |
| 3 | Day 3 | {{value_prop_2}} | Show social proof | See examples |
| 4 | Day 7 | {{urgency}} | Drive action before trial ends | Upgrade |
| 5 | Day 14 | {{last_chance}} | Final push or feedback request | Upgrade / Give feedback |

**Step 2: Write each email**
For each email in the sequence:
- **Subject line:** Under 50 characters, no spam trigger words (3 A/B variants)
- **Preview text:** Complements subject, under 90 characters
- **Body:** Scannable (short paragraphs, bullet points, bold key phrases)
- **CTA:** Single, clear call-to-action button
- **Tone:** {{conversational|professional|friendly}} — consistent across the sequence

**Step 3: Personalization**
- Use `{{first_name}}` where natural (not forced)
- Segment by behavior: different paths for active vs inactive users
- Dynamic content blocks based on user's plan/usage

**Step 4: Technical setup**
- Email HTML templates (responsive, dark mode compatible)
- Automation trigger configuration
- Unsubscribe handling and CAN-SPAM compliance
- Tracking: open rate, click rate, conversion per email
- A/B test setup for subject lines

**Step 5: Output**
For each email, produce:
1. Subject line (3 variants for A/B testing)
2. Preview text
3. Plain text version
4. HTML version (if requested)
5. Send timing and trigger conditions
```

## Tips
- Use the `email-systems` skill for SendGrid/Resend API integration
- The `email-capture` skill handles signup form and list management
- Keep emails short — under 200 words for transactional, under 500 for content

## Example

```
Design an email campaign for the following goal.

**Campaign goal:** Activate new signups — get them to complete their first project within 7 days
**Audience:** Users who signed up but haven't created a project yet
**Email platform:** Resend
**Trigger:** User signup (via webhook)
```
