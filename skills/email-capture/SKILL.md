---
name: email-capture
description: "Build email capture and newsletter signup components for Next.js + shadcn/ui projects. Signup forms, lead magnets, popup/slide-in triggers, Resend/Mailchimp/ConvertKit integration, double opt-in, and drip sequence templates. Use when: user wants email signup, newsletter forms, lead magnets, popups, or email marketing integration."
---

# Email Capture Skill

Build email capture components for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React components with TypeScript
- shadcn/ui form components
- Server Actions for form submission
- GDPR-compliant (consent checkbox, privacy link)
- Spam-protected (honeypot + rate limiting)

## 1. Inline Newsletter Signup

```tsx
"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { subscribeToNewsletter } from "@/app/actions/newsletter"

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    const result = await subscribeToNewsletter(email, source)
    if (result.success) {
      setStatus("success")
      setMessage("Check your email to confirm!")
      setEmail("")
    } else {
      setStatus("error")
      setMessage(result.error ?? "Something went wrong")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        disabled={status === "loading"}
      />
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
      </Button>
    </form>
  )
}
```

## 2. Server Action

```tsx
// app/actions/newsletter.ts
"use server"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
})

export async function subscribeToNewsletter(email: string, source?: string) {
  const parsed = schema.safeParse({ email, source })
  if (!parsed.success) return { success: false, error: "Invalid email" }

  try {
    // Option A: Resend
    await fetch("https://api.resend.com/audiences/AUDIENCE_ID/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: parsed.data.email, unsubscribed: false }),
    })

    // Option B: Mailchimp
    // await fetch(`https://REGION.api.mailchimp.com/3.0/lists/LIST_ID/members`, {
    //   method: "POST",
    //   headers: { Authorization: `apikey ${process.env.MAILCHIMP_API_KEY}` },
    //   body: JSON.stringify({ email_address: email, status: "pending" }), // pending = double opt-in
    // })

    // Option C: ConvertKit
    // await fetch(`https://api.convertkit.com/v3/forms/FORM_ID/subscribe`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ api_key: process.env.CONVERTKIT_API_KEY, email }),
    // })

    return { success: true }
  } catch {
    return { success: false, error: "Failed to subscribe. Please try again." }
  }
}
```

## 3. Lead Magnet Signup

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Download } from "lucide-react"

interface LeadMagnetProps {
  title: string
  description: string
  deliverable: string // "Free PDF Guide", "Email Course", etc.
  source: string
}

export function LeadMagnet({ title, description, deliverable, source }: LeadMagnetProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <Input type="text" placeholder="First name" required />
          <Input type="email" placeholder="Email address" required />
          <div className="flex items-start gap-2">
            <Checkbox id="consent" required />
            <label htmlFor="consent" className="text-xs text-muted-foreground leading-snug">
              I agree to receive emails. You can unsubscribe at any time. <a href="/privacy" className="underline">Privacy Policy</a>
            </label>
          </div>
          <Button type="submit" className="w-full">
            <Download className="mr-2 h-4 w-4" /> Get {deliverable}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

## 4. Popup / Slide-in Triggers

```tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"

interface PopupTriggerProps {
  children: React.ReactNode
  trigger: "exit-intent" | "scroll-depth" | "time-delay" | "page-count"
  delay?: number // ms for time-delay, % for scroll-depth, count for page-count
  cooldownDays?: number
}

export function PopupTrigger({ children, trigger, delay = 5000, cooldownDays = 7 }: PopupTriggerProps) {
  const [open, setOpen] = useState(false)
  const storageKey = `popup_${trigger}_dismissed`

  const shouldShow = useCallback(() => {
    const dismissed = localStorage.getItem(storageKey)
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime()
      if (Date.now() - dismissedAt < cooldownDays * 86400000) return false
    }
    return true
  }, [storageKey, cooldownDays])

  const show = useCallback(() => {
    if (shouldShow()) setOpen(true)
  }, [shouldShow])

  const dismiss = () => {
    setOpen(false)
    localStorage.setItem(storageKey, new Date().toISOString())
  }

  useEffect(() => {
    if (!shouldShow()) return

    if (trigger === "exit-intent") {
      const handler = (e: MouseEvent) => { if (e.clientY < 10) show() }
      document.addEventListener("mouseleave", handler)
      return () => document.removeEventListener("mouseleave", handler)
    }

    if (trigger === "time-delay") {
      const timer = setTimeout(show, delay)
      return () => clearTimeout(timer)
    }

    if (trigger === "scroll-depth") {
      const handler = () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        if (scrollPercent >= (delay as number)) show()
      }
      window.addEventListener("scroll", handler, { passive: true })
      return () => window.removeEventListener("scroll", handler)
    }

    if (trigger === "page-count") {
      const count = Number(sessionStorage.getItem("page_views") ?? 0) + 1
      sessionStorage.setItem("page_views", String(count))
      if (count >= (delay as number)) show()
    }
  }, [trigger, delay, show, shouldShow])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) dismiss() }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">Special offer</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// Usage:
// <PopupTrigger trigger="exit-intent" cooldownDays={3}>
//   <LeadMagnet title="Wait! Get our free guide" ... />
// </PopupTrigger>
```

## 5. Sticky Bottom Bar CTA

```tsx
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function StickyBottomCTA({ show = true }: { show?: boolean }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const handler = () => setVisible(window.scrollY > 600)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [dismissed])

  if (dismissed || !show) return null

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur p-3 transition-transform duration-300",
      visible ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="container flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Ready to get started? Join 10,000+ users today.</p>
        <div className="flex items-center gap-2">
          <Button size="sm">Sign Up Free</Button>
          <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## 6. Double Opt-in Flow

```
1. User submits email → Server creates contact with status "pending"
2. Email service sends confirmation email with unique link
3. User clicks link → status changes to "active"
4. Welcome email sent automatically

// Resend: use Audiences API, contacts are auto-confirmed
// Mailchimp: set status: "pending" (not "subscribed")
// ConvertKit: double opt-in is on by default per form settings
```

## Anti-Spam Rules

1. Always use honeypot field (hidden input that bots fill)
2. Rate limit server actions (1 request per 10 seconds per IP)
3. Validate email format server-side with Zod
4. Never expose API keys client-side
5. Use CAPTCHA only if honeypot insufficient (adds friction)
6. Store consent timestamp for GDPR compliance

**Version:** 1.0.0
**Last Updated:** 2026-03-17
