# /ccc-smb-ops — sub-skills and routing

Reference for SKILL.md step 1. Sub-skills ship with the Commander CLI toolkit (`skills/ccc-smb-ops/<name>/SKILL.md` in the repository). When one is not available in the session, apply the focus in its row.

## Sub-skills

| Sub-skill | Focus |
|---|---|
| `cash-flow-forecast` | 13-week rolling forecast from bank balance, AR and AP; find the cash trough; base and downside cases |
| `invoicing-ar` | Clean, complete invoices; AR aging; an escalating dunning ladder that stops when payment clears |
| `payroll-planning` | Plan each run, tax-withholding checklist, fully-loaded headcount cost model |
| `crm-hygiene` | Deduplicate contacts, sweep stale leads, standardize fields, pipeline review |
| `expense-tracking` | Category system, receipt-capture workflow, budget vs. actual |
| `weekly-owner-brief` | Monday one-pager: cash, AR aging, pipeline, top 3 actions |

## Intent routing

| Intent | Route to |
|---|---|
| "Will I make payroll?", "cash forecast", "runway" | `cash-flow-forecast` |
| "Send an invoice", "chase who owes me", "follow up on unpaid" | `invoicing-ar` |
| "Run payroll", "what will a hire cost", "withholding" | `payroll-planning` |
| "Clean up my contacts", "dead leads", "pipeline review" | `crm-hygiene` |
| "Where did the money go", "categorize expenses", "budget vs actual" | `expense-tracking` |
| "Give me the Monday picture", "owner update", "weekly summary" | `weekly-owner-brief` |

## Campaigns

### Month-end close (90-minute version)

1. `expense-tracking` — categorize the month, reconcile receipts
2. `invoicing-ar` — bill un-invoiced work, refresh AR aging
3. `cash-flow-forecast` — roll the 13-week view forward with real balances
4. `weekly-owner-brief` — the summary the owner actually reads

### Get-paid sprint (cash is tight)

1. `invoicing-ar` — AR aging report; draft the dunning step for anything 30+ days late
2. `cash-flow-forecast` — model base vs. downside to see whether payroll clears
3. `expense-tracking` — flag discretionary spend to pause

### New-hire decision

1. `payroll-planning` — fully-loaded cost of the role
2. `cash-flow-forecast` — drop it into the 13-week view, check the trough
3. `weekly-owner-brief` — frame the go / no-go with numbers attached

## Examples

| Owner says | Route |
|---|---|
| "Will I be able to make payroll next month?" | `cash-flow-forecast` — the 13-week view and the trough on the payroll date |
| "Three customers still haven't paid me" | `invoicing-ar` — AR aging and the dunning ladder |
| "Quick Monday summary of where the business stands" | `weekly-owner-brief` — cash, AR aging, pipeline, top 3 actions |
