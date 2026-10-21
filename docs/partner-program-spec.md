# Featured Partner Program — Specification (DRAFT, v4.2 target)

**Status:** Draft proposal. Not approved. Nothing in this document is implemented, priced, or offered.
**Tracking:** Linear CC-364.
**Prerequisite to implementation:** Kevin's explicit written approval of this spec. Until then, do not build placement, contact prospective partners, quote prices, accept money, or publish this document outside the repository.

Everything marked **Proposal** is an option for Kevin to choose from, not a decision.

## 1. Invariant: core recommendations are never pay-to-play

This invariant is not a proposal and has no exceptions.

- Core recommendations (the skills, agents, connectors and tools CC Commander suggests on its own merits) are chosen by editorial and technical criteria only.
- No payment, discount, affiliate arrangement, sponsorship, or partner status can add, remove, reorder, reword, or rank a core recommendation.
- A Featured Partner slot is a separate, labeled surface. Partner status never changes what appears in the core list.
- A partner may be absent from core recommendations. A tool in core recommendations may never be a partner. Both are normal.
- Any change that would break this invariant requires a new spec and Kevin's approval, and cannot be made through partner terms.

Existing disclosed affiliate links (see [README](../README.md), Sustained-by note) stay governed by the existing affiliate disclosure and are unchanged by this program.

## 2. What a Featured Partner slot is

A Featured Partner slot is a clearly labeled, paid placement of one partner's product or service inside a skill's output or catalog entry, shown separately from that skill's core recommendations.

Constraints (all proposals unless stated in section 1):

- One slot per skill surface, at most, and never inside the core recommendation list.
- Only skills whose topic the partner's product genuinely relates to are eligible. Relevance is judged by editorial review, not by price.
- Slots are static, human-written, and reviewed. No dynamic bidding, no auction, no per-user targeting, no tracking beyond what the existing public privacy statement ([PRIVACY](../PRIVACY.html)) already allows.
- Partner copy cannot instruct the model, include hidden prompt text, or request tool use or permissions. Slot text is display content only.
- Opt-in, portable behavior is preserved: the core plugin works fully with slots disabled. A single setting hides all slots (proposed default: shown, clearly labeled).

## 3. Visual and textual distinction from core recommendations

Proposed labeling rules, applied in every surface (Desktop plugin, CLI, Codex mirror, catalog pages):

| Rule | Proposal |
|---|---|
| Label text | The literal words "Featured Partner" plus "Paid placement" on every slot |
| Position | After and visibly separated from the core list, never interleaved |
| Separator | A rule or heading line between core recommendations and the slot |
| Style | Different heading and marker than core items; no shared numbering or rank badges |
| Ranking language | Slots never use "best", "top", "recommended" or rank badges |
| Disclosure link | Each slot links to the program disclosure page and this spec's policy summary |
| Plain text surfaces | Label as text, for example `[Featured Partner — paid placement]`, so it survives terminals and copy-paste |
| Accessibility | Label is real text, not color or icon alone |

Illustrative layout (mock text, not an implemented UI):

```text
Recommended for this task
  1. <core recommendation>
  2. <core recommendation>

-----
Featured Partner — paid placement (not part of the recommendations above)
  <Partner name>: <one-line description>  <link>  How this works
```

## 4. Partner intake

Intake is a proposal for a form or issue template. No form is built or published by this draft. Intake collects information only and does not commit CC Commander to accept any partner.

### 4.1 Fields

| Field | Required | Purpose |
|---|---|---|
| Company legal name and website | Yes | Identity |
| Contact name and email | Yes | Reviewer contact |
| Product or service name and one-line description | Yes | Slot copy basis |
| Proposed skills or topics for the slot | Yes | Relevance review |
| Proposed slot copy (max length set at approval) | Yes | Editorial review |
| Destination URL and any tracking parameters | Yes | Link review |
| Pricing and billing details they accept (see section 5) | Yes | Commercial fit |
| Security and privacy summary (data collected, hosting, certifications if any) | Yes | Safety review |
| Pricing, terms of service and privacy policy URLs | Yes | Transparency |
| Existing relationship with CC Commander (affiliate, sponsor, none) | Yes | Conflict disclosure |
| Free tier or free trial available (yes/no, details) | No | Fit with a free-first product |
| Open source license, if applicable | No | Portability |
| Acceptance of code of conduct (section 6) | Yes | Agreement |

