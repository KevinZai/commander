<!-- badges -->
![Version](https://img.shields.io/badge/version-4.1.0--beta.2-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![npm](https://img.shields.io/npm/v/cc-commander)
![Status](https://img.shields.io/badge/status-beta-yellow)

# CC Commander — Operating Manual

**The definitive day-to-day reference for Kevin Zicherman.**
If you forgot everything, start at [§1 Quick start](#1-quick-start). If the site is down, jump to [§10 Emergency procedures](#10-emergency-procedures).

Last updated: 2026-05-09

---

## Table of Contents

- [§1 Quick start](#1-quick-start)
- [§2 The product at a glance](#2-the-product-at-a-glance)
- [§3 Linear ticket index](#3-linear-ticket-index)
- [§4 Environment and secrets reference](#4-environment-and-secrets-reference)
- [§5 Daily / weekly / monthly operations](#5-daily--weekly--monthly-operations)
- [§6 Customer support workflows](#6-customer-support-workflows)
- [§7 Affiliate / creator / influencer operations](#7-affiliate--creator--influencer-operations)
- [§8 Lifetime cap mechanism](#8-lifetime-cap-mechanism)
- [§9 Premium skill pack workflow](#9-premium-skill-pack-workflow)
- [§10 Emergency procedures](#10-emergency-procedures)
- [§11 Communication channels](#11-communication-channels)
- [§12 Onboarding new contributors](#12-onboarding-new-contributors)
- [§13 External services and admin URLs](#13-external-services-and-admin-urls)
- [§14 Knowledge base and memory](#14-knowledge-base-and-memory)
- [§15 Versioning and release procedure](#15-versioning-and-release-procedure)
- [§16 First-time setup checklist](#16-first-time-setup-checklist)

---

## 1. Quick start

### Top 3 daily checks

1. **Linear** — open [CC Commander project](https://linear.app/k3v80/project/cc-commander), filter by "Assigned to me", pick the top unblocked issue.
2. **Test suite** — `npm test` from repo root. All suites must pass before any publish.
3. **Error logs** — `fly logs --app commander-mcp` (when [CC-653](https://linear.app/k3v80/issue/CC-653) lands). Until then: Vercel dashboard → Deployments → last deploy logs.

### Common commands cheat sheet

| Command | What it does |
|---|---|
| `npm test` | Full test suite (127 tests, 14 suites) |
| `npm run docs:sync:check` | Verify doc counts match `contract.json` (CI drift check) |
| `npm run docs:sync` | Apply count/version fixes across 21 docs |
| `npm run check:version` | Verify all 5 manifests share the same version |
| `npm run check:contract` | Verify product contract parity |
| `npm run build:codex` | Regenerate Codex mirror (`cowork-plugin-codex/`) |
| `node scripts/bump-version.js 4.X.Y` | Bump version across all 5 manifests |
| `npm publish --tag beta` | Publish beta to npm |
| `npm publish --tag latest` | Publish stable to npm |
| `gh release create v4.X.Y --notes-from-tag` | Create GitHub release |
| `fly deploy --app commander-mcp` | Deploy hosted MCP (after [CC-653](https://linear.app/k3v80/issue/CC-653)) |
| `fly releases rollback --app commander-mcp` | Rollback hosted MCP |
| `fly logs --app commander-mcp` | Tail hosted MCP logs |
| `ccc --test` | Run CCC CLI self-tests |
| `ccc --status` | CCC health check |
| `node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check` | Doc drift CI check (also in `npm run docs:sync:check`) |

### Where everything lives

| What | Path |
|---|---|
| Plugin (primary product) | `commander/cowork-plugin/` |
| Plugin skills | `commander/cowork-plugin/skills/` |
| Plugin agents | `commander/cowork-plugin/agents/` |
| Plugin hooks | `commander/cowork-plugin/hooks/` |
| Plugin manifest | `commander/cowork-plugin/.claude-plugin/plugin.json` |
| Hosted MCP server | `apps/mcp-server-cloud/` |
| Landing site (Next.js) | `site/` |
| Docs (Mintlify) | `mintlify-docs/` |
| CLI engine | `commander/engine.js` |
| Version source of truth | `package.json` |
| Product contract | `commander/contract.json` |
| Test suites | `commander/tests/*.test.js` + `tests/*.test.js` |
| Version bump script | `scripts/bump-version.js` |
| Doc sync script | `commander/cowork-plugin/skills/ccc-doc-sync/sync.js` |
| Strategy docs (gitignored) | `marketing/` |
| Kevin's personal overlay | `kevin/` |
| Vendor submodules | `vendor/` (19 packages) |
| Session dashboard | `dashboard/` (port 4690, zero-dep) |

---

## 2. The product at a glance

| Property | Value |
|---|---|
| Repo | [github.com/KevinZai/commander](https://github.com/KevinZai/commander) |
| Landing page | [cc-commander.com](https://cc-commander.com) |
| Docs | [docs.cc-commander.com](https://docs.cc-commander.com) |
| npm | [cc-commander](https://www.npmjs.com/package/cc-commander) |
| Plugin slug | `commander` in Cowork Desktop marketplace |
| Current version | 4.1.0-beta.2 |

### Plugin counts (v4.1.0-beta.2)

| Metric | Count |
|---|---|
| Plugin skills | 62 |
| Specialist agents | 22 |
| Lifecycle hooks | 9 |
| Hook handlers | 24 |
| Bundled MCP servers (credential-free) | 2 |
| Opt-in MCP connectors | 16 |
| Total ecosystem skills | 502+ |
| CCC domains | 11 |

### Pricing (as of 2026-05-08 — see [`marketing/monetization-plan-2026-05-08.md`](marketing/monetization-plan-2026-05-08.md))

| Tier | Price | Key inclusions |
|---|---|---|
| **Starter** | $0 | All 62 plugin skills, 22 agents, 9 hooks, 2 bundled MCPs + 16 opt-in. 100 hosted MCP calls/mo. Community Discussions. |
| **Pro** | $19/mo · $190/yr | Unlimited hosted MCP. Premium skill packs. Priority email (24h SLA). 1-week early access. Cross-machine state sync. Pro Discord. |
| **Lifetime** | $299 one-time *(first 100 only, then $499)* | Everything in Pro forever. Founding-member badge. Locked-in pricing. |

**Payment processor:** Lemon Squeezy (Merchant of Record — handles VAT/sales-tax globally, native affiliate, native license keys, native customer portal).

---

## 3. Linear ticket index

Project: [linear.app/k3v80/project/cc-commander](https://linear.app/k3v80/project/cc-commander)

| Ticket | Title | Priority | Blocked by |
|---|---|---|---|
| [CC-653](https://linear.app/k3v80/issue/CC-653) | MCP Phase 1 — Provision Supabase + Upstash + Fly + vault + GH secrets | 🔴 Urgent | Kevin only |
| [CC-663](https://linear.app/k3v80/issue/CC-663) | Migrate Pro tier checkout to Lemon Squeezy | 🔴 Urgent | Kevin only |
| [CC-662](https://linear.app/k3v80/issue/CC-662) | Pro tier launch (amended: use LS per CC-663) | 🔴 Urgent | After CC-663 |
| [CC-664](https://linear.app/k3v80/issue/CC-664) | Affiliate program: LS native + /affiliate signup page | 🟠 High | After CC-663 |
| [CC-665](https://linear.app/k3v80/issue/CC-665) | Creator program: GitHub OAuth + /r/{slug} pages + dashboard | 🟠 High | After CC-663 |
| [CC-657](https://linear.app/k3v80/issue/CC-657) | Publish first 3 blog posts to kevinz.ai + cc-commander.com/blog | 🟠 High | Review for old "free forever" copy first |
| [CC-666](https://linear.app/k3v80/issue/CC-666) | Influencer outreach + top-20 target list | 🟡 Medium | After CC-665 |
| [CC-667](https://linear.app/k3v80/issue/CC-667) | Press kit + Vercel OG image generation + creator assets | 🟡 Medium | None |
| [CC-654](https://linear.app/k3v80/issue/CC-654) | Anthropic Patch 2 — `permissionDecision: "defer"` for force-push | 🟡 Medium | None |
| [CC-655](https://linear.app/k3v80/issue/CC-655) | Anthropic Patch 3 — MCP tool annotations on cloud server | 🟡 Medium | After CC-653 |
| [CC-658](https://linear.app/k3v80/issue/CC-658) | GitHub Sponsors: 3 tiers ($5 / $19 / $99) | 🟡 Medium | None |
| [CC-659](https://linear.app/k3v80/issue/CC-659) | Audit /ccc-connect affiliate links: enable Vercel + Supabase + Neon | 🟡 Medium | None |
| [CC-661](https://linear.app/k3v80/issue/CC-661) | Test debt: clear 64 audit-test failures (post-rename + count drift) | 🟡 Medium | None |
| [CC-656](https://linear.app/k3v80/issue/CC-656) | Vendor majors: review + bump 6 deferred packages | 🟢 Low | None |
| [CC-660](https://linear.app/k3v80/issue/CC-660) | Pro Discord — defer until 200 stars | 🟢 Backlog | 200 GitHub stars |

---

## 4. Environment and secrets reference

All secrets live in 1Password vault **Alfred**. Never hardcode. Reference via `op://Alfred/<item>/<field>`.

### Root + mcp-server-cloud vars

| Var | Used by | Source | Notes |
|---|---|---|---|
| `LEMONSQUEEZY_API_KEY` | `site/app/api/*` | `op://Alfred/cc-commander-lemonsqueezy/api-key` | Required for Pro signups (CC-663) |
| `LEMONSQUEEZY_STORE_ID` | `site/app/api/*` | Same LS vault item | |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | `site/app/api/webhooks/lemonsqueezy/route.ts` | Same LS vault item | Verify webhook signature |
| `AUTH_SECRET` | `site/auth.config.ts` | `openssl rand -base64 32` | Random string, rotate if leaked |
| `AUTH_GITHUB_ID` | `site/auth.config.ts` | github.com/settings/applications/new | GitHub OAuth app |
| `AUTH_GITHUB_SECRET` | `site/auth.config.ts` | Same GitHub app | |
| `SUPABASE_URL` | `apps/mcp-server-cloud`, `site/` (creators table) | `op://Alfred/cc-commander-supabase/url` | CC-653 — provision first |
| `SUPABASE_SERVICE_ROLE_KEY` | Same | Same Supabase vault item | Never expose client-side |
| `JWT_SECRET` | `apps/mcp-server-cloud` (license signing) | Same Supabase vault item | |
| `METRICS_AUTH_TOKEN` | `apps/mcp-server-cloud` (`/metrics` gate) | `op://Alfred/cc-commander-metrics/auth-token` | Protects the metrics endpoint |
| `UPSTASH_REDIS_REST_URL` | `apps/mcp-server-cloud` (rate limiting) | `op://Alfred/cc-commander-upstash/url` | CC-653 |
| `UPSTASH_REDIS_REST_TOKEN` | Same | Same Upstash vault item | |
| `FLY_API_TOKEN` | GitHub Actions (`deploy-mcp.yml`) | `op://Alfred/cc-commander-fly/api-token` | CC-653 |
| `POSTHOG_API_KEY` | `apps/mcp-server-cloud`, site analytics | `op://Alfred/cc-commander-posthog/api-key` | Optional until analytics needed |
| `STRIPE_*` | Deprecated — removed in v4.1.0-beta.2 pivot | n/a | Replaced by Lemon Squeezy (CC-663) |

### Vercel environment variable setup

Go to [Vercel dashboard](https://vercel.com/k3v80s-projects/cc-commander) → Settings → Environment Variables.

| Var | Environments |
|---|---|
| `LEMONSQUEEZY_API_KEY` | Production, Preview |
| `LEMONSQUEEZY_STORE_ID` | Production, Preview |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Production only |
| `AUTH_SECRET` | Production, Preview |
| `AUTH_GITHUB_ID` | Production, Preview |
| `AUTH_GITHUB_SECRET` | Production, Preview |
| `SUPABASE_URL` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only |
| `POSTHOG_API_KEY` | Production (optional) |

**Tip:** Preview deployments should use a separate LS test-mode store so test transactions don't appear in production revenue.

---

## 5. Daily / weekly / monthly operations

### Daily

- Check [Linear CC project](https://linear.app/k3v80/project/cc-commander) — pick top unblocked issue.
- Scan Vercel deployment logs for runtime errors.
- Respond to GitHub Discussions within 24 hours.
- Pro support email (`hello@cc-commander.com`) — 24h SLA.

### Weekly

- Ship at least one commit (feature, fix, or doc).
- Publish one of the 10 staged blog posts from `marketing/blog-drafts/` per [CC-657](https://linear.app/k3v80/issue/CC-657). Check for stale "free forever" copy before publishing.
- Review GitHub Discussions for any unanswered threads.
- Check affiliate signup activity in [Lemon Squeezy dashboard](https://app.lemonsqueezy.com/dashboard).
- Run weekly creator tier graduation check (see [§7](#7-affiliate--creator--influencer-operations)).

### Monthly

- Review affiliate payouts in [LS dashboard](https://app.lemonsqueezy.com/dashboard) — LS auto-runs on the 1st. Verify, no action unless dispute.
- Review top creator stats (`creator_conversions` table in Supabase).
- Run `npm audit` + Dependabot review. Merge security patches immediately.
- Check vendor submodule updates via `git submodule status` — apply weekly auto-updates from GitHub Actions, review for breaking changes.
- Refund any expiring trials or disputed charges within 5 business days.
- Update `CHANGELOG.md` with GitHub Sponsors names if relevant.

### Per release

See [§15 Versioning and release procedure](#15-versioning-and-release-procedure) for the full checklist.

### Quarterly

- Reassess pricing tiers against market (Cursor, ECC, Copilot anchors).
- Audit affiliate compliance — review click-to-conversion anomalies.
- Review deferred Linear ticket backlog — promote, kill, or re-prioritize.
- Rotate `JWT_SECRET` and `METRICS_AUTH_TOKEN` as a precaution.

---

## 6. Customer support workflows

### Pro signup support

1. Ask the customer for their Lemon Squeezy order number (in their purchase receipt email).
2. In [LS dashboard](https://app.lemonsqueezy.com/dashboard) → Orders → search order number.
3. Verify order status = "Paid" and product = "CC Commander Pro".
4. If license key is missing: Orders → order detail → "License keys" → copy key → email customer.
5. If activation fails: ask customer to check `~/.claude/commander/license.json` exists. If it doesn't, they need to run the license validation flow from `/ccc-start`.

### Refund request

- **Monthly/Yearly subscriptions:** 14-day money-back, no questions asked.
- **Lifetime:** 30-day money-back.
- Process: [LS dashboard](https://app.lemonsqueezy.com/dashboard) → Orders → find order → "Refund" button.
- After refund: LS auto-cancels the subscription and revokes the license key. No manual action needed.
- Email customer confirming the refund (usually 3-5 business days to appear on statement).

### Subscription cancellation

- Send customer their LS customer portal link (available in LS dashboard → Customers → find customer → "Customer portal" button, or they can use the link in any receipt email).
- They manage their own subscription from the portal — no Kevin action required.
- They keep Pro access until the end of their current billing period.

### License key not working

1. Verify in [LS dashboard](https://app.lemonsqueezy.com/dashboard) → License Keys — check status is "Active" (not "Expired" or "Disabled").
2. If active: ask customer to delete `~/.claude/commander/license.json` and re-validate.
3. If expired/disabled: check if subscription lapsed — offer renewal link.
4. If still failing after re-validate: check `apps/mcp-server-cloud` license validation endpoint logs on Fly.

### Pro Discord access (when CC-660 ships)

1. Verify customer has an active Pro subscription in LS dashboard.
2. Send invite link to the Pro Discord server.
3. Assign the `Pro` role on entry — either manually or via Discord bot (bot TBD in CC-660 scope).

### Account migration (multiple machines)

- License keys are per-user, not per-machine.
- Customer simply pastes their license key on each new machine and runs the validation flow.
- No Kevin action required. LS license key API supports unlimited machine activations by default unless you configure an activation limit in LS.

---

## 7. Affiliate / creator / influencer operations

### New affiliate signup

1. Customer clicks "Become a creator" on `cc-commander.com/affiliate`.
2. GitHub OAuth flow auto-creates their LS affiliate account, generates `cc-commander.com/r/{username}`.
3. Welcome email fires automatically.
4. **Kevin action: none** — fully automated via CC-664 / CC-665 infrastructure.

### Creator tier graduation

- **Automated:** weekly cron auto-promotes Affiliate → Creator at 50 conversions OR 1K+ GitHub followers.
- Kevin receives an email notification for each promotion.
- Manual override: set `tier='creator'` in Supabase `creators` table via Supabase Studio.

### Influencer onboarding (hand-picked top 20)

When Kevin decides to invite someone:

1. Set `tier='influencer'` in Supabase `creators` table.
2. Set 50% lifetime commission in LS: [LS dashboard](https://app.lemonsqueezy.com/dashboard) → Affiliates → find affiliate → edit commission rate to 50%.
3. Generate custom 20% discount code in LS: `LOVE-{SLUG-UPPER}` (e.g., `LOVE-THEO`).
4. Add to Slack Connect "CC Commander Influencers" workspace.
5. Send welcome email using template at [`marketing/templates/emails/05-welcome-influencer.md`](marketing/templates/emails/05-welcome-influencer.md).
6. Optional: schedule a 30-minute onboarding call.

### Monthly affiliate payout

LS auto-runs on the 1st. Log into [LS dashboard](https://app.lemonsqueezy.com/dashboard) → Affiliates → Payouts to verify. No Kevin action unless there is a dispute or anomaly.

### Affiliate fraud detection

Automatic flags to watch for:
- Click-to-conversion ratio > 30% (industry norm ~1-5%) — possible self-referral.
- Conversion followed by chargeback within 30 days.
- Burst of clicks from a single IP or region in < 1 hour.

**If fraud suspected:**
1. Suspend affiliate in LS immediately.
2. Document in `marketing/affiliate-fraud-log.md` (create if it doesn't exist).
3. Refund any fraudulent charges.
4. If confirmed fraud: permanently disable affiliate account in LS.

---

## 8. Lifetime cap mechanism

The first 100 lifetime sales close at $299, then the price rises to $499.

### How the counter works

- LS fires a `order_created` webhook on every Lifetime purchase.
- `site/app/api/webhooks/lemonsqueezy/route.ts` receives the webhook.
- The handler increments `lifetime_sales` in Supabase (single-row counter).

### When the counter hits 100

Kevin must do one of the following:

**Option A — Manual copy update:**
1. Edit `site/components/pricing-table.tsx` — change Lifetime tier checkout href to a waitlist signup URL.
2. Update the tier label to "Sold out — join waitlist".
3. Deploy via `git push` to Vercel.

**Option B — Auto-redirect via API route (if built):**
- The `site/app/api/stripe/checkout` route can return a 302 to the waitlist URL if `lifetime_sales >= 100`.

**After the cap:**
1. Log into [LS dashboard](https://app.lemonsqueezy.com/dashboard) → Products → Lifetime tier → raise price to $499.
2. Update `site/components/pricing-table.tsx` price display to $499.
3. Add waitlist email capture form (collect interest for next batch).
4. Tweet: "First 100 Lifetime seats are gone. Waitlist open for the next batch at $499."

---

## 9. Premium skill pack workflow

Each new Pro-only skill pack follows this process:

1. Create `commander/cowork-plugin-pro/skills/{pack-name}/SKILL.md` with valid frontmatter:
   ```yaml
   ---
   name: ccc-{pack-name}
   description: "..."   # ≤200 chars
   tier: pro
   status: shipped
   ---
   ```
2. Implement the full skill body — real workflows, not placeholders. Reference 3 existing skills for style before writing.
3. Add unit tests in `commander/tests/` or `tests/` matching the hook lifecycle.
4. Update `commander/contract.json` — bump `pro_skill_packs` count.
5. Run `npm test` — all suites must pass.
6. Run `npm run docs:sync` to propagate new count to all 21 docs.
7. Bump CHANGELOG under the new version section.
8. Send "Pack release" email to all Pro users via LS → Emails → New broadcast (template at [`marketing/templates/emails/06-pack-release.md`](marketing/templates/emails/06-pack-release.md)).
9. Post announcement tweet.
10. Update Mintlify docs at `mintlify-docs/plugin/free-vs-pro.mdx` — add pack to the Pro inclusions list.

**Anti-pattern to avoid:** do not ship a pack until it is production-quality. One great pack at launch beats four mediocre ones.

---

## 10. Emergency procedures

### Site down (cc-commander.com)

1. Check [Vercel status page](https://www.vercel-status.com) — is it a platform incident?
2. If not a platform incident: [Vercel dashboard](https://vercel.com/k3v80s-projects/cc-commander) → Deployments → find last stable deploy → "Rollback to this deployment".
3. Check runtime logs for the broken deploy to diagnose root cause before re-deploying a fix.

### Hosted MCP down (apps/mcp-server-cloud on Fly)

```bash
fly status --app commander-mcp          # Check instance health
fly logs --app commander-mcp            # Tail logs for errors
fly releases rollback --app commander-mcp  # Rollback to last stable release
```

If Fly itself is having an incident: [status.fly.io](https://status.fly.io).

### Lemon Squeezy payment processor incident

1. Check [status.lemonsqueezy.com](https://status.lemonsqueezy.com).
2. If confirmed LS incident: post status update on Twitter (`@kzic`) — "Pro signups temporarily paused, working on it."
3. Refund any failed charges manually once LS recovers.

### Security incident

1. Read [`SECURITY.md`](./SECURITY.md) — follow the response protocol there.
2. Rotate `JWT_SECRET` immediately in 1Password + Vercel + Fly env vars.
3. Rotate `LEMONSQUEEZY_WEBHOOK_SECRET` in LS dashboard + Vercel.
4. Force re-authentication: invalidate all active sessions in Supabase (`auth.sessions` table — delete all rows).
5. Open a private GitHub Security Advisory for tracking.
6. If license keys are compromised: bulk-revoke in LS API, email all affected users.

### Refund surge (possible regression)

1. Look at what shipped in the last 1-3 commits: `git log --oneline -10`.
2. If a commit matches the reported problem: `git revert <hash>` + deploy.
3. Email affected customers personally — acknowledge the issue, confirm refund processing.
4. File a post-mortem in Linear as a new CC- issue.

### Lost license key surge

1. LS dashboard → License Keys → search by customer email.
2. Copy key → email customer directly.
3. If this is a pattern (> 5 requests in a day): ship a self-service "resend license key" flow on the Pro account dashboard.

### Affiliate fraud surge

1. Suspend the affiliate program temporarily in LS dashboard → Affiliates → Settings → disable.
2. Audit last 48 hours of `creator_clicks` and `creator_conversions` tables in Supabase.
3. Identify and ban fraudulent accounts.
4. Re-enable after cleanup.

### DDoS on hosted MCP

1. Check Fly metrics for traffic spike: `fly dashboard --app commander-mcp`.
2. If rate limiter is running (Upstash Redis), it should auto-throttle — verify logs.
3. If throughput is overwhelming: add Cloudflare WAF in front of Fly origin.
4. Fallback: temporarily lower the free-tier cap in Supabase `get_effective_cap` RPC to reduce attack surface.

---

## 11. Communication channels

| Channel | Where | Response SLA | Notes |
|---|---|---|---|
| **GitHub Discussions** | [github.com/KevinZai/commander/discussions](https://github.com/KevinZai/commander/discussions) | 24h | Public community Q&A |
| **Pro support email** | hello@cc-commander.com | 24h business hours | Pro subscribers only |
| **Pro Discord** | TBD (CC-660) | 4h business hours | Launch at 200 stars |
| **Influencer Slack** | "CC Commander Influencers" Slack Connect | 24h | Hand-picked top-20 only |
| **Twitter / X** | [@kzic](https://twitter.com/kzic) | Best effort | Announcements + engagement |
| **Linear** | [CC project](https://linear.app/k3v80/project/cc-commander) | Internal | All CC work tracked here |
| **GitHub Issues** | [Bugs + feature requests](https://github.com/KevinZai/commander/issues) | 48h | Use issue templates |

---

## 12. Onboarding new contributors

1. Point them to [`CONTRIBUTING.md`](./CONTRIBUTING.md) — quick start, PR standards, what we don't merge.
2. Point them to this file (`OPERATING-MANUAL.md`) for operational context.
3. For substantial PRs (new skill, new agent, new hook): ask them to open a Linear issue first using the CC- project, or a GitHub Discussion.
4. Review against the counts-impact checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
5. Key guardrails (from `CONTRIBUTING.md`):
   - Skills/agents/hooks shipped today stay free in Starter **forever** — no paywalling existing features.
   - No license-key checks on the plugin core (MIT-licensed, git-clonable).
   - No telemetry additions of any kind.
   - Tests required for any new behavior.
   - Count changes require `commander/contract.json` update + `npm run docs:sync`.
6. Squash and merge with a conventional commit message.

---

## 13. External services and admin URLs

| Service | URL | Notes |
|---|---|---|
| Lemon Squeezy admin | [app.lemonsqueezy.com/dashboard](https://app.lemonsqueezy.com/dashboard) | Orders, subscriptions, affiliates, license keys |
| Vercel dashboard | [vercel.com/k3v80s-projects/cc-commander](https://vercel.com/k3v80s-projects/cc-commander) | Site deploys, env vars, logs |
| Fly.io app | `fly dashboard --app commander-mcp` or [fly.io/apps](https://fly.io/apps) | Hosted MCP (after CC-653) |
| Upstash Redis | [console.upstash.com](https://console.upstash.com) | Rate limiting database (after CC-653) |
| Supabase project | TBD after CC-653 | creators table, usage counters, license state |
| GitHub repo | [github.com/KevinZai/commander](https://github.com/KevinZai/commander) | Code, issues, discussions, Actions |
| GitHub Sponsors | [github.com/sponsors/KevinZai](https://github.com/sponsors/KevinZai) | 3 tiers (CC-658) |
| npm package | [npmjs.com/package/cc-commander](https://www.npmjs.com/package/cc-commander) | Publish history, download stats |
| Linear project | [linear.app/k3v80/project/cc-commander](https://linear.app/k3v80/project/cc-commander) | All CC- tickets |
| 1Password Alfred vault | Open via Mac app → Alfred vault | All secrets stored here |
| PostHog analytics | TBD after enabled | CC-653 tracks this |
| Lemon Squeezy status | [status.lemonsqueezy.com](https://status.lemonsqueezy.com) | Monitor during incidents |
| Fly status | [status.fly.io](https://status.fly.io) | Monitor during MCP incidents |
| Vercel status | [www.vercel-status.com](https://www.vercel-status.com) | Monitor during site incidents |

---

## 14. Knowledge base and memory

### Project-scoped Claude memory

Agent memory for CC Commander sessions is stored at:

```
~/.claude/projects/-Users-ai-clawd-projects-cc-commander/memory/
```

Key files:
- `MEMORY.md` — index of all memory files
- `project_pricing_decision.md` — current Starter/Pro/Lifetime model (locked 2026-05-08)
- Plus other project-scoped notes (brand strategy, rebrand history, etc.)

### Strategy docs (gitignored — stay local)

```
marketing/
├── monetization-plan-2026-05-08.md   # Definitive plan (pricing, affiliates, 90-day targets)
├── templates/
│   └── emails/
│       ├── 05-welcome-influencer.md
│       └── 06-pack-release.md
├── blog-drafts/                       # 10 posts staged for CC-657
└── affiliate-fraud-log.md             # Create when needed
```

### Output docs (gitignored)

```
output/dev/
├── pricing-analysis-*.md
├── vendor-sweep-report-*.md
├── anthropic-features-audit-*.md
└── memory-stack-tier-model-*.md
```

### Public reference docs (committed)

| File | Purpose |
|---|---|
| [`BIBLE.md`](./BIBLE.md) | The Kevin Z Method — 7 chapters, philosophy + practice |
| [`CHEATSHEET.md`](./CHEATSHEET.md) | Daily-use command reference |
| [`SKILLS-INDEX.md`](./SKILLS-INDEX.md) | Searchable skill directory |
| [`CHANGELOG.md`](./CHANGELOG.md) | Full version history |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Contributor guide |
| [`CLAUDE.md.template`](./CLAUDE.md.template) | Staff CLAUDE.md template |
| [`commander/contract.json`](./commander/contract.json) | Authoritative count source for CI |

---

## 15. Versioning and release procedure

### Full release checklist

```bash
# 1. Branch
git checkout -b release/v4.X.Y

# 2. Bump version across all 5 manifests
node scripts/bump-version.js 4.X.Y

# 3. Update CHANGELOG.md
#    Move drafted notes from the "Unreleased" section to a dated section:
#    ## [4.X.Y] — YYYY-MM-DD

# 4. Run full verification suite
npm test                          # 127 tests must pass
npm run docs:sync:check           # No doc drift
npm run check:version             # All 5 manifests match
npm run check:contract            # Product contract parity

# 5. Commit
git add -A
git commit -m "chore: bump to v4.X.Y"

# 6. Tag
git tag v4.X.Y

# 7. Push
git push origin release/v4.X.Y --tags

# 8. Merge to main (PR or direct if solo)
git checkout main && git merge --no-ff release/v4.X.Y && git push

# 9. npm publish
#    Beta:
npm publish --tag beta
#    Stable (when out of beta):
npm publish --tag latest

# 10. GitHub release
gh release create v4.X.Y --notes-from-tag

# 11. Announce
#    - Tweet with version + key changes
#    - Post in Pro Discord (when live)
#    - Send Pro newsletter if major release
```

### The 5 manifests that `bump-version.js` updates

1. `package.json`
2. `commander/cowork-plugin/.claude-plugin/plugin.json`
3. `.claude-plugin/marketplace.json`
4. `apps/mcp-server-cloud/package.json`
5. `apps/mcp-server-cloud/package-lock.json`

The `prepublishOnly` script in `package.json` runs all CI checks automatically before `npm publish` can proceed. It will block publish if any check fails.

---

## 16. First-time setup checklist

Use this when setting up a fresh development environment.

```bash
# Clone with submodules
git clone --recursive https://github.com/KevinZai/commander.git cc-commander
cd cc-commander

# Node version
nvm use   # Uses .nvmrc — requires Node 18+, project runs on 24.13.0

# Root dependencies
npm install

# Site dependencies
cd site && pnpm install && cd ..

# Hosted MCP server dependencies
cd apps/mcp-server-cloud && npm install && cd ../..

# Environment variables
# Copy each .env.example to .env.local in site/ and apps/mcp-server-cloud/
# Fill from 1Password Alfred vault (see §4 for the full var list)
cp site/.env.example site/.env.local
cp apps/mcp-server-cloud/.env.example apps/mcp-server-cloud/.env.local
# Edit each .env.local with values from: op://Alfred/cc-commander-*/...
```

**Verification:**

```bash
npm test                   # 127 tests, all pass
npm run docs:sync:check    # No doc drift (exit 0)
npm run check:version      # Version parity across 5 manifests (exit 0)
```

**Optional — run locally:**

```bash
# Landing site on :3000
cd site && pnpm dev

# Hosted MCP dev server
cd apps/mcp-server-cloud && npm run dev

# CCC CLI
node commander/engine.js

# Session dashboard on :4690
cd dashboard && open index.html   # or serve with npx serve -l 4690
```

**Setup checklist:**

- [ ] `git clone --recursive` completed (submodules present in `vendor/`)
- [ ] `nvm use` resolves without error
- [ ] `npm install` at root — no errors
- [ ] `cd site && pnpm install` — no errors
- [ ] `cd apps/mcp-server-cloud && npm install` — no errors
- [ ] `site/.env.local` populated from 1Password
- [ ] `apps/mcp-server-cloud/.env.local` populated from 1Password
- [ ] `npm test` — 127/127 pass
- [ ] `npm run docs:sync:check` — exit 0
- [ ] `npm run check:version` — exit 0

---

*Last updated: 2026-05-09*
