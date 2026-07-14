---
name: weekly-owner-brief
description: "Produce a one-page Monday owner brief that pulls cash position, AR aging, sales pipeline, and the top 3 actions for the week — the whole business at a glance."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, reporting, owner-brief, dashboard, weekly]
disable-model-invocation: true
---

# Weekly Owner Brief

## What This Does

Produces the **Monday morning one-pager** every small-business owner needs: cash position, who owes you (AR aging), what's in the sales pipeline, and the **top 3 actions** for the week — on a single screen. It's the roll-up of the other `ccc-smb-ops` skills into one honest picture, so you start the week knowing exactly where things stand and what to do first. Designed to be read in two minutes and produced in fifteen.

## What It Pulls From

| Section | Source skill | If you don't have it yet |
|---------|--------------|--------------------------|
| Cash position & 13-week trough | `cash-flow-forecast` | Use today's bank balance + known big bills |
| AR aging & top overdue | `invoicing-ar` | List who owes you and how late |
| Pipeline & likely wins | `crm-hygiene` | List open deals and their stage |
| Spending flags | `expense-tracking` | Note any over-budget category |
| Payroll due this period | `payroll-planning` | Next pay date + amount |

The brief works even if you only have raw numbers — it's a structure, not a software integration.

## Instructions

1. **Pull the five inputs.** Grab the current numbers from each source skill (or the raw equivalents). Use the *latest actuals*, not last week's estimates.
2. **Compute the headline.** One line at the top that answers "are we OK this week?": current cash, the 13-week trough, and whether payroll clears.
3. **Fill each section with a number and a "so what."** Every line is a figure plus one clause of meaning — never a raw number alone. "AR: $18,400, of which $9,100 is 30+ days late" beats "AR: $18,400."
4. **Compare to last week.** Note the direction on the three that matter: cash, AR, pipeline. Trend beats snapshot.
5. **Choose exactly three actions.** Not ten. The three highest-leverage moves for *this* week, each with an owner and a route to the skill that does it. If everything's green, the actions can be growth moves instead of firefighting.
6. **Keep it to one page.** If it doesn't fit on a screen, it won't get read. Cut detail, keep decisions.

## Output Format

```markdown
# Weekly Owner Brief — {Business Name}
**Week of {YYYY-MM-DD}**

## Headline
{One line: cash {$}, 13-week trough {$} in week {n}, payroll {clears / at risk}.}

## Cash
- Bank balance today: {$}  ({▲/▼} {$} vs last week)
- 13-week trough: {$} in week {n} ({date})  — cushion {above/below} {$} minimum
- Payroll due {date}: {$}  → {covered / gap of $X}

## Accounts Receivable
- Total owed: {$}   |   30+ days late: {$}
- Top overdue: #{invoice} {customer} {$} ({days} late) → invoicing-ar

## Pipeline
- Open deals: {n} worth {$}
- Likely to close this month: {n} worth {$}
- Stuck / no next step: {n} → crm-hygiene

## Spending
- Over-budget this month: {category} by {$} → expense-tracking

## Top 3 Actions This Week
1. {Action} — {owner} — {route: e.g. invoicing-ar}
2. {Action} — {owner} — {route}
3. {Action} — {owner} — {route}
```

## Tips

- **Two minutes to read or it fails.** The whole value is that a busy owner actually looks at it. Ruthlessly cut anything that isn't a decision or a number-that-drives-one.
- **Every number needs a "so what."** A figure with no interpretation is trivia; pair each with its meaning.
- **Exactly three actions.** More than three isn't a plan, it's a wish list — pick the highest-leverage moves and route each to the skill that executes it.
- Run it the same time every Monday. Consistency turns it into the habit that keeps the business out of surprises.
- Lead with cash and payroll — those are the two that end a business fastest when missed.
- Show the trend arrows. "Cash up, AR down, pipeline flat" tells you more in one glance than three precise numbers.
- This summarizes your own figures for your decisions — it doesn't move money, send anything, or give regulated financial advice. The three actions are prompts for you to approve, not automatic steps.
