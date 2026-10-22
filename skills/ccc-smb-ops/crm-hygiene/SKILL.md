---
name: crm-hygiene
description: "Clean up your contact and deal records — deduplicate, sweep stale leads, standardize fields, and run a pipeline review so your sales list reflects reality."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, crm, data-hygiene, pipeline, sales]
disable-model-invocation: true
---

# CRM Hygiene

## What This Does

Keeps your **CRM** (the list of contacts and deals you sell to — whether that's real software or a spreadsheet) clean and trustworthy. A messy contact list quietly costs you deals: duplicates make you look disorganized, stale leads inflate your pipeline, and blank fields mean follow-ups fall through. This skill runs a repeatable clean-up — **deduplicate, sweep stale leads, standardize fields** — and a **pipeline review** so the numbers you plan on are real.

## Part A — Deduplicate

1. **Pull the full contact list** (export to CSV if it's in software). Work on a copy — never edit the only record you have.
2. **Find likely duplicates** by matching on, in priority order:
   - Same email address (strongest signal)
   - Same phone number
   - Same company + very similar person name
   - Same company domain across contacts
3. **Merge, don't delete blindly.** For each duplicate pair, keep the record with the most complete/recent info and fold in anything the other has (a phone number, a note, a deal). Preserve history — a lost note can be a lost deal.
4. **Log every merge** (kept ID, merged ID, date) so you can trace anything that looks wrong later.

## Part B — Stale-Lead Sweep

Define "stale," then act on it consistently:

| Last contact | Status | Action |
|--------------|--------|--------|
| < 30 days | Active | Leave in working pipeline |
| 30–90 days | Cooling | One clear re-engagement touch; set a follow-up date |
| 90–180 days | Stale | Final re-engage attempt; if silent, move to "Nurture" |
| 180+ days, no reply | Dead | Archive out of the active pipeline (don't delete) |

- **Archive, don't delete.** A cold lead can warm up; keep the record, just remove it from the *active* pipeline so it stops inflating your numbers.
- Every contact you keep active must have a **next step and a date.** No next step = it's not really in the pipeline.

## Part C — Standardize Fields

Blank and inconsistent fields break follow-ups. Enforce a minimum standard:

```markdown
Required on every active contact:
- [ ] Name (first + last)
- [ ] Primary email OR phone
- [ ] Company (if B2B)
- [ ] Lead source (how they found you)
- [ ] Stage (see pipeline below)
- [ ] Owner (who's responsible)
- [ ] Next step + date

Standardize formats:
- [ ] Phone numbers in one consistent format
- [ ] Company names consistent (no "Acme" / "Acme Inc" / "acme" splits)
- [ ] Stage names from the fixed list only — no free-text stages
```

## Part D — Pipeline Review

Sort active deals into a fixed set of stages and sanity-check each:

```markdown
# Pipeline Review — {Business Name}   (as of {YYYY-MM-DD})

| Stage | Deals | Value | Health check |
|-------|-------|-------|--------------|
| New / Uncontacted | {n} | {$} | Anything >7 days here? Contact or drop. |
| Contacted | {n} | {$} | Has a next step + date? |
| Qualified | {n} | {$} | Real budget + need confirmed? |
| Proposal / Quote | {n} | {$} | Follow-up scheduled? |
| Won | {n} | {$} | → hand to invoicing-ar |
| Lost | {n} | {$} | Reason logged? |

## Cleanup actions
1. {e.g. Merge 6 duplicate contacts for Acme}
2. {e.g. Archive 14 leads with no contact in 180+ days}
3. {e.g. 9 "Proposal" deals have no follow-up date — set one}
```

## Output Format

Deliver one of: a **dedup log** (pairs merged, kept vs. folded), a **stale-lead sweep list** (what to re-engage vs. archive), a **field-standardization checklist** with gaps found, or a **pipeline review** table with concrete cleanup actions. Always end with the top 3 actions.

## Tips

- **A clean small pipeline beats a big dirty one.** Ten real, next-stepped deals are worth more than fifty vague ones.
- Email is your best dedup key — start there, then phone, then company+name.
- **Archive is your friend; delete is dangerous.** You almost never need to permanently remove a contact — just move it out of the active view.
- Every active deal needs an owner and a dated next step. If it has neither, it's clutter inflating your forecast.
- Won deals should flow straight into `invoicing-ar`; lost deals should always carry a reason so you can spot patterns.
- Run the sweep monthly. Hygiene is a habit — a once-a-year cleanup means eleven months of decisions made on bad data.
- If you handle personal contact data, follow the privacy rules that apply to you (consent, deletion requests). This skill organizes records; confirm compliance obligations with a professional.
