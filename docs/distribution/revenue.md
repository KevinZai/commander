# Revenue routing

Principle: the core (skills, agents, hooks, mods, workflows, connectors) is free and MIT, and stays free. There is no paid tier. Revenue comes from four disclosed levers: consulting (primary), affiliates (passive), an optional community, and sponsorship. Revenue is a secondary metric; the 90-day north star is weekly active users (see `metrics.md`). Every revenue path is justified by serving active users first: it must never gate a feature or change what the plugin recommends.

## The four routes and where each lives

| Route | What it is | Where people meet it | Destination |
|---|---|---|---|
| Consulting (primary) | Kevin helps teams adopt and customise Commander and the Commander Method | Site footer ("Hire Kevin, AI consulting"), `.github/FUNDING.yml` custom link, plugin README and docs footer | `https://kevinz.ai/consulting` |
| Affiliates (passive) | Partner links for services recommended in the optional `/ccc-connect` wizard | `/ccc-connect` (shows the disclosure before any affiliate connector), `commander/cowork-plugin/CONNECTORS.md` (rows marked as affiliate), docs | Partner sign-up pages via UTM-tagged links from `scripts/affiliate-links.mjs`; disclosure at `docs.commanderplugin.com/affiliate-disclosure` (source `mintlify-docs/affiliate-disclosure.mdx`) |
| Community (optional) | A paid or free community around the method, not a gate on the plugin | Not yet launched; link only once it exists | To be decided (open question) |
| Sponsorship | GitHub Sponsors, and sponsored placements if a partner asks | Site footer and pricing page, `.github/FUNDING.yml` | `https://github.com/sponsors/KevinZai` |

## How interested teams are routed

Teams ask for help in one of three ways. Route each one the same way every time:

1. **"We want this for our team"** (rollout, custom skills, training): consulting. Entry points: the site footer, a "For teams" section on the docs introduction page, and the closing line of the Show HN and launch post. One link, one form at `kevinz.ai/consulting`, tagged `?utm_source=commander&utm_medium=<surface>&utm_campaign=<release>`. Reply within two business days; first call free. (Kevin to confirm the offer and response time.)
2. **"What do you use for X?"** (databases, hosting, trackers): `/ccc-connect`. It shows the affiliate disclosure at the top of every response, always surfaces a non-affiliate alternative, and never changes a recommendation because of a commission.
3. **"I want to support this"**: GitHub Sponsors. No perks that gate features.

## Disclosure rules (non-negotiable)

- Every surface that shows an affiliate link says so next to the link, in plain words, before the click: "affiliate link, we may earn a commission, no effect on price or on what we recommend".
- `/ccc-connect` shows the disclosure at the top of every response and before any affiliate connector is installed (this is already in the skill).
- Posts that include an affiliate link carry the same line. Launch posts for Hacker News and Reddit carry no affiliate links at all.
- Keep one source of truth for partner URLs: `scripts/affiliate-links.mjs` (data file under `marketing/`, which is gitignored). Do not hand-edit links on surfaces.
- The directory listing and the plugin README must not push users to paid products.

## Fix before launch: the site contradicts "no paid tier"

Reading the repo shows public pages that describe a paid Pro tier. They conflict with the decision and with listing copy, and a reviewer or a commenter will notice:

- `site/app/pricing/page.tsx`: "Pro on a waitlist", "Pro and Lifetime are aspirational", stale skill and hook counts that disagree with the repo, and a statement of "100 free calls/mo" on the hosted MCP server.
- `site/app/affiliate/page.tsx`: a 30% recurring commission table on Pro Monthly ($19), Pro Yearly ($190) and Lifetime ($299), with `AFFILIATE_COUNT = 0` and a TODO. There is no product to earn commission on.
- `commander/contract.json`: `pricing_model` is `free-forever-with-pro-tier`, `pro_tier_planned` is true, `pro_skill_packs` is 5 (and a `commander/cowork-plugin-pro/` directory exists but is excluded from the npm package).
- `PLAN.md` (April) records the four-lever stack and "no paid plugin tier planned", so the plan agrees with the decision; the pricing page and contract do not.

Recommended change set (separate PR, not part of this docs-only branch): rewrite the pricing page as "Free. Here is how this is funded", drop the Pro and Lifetime tables, replace the affiliate page with the disclosed partner list (or remove it), set `pricing_model` to a free value in the contract, and decide the fate of `cowork-plugin-pro`. Until then, do not link the pricing or affiliate pages from any launch post.

## What to measure

Revenue is secondary to WAU. Track it so we learn which route earns, not to optimise it ahead of adoption.

| Route | Measure | Source |
|---|---|---|
| Consulting | Enquiries per week, qualified calls, engagements won, revenue, and the surface each enquiry came from (UTM) | The consulting form or Kevin's inbox; CRM note |
| Affiliates | Clicks per partner per week, sign-ups, commission earned | Partner dashboards, `affiliate-links.mjs revenue` once data exists |
| Community | Joins, active members, retention (only after launch) | Community platform |
| Sponsorship | Sponsor count and monthly amount | GitHub Sponsors |
| All | Revenue per WAU, reviewed monthly, and the share of enquiries that came from activated users | Derived with `metrics.md` |

Guardrails: if any revenue route correlates with a drop in activation or WAU in the weekly review, pause that route first. Do not send telemetry to partners; attribution uses UTM links only. No tracking pixels in the plugin.
