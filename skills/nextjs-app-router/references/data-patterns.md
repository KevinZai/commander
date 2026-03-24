# Data Patterns — Next.js 15 App Router

## Fetch Patterns

### In Server Components (RSC)
```typescript
// Basic fetch — cached by default in Next.js
const data = await fetch("https://api.example.com/data").then(r => r.json())

// Force fresh (no cache)
const data = await fetch("https://api.example.com/data", {
  cache: "no-store"
}).then(r => r.json())

// ISR — revalidate every 60 seconds
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 60 }
}).then(r => r.json())

// With tags for on-demand revalidation
const data = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] }
}).then(r => r.json())
```

### Drizzle ORM Patterns
```typescript
// Select with join
const result = await db
  .select({
    id: projects.id,
    name: projects.name,
    ownerEmail: users.email,
  })
  .from(projects)
  .innerJoin(users, eq(projects.userId, users.id))
  .where(eq(projects.status, "active"))
  .orderBy(desc(projects.createdAt))
  .limit(20)

// Insert returning
const [created] = await db.insert(projects).values(data).returning()

// Update
await db.update(projects)
  .set({ updatedAt: new Date(), name: newName })
  .where(and(eq(projects.id, id), eq(projects.userId, userId)))

// Delete
await db.delete(projects).where(eq(projects.id, id))

// Transaction
const result = await db.transaction(async (tx) => {
  const [project] = await tx.insert(projects).values(projectData).returning()
  await tx.insert(projectMembers).values({ projectId: project.id, userId })
  return project
})
```

## Caching Matrix

| Data Type | Strategy | Code |
|---|---|---|
| Static CMS content | Build-time cache | `fetch(url)` default |
| Blog posts | ISR hourly | `{ next: { revalidate: 3600 } }` |
| User dashboard | No cache | `cache: "no-store"` or `export const dynamic = "force-dynamic"` |
| Product listings | ISR 5 min | `{ next: { revalidate: 300, tags: ["products"] } }` |
| Shared DB queries | `unstable_cache` | `unstable_cache(fn, keys, { tags, revalidate })` |
| Per-request dedup | `cache()` from React | Runs once per request, not persisted |
| Real-time data | Route Handler + SWR | Client polls `/api/route` |

## Revalidation Cheatsheet

```typescript
// 1. Time-based (ISR) — set in page/layout
export const revalidate = 3600  // seconds

// 2. On-demand by path — call after mutation
import { revalidatePath } from "next/cache"
revalidatePath("/blog")                    // exact path
revalidatePath("/blog/[slug]", "page")     // all pages matching pattern
revalidatePath("/blog", "layout")          // layout + all children

// 3. On-demand by tag — requires fetch/unstable_cache tagging
import { revalidateTag } from "next/cache"
revalidateTag("posts")                     // all data tagged "posts"
revalidateTag(`post-${id}`)               // specific post

// 4. unstable_cache with tags
import { unstable_cache } from "next/cache"
const getPosts = unstable_cache(
  async () => db.select().from(posts),
  ["posts-list"],
  { tags: ["posts"], revalidate: 3600 }
)

// 5. React cache() — request-scoped dedup only
import { cache } from "react"
export const getUser = cache(async (id: string) => {
  return db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0])
})
// Multiple components calling getUser(id) → single DB query
```

## Parallel Data Fetching

```typescript
// ✅ Parallel — both start simultaneously
const [user, posts] = await Promise.all([getUser(id), getPostsByUser(id)])

// ❌ Sequential — posts waits for user
const user = await getUser(id)
const posts = await getPostsByUser(id)

// Parallel with error handling
const [userResult, postsResult] = await Promise.allSettled([getUser(id), getPosts(id)])
const user = userResult.status === "fulfilled" ? userResult.value : null
```

## Client-Side Fetching (SWR/React Query)

```typescript
// When to fetch client-side:
// - Real-time data that changes frequently
// - User-specific data that shouldn't be in SSR HTML
// - Data dependent on client-side state

"use client"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR("/api/projects", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })
  return { projects: data, error, isLoading, mutate }
}
```
