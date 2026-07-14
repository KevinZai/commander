---
name: ccc-smb-ops
context: fork
description: "Small-business operations — 6 skills in one: 13-week cash-flow forecast, invoicing + AR chasing, payroll planning, CRM hygiene, expense tracking, and a weekly owner brief."
allowed-tools:
  - Read
---

# /ccc-smb-ops — Small-business operations hub

> Load ONE skill. Get the entire back-office operations domain for a small business. 6 skills in one — plain-language checklists and templates for the owner who runs the shop, not the accountant.

**Integration note:** These skills are tool-agnostic. Everything works from a plain bank/card CSV export, an invoice list, or a typed-out set of numbers — no accounting or CRM software required. They organize and forecast; they do not move money, file taxes, or give regulated financial advice.

## Sub-Skills

| # | Skill | Focus |
|---|-------|-------|
| 1 | cash-flow-forecast | 13-week rolling cash-flow forecast from bank + AR/AP; find the cash trough |
| 2 | invoicing-ar | Generate clean invoices; chase unpaid ones with a dunning ladder + AR aging |
| 3 | payroll-planning | Plan each run, tax-withholding checklist, fully-loaded headcount cost model |
| 4 | crm-hygiene | Dedup contacts, sweep stale leads, standardize fields, review the pipeline |
| 5 | expense-tracking | Categorize spend, receipt-capture workflow, budget vs. actual |
| 6 | weekly-owner-brief | Monday one-pager: cash, AR aging, pipeline, and the top 3 actions |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Will I make payroll?" / "Cash forecast" / "Runway" | `cash-flow-forecast` |
| "Send an invoice" / "Chase who owes me" / "Follow up on unpaid" | `invoicing-ar` |
| "Run payroll" / "What will a hire cost" / "Withholding" | `payroll-planning` |
| "Clean up my contacts" / "Dead leads" / "Pipeline review" | `crm-hygiene` |
| "Where did the money go" / "Categorize expenses" / "Budget vs actual" | `expense-tracking` |
| "Give me the Monday picture" / "Owner update" / "Weekly summary" | `weekly-owner-brief` |

## Protocol

1. **Confirm what records the owner has on hand** (bank export, invoice list, receipts, contact list) before routing — everything works from a CSV or a typed list.
2. Route to the specialist sub-skill for the job; each delivers a checklist or fill-in template.
3. `weekly-owner-brief` runs every Monday and pulls from the other five — start there when the owner just wants "the picture."
4. Keep cash, AR, and spending reconciled across skills — if two disagree, find the discrepancy before acting.
5. Never move money, send messages, or file anything automatically — deliver the plan for the owner to approve.

## Campaign Templates

### Month-End Close (90-minute version)
1. `expense-tracking` → categorize the month, reconcile receipts
2. `invoicing-ar` → bill un-invoiced work, refresh AR aging
3. `cash-flow-forecast` → roll the 13-week view forward with real balances
4. `weekly-owner-brief` → the summary the owner actually reads

### Get-Paid Sprint (cash is tight)
1. `invoicing-ar` → AR aging report, fire the dunning ladder on 30+ days late
2. `cash-flow-forecast` → model base vs. downside to see if payroll clears
3. `expense-tracking` → flag discretionary spend to pause

### New-Hire Decision
1. `payroll-planning` → fully-loaded cost of the role
2. `cash-flow-forecast` → drop it into the 13-week view, check the trough
3. `weekly-owner-brief` → frame the go / no-go with numbers attached

## When to invoke this skill

**Example 1**
- user: will I be able to make payroll next month?
- assistant: Loads ccc-smb-ops and routes to cash-flow-forecast to build the 13-week view and find the trough on the payroll date.

**Example 2**
- user: three customers still haven't paid me — help me chase them
- assistant: Loads ccc-smb-ops and routes to invoicing-ar for the AR aging report and the dunning ladder.

**Example 3**
- user: give me a quick Monday summary of where the business stands
- assistant: Loads ccc-smb-ops and routes to weekly-owner-brief, pulling cash, AR aging, and pipeline into a one-pager with the top 3 actions.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
