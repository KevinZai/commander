# Spec: cc-commander.com Marketing Site

**Date:** 2026-04-16
**Owner:** Kevin Zicherman
**Status:** Draft — pending approval to build
**Domain:** cc-commander.com (owned by Kevin)
**Repo location:** `<repo-root>/marketing/`

---

## 1. Goal

Ship a high-conversion marketing site for CCC v3.0.0 that:

1. **Educates** — tells the story of why CCC exists (curation + AI-guided workflows)
2. **Converts** — drives plugin installs (free tier) and Pro subscriptions ($19/mo)
3. **Positions** — anchors CCC as the curated, premium alternative to plugin-hunting
4. **Proves** — shows concrete before/after examples and pricing upfront

**Target personas:**
- **Primary:** Solo developers already using Claude Code but frustrated by plugin sprawl
- **Secondary:** Teams evaluating Claude Code at work who need enterprise features
- **Tertiary:** AI-curious technical buyers who want a turnkey Claude upgrade

---

## 2. Tech Stack (locked)

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Next.js 15** App Router | Industry standard for monetized Claude plugin sites (matches thecommander.app) |
| Styling | **Tailwind CSS v4** | Kevin's default; pairs with shadcn/ui |
| Components | **shadcn/ui v4** | Via shadcn-ui MCP; consistent with Kevin's ecosystem |
| Animation | **Framer Motion** | For hero animations, scroll effects, workflow diagram |
| Payments | **Stripe Checkout** (hosted) | No PCI scope; fastest path to monetization |
| Analytics | **Plausible** | Privacy-first, no cookies, GDPR-clean |
| Deployment | **Vercel** | Auto-deploy on push to `main` branch, `marketing/` folder |
| Email capture | **Loops** or **Resend** | Waitlist + newsletter integration |
| Content | **MDX** | Changelog, blog, docs-lite posts |

