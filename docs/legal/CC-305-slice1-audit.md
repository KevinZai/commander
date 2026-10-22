# CC-305 slice 1: legal-pages / consent / data-disclosure audit (read-only)

DRAFT, internal engineering checklist. Not legal advice and not a compliance assurance. Needs review by qualified counsel before anything is published. Audit date: 2026-10-21. Baseline: origin/main at e4f8492c.

## Inventory

| Surface | File | Effective date shown |
|---|---|---|
| Site privacy page | `site/app/privacy/page.tsx` | 2026-05-13 (l.209) |
| Site terms page | `site/app/terms/page.tsx` | 2026-05-13 (l.152) |
| Static privacy page | `PRIVACY.html` | 2026-05-13 (l.120) |
| Marketplace privacy | `assets/marketplace/PRIVACY.md` | 2026-04-26 (l.4) |
| Footer links | `site/components/footer.tsx` l.103-109 (Privacy, Terms), l.185 | n/a |
| Consent UI | none found | n/a |

## Gaps (file:line)

| # | Sev | Gap |
|---|---|---|
| 1 | High | No cookie/consent banner exists. A grep for consent/banner/opt-in/DNT/GPC across `site/app`, `site/components`, `site/lib` finds nothing relevant. |
| 2 | High | `site/components/posthog-provider.tsx:15-22` initialises PostHog on first mount, with `persistence: "localStorage+cookie"` and `capture_pageleave: true`. It sets the ID and sends events before any choice, with no `opt_out_capturing_by_default`, no `respect_dnt`, no opt-in/out calls. |
| 3 | High | Privacy claims are not implemented. `site/app/privacy/page.tsx:172-176` and `PRIVACY.html:218` say DNT and "decline cookies" are honored, but there is no decline control and no DNT handling in code. |
| 4 | High | `PRIVACY.html:160-183` says plugin/CLI telemetry is on by default, with an anon device ID, sent to PostHog. `site/app/privacy/page.tsx` has no telemetry section (only "DO NOT collect" at l.14-24 and site/MCP sections). The two live privacy pages contradict each other. |
| 5 | High | `assets/marketplace/PRIVACY.md:11-35,73` says "zero egress", "no analytics platform" and "never transmits". This contradicts `PRIVACY.html:160-183`. It is also scoped to the Codex adapter only and is dated 2026-04-26, and its contact is `kevin@kevinz.ai` (l.80) rather than `hello@commanderplugin.com`. |
| 6 | Med | `PRIVACY.html:27` loads Plausible (`plausible.io/js/script.js`) and Google Fonts (l.28-29). Plausible is not disclosed as a third party in either privacy page. Google Fonts is not disclosed either, and it receives visitor IPs. The Next site `site/app/privacy/page.tsx` lists PostHog only. |
| 7 | Med | Stripe is used (`site/lib/stripe.ts`, `site/app/api/stripe/checkout`) but is not listed under "Third parties" (`site/app/privacy/page.tsx:80-125`). Terms say no paid tier has shipped (`terms/page.tsx:42-44`), so confirm the intended status. |
| 8 | Med | Affiliate / creator tracking is undisclosed. `site/app/affiliate/page.tsx:45,242` and `site/app/r/signup/page.tsx:48` promise a 90-day attribution cookie. `site/app/api/creator/click/route.ts:14-26` reads the raw IP, UA and referer, and logs the raw IP. The privacy page says the raw IP is never stored (`privacy/page.tsx:18,45`) and says it uses "exactly two categories" of cookies (l.136). The Supabase write is a TODO (CC-665). |
| 9 | Med | The privacy page's Cookies section (`privacy/page.tsx:136-153`) lists the PostHog and Auth.js cookies only. It does not list the affiliate cookie or any consent-preference storage. |
| 10 | Med | `site/components/waitlist-modal.tsx` (email field l.128-139) has no privacy/terms link and no consent statement at point of collection. The footer l.185 only links to privacy. |
| 11 | Med | Missing policy basics. There is no legal basis statement, no retention periods, no international-transfer note (US-only vendors), no stated CCPA/GDPR rights or categories, and no named controller address. The "Children" section (l.180-186) says under 13 only. Rights contact is the single hello@ email with a 30-day SLA. |
| 12 | Low | Terms have no termination-timing detail, DMCA/IP section or third-party services section. The terms refer to hosted-MCP data use only by reference to the privacy page, and have no telemetry mention (`terms/page.tsx`). |
| 13 | Low | Three copies of the policy (site TSX, `PRIVACY.html`, marketplace MD) will drift. The effective dates already differ. Pick one source of truth. |
| 14 | Low | Footer has no "Cookie settings" or "Do not sell/share" link (`footer.tsx:100-112`). |

## Draft-only checklist (nothing here is implemented)

- [ ] Decide the legal posture with counsel: EU/UK visitors, CCPA, the analytics-consent model.
- [ ] Decide the PostHog model: consent-gated (init with `opt_out_capturing_by_default: true`, opt in on accept) or cookieless (`persistence: "memory"`) plus a notice.
- [ ] Draft banner spec: accept/reject at equal prominence, a re-open link in the footer, a stored choice, honor DNT/GPC if the policy keeps claiming it.
- [ ] Reconcile the three policy copies into one source; unify the telemetry description (default-on to PostHog vs local-only) with what the code actually does. Verify against the `commander/` telemetry code first (not audited in this slice).
- [ ] Add missing disclosures: Plausible, Google Fonts, Stripe, affiliate cookie and click logging, retention, legal basis, transfers.
- [ ] Fix or remove the claims in gaps 3 and 8 until the code matches.
- [ ] Add privacy/terms link and a consent line to the waitlist modal.
- [ ] Update effective dates and the changelog notice on any change.
- [ ] Counsel review before publication.

## Not audited / out of scope

Plugin telemetry source code, the Supabase schema and retention, Auth.js config, the dashboard, and all live data or deployed state. No Linear issue body was readable (the Linear API and MCP calls were denied in this headless run), so scope was taken from the dispatcher brief.
