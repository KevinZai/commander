# Vue.js & Nuxt — Senior Development Patterns

You are a senior Vue.js and Nuxt developer. Follow these patterns for all Vue/Nuxt work.

## Stack (2025+)
- **Vue 3.5+** with Composition API (`<script setup>`)
- **Nuxt 4** for full-stack apps (SSR/SSG/hybrid)
- **TypeScript** — strict mode, no `any`
- **Vite 6** — build tool
- **Pinia** — state management (not Vuex)
- **VueUse** — composable utilities
- **Vitest** + **Playwright** — testing
- **Tailwind CSS** — styling

## Component Rules

### Always Use `<script setup>` + TypeScript
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<{
  update: [value: number]
  close: []
}>()

const doubled = computed(() => props.count * 2)
</script>
```

### Never Use
- ❌ Options API (`data()`, `methods`, `computed` as objects)
- ❌ `this` keyword (doesn't exist in `<script setup>`)
- ❌ Vuex (use Pinia)
- ❌ Vue 2 syntax (`Vue.component`, `Vue.use`, `$set`, `$delete`)
- ❌ Mixins (use composables)
- ❌ `process.env` (use `import.meta.env` or `useRuntimeConfig()`)

## Composables (Not Mixins)

Extract reusable logic into `composables/` with `use` prefix:

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)
  const increment = () => count.value++
  const reset = () => { count.value = initial }
  return { count, doubled, increment, reset }
}
```

## Pinia Store Pattern

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null)
  const loading = ref(false)

  // Getters
  const isLoggedIn = computed(() => !!user.value)
  const displayName = computed(() => user.value?.name ?? 'Guest')

  // Actions
  async function fetchUser(id: string) {
    loading.value = true
    try {
      user.value = await $fetch(`/api/users/${id}`)
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
  }

  return { user, loading, isLoggedIn, displayName, fetchUser, logout }
})
```

Use **setup store syntax** (function), not options syntax.

## Nuxt Patterns

### File-Based Routing
```
pages/
├── index.vue          → /
├── about.vue          → /about
├── users/
│   ├── index.vue      → /users
│   └── [id].vue       → /users/:id
└── [...slug].vue      → catch-all
```

### Data Fetching
```vue
<script setup lang="ts">
// SSR-safe data fetching (runs on server, cached on client)
const { data: posts, status } = await useFetch('/api/posts')

// With transform and key
const { data: user } = await useFetch(`/api/users/${id}`, {
  key: `user-${id}`,
  transform: (raw) => raw.data,
  watch: [id]
})

// Lazy loading (non-blocking)
const { data: comments, pending } = await useLazyFetch('/api/comments')
</script>
```

### Server Routes
```typescript
// server/api/posts.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return await db.posts.findMany({ take: query.limit ?? 20 })
})

// server/api/posts.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await db.posts.create({ data: body })
})
```

### Runtime Config
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    secretKey: '', // server-only (from NUXT_SECRET_KEY env)
    public: {
      apiBase: '/api' // client + server
    }
  }
})

// Usage in components
const config = useRuntimeConfig()
// config.public.apiBase (client-safe)
// config.secretKey (server-only)
```

### Rendering Modes (Per Route)
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/':          { prerender: true },         // SSG at build time
    '/dashboard': { ssr: true },               // SSR every request
    '/admin/**':  { ssr: false },              // SPA/CSR only
    '/blog/**':   { isr: 3600 },              // ISR: revalidate hourly
    '/api/**':    { cors: true, cache: { maxAge: 60 } }
  }
})
```

## Reactivity Rules

```typescript
// ✅ Correct
const count = ref(0)
const user = reactive({ name: '', age: 0 })
const list = ref<Item[]>([])

// ❌ Wrong — loses reactivity
let { name } = reactive({ name: 'test' })  // destructuring breaks reactivity
const obj = reactive({ nested: ref(0) })    // don't nest ref in reactive

// ✅ Use toRefs for destructuring reactive
const state = reactive({ x: 1, y: 2 })
const { x, y } = toRefs(state)  // keeps reactivity

// ✅ Use shallowRef for large objects/arrays that replace entirely
const bigList = shallowRef<DataRow[]>([])
bigList.value = newData  // triggers update
// bigList.value.push(item) — WON'T trigger (use triggerRef or replace)
```

## Component Patterns

### Provide/Inject (Not Prop Drilling)
```typescript
// Parent
import { provide } from 'vue'
const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)

// Deep child
const theme = inject<Ref<'light' | 'dark'>>('theme', ref('light'))
```

### v-model on Components
```vue
<!-- Parent -->
<SearchInput v-model="query" v-model:filters="activeFilters" />

<!-- SearchInput.vue -->
<script setup lang="ts">
const model = defineModel<string>()
const filters = defineModel<string[]>('filters')
</script>
<template>
  <input :value="model" @input="model = ($event.target as HTMLInputElement).value" />
</template>
```

### Async Components + Suspense
```vue
<script setup>
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
</script>
<template>
  <Suspense>
    <HeavyChart :data="chartData" />
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

## Testing

```typescript
// Component test with Vitest + Vue Test Utils
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('increments on click', async () => {
    const wrapper = mount(Counter, {
      global: {
        plugins: [createTestingPinia({ initialState: { counter: { count: 0 } } })]
      }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('1')
  })
})

// Composable test
import { useCounter } from './useCounter'

test('useCounter', () => {
  const { count, increment, doubled } = useCounter(5)
  expect(count.value).toBe(5)
  expect(doubled.value).toBe(10)
  increment()
  expect(count.value).toBe(6)
})
```

## Performance Checklist
- [ ] Use `shallowRef` for large non-nested data
- [ ] Use `v-once` for static content
- [ ] Use `v-memo` for expensive list renders
- [ ] Lazy-load routes and heavy components
- [ ] Use `useLazyFetch` for non-critical data
- [ ] Configure `routeRules` for per-page caching
- [ ] Enable Vite code-splitting (automatic with dynamic imports)
- [ ] Use `<NuxtImage>` for optimized images

## Project Structure (Nuxt)
```
├── app.vue
├── nuxt.config.ts
├── composables/        # Auto-imported composables
├── components/         # Auto-imported components
├── pages/              # File-based routing
├── layouts/            # Page layouts
├── server/
│   ├── api/            # API routes
│   ├── middleware/      # Server middleware
│   └── utils/          # Server utilities
├── stores/             # Pinia stores
├── types/              # TypeScript types
├── utils/              # Auto-imported utilities
└── public/             # Static assets
```
