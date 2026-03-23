# Vue.js Ecosystem Reference (2025+)

## Core Libraries
| Package | Purpose | Install |
|---------|---------|---------|
| `vue` | Core framework (3.5+) | `npm i vue` |
| `nuxt` | Full-stack meta-framework | `npx nuxi init` |
| `pinia` | State management | `npm i pinia` |
| `vue-router` | Routing (auto in Nuxt) | `npm i vue-router` |
| `@vueuse/core` | 250+ composable utilities | `npm i @vueuse/core` |

## UI Libraries
| Library | Style | Notes |
|---------|-------|-------|
| **Nuxt UI** | Tailwind-based | Nuxt-native, headless + styled |
| **PrimeVue** | Unstyled or themed | 90+ components, enterprise-grade |
| **Radix Vue** | Headless | Accessibility-first primitives |
| **Vuetify** | Material Design | Full design system |
| **Naive UI** | Custom design | TypeScript-first, tree-shakeable |
| **DaisyUI** | Tailwind plugin | Component classes, not JS |
| **Shadcn Vue** | Tailwind + Radix Vue | Copy-paste components |

## Essential VueUse Composables
```typescript
// Browser
import { useLocalStorage, useClipboard, useDark, useMediaQuery } from '@vueuse/core'

// Sensors
import { useMouse, useScroll, useIntersectionObserver, useResizeObserver } from '@vueuse/core'

// State
import { useRefHistory, useDebouncedRef, useThrottleFn } from '@vueuse/core'

// Network
import { useFetch, useWebSocket, useEventSource } from '@vueuse/core'
```

## Nuxt Modules (Top Tier)
| Module | Purpose |
|--------|---------|
| `@nuxt/image` | Image optimization, lazy loading |
| `@nuxtjs/i18n` | Internationalization |
| `@sidebase/nuxt-auth` | Authentication (NextAuth-like) |
| `@pinia-plugin-persistedstate/nuxt` | Persist Pinia stores |
| `@nuxt/content` | Git-based CMS, MDC syntax |
| `@nuxt/test-utils` | Testing utilities |
| `@nuxt/fonts` | Automatic font optimization |
| `nuxt-og-image` | Dynamic OG images |

## TypeScript Patterns

### Component Props with Complex Types
```typescript
interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => string
}

interface Props<T extends Record<string, unknown>> {
  columns: TableColumn<T>[]
  rows: T[]
  loading?: boolean
}

// Generic components need defineComponent
export default defineComponent({
  props: { /* ... */ },
  setup(props) { /* ... */ }
})
```

### Typed Provide/Inject
```typescript
// keys.ts
import type { InjectionKey, Ref } from 'vue'

export const ThemeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme')
export const ApiKey: InjectionKey<ApiClient> = Symbol('api')

// Provider
provide(ThemeKey, theme)

// Consumer (type-safe)
const theme = inject(ThemeKey)! // Ref<'light' | 'dark'>
```

## Migration from Vue 2 / Options API

| Vue 2 / Options API | Vue 3 / Composition API |
|---------------------|------------------------|
| `data()` | `ref()` / `reactive()` |
| `computed: {}` | `computed(() => ...)` |
| `methods: {}` | Plain functions |
| `watch: {}` | `watch()` / `watchEffect()` |
| `this.$emit()` | `defineEmits()` |
| `this.$refs` | `useTemplateRef()` |
| `mixins` | Composables (`use...()`) |
| `Vuex` | Pinia |
| `Vue.prototype.$x` | `provide/inject` |
| `filters` | Computed or functions |
| `$set / $delete` | Direct assignment (proxy-based) |

## Key Differences: Nuxt vs Plain Vue
| Feature | Plain Vue | Nuxt |
|---------|-----------|------|
| Routing | Manual vue-router setup | File-based (automatic) |
| SSR | Manual SSR setup | Built-in (`ssr: true`) |
| Data fetching | `fetch` / axios | `useFetch` / `useAsyncData` |
| API routes | External backend | `server/api/` built-in |
| Auto-imports | Manual imports | Components, composables, utils |
| Meta/SEO | `vue-meta` or manual | `useHead()` / `useSeoMeta()` |
| Config | `.env` + manual | `runtimeConfig` + type-safe |
