---
name: payroll-planning
description: "Plan each payroll run, work a tax-withholding checklist, and model the fully-loaded cost of headcount — so every run clears and no filing is missed."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, payroll, headcount, withholding, planning]
disable-model-invocation: true
---

# Payroll Planning

## What This Does

Helps you **plan** a payroll run before you approve it: confirm the gross-to-net math is complete, walk a tax-withholding checklist so nothing gets missed, and model the **fully-loaded cost** of an employee (which is always more than their wage). This is planning and budgeting support — it does **not** file taxes, calculate exact legal withholding rates, or replace a payroll provider or accountant. Rates and rules vary by country, state, and year; always confirm the actual numbers with your payroll provider or a licensed professional.

## Part A — Pre-Run Checklist (before you approve any payroll)

1. **Confirm the run basics.**
   - [ ] Pay period start and end dates
   - [ ] Pay date (the day money leaves your account)
   - [ ] Every active employee/contractor accounted for; no departed staff still on
   - [ ] Hours entered and approved (hourly); salaries confirmed (salaried)
   - [ ] Overtime, bonuses, commissions, tips, reimbursements captured
   - [ ] PTO / unpaid leave adjustments applied

2. **Walk gross → net for each person.** The pieces, in order:
   - **Gross pay** = base + overtime + bonus/commission + other earnings
   - **− Pre-tax deductions** (retirement, some benefits)
   - **− Taxes withheld from the employee** (income tax + employee payroll taxes)
   - **− Post-tax deductions** (garnishments, some benefits)
   - **= Net pay** (what lands in their account)

3. **Add the employer's own costs.** These are on top of gross pay and are easy to forget:
   - Employer share of payroll taxes
   - Unemployment / statutory insurance contributions
   - Employer benefit contributions (health, retirement match)
   - Workers' comp where applicable

4. **Fund the whole thing.** The cash you must have available = **total net pay + all withheld taxes + all employer costs.** You hold the withheld taxes in trust and remit them on the filing schedule — never spend them.

## Part B — Tax-Withholding Checklist (deterministic, rates confirmed elsewhere)

Use this to make sure every category is *considered* and every deadline is tracked. Fill the actual rates/amounts from your provider — this skill does not invent them.

```markdown
# Withholding & Remittance Checklist — pay date {YYYY-MM-DD}

Withheld from employees:
- [ ] Income tax withholding
- [ ] Employee payroll/social taxes
- [ ] Local/regional taxes (if any)
- [ ] Court-ordered garnishments

Employer-paid:
- [ ] Employer payroll/social taxes
- [ ] Unemployment / statutory insurance
- [ ] Other mandated contributions

Remittance deadlines (confirm with provider/authority):
- [ ] Tax deposit due {date} — amount {$}
- [ ] Filing/return due {date}
- [ ] Year-end employee tax forms scheduled

New-hire / change items:
- [ ] New hires have completed tax + eligibility paperwork
- [ ] Withholding-election changes applied
- [ ] Address/status changes updated
```

## Part C — Headcount Cost Model (fully-loaded)

Before hiring, model the true cost — the "loaded" cost, not the salary:

```markdown
# Loaded Cost — {Role}
Base wage / salary (annual):            {$}
+ Employer payroll taxes (est. %):      {$}
+ Benefits (health, retirement match):  {$}
+ Insurance / workers' comp:            {$}
+ Equipment / software / onboarding:    {$}
+ Overhead allocation (space, admin):   {$}
= Fully-loaded annual cost:             {$}
÷ 12  → monthly cash impact:            {$}
÷ 26  → per-pay-period impact:          {$}   (biweekly)
```

Then drop the per-period impact into `cash-flow-forecast` and check whether the cash trough still holds.

## Output Format

Deliver one of: a **pre-run summary** (total net, total withheld, total employer cost, cash to fund), a **completed withholding checklist** with deadlines, or a **loaded-cost model** for a role. Always state the total cash required and the date it's needed.

## Tips

- **Budget the loaded cost, not the wage.** Employer taxes and benefits typically add a meaningful percentage on top of gross — plan for the bigger number.
- **Withheld taxes are not your money.** Hold them separately in your thinking and remit on schedule; spending them is the classic small-business trap.
- Fund payroll from the `cash-flow-forecast` trough, not from today's balance — confirm the run clears on its actual pay date.
- Rates, brackets, and deadlines change and differ by location. This skill structures the plan; your payroll provider or accountant supplies and files the real numbers.
- Missing a tax-remittance deadline is expensive — track deposit and filing dates as hard commitments, not reminders.
- Reconcile every run: net + withholdings + employer costs should equal the total cash that left the account. A mismatch means something was missed.
- Classify workers correctly (employee vs. contractor) with professional guidance — misclassification carries real penalties.