**Folder structure:**
```
marketing/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # Home
│   │   ├── pricing/page.tsx      # Pricing table
│   │   ├── changelog/page.tsx    # Release notes (MDX)
│   │   ├── docs/page.tsx         # Quick-start docs
│   │   └── layout.tsx            # Marketing shell
│   ├── api/
│   │   └── stripe/
│   │       └── webhook/route.ts  # Handle subscription events
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── hero.tsx
│   ├── workflow-demo.tsx         # Animated "before/after"
│   ├── skills-grid.tsx
│   ├── pricing-table.tsx
│   ├── testimonial-section.tsx
│   └── footer.tsx
├── lib/
│   ├── stripe.ts                 # Stripe client
│   └── content.ts                # MDX loader
├── content/
│   ├── changelog/*.mdx
│   └── blog/*.mdx
├── public/
│   ├── og-image.png
│   └── cc-commander-logo.svg
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## 3. Site Map

| Route | Purpose | Priority |
|-------|---------|----------|
| `/` | Home — hero, features, workflow demo, pricing, CTA | P0 |
| `/pricing` | Full pricing table with FAQ and Stripe checkout buttons | P0 |
| `/changelog` | MDX-driven release notes, starting with v3.0.0 | P1 |
| `/docs` | Quick-start docs (install, first workflow, connect tools) | P1 |
| `/blog` | Blog for SEO + thought leadership (starts empty) | P2 |
| `/api/stripe/webhook` | Handles subscription events → license key issuance | P0 |

---

## 4. Home Page Design

### 4.1 Hero (above fold)

**Overline (small caps, muted):**
> 95% OF CLAUDE USERS ARE OPERATING WITH THEIR HANDS TIED

**H1 (large, bold, 48-64px):**
> We found every great Claude plugin. Kept the best. Made them talk to each other.

**Sub (18-20px, muted):**
> CCC is the curated, **AI-guided** package that turns Claude from a brain-in-a-jar into an operator. **15 skills. 5 agents. 8 pre-wired MCP integrations.** One install.

**CTAs:**
- Primary: `[Install CCC Free →]` (scroll to install section)
- Secondary: `[See what's inside →]` (scroll to features)

**Terminal visual (right side or below):**
```
$ claude
> /plugin marketplace add KevinZai/commander
✓ Marketplace added
> /plugin install commander
✓ Installed: commander v3.0.0
  15 skills · 5 agents · 6 hooks · 8 MCPs
✓ Ready. Try /ccc:build to ship something.
```

Animated: lines type in sequentially with Framer Motion.

**Stats strip below hero (4 columns):**
- `450+ Skills` — across 11 CCC domains
- `8 MCP Integrations` — pre-wired (vs <5% average)
- `5 Agents` — specialized for review, build, debug, research
- `Free Tier` — try before you upgrade

---

### 4.2 Problem Section — "The Plugin Mess"

**H2:** "Claude Code has 100+ plugins. Nobody has time to find the good ones."

Three-column layout with icons + short copy:

1. **Hunting** — "Scrolling GitHub awesome lists. Reading Hacker News. Testing plugins that don't work together."
2. **Duct-taping** — "Copying config between `.claude/settings.json`, `.mcp.json`, agent files. Hoping nothing breaks."
3. **Missing out** — "Less than 5% of Claude users have even ONE MCP server set up. You're leaving 10× productivity on the table."

**Transition copy:**
> "We got tired of it. So we built CCC."

---

### 4.3 Solution Section — "What CCC Is"

**H2:** "The curated, AI-guided Claude Code operator."

Grid of 4 feature cards (2×2):

| Card | Copy |
|------|------|
| **15 AI-Guided Skills** | Every skill runs a guided workflow. `/ccc:build` asks 3 questions, hands off to the builder agent. `/ccc:standup` pulls from git + Linear + Slack, drafts a standup, posts it. No blank terminal. |
| **5 Specialized Agents** | Not one generic assistant. A reviewer for PRs (read-only). A builder with TDD (write access). A debugger (Opus for root-cause reasoning). A researcher (web + codebase). A fleet worker (parallel tasks). |
| **8 Pre-Wired MCPs** | Linear, GitHub, Slack, Gmail, Calendar, Tavily (real-time web), Context7 (library docs), Google Drive. Works standalone. Supercharged when connected. |
| **6 Lifecycle Hooks** | Auto-load context at session start. Capture knowledge from every edit. Classify intent on every prompt. Track cost. Save sessions. All optional, all configurable. |

---

### 4.4 Workflow Demo — "See It In Action"

**H2:** "Weekly competitive intel. Used to take 3 hours."

Animated 4-step workflow diagram (Framer Motion):

```
[Step 1]  /ccc:research competitor.com
          ↓ Tavily pulls news, pricing, product launches
[Step 2]  Google Drive fetches last week's tracking doc
          ↓ Claude compares, identifies changes
[Step 3]  researcher agent synthesizes the report
          ↓ writes updated doc back to Drive
[Step 4]  /ccc:standup posts summary to Slack #comp-intel
          ↓ before your Monday meeting
```

**Below the diagram:**
> **Total time: 4 minutes. Running unsupervised.**
> **Without CCC:** 5 tabs, 12 copy-pastes, 3 hours of context-switching.

---

### 4.5 Skills Showcase — Interactive

**H2:** "15 skills. Tab through them."

Tabbed UI (shadcn/ui Tabs component). Each skill has:
- Name + icon
- One-line description
- Example command
- Free/Pro badge

Skills list (grouped by tier):

**Free tier:**
- `/ccc:commander` — Interactive project manager hub
- `/ccc:session` — Resume or review prior work
- `/ccc:settings` — Configure name, theme, Linear, etc.
- `/ccc:knowledge` — Search/browse captured lessons
- `/ccc:domains` — Router to 11 CCC domain packs

**Pro tier:**
- `/ccc:build` — Spec-driven build with Spec Flow
- `/ccc:linear-board` — Pick tasks, create issues, sync status
- `/ccc:research` — Deep research with Tavily + parallel agents
- `/ccc:content` — Blog, social, email, docs with Drive context
- `/ccc:standup` — Auto-generated from git + Linear + sessions
- `/ccc:code-review` — 4-dimension review with reviewer agent
- `/ccc:deploy-check` — GO/CAUTION/NO-GO deploy gate
- `/ccc:fleet` — Parallel agent orchestration
- `/ccc:night-mode` — Autonomous overnight builds
- `/ccc:infra` — Service health probe

---

### 4.6 Pricing Section

**H2:** "Free forever core. Pro when you're ready."

Three-tier pricing table (shadcn/ui Card components):

| | **Free** | **Pro** ★ | **Team** |
|---|---------|----------|---------|
| **Price** | $0 | $19/mo or $190/yr | $99/mo per 5 seats |
| **Skills** | 5 free skills | 15 skills (all) | 15 skills + custom |
| **Agents** | Hub only | 5 specialized agents | 5 agents + fleet scaling |
| **Hooks** | 2 (SessionStart, Stop) | 6 (all) | 6 + team telemetry |
| **MCP servers** | 8 pre-configured | 8 pre-configured | 8 + private MCPs |
| **Knowledge capture** | Manual | Auto-captured | Shared across team |
| **Night mode** | — | ✓ | ✓ |
| **Fleet orchestration** | — | ✓ | ✓ + parallel caps |
| **Priority support** | Community | Email | Slack Connect |
| **Enterprise SSO** | — | — | ✓ |

**CTAs:**
- Free: `[Install CCC →]` links to GitHub marketplace command
- Pro: `[Start Pro $19/mo]` → Stripe Checkout
- Team: `[Contact Sales]` → mailto or form

**FAQ block below pricing:**
- "Is this really free?" — Yes, free tier is MIT licensed, no limits.
- "Do I need API keys?" — No for free tier. Pro optionally uses Tavily API key.
- "Can I cancel?" — Yes, anytime. License stays active until end of billing period.
- "Do you offer refunds?" — 14-day no-questions refund.
- "Is my data private?" — 100% local. CCC never phones home.

---

### 4.7 Install Section

**H2:** "Install in 60 seconds."

Two-column layout:

**Desktop Plugin (recommended):**
```
/plugin marketplace add KevinZai/commander
/plugin install commander
```

**CLI (legacy/power users):**
```
curl -fsSL https://cc-commander.com/install.sh | bash
```

Copy buttons on both. Short note: "Works with Claude Code Desktop and Claude Code CLI."

---

### 4.8 Social Proof Section

**H2:** "Built in public. Trusted by operators."

- GitHub stars badge (from KevinZai/commander)
- Quote cards (3) from early users (TBD — leave placeholder)
- Logo strip of "Works with: Linear, GitHub, Slack, Gmail, Google Workspace" with their actual logos

---

### 4.9 Footer

- Column 1: Product (Home, Pricing, Changelog, Docs)
- Column 2: Community (GitHub, Discord, Twitter @kzic)
- Column 3: Legal (Privacy, Terms, License)
- Column 4: Built by [Kevin Z](https://kevinz.ai) · © 2026

Newsletter signup: "Get TheAgentReport. Weekly AI coding tactics. No fluff."

---

## 5. Pricing + Stripe Flow

### 5.1 Products (in Stripe)

| Product | Price ID (to create) | Amount |
|---------|---------------------|--------|
| CCC Pro Monthly | `price_ccc_pro_monthly` | $19/mo |
| CCC Pro Yearly | `price_ccc_pro_yearly` | $190/yr (2 months free) |
| CCC Team 5-seat | `price_ccc_team_5` | $99/mo |
| CCC Team 10-seat | `price_ccc_team_10` | $179/mo |

### 5.2 Checkout Flow

1. User clicks `[Start Pro $19/mo]`
2. Next.js creates Stripe Checkout session via `/api/stripe/create-checkout`
3. Redirects to Stripe Checkout (hosted)
4. On success, Stripe redirects to `/thank-you?session_id=...`
5. `/api/stripe/webhook` receives `checkout.session.completed` event
6. Server generates license key, stores in Supabase/Postgres
7. Sends license key email via Resend
8. User adds key to `~/.claude/commander/license.json`
9. CCC SessionStart hook reads key → sets `CCC_TIER=pro`

### 5.3 License Key Format

```json
{
  "key": "ccc_live_abc123def456...",
  "tier": "pro",
  "email": "user@example.com",
  "issued": "2026-04-16T00:00:00Z",
  "expires": "2027-04-16T00:00:00Z"
}
```

Verification: Sign with HMAC-SHA256, plugin verifies signature offline (no server call needed).

---

## 6. SEO + Meta

**Title:** "CCC — Claude Code Commander · The curated AI-guided Claude plugin"
**Description (155 chars):** "We found every great Claude plugin and made them talk to each other. 15 skills, 5 agents, 8 pre-wired MCPs. AI-guided. Free tier."

**OG image:** `public/og-image.png` — generated via Next.js OG image generation or Figma export. Matches hero copy.

**Structured data (JSON-LD):**
- SoftwareApplication schema
- Product schema (for Pro tier)
- Organization schema (Kevin Z)

**Keywords (for content, not meta tags):** Claude Code, Claude Desktop plugin, MCP integration, AI coding agent, Claude skills, Claude Code Commander, Linear Claude plugin, GitHub Claude integration.

---

## 7. Implementation Phases

### Phase 1 — Scaffold (Day 1, 2-3 hours)
- Next.js 15 App Router init in `marketing/`
- Tailwind v4 + shadcn/ui setup
- Plausible snippet
- Deploy to Vercel, wire cc-commander.com DNS

### Phase 2 — Home Page (Day 1-2, 6-8 hours)
- Hero with animated terminal
- Problem/solution sections
- Skills showcase (tabs)
- Workflow demo (Framer Motion)
- Install section
- Footer

### Phase 3 — Pricing + Stripe (Day 2-3, 4-6 hours)
- Pricing table
- Stripe checkout integration
- Webhook handler
- License key generation
- Thank-you page

### Phase 4 — Docs + Changelog (Day 3, 2-3 hours)
- `/docs` quickstart (single page)
- `/changelog` MDX with v3.0.0 entry
- `/blog` shell (no posts yet)

### Phase 5 — SEO + Polish (Day 3-4, 2-4 hours)
- OG image generation
- JSON-LD structured data
- robots.txt, sitemap.xml
- Lighthouse optimization (target 95+)
- Mobile responsiveness pass

### Phase 6 — Launch (Day 4)
- DNS cutover to cc-commander.com
- Announce on Twitter, Hacker News, Reddit r/ClaudeAI
- Email TheAgentReport subscribers

**Total estimate: 16-24 hours of focused work** (realistic range for a polished launch).

---

## 8. Launch Metrics (30-day targets)

| Metric | Target |
|--------|--------|
| Unique visitors | 5,000+ |
| Install command copy rate | 15% of visitors |
| Plugin installs (via GitHub traffic) | 300+ |
| Free → Pro conversion | 3-5% |
| Pro subscribers at Day 30 | 10-20 |
| MRR at Day 30 | $200-400 |
| Newsletter signups | 500+ |
| Lighthouse performance | 95+ mobile, 98+ desktop |

---

## 9. What's NOT in v1

- User accounts / dashboard (use Stripe customer portal)
- Team management UI (manual via email for first customers)
- Blog posts (shell exists, fill in later)
- Internationalization
- Dark mode toggle (ship dark-only v1)
- Testimonials (add after first 20 Pro subs)

---

## 10. Open Questions

1. **Stripe entity:** Use Kevin Z personal Stripe or open a new LLC for CCC?
2. **Domain DNS:** cc-commander.com currently parked — what registrar/DNS provider?
3. **Email:** Keep kzic@ or use hello@cc-commander.com?
4. **License key storage:** Supabase, Postgres on Vercel, or KV (Upstash)?
5. **Support email inbox:** Kevin's personal or new cc-commander.com?

---

## 11. Hand-off checklist (before starting build)

- [ ] Kevin approves this spec
- [ ] Stripe account + products configured
- [ ] cc-commander.com DNS pointed to Vercel
- [ ] Plausible analytics account created
- [ ] Resend/Loops account for email
- [ ] Database (Supabase/KV) for license keys
- [ ] GitHub repo `KevinZai/commander` marketplace listing live (done ✓)
