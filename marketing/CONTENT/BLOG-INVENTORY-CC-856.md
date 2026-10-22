# CC-856 blog inventory (slice 1, read-only)

Date: 2026-10-22. Nothing published. Findings from main @ 25c691ed plus origin/content/cc-322-master-narrative.

## The three posts

| # | Post | Draft exists? | Where |
|---|---|---|---|
| 1 | Kevin Z's Claude Code Bible, full release | Content yes, post no | `BIBLE.md` (3208 lines), `mintlify-docs/bible.mdx` (mirror, canonical URL commanderplugin.com/bible.html), `scripts/build-bible.mjs`, `scripts/build-bible-pdf.mjs`. Commit 87164285 published it as the canonical single page. No announcement post written. |
| 2 | Why CC Commander beats Cursor for planning | No | Only adjacent: `mintlify-docs/why-ccc.mdx` (vs stock Claude Code), `site/app/compare/page.tsx` (vs ECC/Pocock/Anthropic), README Cursor pairing paragraph (CC-769). No Cursor-vs-Commander planning piece. |
| 3 | Building CC Commander in 3 months | Yes, different title | `marketing/CONTENT/blog/how-we-built-cc-commander.md` on branch `content/cc-322-master-narrative` (commit 7e5092ad, draft PR #180, not merged, status DRAFT). Its editor notes list unreconciled items needing Kevin's call (counts, pricing/feedback gate, positioning). Note the "3 months" framing is stale: sources are April 2026, product is now v8.1.0. |

Also present (not in scope): `marketing/CONTENT/launch/codex-launch/blog-announce.md` (Codex launch post, copy says v4.2 and 51 skills, stale vs v8.1.0).

## Blog infrastructure

- No blog exists. `site/` (Next.js) has no `/blog` route, no post source, no index; only `site/app/api/og/blog/[slug]/route.tsx` (OG image generator, takes title/author/readTime params).
- `mintlify-docs/` has no blog section or nav entry (`docs.json`). Mintlify has no native blog; posts would be ordinary pages.
- Per the ticket fallback, the Bible page is the existing canonical content surface.

## Missing assets / gaps

1. Post 2 draft (needs Kevin's positioning angle and fair Cursor claims; verify any claims about Cursor before publishing).
2. Post 1 announcement wrapper (short post linking the Bible).
3. Post 3: PR #180 not merged; reconcile list unresolved; title/timeframe decision.
4. Blog surface: either `/blog` in `site/` or a Mintlify "Blog" group; neither exists.
5. Per-post OG images (generator route exists, no images generated), author/date metadata convention, RSS (none).
6. Analytics: PostHog provider exists in `site/`; no blog events.

## Decisions for Kevin

- A (recommended): Mintlify "Blog" nav group in `mintlify-docs/` (cheapest, matches docs host), reuse OG route params.
- B: `/blog` route in `site/` with MDX (more control, more work).
- C: Bible page only as blog surface, link posts from there.
Also: merge/rework PR #180 as post 3 and retitle? Recommended yes.
