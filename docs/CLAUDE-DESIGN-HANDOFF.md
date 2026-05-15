# CC Commander — Design Handoff Brief
**For:** Claude Design Web (landing page redesign)
**Date:** 2026-05-07
**Prepared by:** Kevin Z

---

## 1. Site Overview

**URL:** https://commanderplugin.com/
**What it is:** Marketing landing page for CC Commander — a free Claude Code Desktop plugin that gives developers 55 click-first AI workflows, 17 specialist agent personas, and lifecycle automation.
**Audience:** Developers actively using Claude Code Desktop or Claude Code CLI. They are technical, skeptical of hype, and will read the install command before they read the headline.
**Primary action:** Install the plugin. Two commands:
```
/plugin marketplace add KevinZai/commander
/plugin install commander
```
**Secondary actions:** Star on GitHub, read the BIBLE.md methodology, explore CCC domains.
**Tone:** Direct, terminal-native, zero fluff. Developer credibility over polish.

---

## 2. Content Extraction

### Hero
- **Badge:** `v4.0.0 — Claude Code Desktop Plugin — Free for Now`
- **H1:** `AI PM for Claude Code — 55 Skills, 17 Agents, Free for Now`
- **Subhead:** Ship faster with Claude Code Desktop and Cowork Desktop. One plugin gives you 55 click-first AI workflows, 17 specialist agent personas, and a guided AI PM that thinks before you do — free for now.
- **Primary CTA:** Terminal block (click-to-copy) showing the two install commands
- **Secondary CTA:** None (GitHub link is in footer only)

### Stats Bar (hero-level numbers)
| Stat | Value |
|------|-------|
| Skills (ecosystem) | 502+ |
| Plugin Skills | 55 |
| Agents | 17 |
| Hooks | 9 |
| CCC Domains | 11 |

### Section Inventory
1. **Desktop Plugin** — 55 plugin skills, 17 specialized agents, 9 lifecycle hooks (19 handlers), 5 MCP servers (Linear, GitHub, Slack, Gmail, Calendar). Quick Mode vs Power Mode callout. Free for Now callout.
2. **The Kevin Z Method** — Origin story: researched 100+ articles, tested every plugin, distilled into one install. 10 community sources listed (ykdojo, hooeem, aiedge_, dr_cintas, MichLieben, coreyganim, GriffinHilly, bekacru, chddaniel, gitagent). Quote: *"Context is like milk — fresh + condensed = best output."*
3. **/init Decision Tree** — Interactive terminal showing 4 build modes: QUICK (<4h), DEEP (1–5 days), SAAS (1–4 weeks), OVERNIGHT (6–12h autonomous).
4. **CCC Domains** — 6 domains shown with expandable skill lists:
   - `ccc-seo` — 19 skills (technical SEO, AI search, GSC, content briefs)
   - `ccc-design` — 35+ skills (animations, WebGL, Impeccable suite)
   - `ccc-testing` — 15 skills (TDD, Playwright, load, security)
   - `ccc-marketing` — 46 skills (CRO, email, ads, competitive intel)
   - `ccc-saas` — 20 skills (auth, billing, Next.js, Stripe, Drizzle)
   - `ccc-devops` — 20 skills (CI/CD, AWS, Docker, monitoring, canary)
   *(5 more domains exist — ccc-security, ccc-data, ccc-research, ccc-mobile, ccc-makeover — not shown on current page)*
5. **CCC Methodology** — BIBLE.md callout: 1,749 lines, 13 sources, 15 chapters covering Golden Rules through Settings Reference. Link to GitHub.
6. **How It All Connects** — Architecture diagram: install → Desktop + ~/.claude/ → Every Session. Tree: Plugin Skills / Agents / Hooks / MCP Servers / skills/ / commands/ / CLAUDE.md / BIBLE.md.
7. **What's New in v4.0.0** — Desktop Plugin transformation. 4 build cards + 2 feature cards (502+ CLI skills still available, full hook lifecycle names).
8. **Get Started in 60 Seconds** — Two install paths side by side: Desktop Plugin (recommended) and CLI/legacy. Install summary grid: 12 items.
9. **Works Everywhere Claude Runs** — IDE compatibility bar: Claude Desktop, Terminal, VS Code, Cursor, JetBrains.

