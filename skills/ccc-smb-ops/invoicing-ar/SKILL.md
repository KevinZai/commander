---
name: invoicing-ar
description: "Generate clean, complete invoices and chase unpaid ones with a polite, escalating dunning ladder — turn delivered work into collected cash."
version: 1.0.0
category: smb-ops
parent: ccc-smb-ops
tags: [ccc-smb-ops, invoicing, accounts-receivable, collections, dunning]
disable-model-invocation: true
---

# Invoicing & Accounts-Receivable Chasing

## What This Does

Two jobs that decide whether delivered work becomes money in the bank:

1. **Invoicing** — produce a clear, complete invoice that's easy to approve and pay, so it doesn't get stuck on someone's desk.
2. **AR chasing (dunning)** — follow up on unpaid invoices with a **dunning ladder**: a fixed, escalating sequence of polite reminders. "Dunning" just means the structured process of asking for money you're owed. A ladder removes the awkward "should I email them again?" guesswork — the schedule decides for you.

## Part A — Generate the Invoice

1. **Confirm the essentials are present.** A missing field is the #1 reason invoices stall:
   - [ ] Your business name, address, and contact
   - [ ] Customer name and billing contact (the person who actually approves payment)
   - [ ] Unique invoice number (sequential — e.g. 2026-0142)
   - [ ] Invoice date **and** due date (a due date, not just "net 30")
   - [ ] Line items: description, quantity, unit price, line total
   - [ ] Subtotal, tax, and total due — in one obvious bold number
   - [ ] Accepted payment methods and exact instructions (how do they pay you today?)
   - [ ] PO or reference number if the customer requires one

2. **Set clear terms.** State the due date as a real date. Note any late fee or early-pay discount up front — it's not enforceable later if it wasn't on the invoice.

3. **Send it to the right person, the day the work is done.** Speed of sending is the single biggest driver of speed of payment. Attach as PDF; put the total and due date in the email subject or first line.

## Part B — The Dunning Ladder

Run this schedule on any invoice past its due date. Escalate tone by step, never skip a rung, and **stop the moment payment clears.**

| Step | Timing | Channel | Tone | Message core |
|------|--------|---------|------|--------------|
| 0 | Due date − 3 days | Email | Friendly | "Heads-up, invoice #{n} for {$} is due {date}. Here's the pay link/instructions." |
| 1 | Due date + 1 day | Email | Warm reminder | "Invoice #{n} ({$}) was due yesterday — likely just slipped through. Copy attached." |
| 2 | Due date + 7 days | Email | Direct | "Following up on #{n}, now 7 days past due. Can you confirm a payment date?" |
| 3 | Due date + 14 days | Phone + email | Firm, personal | Call the billing contact; email a written recap of what was agreed. |
| 4 | Due date + 30 days | Email | Formal | State the amount, days overdue, any late fee, and a specific pay-by date. |
| 5 | Due date + 45 days | Email/letter | Final notice | Clear consequence: pause of service, or referral to collections after {date}. |

**Rules for the ladder:**
- **Always attach the invoice again** — never make them go find it.
- **One clear ask per message:** pay by this date, or tell me when you'll pay.
- **Keep every message professional.** These are customers; the goal is payment *and* the relationship.
- **Log every touch** (date, channel, response) so nothing is chased twice or dropped.
- **Escalate the human, not just the tone** at step 3 — a phone call to the billing contact collects more than a fifth email.

## Part C — The AR Aging Report

Sort everything owed into buckets so you chase the right invoices first:

```markdown
# AR Aging — {Business Name}   (as of {YYYY-MM-DD})

| Bucket | Count | Amount | Action |
|--------|-------|--------|--------|
| Current (not yet due) | {n} | {$} | Monitor |
| 1–30 days late | {n} | {$} | Ladder steps 1–2 |
| 31–60 days late | {n} | {$} | Ladder steps 3–4 — call them |
| 61–90 days late | {n} | {$} | Final notice; consider hold on service |
| 90+ days late | {n} | {$} | Collections / write-off decision |
| **Total AR** | **{n}** | **{$}** | — |

## Priority chase list (this week)
1. #{invoice} — {customer} — {$} — {days late} — {next ladder step}
2. …
```

## Output Format

Deliver one of: a ready-to-send **invoice**, a **dunning message** for the correct ladder step, or an **AR aging report** with a prioritized chase list. Always include the exact next action and date.

## Tips

- **The invoice that's easy to pay gets paid first.** One bold total, a real due date, and clear pay instructions beat any late-fee threat.
- **Send the day you deliver.** Every day of delay in sending adds roughly a day to payment.
- **The ladder is a system, not a mood.** Follow the schedule and you'll never again wonder whether it's "too soon" to follow up.
- Biggest and oldest first: chase the invoices where the most cash is stuck the longest.
- Feed the AR aging totals straight into `cash-flow-forecast` — place each expected payment in the week the customer actually tends to pay.
- A repeat late-payer is a pipeline and terms problem, not just a chasing problem — consider deposits, milestones, or pay-before-delivery for them.
- This chases and organizes what you're owed; it does not move money or provide legal/collections advice. Involve a professional before formal collections.
