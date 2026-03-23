---
name: analytics-conversion
description: "Set up analytics and conversion tracking for Next.js + shadcn/ui projects. GA4, Plausible, PostHog, event tracking, UTM handling, A/B testing, conversion funnels, cookie consent (GDPR), and heatmap integration. Use when: user wants analytics, tracking, A/B tests, conversion optimization, or cookie consent banners."
---

# Analytics & Conversion Skill

Implement analytics and conversion tracking for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- GDPR/CCPA compliant (consent before tracking)
- SSR-safe (no `window` access during SSR)
- Using shadcn/ui for consent UI

## 1. Analytics Provider Setup

### Google Analytics 4
```tsx
// components/analytics/google-analytics.tsx
"use client"
import Script from "next/script"

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${measurementId}',{page_path:window.location.pathname});`}
      </Script>
    </>
  )
}
```

### Plausible (Privacy-first)
```tsx
import Script from "next/script"

export function PlausibleAnalytics({ domain }: { domain: string }) {
  return <Script src="https://plausible.io/js/script.js" data-domain={domain} strategy="lazyOnload" />
}
```

### PostHog (Product analytics)
```tsx
"use client"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false, // manual pageview tracking in App Router
      capture_pageleave: true,
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

## 2. Event Tracking

### Unified Track Function
```tsx
// lib/analytics.ts
type EventProps = Record<string, string | number | boolean>

export function track(event: string, props?: EventProps) {
  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, props)
  }
  // Plausible
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible(event, { props })
  }
  // PostHog
  if (typeof window !== "undefined" && window.posthog) {
    window.posthog.capture(event, props)
  }
}

// Typed events for your project
export const analytics = {
  signupStarted: (source: string) => track("signup_started", { source }),
  signupCompleted: (plan: string) => track("signup_completed", { plan }),
  ctaClicked: (location: string, variant?: string) => track("cta_clicked", { location, variant: variant ?? "default" }),
  videoPlayed: (videoId: string, title: string) => track("video_played", { videoId, title }),
  blogRead: (slug: string, readTime: number) => track("blog_read", { slug, readTime }),
  pricingViewed: (plan: string) => track("pricing_viewed", { plan }),
  formSubmitted: (formName: string) => track("form_submitted", { formName }),
}
```

### Route Change Tracking (App Router)
```tsx
"use client"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { track } from "@/lib/analytics"

export function RouteChangeTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")
    track("pageview", { url, path: pathname })
  }, [pathname, searchParams])

  return null
}
```

## 3. UTM Parameter Handling

```tsx
// lib/utm.ts
export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export function captureUTM(): UTMParams {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const utm: UTMParams = {}
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem("utm_params", JSON.stringify(utm))
  }
  return utm
}

export function getStoredUTM(): UTMParams {
  if (typeof window === "undefined") return {}
  const stored = sessionStorage.getItem("utm_params")
  return stored ? JSON.parse(stored) : {}
}
```

## 4. A/B Testing Component

```tsx
"use client"
import { useEffect, useState } from "react"
import { track } from "@/lib/analytics"

interface ABTestProps {
  experimentId: string
  variants: Record<string, React.ReactNode>
  weights?: number[] // default: equal distribution
}

export function ABTest({ experimentId, variants, weights }: ABTestProps) {
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    // Check if user already has a variant assigned
    const stored = localStorage.getItem(`ab_${experimentId}`)
    if (stored && variants[stored]) {
      setVariant(stored)
      return
    }

    // Assign variant
    const keys = Object.keys(variants)
    const w = weights ?? keys.map(() => 1 / keys.length)
    const rand = Math.random()
    let cumulative = 0
    let selected = keys[0]
    for (let i = 0; i < keys.length; i++) {
      cumulative += w[i]
      if (rand <= cumulative) { selected = keys[i]; break }
    }

    localStorage.setItem(`ab_${experimentId}`, selected)
    setVariant(selected)
    track("experiment_viewed", { experimentId, variant: selected })
  }, [experimentId, variants, weights])

  if (!variant) return null
  return <>{variants[variant]}</>
}

// Usage:
// <ABTest experimentId="hero-cta" variants={{
//   control: <Button>Get Started</Button>,
//   variant_a: <Button>Start Free Trial</Button>,
//   variant_b: <Button>Try It Now — Free</Button>,
// }} />
```

