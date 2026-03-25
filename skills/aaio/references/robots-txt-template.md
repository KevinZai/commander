# robots.txt Template for AI Bot Policy

Copy-paste template. Allows search/indexing + user-triggered AI fetchers. Blocks training crawlers.

```
# Search & indexing bots — ALLOW
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Training crawlers — BLOCK
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

# Discovery
Sitemap: https://YOURDOMAIN.com/sitemap.xml
Sitemap: https://YOURDOMAIN.com/sitemap.md
```

## Verification

```bash
curl -s https://YOURDOMAIN.com/robots.txt
curl -I -A 'OAI-SearchBot/1.3' https://YOURDOMAIN.com/
curl -I -A 'Googlebot' https://YOURDOMAIN.com/
curl -I -A 'Claude-SearchBot' https://YOURDOMAIN.com/
```
