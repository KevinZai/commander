---
name: cash-flow-forecast
description: "Build a 13-week rolling cash-flow forecast from your bank balance, accounts receivable, and accounts payable — see the cash trough before it hits."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, cash-flow, forecasting, finance]
disable-model-invocation: true
---

# Cash-Flow Forecast (13-Week Rolling)

## What This Does

Builds a **13-week rolling cash-flow forecast** — the small-business standard for seeing whether you can cover payroll, rent, and bills over the next quarter. It starts from today's real bank balance, layers in the money you expect to collect (accounts receivable) and the money you owe (accounts payable), and shows the **lowest point (the "trough")** so you can act before you run short. "Rolling" means each week you drop the oldest week and add a new week 13, so the view always looks a full quarter ahead.

## What You Need First

Gather these — a plain list or CSV is fine, no software required:

- **Bank balance today** (add up all business checking accounts; note credit-line room separately)
- **Accounts receivable (AR):** who owes you, how much, and the expected pay date
- **Accounts payable (AP):** what you owe, how much, and the due date
- **Recurring costs:** payroll dates + amounts, rent, loan payments, subscriptions, taxes
- **Expected new sales:** conservative estimate of cash actually landing (not invoices sent)

## Instructions

1. **Set the starting line.** Week 0 = this week. Record the confirmed bank balance as the opening cash for Week 1.

2. **Lay out 13 week-columns.** Label each with its Monday date. Every week has four rows: **Opening Cash → Cash In → Cash Out → Closing Cash**. Closing Cash of one week is the Opening Cash of the next. That single rule is the whole model.

3. **Fill in Cash In per week.** Place each expected receipt in the week you realistically expect the money to arrive, not the week it was invoiced:
   - AR: use the customer's actual pay behavior, not the due date. If they always pay ~2 weeks late, place it 2 weeks late.
   - New sales: only count cash you're confident will land. When unsure, split into a base case and a stretch case (see step 6).
   - Other: tax refunds, loan draws, owner contributions.

4. **Fill in Cash Out per week.** Place each payment in the week it will actually leave the account:
   - Payroll (including employer taxes — see `payroll-planning`)
   - AP / vendor bills on their due dates
   - Fixed costs: rent, insurance, loan payments, software
   - Estimated taxes and any one-off large buys

5. **Compute Closing Cash for all 13 weeks.** Opening + Cash In − Cash Out = Closing. Carry Closing into next week's Opening. Do this straight across to week 13.

6. **Find the trough and pressure-test it.** The trough is the lowest Closing Cash across the 13 weeks.
   - If the trough is comfortably positive: you're clear — recheck weekly.
   - If it dips near or below zero, or below your minimum cash cushion: flag the exact week. Then run two scenarios:
     - **Base case:** your realistic collection timing.
     - **Downside:** every AR payment slips 2 weeks and new-sales cash is halved.
   - If the downside breaks, that's a real risk — act now (accelerate collections via `invoicing-ar`, delay discretionary AP, or line up credit).

7. **Roll it forward.** Each week: replace Week 1's estimate with the actual closing balance, delete the past week, add a fresh Week 13. Re-find the trough.

## Output Format

```markdown
# 13-Week Cash-Flow Forecast — {Business Name}
**As of:** {YYYY-MM-DD}   **Opening bank balance:** {$}
**Minimum cash cushion:** {$}   **Credit line available:** {$}

| Week | W/C Date | Opening | Cash In | Cash Out | Closing |
|------|----------|---------|---------|----------|---------|
| 1 | {date} | {$} | {$} | {$} | {$} |
| 2 | {date} | {$} | {$} | {$} | {$} |
| … | … | … | … | … | … |
| 13 | {date} | {$} | {$} | {$} | {$} |

## Trough
- **Lowest closing cash:** {$} in **Week {n} ({date})**
- **Cushion status:** {above / below} your {$} minimum
- **Downside trough** (AR +2wks, new sales ×0.5): {$} in Week {n}

## Actions
1. {e.g. Chase invoices #1043, #1051 (both 30+ days) — see invoicing-ar}
2. {e.g. Push the equipment purchase from Week 4 to Week 9}
3. {e.g. Confirm credit-line availability before Week 6}
```

## Tips

- Forecast **cash, not profit.** A profitable month can still miss payroll if customers pay late. This model is about timing, not earnings.
- Be conservative on Cash In and generous on Cash Out — an honest forecast that's a little pessimistic is far more useful than an optimistic one.
- The most common mistake is placing receipts on the invoice due date instead of when the customer actually pays. Use real payment history.
- Keep a **minimum cash cushion** (often 2–4 weeks of fixed costs) and treat dipping below it as the alarm line, not zero.
- Update it the same day each week (Monday pairs well with `weekly-owner-brief`). A stale forecast is worse than none because it feels trustworthy.
- If the trough is scary, the fastest levers are usually collecting AR sooner and delaying non-critical AP — not cutting fixed costs, which takes longer to bite.
- This forecasts cash; it does not move money or replace an accountant. Confirm tax payment amounts and dates with a professional.
