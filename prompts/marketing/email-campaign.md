---
name: email-campaign
category: marketing
skills: [email-systems, email-capture, email-sequence]
mode: code
estimated_tokens: 650
---

# Email Campaign Design

## When to use
Use when designing an email campaign: welcome sequence, product launch, re-engagement, or nurture flow. The template covers strategy, copy, and technical setup. It drafts emails and configuration; sending to real recipients or enabling a live automation needs explicit authorization at that step.

## Template

```
Design an email campaign for the goal below. Include strategy, copy for each email, and technical setup.

**Campaign goal:**
{{what_the_campaign_should_achieve — signups, activations, upsells, re-engagement}}

**Audience:**
{{who_receives_these_emails — new signups, trial users, churned users}}

**Email platform:**
{{SendGrid|Resend|Postmark|Mailchimp|other — or "recommend one"}}

**Trigger:**
{{what_starts_the_sequence — signup, trial start, inactivity, purchase}}

Step 1: Sequence design
| # | Timing | Subject | Goal | CTA |
|---|---|---|---|---|
| 1 | Day 0 | Welcome to {{product}} | Confirm signup, set expectations | Get started |
| 2 | Day 1 | {{value_prop_1}} | Teach the key feature | Try it |
| 3 | Day 3 | {{value_prop_2}} | Show social proof | See examples |
| 4 | Day 7 | {{urgency}} | Drive action before the trial ends | Upgrade |
| 5 | Day 14 | {{last_chance}} | Final push or feedback request | Upgrade / Give feedback |

Step 2: Write each email
- Subject line: under 50 characters, no spam-trigger words, 3 A/B variants.
- Preview text: complements the subject, under 90 characters.
- Body: scannable, with short paragraphs, bullets, and bold key phrases.
- CTA: one clear button.
- Tone: {{conversational|professional|friendly}}, consistent across the sequence.

Step 3: Personalization
- Use the platform's first-name merge tag where it reads naturally.
- Segment by behavior: separate paths for active and inactive users.
- Use dynamic blocks based on the user's plan or usage.

Step 4: Technical setup
- Responsive HTML templates that render in dark mode.
- Automation trigger configuration.
- Unsubscribe handling and CAN-SPAM / GDPR compliance.
- Tracking: open rate, click rate, and conversion per email.
- Subject-line A/B test setup.
- Keep API keys in environment variables or the platform's secret store; never in templates or code.

Step 5: Output
For each email:
1. Subject line (3 A/B variants)
2. Preview text
3. Plain-text version
4. HTML version, when requested
5. Send timing and trigger conditions
Then list how to send a test email to an internal address before any live send.
```

## Tips
- Use `email-systems` for SendGrid or Resend API integration, `email-capture` for signup forms and list management, and `email-sequence` for sequence strategy.
- Keep emails short: under 200 words for transactional, under 500 for content.

## Example

```
Design an email campaign for the goal below.

**Campaign goal:** Activate new signups so they complete their first project within 7 days
**Audience:** Users who signed up but have not created a project
**Email platform:** Resend
**Trigger:** User signup (via webhook)
```
