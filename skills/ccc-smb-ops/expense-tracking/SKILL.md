---
name: expense-tracking
description: "Categorize business spending, run a receipt-capture workflow, and compare budget vs. actual — so you always know where the money went and why."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, expenses, bookkeeping, budget, receipts]
disable-model-invocation: true
---

# Expense Tracking

## What This Does

Turns a pile of transactions and receipts into a clear picture of where your money goes. Three parts: a consistent **category system**, a **receipt-capture workflow** so nothing is lost at tax time, and a **budget-vs-actual** review so overspending gets caught the month it happens — not a year later. Works from a bank/card CSV export or a typed-out list; no accounting software required.

## Part A — Categorize Spending

1. **Pull the transactions.** Export the month's bank and card activity to CSV, or list them out.
2. **Assign each transaction one category.** Use a small, fixed set so totals stay comparable month to month. A common small-business starter set (adapt to your business — confirm tax categories with your accountant):

   | Category | Examples |
   |----------|----------|
   | Cost of goods / materials | Inventory, raw materials, direct supplies |
   | Payroll & contractors | Wages, contractor payments (see `payroll-planning`) |
   | Rent & utilities | Space, electricity, water, internet, phone |
   | Software & subscriptions | SaaS tools, hosting, licenses |
   | Marketing & advertising | Ads, content, events, sponsorships |
   | Professional services | Accounting, legal, consulting |
   | Insurance | Liability, property, workers' comp |
   | Travel & meals | Mileage, lodging, client meals |
   | Equipment | Hardware, machinery, furniture |
   | Fees & interest | Bank fees, card processing, loan interest |
   | Taxes & licenses | Permits, registrations, tax payments |
   | Other / uncategorized | Park here only temporarily |

3. **Drive "Other" to near zero.** Anything sitting in Other is a gap in your picture — recategorize before you close the month.
4. **Flag the two kinds that need attention:**
   - **Business vs. personal:** flag any personal spend that hit a business account (and vice versa) to fix.
   - **Fixed vs. variable:** mark which costs are fixed (rent, software) vs. variable (materials, ads) — this matters for `cash-flow-forecast` and for knowing what you can cut fast.

## Part B — Receipt-Capture Workflow

A category without a receipt can't survive an audit. Make capture a habit, not a scramble:

```markdown
Capture rule (do it at point of purchase):
1. Photograph or save the receipt immediately.
2. Name it: {YYYY-MM-DD}_{vendor}_{amount}.  e.g. 2026-07-03_staples_48.20
3. Drop it in one dated folder per month.
4. Note the category and the business reason (esp. for meals/travel).

Weekly reconcile:
- [ ] Every card/bank charge has a matching receipt
- [ ] Every receipt has a matching charge (catch double-bills)
- [ ] Missing receipts listed and chased while memory is fresh
```

Keep receipts for the retention period your jurisdiction requires (confirm with your accountant).

## Part C — Budget vs. Actual

Compare what you planned to spend against what you actually spent, by category:

```markdown
# Budget vs. Actual — {Month YYYY}

| Category | Budget | Actual | Variance | % | Note |
|----------|--------|--------|----------|---|------|
| {category} | {$} | {$} | {+/-$} | {+/-%} | {why} |
| … | … | … | … | … | … |
| **Total** | **{$}** | **{$}** | **{+/-$}** | | |

## Over-budget flags (variance > {threshold}%)
1. {category} — over by {$} — {cause / action}

## Trend watch
- Categories creeping up 3 months running: {list}
```

- Set a **variance threshold** (e.g. 10%). Anything over it gets a one-line explanation and, if needed, an action.
- Watch **trends, not just single months** — a category that grows a little every month is the one that surprises you.

## Output Format

Deliver one of: a **categorized transaction list** (with Other driven to zero and business/personal flagged), a **receipt reconciliation** (matched, missing, double-billed), or a **budget-vs-actual** table with over-budget flags. Always surface the top over-spend to address.

## Tips

- **One transaction, one category, every time.** Consistency is what makes month-to-month comparison meaningful.
- Capture receipts at the moment of purchase — reconstructing them later is where deductions get lost.
- "Other/uncategorized" is a to-do list, not a category. Empty it before closing the month.
- Separate business and personal accounts if you can — it removes the single biggest source of bookkeeping mess.
- Feed fixed-cost totals into `cash-flow-forecast`; they're the baseline your forecast leans on.
- Budget-vs-actual is only useful if you act on the variance — a flagged overspend with no action is just a nicer-looking surprise.
- This organizes spending and receipts; it does not determine tax-deductibility or file returns. Confirm categories and retention rules with a licensed accountant.
