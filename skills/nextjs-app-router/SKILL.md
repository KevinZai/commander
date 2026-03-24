---
name: nextjs-app-router
description: "Next.js 15+ App Router patterns with TypeScript strict, Tailwind CSS v4, shadcn/ui, Drizzle ORM + Neon Postgres, Better Auth, Framer Motion, deployed to Vercel. Covers route groups, server/client components, server actions, streaming, parallel/intercepting routes, middleware, metadata, caching, and more. Use when: building Next.js apps, App Router questions, server components, server actions, data fetching, caching strategy."
---

# Next.js 15+ App Router — Senior Patterns

Stack: **Next.js 15 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Drizzle ORM + Neon · Better Auth · Framer Motion · Vercel**

> NEVER use Pages Router (`pages/`) — all routing lives in `app/`. NEVER import from `next/router` — use `next/navigation`.

## 1. Route Groups

Organize routes without affecting URLs. Separate layouts for marketing, app shell, and auth flows.

```
app/
├── (marketing)/
│   ├── layout.tsx        ← public layout (nav + footer)
│   ├── page.tsx          ← /
│   ├── pricing/page.tsx  ← /pricing
│   └── blog/[slug]/page.tsx
├── (app)/
│   ├── layout.tsx        ← authenticated shell (sidebar + topbar)
│   ├── dashboard/page.tsx
│   └── settings/page.tsx
├── (auth)/
│   ├── layout.tsx        ← centered card layout
│   ├── login/page.tsx
│   └── signup/page.tsx
└── layout.tsx            ← root layout (html, body, providers)
```

```tsx
// app/(app)/layout.tsx — authenticated shell
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </SidebarProvider>
  )
}
```

## 2. Server Components vs Client Components

**Default: Server Components.** Add `"use client"` only when you need browser APIs, event handlers, or hooks.

```tsx
// ✅ Server Component — runs on server, zero JS shipped to client
// app/(app)/dashboard/page.tsx
import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { ProjectCard } from "./project-card"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userProjects = await db.select().from(projects).where(eq(projects.userId, session!.user.id))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userProjects.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  )
}
```

```tsx
// ✅ Client Component — event handlers, state, browser APIs
// app/(app)/dashboard/project-card.tsx
"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface Project { id: string; name: string; description: string }

export function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="mt-2">
            {expanded ? "Less" : "More"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
```

**Boundary rule:** Pass server data as props into client components. Never import server-only modules from `"use client"` files.

```tsx
// ✅ Correct — server fetches, passes to client
export default async function Page() {
  const data = await fetchFromDB()
  return <ClientChart data={data} />  // data serialized as props
}

// ❌ Wrong — can't use db or auth in client component
"use client"
const data = await db.select()... // throws at build time
```

## 3. Server Actions

Mutations live in `actions/` files marked `"use server"`. Use `useActionState` for form feedback.

```tsx
// app/(app)/projects/actions.ts
"use server"
import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export type CreateProjectState = {
  errors?: { name?: string[]; description?: string[] }
  message?: string
}

export async function createProject(
  prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { message: "Unauthorized" }

  const parsed = CreateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const [project] = await db.insert(projects).values({
    name: parsed.data.name,
    description: parsed.data.description,
    userId: session.user.id,
  }).returning()

  revalidatePath("/dashboard")
  redirect(`/projects/${project.id}`)
}
```

```tsx
// app/(app)/projects/new/page.tsx — useActionState form
"use client"
import { useActionState } from "react"
import { createProject } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function NewProjectPage() {
  const [state, action, isPending] = useActionState(createProject, {})

  return (
    <form action={action} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="My Project" />
        {state.errors?.name && (
          <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
        {state.errors?.description && (
          <p className="text-sm text-destructive mt-1">{state.errors.description[0]}</p>
        )}
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Project"}
      </Button>
    </form>
  )
}
```

### Optimistic Updates with useOptimistic

```tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { toggleTodo } from "./actions"

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state, id: string) => state.map(t => t.id === id ? { ...t, done: !t.done } : t)
  )
  const [, startTransition] = useTransition()

  const handleToggle = (id: string) => {
    startTransition(async () => {
      addOptimistic(id)
      await toggleTodo(id)
    })
  }

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li key={todo.id} className={todo.done ? "line-through opacity-50" : ""}>
          <button onClick={() => handleToggle(todo.id)}>{todo.title}</button>
        </li>
      ))}
    </ul>
  )
}
```

## 4. Data Fetching & Caching

```tsx
// RSC — direct async fetch
async function getPost(slug: string) {
  const post = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)
  return post[0] ?? null
}

// unstable_cache — memoize with tags for on-demand revalidation
import { unstable_cache } from "next/cache"

export const getCachedPost = unstable_cache(
  async (slug: string) => getPost(slug),
  ["post"],
  { tags: ["posts"], revalidate: 3600 }
)

// cache() — dedup within a request (not persisted)
import { cache } from "react"
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
})
```

### Revalidation patterns

```tsx
// On-demand revalidation by tag
"use server"
import { revalidateTag } from "next/cache"
export async function publishPost(id: string) {
  await db.update(posts).set({ published: true }).where(eq(posts.id, id))
  revalidateTag("posts")
}

// Revalidate a specific path
import { revalidatePath } from "next/cache"
revalidatePath("/blog/[slug]", "page")  // specific page
revalidatePath("/blog", "layout")        // layout + all children

// Route Handler revalidation trigger (webhook from CMS)
// app/api/revalidate/route.ts
import { NextRequest } from "next/server"
import { revalidateTag } from "next/cache"

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 })
  }
  const { tag } = await request.json()
  revalidateTag(tag)
  return Response.json({ revalidated: true })
}
```

