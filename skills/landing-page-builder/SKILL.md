---
name: landing-page-builder
description: "Build high-converting landing pages with Next.js + shadcn/ui. Hero sections, social proof, testimonials, pricing tables, FAQ, CTA patterns, lead capture forms, countdown timers, trust badges, and above-the-fold optimization. Use when: user wants a landing page, pricing page, hero section, testimonials, or conversion-optimized page."
---

# Landing Page Builder Skill

Build conversion-optimized landing pages for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React Server Components where possible (client only for interactivity)
- shadcn/ui components + Tailwind
- Mobile-first responsive
- Above-the-fold optimized (LCP < 2.5s)
- Accessible (ARIA, keyboard nav, contrast)

## 1. Hero Section Patterns

### Hero with CTA + Social Proof
```tsx
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { ArrowRight, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">New: Feature X is here</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Headline that speaks to the <span className="text-primary">pain point</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Supporting copy that explains the value proposition in one clear sentence. Focus on outcomes, not features.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Primary CTA <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Secondary CTA
            </Button>
          </div>
          {/* Social proof strip */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3,4,5].map(i => (
                <Image key={i} src={`/avatars/${i}.jpg`} alt="" width={32} height={32} className="rounded-full border-2 border-background" />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              <span className="ml-2 text-sm text-muted-foreground">Trusted by 10,000+ users</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

### Hero with Image/Video
```tsx
// Split layout: text left, image/video right
<section className="py-20">
  <div className="container grid gap-12 lg:grid-cols-2 items-center">
    <div>
      <h1>...</h1>
      <p>...</p>
      <Button>...</Button>
    </div>
    <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
      {/* Product screenshot, demo video, or animated visual */}
    </div>
  </div>
</section>
```

## 2. Social Proof & Testimonials

### Logo Strip
```tsx
export function LogoStrip({ logos }: { logos: { name: string; src: string }[] }) {
  return (
    <section className="py-12 border-y">
      <div className="container">
        <p className="text-center text-sm text-muted-foreground mb-8">Trusted by leading companies</p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-60">
          {logos.map(logo => (
            <Image key={logo.name} src={logo.src} alt={logo.name} width={120} height={40} className="h-8 w-auto" />
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Testimonial Cards
```tsx
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface Testimonial { quote: string; name: string; role: string; company: string; avatar?: string }

export function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-12">What our customers say</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    {t.avatar && <AvatarImage src={t.avatar} />}
                    <AvatarFallback>{t.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

## 3. Pricing Table

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Plan { name: string; price: string; period: string; description: string; features: string[]; cta: string; popular?: boolean }

export function PricingTable({ plans }: { plans: Plan[] }) {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">No hidden fees. Cancel anytime.</p>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map(plan => (
            <Card key={plan.name} className={cn("relative", plan.popular && "border-primary shadow-lg scale-105")}>
              {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full mb-6" variant={plan.popular ? "default" : "outline"}>{plan.cta}</Button>
                <ul className="space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

## 4. FAQ Accordion

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface FAQ { question: string; answer: string }

export function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section className="py-20">
      <div className="container max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
```

## 5. Countdown Timer

```tsx
"use client"
import { useEffect, useState } from "react"

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { clearInterval(interval); return }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <div className="flex gap-4 justify-center">
      {Object.entries(timeLeft).map(([label, value]) => (
        <div key={label} className="text-center">
          <div className="text-3xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
          <div className="text-xs text-muted-foreground uppercase">{label}</div>
        </div>
      ))}
    </div>
  )
}
```

## 6. Feature Grid

```tsx
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface Feature { icon: LucideIcon; title: string; description: string }

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <f.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

## 7. Trust Badges

```tsx
import { Shield, Lock, CreditCard, Headphones } from "lucide-react"

export function TrustBadges() {
  const badges = [
    { icon: Shield, label: "SOC 2 Certified" },
    { icon: Lock, label: "256-bit SSL" },
    { icon: CreditCard, label: "PCI Compliant" },
    { icon: Headphones, label: "24/7 Support" },
  ]
  return (
    <div className="flex flex-wrap justify-center gap-6 py-8">
      {badges.map(b => (
        <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
          <b.icon className="h-5 w-5" />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  )
}
```

## Page Layout Pattern

```tsx
// Typical high-converting landing page order:
// 1. Hero (with primary CTA)
// 2. Logo strip (social proof)
// 3. Problem → Solution (before/after)
// 4. Feature grid or bento
// 5. Testimonials
// 6. Pricing
// 7. FAQ
// 8. Final CTA section
// 9. Trust badges + footer
```

## Conversion Best Practices

1. One primary CTA per viewport — don't compete with yourself
2. Sticky CTA on mobile (fixed bottom bar)
3. Above-the-fold must contain: headline, value prop, CTA, social proof
4. Use `priority` on hero images for LCP
5. Repeat CTA after every 2-3 sections
6. Use urgency/scarcity sparingly and honestly
7. Test button copy > test button color

**Version:** 1.0.0
**Last Updated:** 2026-03-17
