---
name: ccc-smb-ops
description: "Small-business back office from a bank CSV or a typed list: 13-week cash-flow forecast, invoicing and AR chasing, payroll planning, CRM cleanup, expense tracking and a Monday owner brief. Use when an owner asks about cash, unpaid invoices, payroll, contacts, spending or the weekly picture."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
argument-hint: "[cash | invoices | payroll | crm | expenses | brief]"
model: inherit
effort: medium
---

# /ccc-smb-ops — small-business operations, routed

**CC Commander** · /ccc-smb-ops · plain-language checklists, forecasts and templates for the owner who runs the shop, not the accountant.

The user's selected model is preserved. Codex: ask pickers as plain-text questions.

Everything works from a plain bank or card CSV export, an invoice list, or typed-out numbers; no accounting or CRM software is required. Owners who use such software export to CSV and the same steps apply.

## When to use / when not to

- Use for owner-level operations: "will I make payroll", "who owes me", "what will a hire cost", "clean up my contacts", "where did the money go", "give me the Monday picture".
- Use `/ccc-data` for warehouse pipelines and dashboards, `/ccc-saas` for SaaS metrics such as MRR and churn, `/ccc-marketing` for campaigns.

## Sub-skills

Each lives at `<dir>/SKILL.md` beside this file and sets `disable-model-invocation: true`, so it loads only when routed here or invoked by name (`/cash-flow-forecast`, and so on).

| Directory | Use for | Not to be confused with |
|---|---|---|
| `cash-flow-forecast/` | 13-week rolling forecast from bank balance, AR and AP; "will I make payroll", runway | `expense-tracking` (past spend, not future cash) |
| `invoicing-ar/` | Clean invoices, AR aging, a polite escalating dunning ladder | `cash-flow-forecast` (uses AR totals, does not chase them) |
| `payroll-planning/` | Each payroll run, withholding checklist, fully loaded headcount cost | `expense-tracking` (payroll is planned, not categorized after) |
| `crm-hygiene/` | Dedupe contacts, sweep stale leads, standardize fields, pipeline review | `invoicing-ar` (customers who owe, not leads) |
| `expense-tracking/` | Categorize spending, receipt capture, budget vs. actual | `payroll-planning` (wages have their own plan) |
| `weekly-owner-brief/` | Monday one-pager: cash, AR aging, pipeline, top 3 actions | any single lane (this one pulls the others together) |

Keep this table matched to the directory: `ls -d "${CLAUDE_SKILL_DIR}"/*/` (repo fallback `ls -d skills/ccc-smb-ops/*/`).

## What happens

### 1. Route by intent, or ask

An argument or a clear intent routes straight to the matching lane above. A multi-step job (month-end close, cash is tight, a hiring decision, the Monday reset) follows its campaign in [references/campaigns.md](references/campaigns.md), which also holds the weekly and monthly cadence.

Otherwise ask with AskUserQuestion (header "Back office"):

- 🟢 Monday owner brief — cash, AR aging, pipeline and the top 3 actions on one page
- Cash forecast — 13-week view and the week cash runs lowest
- Get paid — invoices, AR aging and a polite dunning ladder
- More… — payroll, expenses or CRM cleanup (a follow-up picker; 🟢 Payroll planning first)

### 2. Confirm the records on hand

Before any numbers, ask what the owner has (bank export, invoice list, receipts, contact list, payroll dates) and where it is. Read files with Read; for a CSV, check its shape first:

```bash
head -n 5 "<file>.csv"; wc -l < "<file>.csv"
```

Work on a copy of any record list; never edit the owner's only copy. When a number is missing, ask for it or mark it as an estimate; never invent balances, rates or tax amounts.

### 3. Run the lane

Read `<lane>/SKILL.md` and follow its checklist or fill-in template. Write the result to a dated Markdown file the owner chooses, default `./ops/<topic>-<YYYY-MM-DD>.md`.

Keep cash, AR and spending reconciled across lanes. If two disagree (the forecast's AR total and the AR aging total, for example), stop, find the discrepancy and show it before recommending any action.

### 4. Check the arithmetic

Recompute every total from the source rows with a one-off script rather than mental math, for example a column sum (forecast rule: closing = opening + cash in − cash out):

```bash
python3 -c "import csv,sys; r=list(csv.DictReader(open(sys.argv[1]))); print(sum(float(x[sys.argv[2]]) for x in r))" "<file>.csv" amount
```

Report the recomputed totals beside the ones in the deliverable.

## Done when

- The deliverable file exists (`test -s <file> && echo ok` printed `ok`) and its path is reported.
- Every total in it was recomputed in step 4 and matches, or the mismatch is shown to the owner.
- Estimates and missing inputs are labeled as such, and the actions list names who does what by when.

## Guardrails

- Organize and forecast only. Never move money, pay a bill, run payroll, send an invoice or reminder, message a customer, or file anything; draft it for the owner to approve and send.
- Never give regulated financial, tax-deductibility, withholding-rate or legal conclusions; point to a licensed accountant or the payroll provider for actual rates and filings.
- Bank exports, payroll and contact lists hold personal and financial data: keep them local, never commit them to git, never publish them or paste them into an external service.
- Never create a recurring reminder or Routine unless the owner asks for one.

## See also

- `/ccc-data` — dashboards and pipelines over the same records
- `/ccc-saas` — subscription metrics, MRR and churn
- `/ccc-marketing` — campaigns that fill the pipeline