### Install Flow Narrative
1. Settings → Plugin Marketplace → Add from GitHub: `KevinZai/commander`
2. `/plugin marketplace add KevinZai/commander`
3. `/plugin install commander`
4. Result: ✓ 55 plugin skills activated, ✓ 17 agents wired, ✓ 9 hooks × 19 handlers active, ✓ Linear, GitHub, Slack, Gmail, Calendar connected

CLI alternative: `git clone https://github.com/KevinZai/commander.git && ./install.sh`

### Stats / Numbers (full set)
- 502+ ecosystem skills | 55 plugin skills | 502+ CLI skills
- 17 specialist agents
- 9 lifecycle hooks × 19 handlers
- 11 CCC domains
- 5 MCP servers (Linear, GitHub, Slack, Gmail, Google Calendar)
- 10 connector categories
- 83 slash commands
- 3 starter templates (SaaS, API, Landing)
- 1,749-line BIBLE.md | 13 sources distilled
- Free for now — 0 paywalls

### Quotes / Testimonials
- *"Context is like milk — fresh + condensed = best output."* — Golden Rule #2, CCC
- No third-party testimonials in current HTML.

### Footer Links
- GitHub → `https://github.com/KevinZai/commander`
- BIBLE.md → GitHub blob
- CHEATSHEET.md → GitHub blob
- SKILLS-INDEX.md → GitHub blob
- Affiliate Disclosure → `https://docs.commanderplugin.com/affiliate-disclosure`
- Author: Kevin Z → `https://kevinz.ai` | @kzic → `https://x.com/kzic`

---

## 3. Asset Inventory

### docs/assets/ (production site assets)
| File | Type | Notes |
|------|------|-------|
| `style.css` | CSS | Current site styles — reference only |
| `main.js` | JS | Animations, typed effect, scroll reveals |
| `og-image.png` | PNG 60KB | Current OG image — replace in new design |
| `og-image.svg` | SVG 7.5KB | Source for OG image |
| `og-image-v4.svg` | SVG 6KB | v4 variant |
| `hero.gif` | GIF 1.1MB | Animated hero demo |
| `hero.mp4` | MP4 1MB | Hero video version |
| `ccc-hero.png/.svg` | PNG/SVG | Hero illustration |
| `ccc-architecture.svg` | SVG 7KB | Architecture diagram |
| `ccc-flow.svg/.png` | SVG/PNG | Flow diagram |
| `ccc-flowchart.svg` | SVG 11KB | Flowchart |
| `ccc-components.svg/.png` | SVG/PNG | Component breakdown |
| `ccc-comparison.svg/.png` | SVG/PNG | Before/after comparison |
| `ccc-before-after.svg` | SVG 18KB | Before/after visual |
| `ccc-stats.svg/.png` | SVG/PNG | Stats callout |
| `ccc-themes.png` | PNG 116KB | Theme showcase |
| `ccc-whats-included.svg` | SVG 15KB | What's included breakdown |
| `ccc-yolo.svg/.png` | SVG/PNG | YOLO/night mode visual |
| `ccc-pm-guide.svg` | SVG 22KB | PM guide diagram |
| `bible-cheatsheet.svg/.png` | SVG/PNG | Cheatsheet visual |
| `section-*.png/.svg` (×10) | PNG/SVG | Per-section illustrations (cockpit, domains, features, how-to-use, install, orchestrator, vendors, why, xray, yolo) |

