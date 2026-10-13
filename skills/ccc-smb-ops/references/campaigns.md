# ccc-smb-ops campaigns and cadence

Multi-step back-office jobs. Run one sub-skill at a time, in order, and keep cash, AR and spending reconciled to the same numbers across steps.

## Month-end close (the 90-minute version)

1. `expense-tracking` — categorize the month's spending and reconcile receipts
2. `invoicing-ar` — draft any un-billed work and update the AR aging list
3. `cash-flow-forecast` — roll the 13-week forecast forward one week with real balances
4. `weekly-owner-brief` — produce the summary the owner will actually read
5. Deliver: a closed month with cash, AR and spending reconciled to the same numbers

## Get-paid sprint (cash is tight)

1. `invoicing-ar` — pull the AR aging report and draft the dunning ladder for everything 30+ days late
2. `cash-flow-forecast` — model best-case and worst-case collection to see whether payroll clears
3. `expense-tracking` — flag discretionary spend that can pause this week
4. Deliver: a prioritized collections list plus a cut-list if collections slip

## New-hire decision

1. `payroll-planning` — build the fully loaded cost of the role (wage, employer taxes, overhead)
2. `cash-flow-forecast` — drop the new cost into the 13-week view and check the trough
3. `weekly-owner-brief` — frame the go / no-go with the numbers attached
4. Deliver: a yes or no on the hire, backed by a cash trough the owner can live with

## Monday reset (every week)

1. `weekly-owner-brief` — the one-pager
2. Route into whichever line item is red, usually `invoicing-ar` or `cash-flow-forecast`
3. Deliver: three concrete actions before 10am

## Operating cadence

| Rhythm | Run | Why |
|---|---|---|
| Every Monday | `weekly-owner-brief` | Start the week knowing cash, AR and the top 3 actions |
| Weekly | `invoicing-ar` | A stale invoice is money already earned; chase on a schedule |
| Weekly | `cash-flow-forecast` (roll forward) | The forecast is useful only while it stays current |
| Each pay period | `payroll-planning` | Confirm the run clears before approving it |
| Monthly | `expense-tracking` + `crm-hygiene` | Close the books; keep the pipeline honest |

A recurring reminder for this cadence is a Routine (`/schedule`) the owner sets up on request; this skill never creates one on its own.
