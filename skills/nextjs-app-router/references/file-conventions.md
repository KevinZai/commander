# File Conventions — Next.js 15 App Router

Every special file in the `app/` directory and what it does.

## Core Route Files

| File | Purpose | Notes |
|---|---|---|
| `page.tsx` | UI for the route, makes it publicly accessible | Required to make a segment a route |
| `layout.tsx` | Persistent UI wrapping a segment and its children | Doesn't re-render on navigation |
| `loading.tsx` | Instant loading UI (Suspense boundary) | Shows while page.tsx is streaming |
| `error.tsx` | Error boundary for segment | Must be `"use client"`, receives `error` + `reset` props |
| `not-found.tsx` | Rendered when `notFound()` is called | Can be async RSC |
| `route.ts` | API endpoint (Route Handler) | Exports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` |
| `middleware.ts` | Runs before every request (edge runtime) | Must be at project root, not in `app/` |
| `template.tsx` | Like layout but re-mounts on navigation | Use for enter/exit animations |
| `default.tsx` | Fallback for parallel routes when no active match | Usually returns `null` |
| `global-error.tsx` | Root-level error boundary (wraps root layout) | Must be `"use client"` |

## Metadata Files

| File | Purpose |
|---|---|
| `favicon.ico` | Favicon (place in `app/`) |
| `icon.png` / `icon.svg` | App icon |
| `apple-icon.png` | Apple touch icon |
| `opengraph-image.png` | Static OG image |
| `opengraph-image.tsx` | Dynamic OG image (ImageResponse) |
| `twitter-image.png` | Static Twitter card image |
| `robots.ts` | `Robots` export for robots.txt |
| `sitemap.ts` | `MetadataRoute.Sitemap` export for sitemap.xml |
| `manifest.ts` | PWA web app manifest |

## Folder Conventions

| Pattern | Meaning | Example |
|---|---|---|
| `(folder)` | Route group — no URL segment | `(marketing)`, `(auth)`, `(app)` |
| `[param]` | Dynamic segment | `[id]`, `[slug]` |
| `[...slug]` | Catch-all segment | Matches `/a/b/c` → `slug: ["a","b","c"]` |
| `[[...slug]]` | Optional catch-all | Matches `/` too |
| `@slot` | Named slot for parallel routes | `@modal`, `@sidebar` |
| `(.)segment` | Intercept same level | `(.)photo/[id]` |
| `(..)segment` | Intercept one level up | `(..)photo/[id]` |
| `(...)segment` | Intercept from root | `(...)photo/[id]` |
| `_folder` | Private folder — opt out of routing | `_components`, `_lib` |

## Complete Example Structure

```
app/
├── layout.tsx                    ← Root layout (html, body, providers)
├── global-error.tsx              ← Root error boundary
├── not-found.tsx                 ← Global 404 page
├── favicon.ico
├── opengraph-image.tsx           ← Dynamic OG
├── robots.ts
├── sitemap.ts
│
├── (marketing)/
│   ├── layout.tsx                ← Marketing layout (nav + footer)
│   ├── page.tsx                  ← / (homepage)
│   ├── pricing/
│   │   └── page.tsx              ← /pricing
│   └── blog/
│       ├── page.tsx              ← /blog (list)
│       ├── loading.tsx           ← Streaming skeleton
│       └── [slug]/
│           ├── page.tsx          ← /blog/my-post
│           ├── loading.tsx
│           └── not-found.tsx
│
├── (auth)/
│   ├── layout.tsx                ← Centered card layout
│   ├── login/
│   │   └── page.tsx              ← /login
│   └── signup/
│       └── page.tsx              ← /signup
│
├── (app)/
│   ├── layout.tsx                ← Authenticated shell (auth check)
│   ├── @modal/
│   │   ├── default.tsx           ← null (no active modal)
│   │   └── (.)projects/[id]/
│   │       └── page.tsx          ← Intercepted modal
│   ├── dashboard/
│   │   ├── page.tsx              ← /dashboard
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── projects/
│       ├── page.tsx              ← /projects
│       ├── new/
│       │   └── page.tsx          ← /projects/new
│       └── [id]/
│           ├── page.tsx          ← /projects/123
│           ├── loading.tsx
│           ├── error.tsx
│           └── not-found.tsx
│
└── api/
    ├── auth/
    │   └── [...all]/
    │       └── route.ts          ← Better Auth handler
    ├── og/
    │   └── route.tsx             ← OG image generation
    └── revalidate/
        └── route.ts              ← Webhook revalidation
```

## Special Exports from page.tsx / layout.tsx

```typescript
// Caching behavior
export const dynamic = "auto" | "force-dynamic" | "force-static"
export const revalidate = false | 0 | number  // seconds
export const fetchCache = "auto" | "force-cache" | "no-store"

// Runtime
export const runtime = "nodejs" | "edge"

// Segment config
export const preferredRegion = "auto" | "global" | "home" | string[]
export const maxDuration = 300  // seconds (Pro plan)

// Generate static paths
export async function generateStaticParams() {
  return [{ slug: "post-1" }, { slug: "post-2" }]
}

// Dynamic metadata
export async function generateMetadata({ params, searchParams }) {
  return { title: "..." }
}
```

## Route Handler Exports

```typescript
// app/api/example/route.ts
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {}
export async function POST(request: NextRequest) {}
export async function PUT(request: NextRequest) {}
export async function PATCH(request: NextRequest) {}
export async function DELETE(request: NextRequest) {}
export async function HEAD(request: NextRequest) {}
export async function OPTIONS(request: NextRequest) {}

// Dynamic route segment
// app/api/posts/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

## middleware.ts Location & Config

```typescript
// middleware.ts — ROOT of project (next to package.json, not in app/)
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) { ... }

export const config = {
  // Glob patterns for which paths to run middleware on
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```
