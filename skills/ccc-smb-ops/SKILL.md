---
name: ccc-smb-ops
description: "CCC domain — complete small-business-operations ecosystem — 6 skills in one. 13-week cash-flow forecasting, invoicing and AR chasing, payroll planning, CRM hygiene, expense tracking, and a weekly owner brief."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
tags: [CCC domain, small-business, operations, finance, bookkeeping]
---

# ccc-smb-ops

> Load ONE skill. Get the entire back-office operations domain for a small business. Written for the owner who runs the shop, not the accountant — plain-language checklists and copy-paste templates, no spreadsheets-as-a-hobby required.

## Sub-Skills

| # | Skill | Command | Description |
|---|-------|---------|-------------|
| 1 | cash-flow-forecast | `/cash-flow-forecast` | Build a 13-week rolling cash-flow forecast from your bank balance, AR, and AP |
| 2 | invoicing-ar | `/invoicing-ar` | Generate clean invoices and chase unpaid ones with a polite dunning ladder |
| 3 | payroll-planning | `/payroll-planning` | Plan each payroll run, tax-withholding checklist, and a headcount cost model |
| 4 | crm-hygiene | `/crm-hygiene` | Clean up contacts — dedup, sweep stale leads, review the sales pipeline |
| 5 | expense-tracking | `/expense-tracking` | Categorize spending, capture receipts, and compare budget vs. actual |
| 6 | weekly-owner-brief | `/weekly-owner-brief` | A Monday one-page brief: cash, AR aging, pipeline, and your top 3 actions |

## How To Use

**Step 1:** Tell me what you're trying to get on top of — money coming in, money going out, who owes you, or just "give me the Monday picture."

**Step 2:** I'll confirm what records you have on hand (bank export, invoice list, expense receipts, contact list) before routing. Everything here works from a plain CSV or even a typed-out list — no special software required.

**Step 3:** The specialist skill walks you through it with a checklist or a fill-in template. You get real back-office coverage without learning six separate tools.

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Will I make payroll?" / "Cash forecast" / "Runway" | `cash-flow-forecast` | `expense-tracking` (categorizes past spend, not future cash) |
| "Send an invoice" / "Chase who owes me" / "Follow up on unpaid" | `invoicing-ar` | `cash-flow-forecast` (uses AR totals, doesn't chase them) |
| "Run payroll" / "How much will hiring cost" / "Withholding" | `payroll-planning` | `expense-tracking` (payroll is planned, not categorized after) |
| "Clean up my contacts" / "Dead leads" / "Pipeline review" | `crm-hygiene` | `invoicing-ar` (customers who owe, not leads) |
| "Where did the money go" / "Categorize expenses" / "Budget vs actual" | `expense-tracking` | `payroll-planning` (wages are their own plan) |
| "Give me the Monday picture" / "Owner update" / "Weekly summary" | `weekly-owner-brief` | any single skill (this one pulls them together) |

## Campaign Templates

### Month-End Close (the 90-minute version)
1. `expense-tracking` -> categorize the month's spending and reconcile receipts
2. `invoicing-ar` -> send any un-billed work and update the AR aging list
3. `cash-flow-forecast` -> roll the 13-week forecast forward one week with real balances
4. `weekly-owner-brief` -> produce the summary you'll actually read
5. Deliver: a closed month with cash, AR, and spending all reconciled to the same numbers

### Get-Paid Sprint (cash is tight)
1. `invoicing-ar` -> pull the AR aging report, fire the dunning ladder on everything 30+ days late
2. `cash-flow-forecast` -> model best-case vs. worst-case collection to see if payroll clears
3. `expense-tracking` -> flag discretionary spend you can pause this week
4. Deliver: a prioritized collections list plus a cut-list if collections slip

### New-Hire Decision
1. `payroll-planning` -> build the fully-loaded cost of the role (wage + employer taxes + overhead)
2. `cash-flow-forecast` -> drop the new cost into the 13-week view and check the trough
3. `weekly-owner-brief` -> frame the go / no-go with the numbers attached
4. Deliver: a yes/no on the hire backed by a cash trough you can live with

### Monday Reset (every week)
1. `weekly-owner-brief` -> the one-pager
2. Route into whichever line item is red — usually `invoicing-ar` or `cash-flow-forecast`
3. Deliver: three concrete actions before 10am

## Operating Cadence

| Rhythm | What to run | Why |
|--------|-------------|-----|
| Every Monday | `weekly-owner-brief` | Start the week knowing cash, AR, and the top 3 |
| Weekly | `invoicing-ar` | A stale invoice is money you already earned — chase on a schedule |
| Weekly | `cash-flow-forecast` (roll forward) | The forecast is only useful if it stays current |
| Each pay period | `payroll-planning` | Confirm the run clears before you approve it |
| Monthly | `expense-tracking` + `crm-hygiene` | Close the books; keep the pipeline honest |

## Ground Rules

- **Tool-agnostic.** Everything works from a bank CSV, an invoice list, or a typed-out set of numbers. If you use accounting or CRM software, export to CSV and these still apply.
- **You are not a bank or an accountant.** These skills organize and forecast — they do not file taxes, move money, or give regulated financial or tax advice. Confirm tax and payroll filings with a licensed professional.
- **Same numbers everywhere.** Cash, AR, and spending should reconcile across skills. If two skills disagree, stop and find the discrepancy before acting.

## Context Strategy

This CCC domain uses on-demand loading. Sub-skills have `disable-model-invocation: true` so they only load when explicitly invoked, keeping your context lean.
