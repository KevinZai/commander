---
name: social-integration
description: "Add social media integration to Next.js + shadcn/ui projects. Open Graph previews, Twitter cards, social share buttons, embed feeds (X, Instagram), Discord widget, social proof counters, and share tracking. Use when: user wants social sharing, OG tags, embedded social feeds, share buttons, or social proof."
---

# Social Integration Skill

Build social media integrations for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React components with TypeScript
- shadcn/ui styled
- Privacy-respecting (no tracking pixels without consent)
- Lazy-loaded where possible
- SSR-safe

## 1. Open Graph & Twitter Cards

### Via Next.js Metadata API
```tsx
// app/layout.tsx — site-wide defaults
import type { Metadata } from "next"

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://example.com",
    siteName: "Site Name",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@handle",
    creator: "@handle",
  },
}
```

### Dynamic OG Image Generation
```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  return new ImageResponse(
    <div style={{
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      width: "100%", height: "100%", padding: 60,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    }}>
      <div style={{ fontSize: 20, color: "#94a3b8", marginBottom: 16 }}>example.com/blog</div>
      <div style={{ fontSize: 48, fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>{post.title}</div>
      <div style={{ fontSize: 22, color: "#94a3b8", marginTop: 16 }}>{post.author} · {post.readingTime}</div>
    </div>,
    { ...size }
  )
}
```

## 2. Social Share Buttons

### Native Share (Mobile-first)
```tsx
"use client"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"

export function NativeShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, text, url })
    } else {
      await navigator.clipboard.writeText(url)
      // Show toast: "Link copied!"
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" /> Share
    </Button>
  )
}
```

### Platform-Specific Share Links (No SDK needed)
```tsx
import { Button } from "@/components/ui/button"

interface ShareLinksProps { url: string; title: string; description?: string }

const platforms = [
  {
    name: "X",
    icon: "𝕏",
    getUrl: (url: string, title: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: "in",
    getUrl: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: "f",
    getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",
    icon: "r",
    getUrl: (url: string, title: string) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "HN",
    icon: "Y",
    getUrl: (url: string, title: string) => `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`,
  },
  {
    name: "Email",
    icon: "✉",
    getUrl: (url: string, title: string) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
]

export function ShareLinks({ url, title }: ShareLinksProps) {
  return (
    <div className="flex gap-2">
      {platforms.map(p => (
        <Button key={p.name} variant="outline" size="icon" asChild title={`Share on ${p.name}`}>
          <a href={p.getUrl(url, title)} target="_blank" rel="noopener noreferrer">{p.icon}</a>
        </Button>
      ))}
    </div>
  )
}
```

### Copy Link Button
```tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link2, Check } from "lucide-react"

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
      {copied ? "Copied!" : "Copy Link"}
    </Button>
  )
}
```

## 3. Embedded Social Feeds

### X/Twitter Embed (Privacy-respecting)
```tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function TwitterEmbed({ tweetId }: { tweetId: string }) {
  const [loaded, setLoaded] = useState(false)

  if (!loaded) {
    return (
      <Card className="max-w-lg">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Tweet from @handle</p>
          <Button variant="outline" size="sm" onClick={() => setLoaded(true)}>
            Load Tweet (connects to X)
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-lg">
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={`https://twitter.com/x/status/${tweetId}`}>Loading tweet...</a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js" />
    </div>
  )
}
```

### YouTube Embed (Lazy, Privacy)
```tsx
// Use LazyVideo from video-gallery skill with youtube-nocookie.com domain
```

### Instagram Embed
```tsx
export function InstagramEmbed({ postId }: { postId: string }) {
  return (
    <blockquote
      className="instagram-media max-w-lg"
      data-instgrm-permalink={`https://www.instagram.com/p/${postId}/`}
      data-instgrm-version="14"
    />
    // Load embed.js only after user consent
  )
}
```

## 4. Discord Widget

```tsx
export function DiscordWidget({ serverId, theme = "dark" }: { serverId: string; theme?: "dark" | "light" }) {
  return (
    <iframe
      src={`https://discord.com/widget?id=${serverId}&theme=${theme}`}
      width="350"
      height="500"
      allowTransparency
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      className="rounded-lg border"
      loading="lazy"
    />
  )
}
```

## 5. Social Proof Counters

```tsx
import { Users, Star, Download, MessageCircle } from "lucide-react"

interface SocialStat { icon: typeof Users; label: string; value: string }

export function SocialProofBar({ stats }: { stats: SocialStat[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-8 py-8">
      {stats.map(stat => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className="h-5 w-5 text-primary" />
          <div>
            <span className="font-bold">{stat.value}</span>
            <span className="ml-1 text-sm text-muted-foreground">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Usage:
// <SocialProofBar stats={[
//   { icon: Users, label: "Users", value: "50K+" },
//   { icon: Star, label: "GitHub Stars", value: "12K" },
//   { icon: Download, label: "Downloads", value: "1M+" },
// ]} />
```

## 6. GitHub Stats (Live)

```tsx
// app/api/github-stats/route.ts
export async function GET() {
  const res = await fetch("https://api.github.com/repos/owner/repo", {
    headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    next: { revalidate: 3600 }, // cache 1 hour
  })
  const data = await res.json()
  return Response.json({
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.subscribers_count,
  })
}
```

## 7. Share Tracking

```tsx
import { track } from "@/lib/analytics"

export function trackShare(platform: string, url: string, title: string) {
  track("social_share", { platform, url, title })
}

// Wrap share buttons:
// onClick={() => { trackShare("twitter", url, title); window.open(shareUrl) }}
```

## Privacy Rules

1. Never load third-party embeds without user consent (GDPR)
2. Use `youtube-nocookie.com` for YouTube
3. Show placeholder with "Load content" button for social embeds
4. Don't include social SDK scripts by default — load on demand
5. Share links (intent URLs) don't require any SDK or tracking
6. Use `rel="noopener noreferrer"` on all external links

**Version:** 1.0.0
**Last Updated:** 2026-03-17