## 5. Streaming & Suspense

```tsx
// app/(app)/dashboard/page.tsx — parallel streaming
import { Suspense } from "react"
import { StatsCards, StatsCardsSkeleton } from "./stats-cards"
import { RecentActivity, ActivitySkeleton } from "./recent-activity"

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}

// app/(app)/dashboard/stats-cards.tsx — async RSC
export async function StatsCards() {
  const stats = await getStats()  // slow query, streams in
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  )
}

// Skeleton matches exact layout
export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  )
}
```

```tsx
// app/(app)/dashboard/loading.tsx — instant loading UI for entire route
export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

## 6. Parallel Routes

```
app/(app)/
├── layout.tsx
├── @modal/
│   ├── default.tsx        ← renders null when no modal active
│   └── (.)projects/[id]/page.tsx  ← intercepting route
└── dashboard/
    └── page.tsx
```

```tsx
// app/(app)/layout.tsx — inject slots
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

// app/(app)/@modal/default.tsx — nothing when no modal
export default function ModalDefault() {
  return null
}
```

## 7. Intercepting Routes

```tsx
// app/(app)/@modal/(.)projects/[id]/page.tsx
// Intercepts /projects/[id] when navigating client-side (shows as modal)
// Direct URL visits still render the full page

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ProjectDetail } from "@/components/project-detail"
import { InterceptedModalClose } from "@/components/intercepted-modal-close"

export default async function ProjectModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProject(id)

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl">
        <InterceptedModalClose />
        <ProjectDetail project={project} />
      </DialogContent>
    </Dialog>
  )
}
```

```tsx
// components/intercepted-modal-close.tsx
"use client"
import { useRouter } from "next/navigation"
import { DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"

export function InterceptedModalClose() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="absolute right-4 top-4">
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}
```

## 8. Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"

const publicRoutes = ["/", "/login", "/signup", "/blog", "/pricing"]
const authRoutes = ["/login", "/signup"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting via Upstash (example)
  // const { success } = await ratelimit.limit(getClientIp(request))
  // if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  // Check session with Better Auth
  const { data: session } = await betterFetch<{ user: { id: string } }>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  )

  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + "/"))
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r))

  // Redirect logged-in users away from auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect anonymous users away from protected routes
  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
```

## 9. Metadata API

```tsx
// app/(marketing)/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from "next"

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params
  const post = await getCachedPost(slug)
  if (!post) return { title: "Post Not Found" }

  const parentMeta = await parent
  const previousImages = parentMeta.openGraph?.images ?? []

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(post.title)}`,
          width: 1200,
          height: 630,
        },
        ...previousImages,
      ],
    },
    twitter: { card: "summary_large_image", title: post.title },
  }
}

// Static params for SSG
export async function generateStaticParams() {
  const allPosts = await db.select({ slug: posts.slug }).from(posts)
  return allPosts.map(p => ({ slug: p.slug }))
}
```

```tsx
// app/api/og/route.tsx — dynamic OG image
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") ?? "Untitled"

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: 80,
      }}
    >
      <h1 style={{ color: "white", fontSize: 64, fontWeight: 700, textAlign: "center" }}>
        {title}
      </h1>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

## 10. Error Handling

```tsx
// app/(app)/dashboard/error.tsx — segment-level error boundary
"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">{error.message}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
```

```tsx
// app/(app)/projects/[id]/not-found.tsx
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">This project doesn't exist or you don't have access.</p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  )
}

// In page.tsx — trigger not-found
import { notFound } from "next/navigation"
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  // ...
}
```

## 11. Image Optimization

```tsx
import Image from "next/image"

// Local image with blur placeholder (auto-generated)
import heroImg from "@/public/hero.jpg"
<Image src={heroImg} alt="Hero" priority placeholder="blur" className="object-cover" />

// Remote image — requires remotePatterns in next.config.ts
<Image
  src="https://images.unsplash.com/photo-123?w=800"
  alt="Product"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  className="rounded-lg"
/>
```

```typescript
// next.config.ts
import type { NextConfig } from "next"

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
}
export default config
```

## 12. Route Handlers

```typescript
// app/api/projects/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const data = await db.select().from(projects).where(eq(projects.userId, session.user.id))
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const [project] = await db.insert(projects).values({ ...body, userId: session.user.id }).returning()
  return Response.json(project, { status: 201 })
}

// Streaming response
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of generateAIResponse()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  })
}
```

## 13. Caching Strategy

| Pattern | Use Case | Config |
|---|---|---|
| `fetch` default | Static data that rarely changes | `cache: "force-cache"` |
| `revalidate: N` | Periodically fresh (ISR) | `{ next: { revalidate: 3600 } }` |
| `no-store` | Always fresh (user data) | `cache: "no-store"` |
| `unstable_cache` | DB queries with tag revalidation | `{ tags: ["posts"] }` |
| `cache()` | Request dedup (no persistence) | `import { cache } from "react"` |

```typescript
// ISR — revalidate every hour
export const revalidate = 3600  // in layout.tsx or page.tsx

// Dynamic — always fresh
export const dynamic = "force-dynamic"

// Static — never revalidate (build time only)
export const dynamic = "force-static"
```

## 14. Environment Variables

```typescript
// env.ts — using @t3-oss/env-nextjs
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  },
})

// Usage — throws at startup if missing/invalid
import { env } from "@/env"
const db = drizzle(env.DATABASE_URL)
```

**Version:** 1.0.0
**Last Updated:** 2026-03-23
