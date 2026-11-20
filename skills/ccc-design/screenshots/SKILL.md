---
name: screenshots
description: "Capture crisp 2x marketing images of your own running web app with a Playwright script: viewport presets, light and dark themes, logged-in pages, predictable file names. Use when the user needs product shots for a launch post, store listing, landing page, social card or docs."
---

# Screenshots — 2x product shots with Playwright

**CC Commander** · screenshots · a repeatable capture script that turns the user's own app into retina-sharp marketing images.

## When to use / when not to

- Use for launch posts, marketplace and store listings, landing-page heroes, social cards and documentation images of an app the user owns or is authorized to capture.
- Not for visual regression tests: those belong in the project's test suite with Playwright's `toHaveScreenshot` assertion.
- Not for analysing someone else's site as a design reference: the `capture` skill does that.

## What happens

1. **Pin down the target.** Ask for the base URL (local dev server or a preview deploy) and the routes to shoot. Confirm the app answers before writing anything:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/
   ```

   Anything other than a 2xx or 3xx status: ask the user to start the app (or give the right URL) and stop here.

2. **Check for Playwright.**

   ```bash
   npx --no-install playwright --version
   ```

   When it is missing, ask before changing the project, then install it as a dev dependency with the browser it needs:

   ```bash
   npm install --save-dev playwright && npx playwright install chromium
   ```

   Use `pnpm add -D` or `yarn add -D` when the repo has that lockfile.

3. **Choose the set** with the picker in Decision points, then map it onto presets. Every preset renders at `deviceScaleFactor: 2`, so each PNG is twice the CSS size in both dimensions.

   | Preset | CSS viewport | PNG size | Typical use |
   |---|---|---|---|
   | `desktop` | 1440 × 900 | 2880 × 1800 | Hero image, docs |
   | `laptop` | 1280 × 800 | 2560 × 1600 | Store listings |
   | `wide` | 1920 × 1080 | 3840 × 2160 | Video thumbnails, decks |
   | `tablet` | 834 × 1194 | 1668 × 2388 | iPad-style portrait |
   | `mobile` | 390 × 844 | 780 × 1688 | Phone frames |
   | `og` | 1200 × 630 | 2400 × 1260 | Social link cards |
   | `square` | 1080 × 1080 | 2160 × 2160 | Social feed posts |

   `mobile` and `tablet` also set `isMobile: true` and `hasTouch: true` so responsive layouts switch to their touch variants.

4. **Set up auth only if a route needs it.** Pick one, in this order of preference:
   - Seeded demo account on a local or preview environment. Never shoot real customer data.
   - Saved session: record a login once and reuse its cookies.

     ```bash
     mkdir -p .auth && npx playwright codegen --save-storage=.auth/screenshots.json http://localhost:3000/login
     ```

   - Scripted login with credentials from the environment (`SHOT_USER`, `SHOT_PASSWORD`), written to the same `.auth/screenshots.json` through `context.storageState({ path })`.

   The session file holds live cookies. Add `.auth/` to `.gitignore` before recording it, and never print its contents.

5. **Write the capture script** to `scripts/screenshots.mjs`, editing `SHOTS`, `THEMES` and the hide list for this app:

   ```js
   // scripts/screenshots.mjs: marketing captures at 2x device scale.
   import { chromium } from 'playwright';
   import { mkdir } from 'node:fs/promises';
   import path from 'node:path';

   const BASE_URL = process.env.SHOT_BASE_URL ?? 'http://localhost:3000';
   const SESSION = process.env.SHOT_STORAGE_STATE ?? '.auth/screenshots.json';
   const OUT_DIR = path.join('screenshots', new Date().toISOString().slice(0, 10));

   const PRESETS = {
     desktop: { viewport: { width: 1440, height: 900 } },
     laptop: { viewport: { width: 1280, height: 800 } },
     wide: { viewport: { width: 1920, height: 1080 } },
     tablet: { viewport: { width: 834, height: 1194 }, isMobile: true, hasTouch: true },
     mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
     og: { viewport: { width: 1200, height: 630 } },
     square: { viewport: { width: 1080, height: 1080 } },
   };

   // One entry per image group. `selector` crops to one element; `fullPage` captures the whole scroll height.
   const SHOTS = [
     { route: '/', presets: ['desktop', 'mobile'] },
     { route: '/pricing', presets: ['desktop'], fullPage: true },
     { route: '/dashboard', presets: ['desktop'], auth: true, selector: 'main' },
   ];
   const THEMES = ['light']; // add 'dark' when the app follows prefers-color-scheme

   // Dev overlays, cookie banners and chat bubbles never belong in a marketing image.
   const HIDE_CSS = `
     [data-screenshot-hide], #cookie-banner, nextjs-portal { display: none !important; }
     * { caret-color: transparent !important; }
   `;

   const slugFor = (route) =>
     route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home';

   const chrome = await chromium.launch({ headless: true });
   try {
     await mkdir(OUT_DIR, { recursive: true });
     for (const shot of SHOTS) {
       for (const preset of shot.presets) {
         for (const theme of THEMES) {
           const ctx = await chrome.newContext({
             ...PRESETS[preset],
             deviceScaleFactor: 2,
             colorScheme: theme,
             reducedMotion: 'reduce',
             ...(shot.auth ? { storageState: SESSION } : {}),
           });
           const page = await ctx.newPage();
           await page.goto(new URL(shot.route, BASE_URL).href, { waitUntil: 'networkidle' });
           await page.evaluate(() => document.fonts.ready);
           await page.addStyleTag({ content: HIDE_CSS });
           const file = path.join(OUT_DIR, `${slugFor(shot.route)}-${preset}-${theme}@2x.png`);
           const options = { path: file, animations: 'disabled' };
           if (shot.selector) await page.locator(shot.selector).first().screenshot(options);
           else await page.screenshot({ ...options, fullPage: Boolean(shot.fullPage) });
           console.log(file);
           await ctx.close();
         }
       }
     }
   } finally {
     await chrome.close();
   }
   ```

   A missing session file makes `newContext` throw for `auth: true` shots; that is intended, so a logged-out page is never saved under a logged-in name.

6. **Run it** and keep the printed paths:

   ```bash
   node scripts/screenshots.mjs
   ```

   On a timeout, raise the `goto` timeout or switch that route to `waitUntil: 'load'` plus `page.waitForSelector('<a stable element>')`; pages that poll forever never reach `networkidle`.

## Output naming

- Files land in `screenshots/<YYYY-MM-DD>/` as `<route-slug>-<preset>-<theme>@2x.png`, for example `pricing-desktop-dark@2x.png`.
- The route slug lowercases the path and joins its segments with hyphens: `/` becomes `home`, `/settings/billing` becomes `settings-billing`.
- Names are deterministic, so a rerun on the same day overwrites the previous take instead of piling up copies. Ask before committing the folder; large PNGs often belong in a design drive rather than the repo.

## Decision points

Ask with AskUserQuestion (header "Shots", single select):

- 🟢 Standard set — `desktop` and `mobile`, light theme, every listed route
- Launch kit — every preset in light and dark; the most files and the longest run
- Single image — one route, one preset; fastest way to check framing
- Social only — `og` and `square` for link cards and feed posts

## Done when

- `node scripts/screenshots.mjs` exited 0 in this turn and printed one path per expected image.
- Pixel sizes match the preset table:

  ```bash
  file screenshots/*/*.png
  ```

  Every line reads `PNG image data, W x H` with W and H at twice the CSS viewport (full-page shots: twice the width, any height).
- At least one image per preset was opened with the Read tool and checked for spinners, skeleton loaders, cookie banners, dev overlays, placeholder text and personal data. Report anything found and the fix (hide selector, wait condition, seed data) before calling it finished.

## Guardrails

- Capture only apps the user owns or is authorized to capture.
- Never hardcode credentials in the script; read them from the environment. Never commit `.auth/` or print a session file.
- Never shoot production accounts that show real customer data; use seeded or demo data.
- Ask before adding dependencies, and before uploading, publishing or posting any image.

## See also

- `capture` — turn an existing site, video or screenshot into a design prompt
- `frontend-slides` — put the finished shots into a launch deck
- `ccc-design` — route other design work
