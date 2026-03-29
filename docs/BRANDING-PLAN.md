# Claude Code Kit — Branding, Licensing & Personal Brand Plan

> **Status:** FUTURE PHASE — saved 2026-03-28, not yet executed
> **Context:** Kevin Z going public on X with AI story, positioning as authority in AI dev tools

---

## Context

Kevin Z built a 38-agent AI system (OpenClaw + Claude Code Kit) on a Mac Mini and wants to be recognized as an authority in AI developer tools. This plan covers:

1. **MIT LICENSE** — legally required, currently missing
2. **Strategic attribution** — keep credits for high-profile creators as marketing leverage
3. **Brand positioning** — how to brand Claude Code Kit with Kevin Z's personal brand
4. **3-tier brand architecture** — personal brand, open-source product, consulting business
5. **Kit touchpoints** — social links, author section, origin story (tasteful, not salesy)
6. **kevinz.ai** — what the personal brand website should be

---

## KEY INSIGHT: Attribution = Marketing Leverage

No project in the Claude Code ecosystem credits idea sources. Not gstack (40K stars), not CE (10K stars), not SuperClaude (22K stars). Copyright protects code expression, not ideas.

**But we KEEP the "inspired by" credits for big names.** This is strategic, not charitable:

1. **Credibility** — shows the Kit builds on proven, respected work
2. **@ Mention leverage** — "Hey @garrytan, your /office-hours was so good I built it into Claude Code Kit. Check it out" → free exposure to their audience
3. **Protection** — prevents "this guy stole Garry's stuff" accusations from their followers
4. **Networking** — creates relationship opportunities with high-profile builders

**Rule:** Credit high-profile creators (10K+ followers, major repos). Don't credit generic community patterns.

### Marketing Plays Using Attribution

| Creator | Their Project | What We Took | X Marketing Move |
|---------|--------------|-------------|-----------------|
| **Garry Tan** (@garrytan) | gstack (40K stars) | `/office-hours`, `/retro`, `/qa` concepts | "Your virtual team concept was brilliant — I expanded it into 38 agents. The Kit has your DNA in it." |
| **Every.to** (@every) | Compound Engineering (10K stars) | `/compound` learning loop | "The compounding idea changed how I think about dev tooling. Built it into the Kit." |
| **SuperClaude** | SuperClaude Framework (22K stars) | Confidence checking, 4Q validation | Already credited in BIBLE.md Appendix B |

**X Thread Strategy:** Drop these as natural mentions in launch threads. Not a "credits" post — a "here's who inspired me" narrative that tags them for visibility.

---

## PHASE 1: LICENSE (do first)

### Add MIT LICENSE file

Create `LICENSE` at repo root. Standard MIT, copyright "Kevin Zicherman", year 2026. This is the only legally required item — without it the repo is technically "all rights reserved."

---

## PHASE 2: PERSONAL BRAND TOUCHPOINTS IN KIT

### 2A. README.md — Add origin story + author section

**Add "The Story" paragraph** after the install command, before "What's Inside":

```markdown
## The Story

A non-technical CEO scanned every Claude Code article, plugin, and skill on the internet —
200+ sources. Tested everything. Kept what worked. Threw away what didn't. The result: one
install that gives you what took months to build. [Read the full story →](https://kevinz.ai)
```

**Replace the bare footer** with an author section:

```markdown
## Author

Built by [Kevin Z](https://kevinz.ai) — founder, AI builder,
creator of a 38-agent orchestration system.

- [X/Twitter](https://x.com/kzic)
- [Blog](https://kevinz.ai)
- [GitHub](https://github.com/k3v80)
```

### 2B. docs/index.html — Add footer social links

Update footer to include:
- X/Twitter link (@kzic)
- kevinz.ai link
- "Built by Kevin Z" with link instead of just "Built with Claude Code"

Minimal — 3-4 links, one line.

### 2C. docs/assets/og-image.svg — Update stats

Current OG image says v1.0 with 220+ skills. Update to:
- v1.3
- 280+ skills, 10 mega-skills, 88+ commands, 37 hooks
- Add kevinz.ai URL
- Keep "by Kevin Z"

### 2D. BIBLE.md — Add "About the Author" at end

After Appendix B, add 3-4 sentences:
- Non-technical CEO, 20+ years in tech
- Built a 38-agent AI system on a Mac Mini
- Link to kevinz.ai

---

## PHASE 3: BRAND ARCHITECTURE

### 3-Tier Structure

```
Kevin Z (kevinz.ai)          ← Personal brand, the person, the story
├── Claude Code Kit           ← Open source project, authority builder
│   (github.com/k3v80/claude-code-kit)
├── [Consulting Brand TBD]    ← Paid services, B2B credibility
│   (kevinz.ai/consulting → standalone domain later)
└── Learning Platform          ← Education, courses, tools
    (kevinz.ai/learn → standalone domain later)
```

### Naming Decisions

| Asset | Recommended Name | Notes |
|-------|-----------------|-------|
| **Personal brand** | Kevin Z / kevinz.ai | Hub that connects everything |
| **X handle** | @kzic (keep) | 18-year history = credibility. Just update bio |
| **Open source project** | Claude Code Kit | Keep. Drop "CCCC" as external acronym |
| **Methodology** | The Kevin Z Method | Keep. Strong IP |
| **Consulting** | TBD — see options | Separate from Kit |
| **Legal entity** | Axiom Marketing Inc | Keep for legal/tax, not customer-facing |
| **Education** | kevinz.ai/learn (Phase 1) | Under personal brand initially |

