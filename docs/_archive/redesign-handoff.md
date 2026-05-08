# HANDOFF — cc-commander.com

For the developer (or Claude Code agent) picking this up. Read top to bottom; everything you need to ship is here.

---

## TL;DR for Claude Code

> You are taking over a finished single-file marketing landing page. Your job is **not to redesign**. Your job is to swap placeholder strings for real values, deploy, and verify.
>
> Run the **Replace-this checklist** below. Do not touch the design system, layout, or animations unless explicitly asked. Do not introduce build tooling. Do not split the file into components. **One static HTML, one PNG, one README.** That is the whole product surface.

---

## What this is

`cc-commander.com` — single-page static marketing site for the open-source Claude Code plugin **CC Commander** ("commander"). Brief was strict: dark-only, editorial typography, terminal/dev energy, MIT, free for now. Built to drop into any static host without a build step.

## What's already done

- ✅ All 21 sections from the brief, plus 7 added: stack picker, code-vs-CCC, skill explorer, hooks lifecycle, animated arch rails, live GitHub activity panel, sticky install CTA
- ✅ JSON-LD `SoftwareApplication`, OG/Twitter cards, canonical, SVG favicon, Plausible
- ✅ Reduced-motion honored across every animation
- ✅ WCAG-AA contrast verified against the brief's palette
- ✅ Mobile-first responsive, breakpoints at 440 / 720 / 860 / 1024 / 1280
- ✅ Hero terminal supports interactive `window.claude.complete` calls when a runtime is present, with a graceful fallback when it's not
- ✅ 17 illustrated SVG agent portraits, drawn programmatically — no stock photography, no AI-generated raster

---

## Replace-this checklist (CRITICAL)

These strings exist as plausible-but-not-real placeholders. Verify each against reality and edit `index.html` in place. **Do not** fork the file; do not add a config layer.

| What | Where (search-text) | Current value | Action |
|---|---|---|---|
| GitHub repo URL | `KevinZai/commander` (10 occurrences) | `https://github.com/KevinZai/commander` | Confirm or correct the org/repo. |
| Plugin install command | `/plugin install commander` | hero, install demo, FAQ, hero terminal output | **Confirm this matches the actual Claude Code plugin registry incantation.** If it's `npx claude-code-plugin add …` or similar, fix every occurrence. |
| Author name | `Kevin Zicherman` | footer, JSON-LD, "the Kevin Z method" | Confirm. |
| Author site | `https://kevinz.ai` | hero footer, footer | Confirm or replace. |
| X / Twitter handle | `@kzic` | meta tags, footer | Confirm. |
| Discord URL | `/discord` | nav, footer | Replace with real invite URL or remove. |
| Docs URL | `/docs` | nav, footer, hero CTA | Replace with real docs target. |
| Last-commit microcopy | `last commit 2h ago` (footer) | static placeholder | Either pull live (see "Live GitHub" below) or remove. |
| Changelog items in ticker | search for `tk-pill v` | static | Pull from `git log` or curated changelog. |
| Skill list (55 entries) | search `const SKILLS=[` in `<script>` | hand-written placeholder | Replace with the actual manifest. **Schema:** `[name, domain, description, sub-skill-count]`. Domains used in filters: `core, saas, design, devops, security, data, testing, research`. |
| Hook handlers | search `const HOOKS=` | placeholder timings | Replace with real handlers + measured durations. Schema: `EventName: { when: 'description', handlers: [['handler-name', latency-ms]] }`. |
| GitHub stars in nav | `id="gh-stars"` — animated counter target | `2347` | Wire to live API or set to current real number. |
| Stats strip | search `data-num=` on stat numbers | 55 / 17 / 9×19 / 457 / 11 | Confirm against the real plugin manifest. |
| Live GitHub commits/issues | search `class="gh-row"` | hand-written | See "Make GitHub panel live" below. |

After editing, do a final search for `KevinZai`, `kevinz.ai`, `kzic`, and `discord` — there should be **zero** placeholders left.

---

## Things that are intentionally fake-but-shouldn't-stay

### 1. Live GitHub panel (`#github-live`)

Currently shows hand-written commits, issues, and contributor avatars (initials in colored circles). To make it real, pick one:

**Option A — Build-time (recommended).** Add a tiny GitHub Action that runs on push, fetches recent commits/issues/contributors, and writes them into `index.html` between two `<!-- gh:start -->` / `<!-- gh:end -->` markers. Avoids client-side rate limits.

**Option B — Runtime.** Replace `gh-people` and the row markup with `fetch('https://api.github.com/repos/<owner>/<repo>/commits?per_page=4')` calls. Requires no auth for public repos but eats into the IP rate budget. Probably fine for traffic levels under 10 RPS.

**Option C — Delete the section.** It's the bottom-most "trust" element. Page reads fine without it. Remove the `<section id="github-live">` block and its CSS at `#github-live` / `.gh*` rules.

### 2. Hero terminal `window.claude.complete` integration

