---
name: blog-engine
description: "Build SEO-optimized blog systems for Next.js + shadcn/ui projects. MDX content, pagination, categories/tags, RSS feeds, reading time, TOC, related posts, search (Pagefind/Algolia), author pages, and social share cards. Use when: user wants a blog, content system, MDX setup, RSS feed, or content-driven pages."
---

# Blog Engine Skill

Build content/blog systems for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- Next.js App Router with RSC (React Server Components) where possible
- MDX for content with type-safe frontmatter
- shadcn/ui components for UI elements
- SEO-optimized (use `seo-optimizer` skill patterns)

## 1. Content Layer Setup

### Option A: Contentlayer (recommended for static)
```bash
npm i contentlayer2 next-contentlayer2
```

```ts
// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files"

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: "blog/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    date: { type: "date", required: true },
    updated: { type: "date" },
    author: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, default: [] },
    category: { type: "string", required: true },
    image: { type: "string" },
    draft: { type: "boolean", default: false },
  },
  computedFields: {
    slug: { type: "string", resolve: (doc) => doc._raw.flattenedPath.replace("blog/", "") },
    readingTime: {
      type: "string",
      resolve: (doc) => {
        const words = doc.body.raw.split(/\s+/).length
        const minutes = Math.ceil(words / 200)
        return `${minutes} min read`
      },
    },
  },
}))

export default makeSource({ contentDirPath: "content", documentTypes: [Post] })
```

### Option B: Local MDX with gray-matter
```bash
npm i gray-matter next-mdx-remote
```

```ts
// lib/posts.ts
import fs from "fs"
import path from "path"
import matter from "gray-matter"

const postsDir = path.join(process.cwd(), "content/blog")

export interface PostMeta {
  title: string
  description: string
  date: string
  updated?: string
  author: string
  tags: string[]
  category: string
  image?: string
  draft?: boolean
  slug: string
  readingTime: string
}

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith(".mdx"))
  return files
    .map(file => {
      const raw = fs.readFileSync(path.join(postsDir, file), "utf-8")
      const { data, content } = matter(raw)
      const words = content.split(/\s+/).length
      return {
        ...data,
        slug: file.replace(".mdx", ""),
        readingTime: `${Math.ceil(words / 200)} min read`,
      } as PostMeta
    })
    .filter(p => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string) {
  const raw = fs.readFileSync(path.join(postsDir, `${slug}.mdx`), "utf-8")
  const { data, content } = matter(raw)
  return { meta: { ...data, slug } as PostMeta, content }
}
```

## 2. Blog Index with Pagination

```tsx
// app/blog/page.tsx
import { getAllPosts } from "@/lib/posts"
import { PostCard } from "@/components/blog/post-card"
import { Pagination } from "@/components/blog/pagination"

const POSTS_PER_PAGE = 12

interface Props { searchParams: Promise<{ page?: string }> }

export default async function BlogPage({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1
  const allPosts = getAllPosts()
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)
  const posts = allPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE)

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Blog</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => <PostCard key={post.slug} post={post} />)}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
    </div>
  )
}
```

### PostCard Component
```tsx
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { PostMeta } from "@/lib/posts"

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Card className="group overflow-hidden">
      <Link href={`/blog/${post.slug}`}>
        {post.image && (
          <div className="aspect-video overflow-hidden">
            <Image src={post.image} alt={post.title} width={600} height={340}
              className="object-cover transition-transform group-hover:scale-105" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString()}</time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
          <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">{post.title}</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-2">{post.description}</p>
          <div className="flex gap-2 mt-4">
            {post.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
```

## 3. Category & Tag Pages

```tsx
// app/blog/category/[category]/page.tsx
export async function generateStaticParams() {
  const posts = getAllPosts()
  const categories = [...new Set(posts.map(p => p.category))]
  return categories.map(category => ({ category }))
}

// app/blog/tag/[tag]/page.tsx
export async function generateStaticParams() {
  const posts = getAllPosts()
  const tags = [...new Set(posts.flatMap(p => p.tags))]
  return tags.map(tag => ({ tag }))
}
```

## 4. Table of Contents

```tsx
"use client"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TOCItem { id: string; text: string; level: number }

export function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    const elements = document.querySelectorAll("article h2, article h3")
    const items: TOCItem[] = Array.from(elements).map(el => ({
      id: el.id,
      text: el.textContent ?? "",
      level: Number(el.tagName[1]),
    }))
    setHeadings(items)

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="sticky top-24 space-y-1">
      <p className="font-semibold text-sm mb-3">On this page</p>
      {headings.map(h => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={cn(
            "block text-sm py-1 transition-colors hover:text-foreground",
            h.level === 3 && "pl-4",
            activeId === h.id ? "text-primary font-medium" : "text-muted-foreground"
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  )
}
```

## 5. RSS Feed

```tsx
// app/feed.xml/route.ts
import { getAllPosts } from "@/lib/posts"

export async function GET() {
  const posts = getAllPosts()
  const siteUrl = "https://example.com"

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Site Name</title>
    <link>${siteUrl}</link>
    <description>Site description</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.tags.map(tag => `<category>${tag}</category>`).join("")}
    </item>`).join("")}
  </channel>
</rss>`

  return new Response(xml, { headers: { "Content-Type": "application/xml" } })
}
```

## 6. Search

### Pagefind (Static, zero-config)
```bash
npx pagefind --site .next/server/app
```

```tsx
"use client"
// Load Pagefind dynamically
useEffect(() => {
  async function load() {
    const pf = await import(/* webpackIgnore: true */ "/pagefind/pagefind.js")
    await pf.init()
    // pf.search("query") returns results
  }
  load()
}, [])
```

### Related Posts
```tsx
export function getRelatedPosts(currentSlug: string, tags: string[], limit = 3): PostMeta[] {
  const all = getAllPosts().filter(p => p.slug !== currentSlug)
  return all
    .map(post => ({
      post,
      score: post.tags.filter(t => tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post)
}
```

## 7. Social Share & OG Images

### Dynamic OG Image
```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, width: "100%", height: "100%", background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
      <div style={{ fontSize: 48, fontWeight: 700, color: "white", lineHeight: 1.2 }}>{post.title}</div>
      <div style={{ fontSize: 24, color: "#94a3b8", marginTop: 20 }}>{post.description}</div>
    </div>,
    { ...size }
  )
}
```

## 8. MDX Components

```tsx
// components/mdx-components.tsx
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const mdxComponents = {
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = String(children).toLowerCase().replace(/\s+/g, "-")
    return <h2 id={id} className="scroll-mt-24 text-2xl font-bold mt-10 mb-4" {...props}>{children}</h2>
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = String(children).toLowerCase().replace(/\s+/g, "-")
    return <h3 id={id} className="scroll-mt-24 text-xl font-semibold mt-8 mb-3" {...props}>{children}</h3>
  },
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <Image src={src ?? ""} alt={alt ?? ""} width={800} height={450} className="rounded-lg my-6" {...props} />
  ),
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} className="text-primary underline underline-offset-4 hover:text-primary/80" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>{children}</a>
  ),
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
}
```

## Content Structure

```
content/
  blog/
    getting-started.mdx
    advanced-guide.mdx
  authors/
    author-name.json
```

### MDX Frontmatter Template
```mdx
---
title: "Post Title with Primary Keyword"
description: "150-160 char description for SEO"
date: "2026-03-17"
author: "Author Name"
category: "Engineering"
tags: ["react", "nextjs", "tutorial"]
image: "/images/blog/post-cover.jpg"
draft: false
---

Content here...
```

**Version:** 1.0.0
**Last Updated:** 2026-03-17
