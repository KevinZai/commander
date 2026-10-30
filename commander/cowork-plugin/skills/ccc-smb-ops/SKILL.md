---
name: ccc-smb-ops
description: "Small-business back office from a bank CSV or a typed list: 13-week cash-flow forecast, invoicing and AR chasing, payroll planning, CRM cleanup, expense tracking, and a Monday owner brief. Use when an owner asks about cash, unpaid invoices, payroll, contacts, spending, or the weekly picture."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Skill
  - AskUserQuestion
argument-hint: "[cash | invoices | payroll | crm | expenses | brief]"
model: inherit
disable-model-invocation: true
---

# /ccc-smb-ops — small-business operations, routed

**CC Commander** · /ccc-smb-ops · plain-language checklists, forecasts and templates for the owner who runs the shop, not the accountant.

Sub-skills (`cash-flow-forecast`, `invoicing-ar`, `payroll-planning`, `crm-hygiene`, `expense-tracking`, `weekly-owner-brief`) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply the method in [references/routing.md](references/routing.md). The user's selected model is preserved.

Everything works from a plain bank or card CSV export, an invoice list, or typed-out numbers; no accounting or CRM software is required. These skills organize and forecast. They do not move money, file taxes, or give regulated financial, tax or legal advice.

Codex: ask pickers as plain-text questions.

## When to use / when not to

- Use for owner-level operations: "will I make payroll", "who owes me", "what will a hire cost", "clean up my contacts", "where did the money go", "give me the Monday picture".
- Use `/ccc-data` for warehouse pipelines and dashboards, `/ccc-saas` (`saas-metrics-coach`) for SaaS metrics such as MRR and churn, `/ccc-marketing` for campaigns.

## What happens

### 1. Route by intent, or ask

An argument or a clear intent routes straight to the sub-skill in [references/routing.md](references/routing.md). A multi-step job (month-end close, cash is tight, a hiring decision) follows the matching campaign in that file. When the owner just wants "the picture", start with `weekly-owner-brief`, which pulls from the other five.

Otherwise ask with AskUserQuestion (header "Back office"), recommended first:

- 🟢 Monday owner brief — cash, AR aging, pipeline and the top 3 actions on one page
- Cash forecast — 13-week view and the week cash runs lowest
- Get paid — invoices, AR aging and a polite dunning ladder
- More — payroll, expenses or CRM cleanup (a follow-up picker with those three)

### 2. Confirm the records on hand

Before any numbers, ask what the owner has (bank export, invoice list, receipts, contact list, payroll dates) and where it is. Read files with Read; for a CSV, check its shape first:

```bash
head -n 5 "<file>.csv"; wc -l < "<file>.csv"
```

Work on a copy of any record list; never edit the owner's only copy. When a number is missing, ask for it or mark it as an estimate; never invent balances, rates or tax amounts.

### 3. Do the work

Follow the routed sub-skill. Each one delivers a checklist or fill-in template. Write the result to a dated Markdown file the owner chooses (default `./ops/<topic>-<YYYY-MM-DD>.md`) with Write.

Keep cash, AR and spending reconciled across skills. If two disagree (the forecast's AR total and the AR aging total, for example), find the discrepancy and show it before recommending any action.

### 4. Check the arithmetic

For any table with totals, recompute it from the source rows with a one-off script rather than trusting mental math, for example the forecast rule closing = opening + cash in − cash out:

```bash
python3 -c "import csv,sys; r=list(csv.DictReader(open(sys.argv[1]))); print(sum(float(x['amount']) for x in r))" "<file>.csv"
```

Report the recomputed totals beside the ones in the deliverable.

## Done when

- The deliverable file exists (`test -s <file> && echo ok` printed `ok`) and its path is reported.
- Every total in it was recomputed in step 4 and matches, or the mismatch is shown to the owner.
- Estimates and missing inputs are labeled as such, and the actions list names who does what by when.

## Guardrails

- Never move money, pay a bill, run payroll, send an invoice or reminder, message a customer, or file anything. Draft it for the owner to approve and send.
- Never give tax-deductibility, withholding-rate or legal conclusions; point to a licensed accountant or the payroll provider for actual rates and filings.
- Bank exports, payroll and contact lists contain personal and financial data: keep them local, never commit them to git, never publish them or paste them into an external service.
- Archive, do not delete, contacts and records during CRM cleanup.

## See also

- `/ccc-data` — analytics pipelines and dashboards
- `/ccc-saas` — SaaS metrics and billing systems
- `/ccc-standup` — a recurring personal status summary
- `/ccc-loop` — repeat the Monday brief on a schedule

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