**docs/assets/screenshots/** — 36 files: GIFs and PNGs of CLI menus, dashboard, status line, domains browser, install flow, skills catalog. Most are CLI-era (v2/v3). Check for relevance to Desktop-first v4 story.

**docs/assets/x-cards/** — 6 SVGs: `450-skills.svg`, `5-layers.svg`, `98-percent-savings.svg`, `before-after.svg`, `intelligence.svg`, `pipe-rail.svg`. Social card artwork.

### docs/screenshots/ — Real product screenshots (Desktop plugin UI)
| File | Notes |
|------|-------|
| `01-install-marketplace.png` | Plugin Marketplace install step |
| `02-plugin-installed.png` | Post-install state |
| `02b-plugin-installed-agents-view.png` | Agents tab view |
| `04-ccc-browse-catalog.png` | Skill catalog browser |
| `08-agents-catalog.png` | Agents listing |
| `09-skill-detail-ccc-build.png` | Skill detail page |
| `10-agent-detail-architect.png` | Agent detail page |
| `11-marketplace-code-tab.png` | Marketplace code tab |
| `12-personal-marketplace.png` | Personal marketplace |
| `13-plugin-options-menu.png` | Plugin options |

**These are the most valuable assets for the redesign** — actual Desktop plugin UI.

### docs/marketing/ — Launch campaign assets
| File | Notes |
|------|-------|
| `v40-announcement-hero.png` | 3.1MB hero for v4.0 launch |
| `v40-architecture-overview.png` | 1.5MB architecture overview |
| `screenshots/v40-1-install-flow.png` | Install flow screenshot |
| `screenshots/v40-2-ccc-hub.png` | CCC hub UI |
| `screenshots/v40-3-fleet-topology.png` | Fleet topology |
| `screenshots/v40-4-fleet-viz.png` | Fleet viz |
| `screenshots/codex-1-hero.png` through `codex-6-*.png` | Codex launch series (6 images) |

---

## 4. Must-Preserve Technical Elements

### JSON-LD Schema (copy verbatim into new `<head>`)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CC Commander",
  "alternateName": ["CCC", "Claude Code Commander"],
  "description": "Guided AI PM plugin for Claude Code Desktop and Claude Code CLI. 55 plugin skills, 17 specialist AI agents, 9 lifecycle hooks, hosted MCP server. Free for now. Works in Cursor, Windsurf, Cline, Continue, Codex, and every MCP-capable IDE.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "macOS, Linux, Windows",
  "url": "https://kevinzai.github.io/commander",
  "downloadUrl": "https://github.com/KevinZai/commander",
  "installUrl": "https://github.com/KevinZai/commander",
  "softwareVersion": "4.0.0",
  "releaseNotes": "https://github.com/KevinZai/commander/blob/main/CHANGELOG.md",
  "license": "https://opensource.org/licenses/MIT",
  "author": {
    "@type": "Person",
    "name": "Kevin Zicherman",
    "alternateName": "Kevin Z",
    "url": "https://kevinz.ai",
    "sameAs": ["https://x.com/kzic", "https://github.com/KevinZai"]
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free for now — 1,000 hosted MCP calls/month included"
  },
  "keywords": "Claude Code plugin, Claude Desktop, Cowork Desktop, AI PM, AI agents, MCP server, Anthropic, Claude SDK, prompt engineering, AI workflow, AI coding agent",
  "featureList": [
    "55 plugin skills including 13 /ccc-* click-first workflows",
    "17 specialist AI sub-agents (architect, reviewer, debugger, designer, and more)",
    "9 lifecycle hooks with 19 handlers",
    "Hosted MCP server with 100 free calls/month",
    "502+ ecosystem skills across 11 domains",
    "Works in Claude Code Desktop, CLI, Cursor, Windsurf, Cline, Continue, Codex"
  ]
}
```

### Open Graph Meta Tags
```html
<meta property="og:title" content="CC Commander — AI PM Plugin for Claude Code · 55 Skills · Free">
<meta property="og:description" content="Guided AI PM for Claude Code Desktop. 55 plugin skills, 17 specialist AI agents, 9 lifecycle hooks, hosted MCP server. Free for now.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://commanderplugin.com/">
<meta property="og:image" content="https://kevinzai.github.io/commander/assets/og-image.png">
<meta property="og:site_name" content="CC Commander">
```

### Twitter Card Meta Tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@kzic">
<meta name="twitter:creator" content="@kzic">
<meta name="twitter:title" content="CC Commander — AI PM Plugin for Claude Code · 55 Skills · Free">
<meta name="twitter:description" content="Guided AI PM for Claude Code Desktop. 55 plugin skills, 17 AI agents, MCP server. Free for now.">
<meta name="twitter:image" content="https://kevinzai.github.io/commander/assets/og-image.png">
```

### Plausible Analytics (copy verbatim — privacy-friendly, no GDPR banner needed)
```html
<script async src="https://plausible.io/js/pa-rg9iHTyTRhl2G04GCUniT.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
```

### Other Head Requirements
```html
<link rel="canonical" href="https://commanderplugin.com/">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>></text></svg>">
<meta name="description" content="CC Commander: the guided AI PM plugin for Claude Code Desktop and Claude Code CLI. 55 plugin skills, 17 specialist AI agents, 9 lifecycle hooks, hosted MCP server. Free for now. Works in Cursor, Windsurf, and every MCP-capable IDE.">
```

---

## 5. Existing Design Notes (Context Only — Depart Freely)

**Color palette:**
- Background: `#0F0F1A` (near-black indigo)
- Card background: `#1A1A2E`
- Terminal background: `#12121F`
- Border: `#1E1E35`
- Primary accent: `#D97706` (amber/orange)
- Secondary accent: `#6366F1` (indigo/violet)
- Text: `#e0e0e0` | Muted: `#888` | Dimmer: `#555`
- Terminal dots: red `#ff5f56`, yellow `#ffbd2e`, green `#27c93f`

**Typography:**
- Body: `system-ui / -apple-system / Roboto` (sans-serif)
- Headings and section titles: `ui-monospace / Cascadia Code / Menlo` (monospace)
- Max content width: 1100px

**Structure:** Single-page, vertical scroll. Nav anchors to sections. Sections separated by `<hr>` dividers. Terminal mockups (dark, with macOS-style colored dots) are the primary visual motif — used for install commands, decision trees, and architecture. Stats use animated count-up on scroll. Section cards use a grid layout with `fade-in` scroll animations. No hero image — text-first with inline terminal blocks.

**What works:** Terminal-native aesthetic is on-brand. Click-to-copy on code blocks is valuable UX. Stats bar in hero communicates scale instantly.
**What to reconsider:** No real product screenshots above the fold. No social proof. CCC Domains section is heavy (accordion cards for 6+ domains creates cognitive load). /init section and Architecture section are conceptually strong but visually dense.

---

## 6. Out of Scope

The Mintlify documentation site at `https://docs.commanderplugin.com/` is **not touched**. That includes:
- `mintlify-docs/` directory in the repo
- All content under `docs.commanderplugin.com`
- The `mintlify-docs/docs.json` and `mintlify-docs/mint.json` config files

**This redesign is strictly:** the single-page marketing site at `commanderplugin.com/` — source file `docs/index.html` + `docs/assets/style.css` + `docs/assets/main.js`.

---

## Ready-to-Rip Checklist

- [ ] All 5 OG meta tags preserved in `<head>`
- [ ] All 5 Twitter Card tags preserved
- [ ] JSON-LD block copied verbatim (update `softwareVersion` if needed)
- [ ] Plausible snippet in `<head>` — exact script URL, not replaced with generic Plausible
- [ ] `<link rel="canonical" href="https://commanderplugin.com/">` present
- [ ] Favicon `data:` URI preserved (or replaced with equivalent `>` terminal icon)
- [ ] Primary CTA is the 2-command install block (click-to-copy behavior retained)
- [ ] Stats are accurate: 502+, 55, 17, 9, 11, 502+, 83
- [ ] "Free for now" messaging visible above the fold
- [ ] Desktop plugin install path is primary; CLI is secondary
- [ ] Real product screenshots (`docs/screenshots/`) used — not only SVG diagrams
- [ ] No reference to Mintlify docs in the redesign (separate site)
- [ ] `robots.txt` and `sitemap.xml` in `docs/` root — do not delete
- [ ] Output replaces `docs/index.html` only — no other files deleted