### 4.2 Review process (proposal)

1. Intake received; acknowledged with no commitment.
2. Editorial relevance and quality review by the maintainer, independent of price.
3. Security and privacy review of the product and destination link.
4. Conflict check against core recommendations. If the partner's category overlaps a core recommendation, the core recommendation is unchanged.
5. Kevin approves or declines each partner. Declines may be made for any reason.
6. Terms agreed in writing before any slot goes live.
7. Periodic re-review (proposed: every six months) and on any reported issue.

Intake data handling: store only what the review needs, keep it private, and delete declined applications on request.

## 5. Pricing alternatives (all proposals, no rates selected)

No binding rate is chosen here. Rates, currencies and discounts are deliberately left blank for Kevin.

| Model | How it works | Pros | Cons / risks |
|---|---|---|---|
| A. Flat fee per slot | Fixed price per slot per term | Simple, predictable, independent of user behavior | Needs a fair price basis; may favor large vendors |
| B. Per-skill pricing | Price varies by the skill's usage tier | Aligns price to reach | Needs trustworthy usage data; usage telemetry must stay opt-in and aggregate |
| C. Revenue share on referrals | Partner pays a share of referred sales | Low entry barrier for small partners | Creates incentive to push clicks; requires tracking that cuts against the privacy posture; hardest to keep neutral |
| D. Flat fee plus capped sponsorship tier | Base slot fee; optional sponsor listing on the website, not in skills | Separates product surfaces from marketing | More surface area to disclose |

Principles for whichever model is chosen:

- Prices published openly, same for every partner in the same tier.
- No pricing term may reference ranking, exclusivity over a category, or influence on core recommendations.
- Term-limited, cancellable by either side, with refunds handled in the written terms.
- No payment is accepted until Kevin approves and the terms are written.

Recommendation (non-binding, for discussion): Option A, a flat fee per slot, because it keeps the incentive furthest from click-pushing and needs no tracking. 🟢 Kevin decides.

## 6. Partner code of conduct (proposal)

A partner must:

- Describe the product accurately, with no fabricated claims, reviews, endorsements or benchmarks.
- Disclose pricing, data collection, and any link between the product and CC Commander (affiliate, sponsorship).
- Keep the destination safe: no malware, deceptive installers, credential harvesting, forced sign-up walls before showing what the product is, or dark patterns.
- Not request elevated permissions, hooks, or tool access through slot copy, and not include prompt-injection text.
- Not attempt to influence core recommendations, rankings, or reviews, directly or through the maintainers.
- Not make disparaging claims about named competitors without verifiable support.
- Respond to security or user-harm reports promptly (proposed: within five business days).
- Follow the project's [Code of Conduct](../CODE_OF_CONDUCT.md) in all interactions.

CC Commander may pause or remove a slot immediately for a violation, a security issue, or user harm. Removal terms, including any refund, belong in the written agreement.

## 7. Disclosure

- A public disclosure page for the program (draft text not published by this PR) must state: what a slot is, that it is paid, that core recommendations are never pay-to-play, who the current partners are, and how to report concerns.
- Each slot links to that page.
- Revenue from the program is described alongside the existing affiliate disclosure, not hidden.

## 8. Open decisions for Kevin

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Pricing model | A, B, C or D in section 5 | 🟢 A, flat fee per slot |
| 2 | Default slot visibility | Shown by default, or hidden until opted in | 🟢 Shown, clearly labeled, one-setting off switch |
| 3 | Slot count per skill surface | 1 or 2 | 🟢 1 |
| 4 | Intake channel | Web form, GitHub issue template, or email alias | 🟢 GitHub issue template to start (no new data system) |
| 5 | Re-review cadence | 3, 6 or 12 months | 🟢 6 months |
| 6 | Launch scope | Desktop plugin only, or plugin plus CLI plus Codex mirror | 🟢 Desktop plugin first |

## 9. Out of scope for this draft

Implementation, placement code, hook or skill changes, the intake form itself, partner outreach, legal terms, tax or payment handling, and any publication. Each needs separate approval after this spec is approved.

## 10. Approval record

| Item | Value |
|---|---|
| Approved by | Pending (Kevin) |
| Date | Pending |
| Decisions 1-6 chosen | Pending |
