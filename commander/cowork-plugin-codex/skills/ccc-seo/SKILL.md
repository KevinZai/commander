---
name: ccc-seo
description: "SEO router: technical audit and fixes, AI search optimization, content clusters, analytics, programmatic pages, backlinks. Use to improve SEO."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - WebFetch
  - AskUserQuestion
argument-hint: "[audit | ai-search | content | more, or plain words]"
model: sonnet
effort: medium
---

# $ccc-seo — route the SEO job

**CC Commander** · $ccc-seo · one pick from intent to the right SEO method, for classic ranking and for citation in AI answers.

The user's selected model is preserved unless they choose otherwise. SEO sub-skills (`seo-context`, `seo-optimizer`, `ai-seo`, `aaio` and the rest) ship with the Commander CLI toolkit under `skills/ccc-seo/<name>/`. Invoke one with the Skill tool when it is listed in this session; otherwise apply its one-line method from [references/routing.md](references/routing.md).

Codex: ask pickers as plain-text questions with the same options, and read a sub-skill's `SKILL.md` directly instead of using the Skill tool.

## When to use / when not to

- Use for technical SEO (meta, sitemaps, canonicals, Core Web Vitals, JSON-LD), site structure, AI-search optimization (answer engines, generative summaries, LLM citations), content clusters and briefs, Search Console and analytics setup, programmatic pages, backlink audits and Open Graph previews.
- Use `$ccc-marketing` for positioning, CRO and campaigns, `$ccc-content` for drafting the article itself, and `$ccc-design` for page visuals.

## What happens

### 1. Context strip

Run in one Bash call, silent on failure:

```bash
ls seo-context.md marketing-context.md 2>/dev/null
test -f package.json && jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' package.json 2>/dev/null | grep -E '^(next|astro|nuxt|gatsby|@sveltejs/kit)$'
ls public/robots.txt public/sitemap.xml app/sitemap.* app/robots.* 2>/dev/null
```

Render one line:

> 🌐 Framework: `<Next.js | Astro | other | none>` · robots <yes | no> · sitemap <yes | no> · SEO context <yes | no>

If `seo-context.md` exists, Read it before routed work. If the user gives a live URL, fetch it with WebFetch for the audit instead of guessing.

### 2. Route by intent, or ask

When the request or argument names the job, route straight to it with the intent table in [references/routing.md](references/routing.md) and skip the picker.

Otherwise ask with AskUserQuestion (header "SEO", question "What SEO work?"). Put the recommended option first, marked 🟢:

- 🔧 Technical audit and fix — meta tags, sitemap, robots, canonicals, Core Web Vitals, internal links. Recommended when step 1 shows no sitemap or no robots file.
- 🤖 AI search optimization — structure content for direct answers and LLM citations, AI-crawler rules, JSON-LD, markdown twins.
- 📝 Content engine — content pillars, topic clusters, per-page briefs and a blog setup.
- 🔄 More — analytics, Search Console, SERP analysis, programmatic pages, backlinks, social previews, dashboard.

When sitemap and robots both exist, the 🟢 default is AI search optimization.

On "More", ask a second picker, question "Which area?":

- 🟢 Analytics and Search Console — conversion tracking, product analytics, crawl and index coverage.
- 🔬 SERP and backlinks — competitor SERP analysis and a backlink profile audit.
- 📦 Programmatic pages — template-driven pages at scale with schema markup.
- 🌐 Social previews and dashboard — Open Graph and Twitter cards, plus a combined SEO health view.

Dispatch the selection immediately; do not re-prompt.

### 3. Run the routed flow

1. Start with `seo-context` when no `seo-context.md` exists and the flow depends on rankings, competitors or goals; otherwise skip it.
2. Run the flow's stages in order from [references/routing.md](references/routing.md) (Technical audit + fix, AI search optimization, Content engine, or the single routed sub-skill), invoking each with the Skill tool or applying its fallback method.
3. Before editing code, list the planned changes (file, change, reason) and apply them only within the project's existing SEO files and layout components.
4. Sub-skills that call external APIs (`serp-analyzer`, `backlink-audit`, `search-console`) need the user's own opt-in credentials in the environment. Check presence with `test -n "$VAR"` only; never print a value. Without credentials, fall back to the web-search method the sub-skill describes, and say the data is partial.

## Done when

Run before reporting, and report the actual result:

- Code changed: the project's build or typecheck exits 0 (`npm run build`, or `npx tsc --noEmit` when there is no build script), and `git status --short` lists only the intended files.
- Sitemap or robots on a live URL: `curl -sI <url>/sitemap.xml` and `curl -sI <url>/robots.txt` return 200; quote the status lines.
- JSON-LD added: each block parses (`node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' <file>` for extracted blocks) and names a schema.org `@type`.
- Audit only: findings are listed with the URL or `path:line`, severity and fix; nothing is reported as fixed that was not changed.
- Programmatic pages: the generated page count matches the input row count (`ls <out-dir> | wc -l`).

## Guardrails

- Never list every sub-skill as a menu; pickers have two to four options.
- Never deploy, submit sitemaps to search engines, or change DNS from this skill; `$ccc-deploy` owns releases and asks first.
- Never add hidden text, doorway pages, keyword stuffing, cloaking or fake reviews in structured data.
- Never block or allow AI crawlers in `robots.txt` without stating the trade-off and getting the user's choice.
- Never print or commit an API key; credentials stay in the user's environment.

## See also

- `$ccc-marketing` — positioning, CRO, campaigns and launches
- `$ccc-content` — draft the article a brief calls for
- `$ccc-deploy` — ship the SEO changes
- `$ccc-browse` — inspect the rendered page and its head tags

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