**Consulting name options** (rank order):
1. **FleetOps AI** — "fleet" of agents + "Ops" = operational, not theoretical
2. **Kevin Z Labs** — personal brand IS the brand (like Rauch before Vercel)
3. **Claw Systems** — connects to OpenClaw, short, memorable
4. **Orchestr8** — orchestration theme, catchy but potentially gimmicky

### X Bio Update

```
CEO @MyWiFiNetworks (20+ yrs). Built a 38-agent AI system on a Mac Mini.
Creator of Claude Code Kit (280+ skills, open source).
Non-coder building with AI. kevinz.ai
```

### The Core Narrative (use everywhere)

> I'm a non-technical CEO. 20+ years in tech, never wrote production code.
> When I found Claude Code, I didn't just use it — I built a system around it.
> 38 specialized AI agents. One Mac Mini. One terminal.
> Then I open-sourced the toolkit: Claude Code Kit.

---

## PHASE 4: kevinz.ai — WHAT IT SHOULD BE

### Not Just a Blog — A Personal Brand Hub

**kevinz.ai should be a single-page hub** (initially) that connects everything Kevin does. Think of it like Guillermo Rauch's personal site before Vercel existed — minimal, authoritative, links to projects.

### Page Structure

**Hero**
- Name: Kevin Z
- Tagline: "The CEO who codes with AI" or "38 agents. One terminal."
- One paragraph: the narrative (non-technical CEO → 38 agents → open source toolkit)
- Photo/avatar (optional but recommended for personal brand)

**Projects Section** (3-4 cards)
- **Claude Code Kit** — "280+ skills for Claude Code. Open source." → GitHub link
- **OpenClaw** — "38-agent orchestration platform. Runs on a Mac Mini." → brief description (private repo, link to blog post)
- **MyWiFi Networks** — "WiFi marketing platform. 15K+ resellers. 40+ countries." → mywifinetworks.com
- **[Consulting]** — "AI consulting for businesses." → kevinz.ai/consulting (when ready)

**Blog/Writing Section**
- Recent posts (start with the flagship: "How I Built a 38-Agent AI System on a $600 Mac Mini")
- Can be hosted on kevinz.ai directly (Next.js MDX) or link to Substack/Medium
- Recommendation: host on kevinz.ai for SEO ownership

**Newsletter Signup**
- "Get weekly AI builder insights. Free."
- Single email field + button
- This is the most important CTA on the site

**Footer**
- Social links: X, GitHub, LinkedIn
- "Based in [city]. Available for speaking and consulting."

### Tech Stack Recommendation

- **Next.js 14** (App Router) on Vercel — Kevin already uses this stack
- **Tailwind CSS** + minimal design (let content breathe)
- **MDX** for blog posts (code-friendly, SSG for SEO)
- **Resend** or **Kit** for newsletter
- Single page to start, blog section as Phase 2

### Content Calendar (X + Blog)

**Launch Week:**
1. X Thread: "I'm a non-technical CEO who runs 38 AI agents from one terminal. Here's the toolkit that makes it possible." (updated Thread 1 from docs/x-threads.md)
2. Blog Post: "How I Built a 38-Agent AI System on a $600 Mac Mini"
3. X Thread: Tag @garrytan, @every — "These projects inspired parts of my toolkit"

**Ongoing (3-5x/week on X):**
- "Agent #N" series — one agent profile per week (38 episodes built-in)
- Claude Code tips (repurpose from Kit content)
- Builder updates ("shipped X today")
- Hot takes on AI tooling
- Behind-the-scenes of the 38-agent system

**Monthly:**
- One long-form blog post on kevinz.ai
- One newsletter issue
- Kit release notes → content opportunity

---

## WHAT NOT TO DO

- Don't put consulting pricing on the Kit landing page or README
- Don't turn the Kit into a lead-gen funnel (one author section + one footer link = enough)
- Don't create a separate entity for the Kit
- Don't change @kzic handle — 18 years of history IS credibility
- Don't rush the consulting rebrand — kevinz.ai/consulting first, standalone domain later
- Don't delete old WiFi tweets — the pivot narrative is strengthened by the contrast

---

## PRECEDENTS: HOW OTHER DEV-FOUNDERS DID THIS

| Founder | Open Source | Company | Pattern |
|---------|-----------|---------|---------|
| **Guillermo Rauch** | Next.js | Vercel | OSS built authority → personal brand captured it → company monetized it |
| **TJ Holowaychuk** | Express.js, Koa | Apex | Volume of output = reputation. Never built big company around it |
| **Sindre Sorhus** | 1000+ npm packages | GitHub Sponsors | Curation authority. Monetized through community reputation |
| **Kent C. Dodds** | Testing Library | Epic React ($600+) | Free tool → paid education. Exactly the Kit → kevinz.ai/learn path |

**Kevin's closest match: Guillermo Rauch.** The Kit is Kevin's Next.js. The consulting business is Kevin's Vercel. The personal brand (@kzic, kevinz.ai) is the bridge.

---

## EXECUTION TIMELINE

| When | What |
|------|------|
| **Now** | Add MIT LICENSE file |
| **Week 1** | Register kevinz.ai, update @kzic bio |
| **Week 1** | Add author section + social links to README and landing page |
| **Week 1** | Update OG image to v1.3 stats |
| **Week 2** | Build kevinz.ai v1 (single page hub + blog placeholder) |
| **Week 2** | Write flagship blog post ("38 agents on a Mac Mini") |
| **Week 2** | Publish launch thread on X (tag Garry Tan, Every.to) |
| **Week 3** | Start "Agent #N" content series |
| **Week 3** | Add kevinz.ai/consulting page |
| **Week 4+** | Newsletter, content cadence, community engagement |
