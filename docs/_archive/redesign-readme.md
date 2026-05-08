# cc-commander.com

Marketing landing page for **CC Commander** — open-source AI PM plugin for Claude Code.

- Single static HTML file: `index.html`
- Open Graph card: `og.png` (1200×630)
- No build step. No framework. No dependencies that aren't pinned.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or any static-file server. The page is fully self-contained except for two CDNs:

| External | Purpose | Falls back to |
|---|---|---|
| Google Fonts (Inter, JetBrains Mono) | Body + mono | system-ui, ui-monospace |
| plausible.io/js/script.js | Analytics | Silent — page works without it |

## Deploy

Drop `index.html` and `og.png` at the root of any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Canonical URL is hard-coded to `https://cc-commander.com/` in the `<head>`.

## What's in the page

12 sections, in order:

1. Sticky nav (logo · docs · github · install)
2. Changelog ticker (sticky under nav)
3. Hero — ASCII banner, animated terminal with **live `claude.complete` integration** when an input is focused
4. Stats strip (5 numbers, animated counters)
5. Why CCC (3 cards)
6. Pick your stack (3-tab router: agency / solo / enterprise)
7. Live demo tabs (Desktop / Cowork / CLI)
8. Install flow terminal (sequenced)
9. Code-vs-CCC side-by-side
10. Stock-vs-Commander compare (animated diff bars)
11. 17 specialist agents (illustrated SVG portraits)
12. 11 domain pills + 55-skill explorer (search + filter)
13. Hooks lifecycle (9 events × 19 handlers, click-to-explore)
14. Architecture diagram (animated rails)
15. Kevin Z method (editorial quote)
16. Loved by builders (testimonial wall)
17. Live GitHub activity (commits/issues/contributors)
18. Free for now manifesto
19. Quick start (3 steps)
20. FAQ (8 expanding items)
21. Footer + sticky-bottom install CTA

## Tech baseline

- Inline `<style>` (~1100 lines) and inline `<script>` (~600 lines) — no external bundle
- Vanilla JS only. No React, no Vue, no jQuery.
- Dark mode only by design. WCAG-AA contrast across all surfaces.
- Mobile breakpoints: 440 / 720 / 860 / 1024 / 1280
- `prefers-reduced-motion` honored across reveal, ticker, hero typing, arch rails, caret
- Semantic HTML — `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<details>` for FAQ

## Files

```
index.html      The page.
og.png          1200×630 social card (linked in <meta og:image>).
README.md       This file.
HANDOFF.md      Implementation notes for the next dev (or Claude Code).
```
