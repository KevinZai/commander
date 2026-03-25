# Machine Interfaces — Implementation Patterns

## Markdown Twin Routes (Next.js)

### Middleware rewrite (.md → /slug/md)
```typescript
// middleware.ts
const mdMatch = pathname.match(/^\/([\\w-]+)\\.md$/);
if (mdMatch) {
  const url = request.nextUrl.clone();
  url.pathname = `/${mdMatch[1]}/md`;
  return NextResponse.rewrite(url);
}
```

### Route handler returning markdown
```typescript
// app/[slug]/md/route.ts
export async function GET(request, { params }) {
  const content = await getContent(params.slug);
  const markdown = renderToMarkdown(content);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
```

### Internal links in markdown should point to other .md routes
When rendering markdown twins, rewrite internal links to `.md` endpoints so agents stay in the cheap path.

## sitemap.md
```typescript
// app/sitemap.md/route.ts
export async function GET() {
  const posts = await getAllPosts();
  const lines = [
    "# Sitemap",
    "",
    "## Pages",
    ...pages.map(p => `- [${p.title}](${SITE_URL}/${p.slug})`),
    "",
    "## Agent Markdown Exports",
    "Append `.md` for agent markdown:",
    ...posts.map(p => `- [${p.title}](${SITE_URL}/${p.slug}.md)`),
    "",
    "## API",
    `- [API Discovery](${SITE_URL}/api)`,
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
```

## llms.txt
```
# SITENAME

> One-line description

## Docs
- [Sitemap (markdown)](https://DOMAIN/sitemap.md)
- [API Discovery](https://DOMAIN/api)

## Access Pattern
- Append `.md` to any page URL for agent markdown
- JSON API at `/api/...`
- Content-Type: text/markdown for .md routes
```

Serve with `Content-Type: text/plain; charset=utf-8`.

## API Discovery Route
```typescript
// app/api/route.ts
export async function GET(request) {
  const origin = new URL(request.url).origin;
  return Response.json({
    name: "SITENAME API",
    version: "1.0",
    endpoints: [
      { path: "/api/content", description: "Content API" },
      { path: "/api/search", description: "Search API" },
    ],
    nextActions: [
      { command: `curl -sS "${origin}/api/content"`, description: "List all content" },
      { command: `curl -sS "${origin}/api/search?q=QUERY"`, description: "Search content" },
    ],
  });
}
```

## MIME Type Discipline
| Surface | Content-Type |
|---------|-------------|
| HTML pages | `text/html; charset=utf-8` |
| Markdown twins | `text/markdown; charset=utf-8` |
| JSON API | `application/json; charset=utf-8` |
| llms.txt | `text/plain; charset=utf-8` |
| robots.txt | `text/plain` |

If a markdown endpoint returns `text/html`, that's a bug. Fix it.

## Verification
```bash
# Markdown twin exists and has correct type
curl -I https://DOMAIN/page.md
# expect: Content-Type: text/markdown; charset=utf-8

# API discovery returns next_actions
curl -sS https://DOMAIN/api | jq '.nextActions'

# llms.txt is plain text
curl -I https://DOMAIN/llms.txt
# expect: Content-Type: text/plain; charset=utf-8

# sitemap.md is markdown
curl -I https://DOMAIN/sitemap.md
# expect: Content-Type: text/markdown; charset=utf-8
```