## 5. Conversion Funnel Tracking

```tsx
// lib/funnel.ts
import { track } from "@/lib/analytics"

export function createFunnel(funnelName: string, steps: string[]) {
  return {
    step(stepName: string, props?: Record<string, string>) {
      const stepIndex = steps.indexOf(stepName)
      track("funnel_step", {
        funnel: funnelName,
        step: stepName,
        stepIndex,
        totalSteps: steps.length,
        ...props,
      })
    },
    complete(props?: Record<string, string>) {
      track("funnel_completed", { funnel: funnelName, ...props })
    },
    drop(stepName: string, reason?: string) {
      track("funnel_dropped", { funnel: funnelName, step: stepName, reason: reason ?? "unknown" })
    },
  }
}

// Usage:
// const signupFunnel = createFunnel("signup", ["landing", "email", "verify", "profile", "complete"])
// signupFunnel.step("landing")
// signupFunnel.step("email")
// signupFunnel.complete()
```

## 6. Cookie Consent Banner (GDPR)

```tsx
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ConsentState {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent({ onConsent }: { onConsent: (consent: ConsentState) => void }) {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState<ConsentState>({ necessary: true, analytics: false, marketing: false })

  useEffect(() => {
    const stored = localStorage.getItem("cookie_consent")
    if (!stored) setVisible(true)
    else onConsent(JSON.parse(stored))
  }, [onConsent])

  const accept = (state: ConsentState) => {
    localStorage.setItem("cookie_consent", JSON.stringify(state))
    setVisible(false)
    onConsent(state)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            We use cookies to improve your experience. You can customize your preferences below.
          </p>
          {showDetails && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Necessary</span>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Analytics</span>
                <Switch checked={consent.analytics} onCheckedChange={v => setConsent(prev => ({ ...prev, analytics: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Marketing</span>
                <Switch checked={consent.marketing} onCheckedChange={v => setConsent(prev => ({ ...prev, marketing: v }))} />
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? "Hide" : "Customize"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => accept({ necessary: true, analytics: false, marketing: false })}>
              Reject All
            </Button>
            {showDetails ? (
              <Button size="sm" onClick={() => accept(consent)}>Save Preferences</Button>
            ) : (
              <Button size="sm" onClick={() => accept({ necessary: true, analytics: true, marketing: true })}>Accept All</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 7. Scroll Depth Tracking

```tsx
"use client"
import { useEffect, useRef } from "react"
import { track } from "@/lib/analytics"

export function ScrollDepthTracker() {
  const tracked = useRef(new Set<number>())

  useEffect(() => {
    const milestones = [25, 50, 75, 100]
    const handleScroll = () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !tracked.current.has(milestone)) {
          tracked.current.add(milestone)
          track("scroll_depth", { depth: milestone, path: window.location.pathname })
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return null
}
```

## Integration Pattern

```tsx
// app/layout.tsx
import { GoogleAnalytics } from "@/components/analytics/google-analytics"
import { RouteChangeTracker } from "@/components/analytics/route-tracker"
import { CookieConsent } from "@/components/analytics/cookie-consent"
import { ScrollDepthTracker } from "@/components/analytics/scroll-depth"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Suspense><RouteChangeTracker /></Suspense>
        <ScrollDepthTracker />
        <CookieConsent onConsent={(c) => {
          if (c.analytics) {
            // Initialize analytics only after consent
          }
        }} />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  )
}
```

## Performance Rules

1. Load analytics scripts with `strategy="lazyOnload"` — never block rendering
2. Only initialize tracking AFTER consent is given
3. Use `navigator.sendBeacon` for exit-intent tracking
4. Batch events where possible
5. Never send PII (emails, names) to analytics — hash if needed

**Version:** 1.0.0
**Last Updated:** 2026-03-17
