# Lighthouse-Style Static Audit — cc-commander.com

**Audited:** 2026-05-08  
**File:** `docs/index.html` — 3,076 lines, 185KB (189KB raw)

---

## File Anatomy

| Layer | Size |
|---|---|
| Inline CSS | 67.8KB (~1,320 rule blocks) |
| Inline JS | 23.0KB |
| HTML skeleton | ~94KB |
| Inline SVGs | 66 total (17 agent portraits = 16.9KB combined) |
| DOM elements | ~1,200 |
| External resources | Google Fonts (2 families), Plausible analytics |
| `<img>` tags | 0 (all raster-free — SVG-only) |

---

## Estimated Scores

| Category | Score | Notes |
|---|---|---|
| **Performance** | 68/100 | Render-blocking Google Fonts; 185KB single file; no font preload hints |
| **Accessibility** | 76/100 | No `<h1>`; no skip-nav; `fg-faint` (#6E6E68) fails WCAG AA on body text |
| **Best Practices** | 82/100 | External links missing `rel="noopener noreferrer"`; no CSP header (server-side) |
| **SEO** | 84/100 | No `<h1>`; no `robots` meta; heading hierarchy starts at `<h2>` |

---

## Findings (severity-ranked)

### 🔴 Critical

| | |
|---|---|
| **Location** | `index.html` — no `<h1>` anywhere in document |
| **Issue** | Page has zero `<h1>` elements. Google devalues pages with no primary heading. Screen readers have no document entry point. |
| **Fix** | Add visually-hidden `<h1>` matching the `<title>` text. ✅ **Applied.** |

---

### 🟠 High

| | |
|---|---|
| **Location** | `<head>` line 51 |
| **Issue** | Google Fonts loaded as blocking `<link rel="stylesheet">`. Delays FCP by the full Fonts CDN RTT on every cold load (~100–300ms on slow connections). |
| **Fix** | Use `media="print" onload="this.media='all'"` pattern + `<noscript>` fallback. ✅ **Applied.** |

| | |
|---|---|
| **Location** | `<head>` line 11 |
| **Issue** | No `<meta name="robots">` tag. Absence is fine for Googlebot, but explicitly stating `index, follow` prevents accidental crawler lockout from robots.txt drift. |
| **Fix** | Add `<meta name="robots" content="index, follow">`. ✅ **Applied.** |

---

### 🟡 Medium

| | |
|---|---|
| **Location** | Footer links (lines 2689–2694) + nav `docs` link (line 1397) + hero `docs` button (line 1498) |
| **Issue** | External links missing `rel="noopener noreferrer"`. Allows opened pages to access `window.opener` — minor security posture issue. |
| **Fix** | Added `rel="noopener noreferrer"` to all affected external links. ✅ **Applied.** |

| | |
|---|---|
| **Location** | Entire document |
| **Issue** | No skip-navigation link. Keyboard-only users must tab through the full 7-item nav + ticker bar before reaching main content on every page load. |
| **Fix** | Add `<a href="#main" class="sr-only focusable">Skip to content</a>` as first child of `<body>`. Not applied (requires adding an `id="main"` anchor and CSS for the skip link). ~5 min. |

| | |
|---|---|
| **Location** | CSS — `--fg-faint: #6E6E68` |
| **Issue** | `fg-faint` on `#0F0F0F` background = 3.7:1. Passes WCAG AA for large text (≥18px / ≥14px bold) but fails for normal body text. Used in many `font-size:11–12px` labels (below large-text threshold). |
| **Fix** | Lighten `--fg-faint` to `#7E7E78` (≈4.6:1) — meets AA for all text sizes. Not applied (sweeping color change). |

| | |
|---|---|
| **Location** | `<head>` — no `<link rel="preload">` for fonts |
| **Issue** | Google Fonts has `display=swap` (good) but no preload hint. On first paint, FOUT (flash of unstyled text) is visible for ~500ms on average connections before Inter/JetBrains Mono load. |
| **Fix** | Add `<link rel="preload" as="font" crossorigin href="...Inter-woff2-url...">` for the 400/500 weight subsets. Requires knowing the actual woff2 URL from Google Fonts. Not applied. |

---

### 🟢 Low / Nit

| | |
|---|---|
| **Location** | `<pre class="banner">` line 1481 |
| **Issue** | ASCII art `<pre>` had `aria-label="CC Commander"` but was NOT `aria-hidden` — screen readers announced all the block-character art. |
| **Fix** | Added `aria-hidden="true"` to the `<pre>`. ✅ **Applied** (the hidden `<h1>` now carries the label). |

| | |
|---|---|
| **Location** | `index.html` heading hierarchy |
| **Issue** | Document goes `<h2>` → `<h3>` with no `<h1>`. After adding hidden `<h1>`, hierarchy is correct. No skipped levels. |
| **Status** | Resolved by the `<h1>` fix above. |

| | |
|---|---|
| **Location** | Inline JS (~23KB) at line 2710 |
| **Issue** | Large script block is non-deferred (inline scripts always block). Contains hero typing, intersection observers, tab logic, skill explorer, hooks demo — all non-critical for first paint. |
| **Fix** | Move to external `app.js` with `defer`, or wrap body in `requestIdleCallback`. Not applied (larger refactor). |

---

## Color Contrast Summary (sampled pairs)

| Pair | Ratio | WCAG AA |
|---|---|---|
| Body text `#F5F5F0` on `#0F0F0F` | 17.5:1 | PASS |
| `fg-dim` `#A8A8A0` on `#0F0F0F` | 8.0:1 | PASS |
| `fg-faint` `#6E6E68` on `#0F0F0F` | 3.7:1 | FAIL normal, PASS large |
| Accent `#FF6B47` on `#0F0F0F` | 6.8:1 | PASS |
| Btn text `#1A0E07` on `#FF6B47` | 6.7:1 | PASS |

---

## SEO Checklist

| Check | Status |
|---|---|
| `<title>` (58 chars) | PASS (≤60) |
| Meta description (132 chars) | PASS (≤160) |
| `og:image` 1200×630 | PASS |
| `og:image` URL | PASS |
| Canonical URL | PASS |
| `robots` meta | ✅ Added |
| JSON-LD `SoftwareApplication` | PASS (valid) |
| `<h1>` present | ✅ Added |
| `lang` attribute | PASS (`en`) |
| Twitter card | PASS (`summary_large_image`) |

---

## Quick Wins Applied (≤5 min each)

1. **Google Fonts non-blocking** — `media="print" onload` pattern + `<noscript>` fallback. Removes render-blocking stylesheet. Estimated FCP improvement: 100–300ms on cold loads.
2. **`robots` meta** — added `index, follow` explicitly.
3. **`rel="noopener noreferrer"`** — added to all 8 external links that were missing it (nav, hero, footer).
4. **Hidden `<h1>`** — SR-only heading matching page `<title>`. Fixes both SEO and accessibility heading hierarchy.
5. **`aria-hidden` on ASCII banner `<pre>`** — prevents screen readers announcing box-drawing characters.

---

## Remaining backlog (not applied)

| Priority | Fix | Effort |
|---|---|---|
| 🟡 | Skip-nav link | 10 min |
| 🟡 | Lighten `--fg-faint` to #7E7E78 | 5 min |
| 🟡 | Font preload hints (Inter 400/500 woff2) | 15 min |
| 🟢 | Extract inline JS to `app.js defer` | 30 min |
| 🟢 | CSP header (server-side, not HTML) | 20 min |