```js
window.claude.complete(`You are CC Commander, a Claude Code plugin orchestrator…`)
```

When the page is loaded inside a Claude artifact host, this works. When deployed to `cc-commander.com`, **it falls back to a static response** (see the `.catch()` branch in `runHero`). That's fine — the live behavior is a bonus on the artifact preview, not a production requirement.

If you want it live in production: route to your own `/api/demo` endpoint behind an Anthropic key, with strict rate limiting (e.g. 5 req / IP / hour) and a hard 1024-token output cap. Otherwise, keep the static fallback — it still demos the UI.

### 3. Testimonials (`#loved`)

Three quotes, three handles. **Replace with real quotes** from GitHub stars, X replies, or Discord screenshots, with permission. If you can't get permission for any, **delete the section** rather than fabricate.

---

## File map

```
index.html       3,032 lines · ~120 KB · single file
og.png           1200×630 · ~30 KB · social card
README.md        public-facing
HANDOFF.md       this file
```

`index.html` structure (line numbers approximate, run `grep -n '──' index.html` for exact):

| Lines | Block |
|---|---|
| 1–60 | `<head>`: meta, JSON-LD, Plausible, fonts |
| 60–1390 | `<style>` |
| 1390–1430 | sticky nav |
| 1430–1455 | changelog ticker |
| 1455–1535 | hero |
| 1535–1605 | stats strip |
| 1605–1645 | why CCC |
| 1545–1600 | pick your stack |
| 1645–1810 | live demo tabs (desktop/cowork/cli) |
| 1810–1900 | install demo · code vs commander · compare bars |
| 1900–2380 | 17 agents · 11 domains |
| 2380–2570 | skill explorer · hooks lifecycle · architecture · Kevin Z method · testimonials · github |
| 2570–2700 | free for now · quick start · FAQ · footer |
| 2700–2710 | sticky-bottom CTA |
| 2710–3032 | `<script>` |

## Code conventions used

- **CSS:** custom-property-driven design tokens at `:root`; component blocks separated by `/* ───── Name ───── */` rules. Spacing scale is `clamp()`-based for responsive type. No utility classes; everything is BEM-ish or component-scoped.
- **JS:** module pattern wrapped in an IIFE-ish flow. No classes. No async-await on the critical path — only on optional `claude.complete`.
- **Selectors:** all interactive elements use `data-*` attributes for state binding, never class-based state. Switching `.on` flips visual state only.
- **No external state.** No localStorage, no cookies (except whatever Plausible may set — first-party, anonymous).

## Performance baseline

- LCP element: hero ASCII banner, all inline.
- No render-blocking external CSS (Google Fonts is `display=swap`).
- Plausible is `defer`.
- All SVGs inline; no image requests except `og.png` (only fetched by social-card scrapers, not browsers).
- Animations are GPU-friendly (`transform`, `opacity`).

Lighthouse target was 95+. If you regress this, audit the offending change rather than disable performance features.

## What NOT to do

- ❌ Don't introduce React, Vue, Astro, or any framework. The brief is explicit: one static HTML file.
- ❌ Don't add a build step. No PostCSS, no Tailwind, no Sass. The CSS is intentionally hand-written.
- ❌ Don't split into multiple files. Inline `<style>` and inline `<script>` are by design — keep the single-file constraint.
- ❌ Don't add light mode. Brief is dark-only.
- ❌ Don't add a pricing page. It's free for now; it's stated once and we move on.
- ❌ Don't add carousels, sliders, or auto-rotating heroes.
- ❌ Don't add cartoon illustrations or stock photography. The 17 agent portraits are programmatically composed SVGs and should stay that way.
- ❌ Don't add new sections without the user's signoff. The page is intentionally complete.

## Acceptance criteria

Page ships when:

1. Every row in the **Replace-this checklist** above is verified against reality.
2. Lighthouse on the deployed URL: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
3. `og.png` renders correctly when pasted into Slack, X, Discord, and LinkedIn previews.
4. Manual smoke: nav links scroll, FAQ items expand, skill explorer filters, stack picker switches, hooks timeline detail updates on click, sticky CTA appears after hero scrolls past, footer renders.
5. Page is keyboard-navigable end-to-end with visible focus rings on every interactive element.
6. `prefers-reduced-motion` browser flag pauses the ticker, the hero typing loop, and the architecture rail sweep.

## Future enhancements (not in scope, but ranked)

If the user comes back asking "what's next," these are the candidates in priority order. Don't ship them unprompted.

1. **Real `/installed` thank-you page** with first-run guidance.
2. **404 page** matching site aesthetic.
3. **Print stylesheet** so docs print clean (currently we have screen-only CSS).
4. **i18n** — page is English only; structure supports a translation layer but doesn't include one.
5. **Lazy-mount heavy sections** (skill grid, agent portraits, GitHub panel) via `IntersectionObserver` to reduce first-paint cost.

---

**Last updated:** May 2026 · v1.0 of the page · single-author handoff.
