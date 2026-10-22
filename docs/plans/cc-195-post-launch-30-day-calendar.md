# Post-launch momentum: 30-day calendar and approval gates (CC-195, slice 1)

Local planning document only. Nothing here sends, schedules or publishes. Every outbound item stays `DRAFT` until a named human moves it through the gates below.

Day numbers are relative to launch day (D1). No calendar dates are fixed until the owner sets D1.
The Linear ticket was written for v2.2.0; the current release is in `package.json` (8.1.0 at the time of writing). Use the current version in all copy.

## Approval gates

| Gate | Meaning | Who clears it |
|---|---|---|
| G0 Draft | Copy and assets exist locally in `docs/plans/` | Author |
| G1 Facts | Every claim, metric and screenshot checked against the repo or real telemetry; comparisons carry a method note | Reviewer (not the author) |
| G2 Disclosure | Affiliate links, sponsorships and AGPL/opt-in notes are disclosed per the product rules | Reviewer |
| G3 Owner OK | Kevin approves the exact text, channel and time | Kevin |
| G4 Send | A human posts or schedules it, outside this plan | Kevin or a delegate he names |

Rules: no item skips a gate. Outreach to individuals (influencers, engaged users) also needs G3 per recipient. Nothing uses personal paths, credentials or private services. Metrics must come from real sessions, never invented. Platform rules (Reddit self-promotion limits, HN guidelines) are checked at G1.

## Calendar

Status of every row starts at `DRAFT`. "Needs" lists the gates required before G4. All rows need G0-G3; extra checks are noted.

### Week 1 (D1-D7): launch and respond

| Day | Action | Channel | Linked ticket | Extra checks |
|---|---|---|---|---|
| D1 | X launch thread | X | CC-186 | G2 disclosure |
| D2 | Reply to comments, DMs and GitHub issues | X, GitHub | none | Reply tone reviewed once; no canned promo replies |
| D3 | Dev.to article cross-post | Dev.to | CC-187, CC-193 | Canonical URL set |
| D4 | "Show HN" post | Hacker News | CC-193 | HN guidelines; owner present to answer comments |
| D5 | Reddit posts, 3 subreddits | Reddit | CC-193 | Per-sub self-promotion rules; each post tailored, not copy-pasted |
| D6-D7 | Collect feedback, triage install issues | GitHub | none | Output: issue list, not a send |

### Week 2 (D8-D14): proof and follow-up

| Day | Action | Channel | Extra checks |
|---|---|---|---|
| D8-D9 | Comparison page: CCC vs stock Claude Code | Site / docs | Real metrics with method and sample size |
| D10-D11 | Comparison page: CCC vs ECC | Site / docs | Feature overlap verified against both repos; fair wording, reviewed for accuracy |
| D12 | Follow up with people who engaged on X, HN, Reddit | Replies | G3 per recipient |
| D14 | First newsletter to email signups | Email | Only opted-in addresses; unsubscribe link; G3 on the list and the send |

### Week 3 (D15-D21): educate and reach

| Day | Action | Channel | Linked ticket | Extra checks |
|---|---|---|---|---|
| D15-D16 | "10 Claude Code Power Tricks" thread (educational, not promotional) | X | none | Each trick verified to work on the current release |
| D17-D19 | YouTube demo video | YouTube | none | Script reviewed; no secrets or personal paths on screen |
| D19 | Outreach to 5 influencers with personalized install | DM / email | none | G3 per recipient; no unsolicited bulk sending; disclose any incentive |
| D21 | Product Hunt submission | Product Hunt | CC-188 | Date chosen by owner for impact; assets final |

### Week 4 (D22-D30): learn and sustain

| Day | Action | Channel | Extra checks |
|---|---|---|---|
| D22-D24 | Post-mortem: what we learned launching the current release | Blog | No private user data |
| D25-D26 | Share ctx_stats from real sessions | Blog / X | Aggregated, anonymized, reproducible |
| D27-D28 | Plan the next minor release from feedback | Linear | Internal; output is tickets |
| D29-D30 | Set up the ongoing changelog marketing cadence | Docs | Proposal only; cadence needs G3 |

## Decisions for the owner

1. Set D1 (launch date). Recommendation: pick it after CC-186 copy reaches G3, then fill dates here.
2. Who may perform G4 sends. Recommendation: Kevin only until the first two weeks are done.
3. Which week-2 comparison to ship first. Recommendation: CCC vs stock Claude Code, since it carries the real-metrics proof.

## Out of scope for this slice

Sending, scheduling, posting, spending, tool or account setup, and any automation of the above. Later slices may add per-item drafts.
