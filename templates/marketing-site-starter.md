# Marketing Site Starter

Stack: Next.js 15 App Router + Tailwind v4 + Framer Motion + MDX + PostHog
Use case: Product landing pages, marketing sites (like mywifi-redesign)

---

## File Tree

```
my-site/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx           # Marketing layout (nav + footer)
│   │   │   ├── page.tsx             # Homepage
│   │   │   ├── pricing/page.tsx
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx         # Blog index
│   │   │   │   └── [slug]/page.tsx  # Blog post
│   │   │   └── contact/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx           # App layout (protected)
│   │   │   └── dashboard/page.tsx
│   │   ├── api/
│   │   │   ├── contact/route.ts     # Contact form server action
│   │   │   └── og/route.tsx         # OG image generation
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── marketing/
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   ├── pricing.tsx
│   │   │   ├── faq.tsx
│   │   │   ├── testimonials.tsx
│   │   │   ├── cta.tsx
│   │   │   ├── nav.tsx
│   │   │   └── footer.tsx
│   │   └── ui/                      # shadcn components
│   ├── lib/
│   │   ├── analytics.ts
│   │   ├── mdx.ts
│   │   └── utils.ts
│   └── content/
│       └── blog/                    # MDX blog posts
│           └── getting-started.mdx
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── mdx-components.tsx
└── .env.local
```

---

## `package.json`

```json
{
  "name": "my-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.2.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "tailwindcss": "4.0.15",
    "@tailwindcss/postcss": "4.0.15",
    "framer-motion": "12.5.0",
    "next-mdx-remote": "5.0.0",
    "@next/mdx": "15.2.4",
    "gray-matter": "4.0.3",
    "reading-time": "1.5.0",
    "posthog-js": "1.250.0",
    "posthog-node": "4.4.3",
    "resend": "4.1.2",
    "zod": "3.24.2",
    "lucide-react": "0.477.0",
    "next-themes": "0.4.4",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "class-variance-authority": "0.7.1",
    "@vercel/og": "0.6.4"
  },
  "devDependencies": {
    "typescript": "5.8.2",
    "@types/react": "19.0.10",
    "@types/react-dom": "19.0.4",
    "@types/node": "22.13.10",
    "eslint": "9.22.0",
    "eslint-config-next": "15.2.4"
  }
}
```

---

## `next.config.ts`

```ts
import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.unsplash.com' },
    ],
  },
};

export default withMDX(nextConfig);
```

---

## Root `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { PostHogProvider } from '@/lib/analytics';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: { default: 'My Product', template: '%s | My Product' },
  description: 'Your product description. Make it compelling and under 160 chars.',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  authors: [{ name: 'My Company' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'My Product',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@myhandle',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

---

## `src/app/(marketing)/layout.tsx`

```tsx
import { Nav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

---

## `src/app/(marketing)/page.tsx`

```tsx
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { Testimonials } from '@/components/marketing/testimonials';
import { Pricing } from '@/components/marketing/pricing';
import { FAQ } from '@/components/marketing/faq';
import { CTA } from '@/components/marketing/cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
```

---

## `src/components/marketing/hero.tsx`

```tsx
'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background px-6 py-24 sm:py-32 lg:px-8">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="mb-6 inline-flex items-center rounded-full border border-border bg-muted px-4 py-1 text-sm font-medium text-muted-foreground">
            ✨ New: Feature announcement here
          </span>
        </motion.div>

        <motion.h1
          className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Your compelling{' '}
          <span className="text-primary">headline</span>{' '}
          here
        </motion.h1>

        <motion.p
          className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Your value proposition in one or two sentences. Focus on the outcome, not the feature.
        </motion.p>

        <motion.div
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="#features"
            className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            See how it works →
          </Link>
        </motion.div>

        <motion.p
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          No credit card required · Free forever plan
        </motion.p>
      </div>
    </section>
  );
}
```

---

## `src/components/marketing/features.tsx`

```tsx
'use client';
import { motion } from 'framer-motion';
import { Wifi, Shield, Zap, BarChart, Globe, Users } from 'lucide-react';

const features = [
  { icon: Wifi, title: 'Feature One', description: 'Compelling description of what this does for the user.' },
  { icon: Shield, title: 'Feature Two', description: 'Focus on the benefit, not the technology.' },
  { icon: Zap, title: 'Feature Three', description: 'Keep it under 20 words per feature description.' },
  { icon: BarChart, title: 'Feature Four', description: 'Use numbers when possible: 10x faster, 50% cheaper.' },
  { icon: Globe, title: 'Feature Five', description: 'Lead with the outcome your customer will experience.' },
  { icon: Users, title: 'Feature Six', description: 'Match language to your ICP\'s vocabulary.' },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Supporting statement that reinforces the section heading.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <feature.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## `src/components/marketing/pricing.tsx`

```tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for trying out',
    features: ['Up to 100 users', '1 location', 'Basic analytics', 'Email support'],
    cta: 'Get started free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: { monthly: 49, yearly: 39 },
    description: 'For growing businesses',
    features: ['Unlimited users', '10 locations', 'Advanced analytics', 'Priority support', 'Custom branding', 'API access'],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 'Custom', yearly: 'Custom' },
    description: 'For large deployments',
    features: ['Everything in Pro', 'Unlimited locations', 'SSO / SAML', 'SLA guarantee', 'Dedicated success manager'],
    cta: 'Contact sales',
    href: '/contact',
    highlight: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm ${!yearly ? 'font-medium' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative h-6 w-11 rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${yearly ? 'translate-x-5' : ''}`} />
            </button>
            <span className={`text-sm ${yearly ? 'font-medium' : 'text-muted-foreground'}`}>
              Yearly <span className="text-green-600 font-medium ml-1">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlight
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 relative'
                  : 'border-border bg-card'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  {typeof plan.price.monthly === 'number' ? (
                    <span className="text-4xl font-bold">
                      ${yearly ? plan.price.yearly : plan.price.monthly}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </span>
                  ) : (
                    <span className="text-4xl font-bold">{plan.price.monthly}</span>
                  )}
                </div>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## `src/components/marketing/faq.tsx`

```tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How does the free plan work?',
    a: 'The free plan gives you full access to core features with limits on volume. No credit card required.',
  },
  {
    q: 'Can I change plans at any time?',
    a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately, downgrades at renewal.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, ACH transfers, and invoicing for annual Enterprise contracts.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. We use SOC 2 compliant infrastructure, encrypt data at rest and in transit, and never sell your data.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl mb-16">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-sm text-muted-foreground">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## `src/app/(marketing)/contact/page.tsx` (Server Action)

```tsx
import { z } from 'zod';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

async function submitContact(formData: FormData) {
  'use server';
  const parsed = ContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid form data');

  await resend.emails.send({
    from: 'contact@yourdomain.com',
    to: 'team@yourdomain.com',
    replyTo: parsed.data.email,
    subject: `Contact form: ${parsed.data.name}`,
    html: `<p><strong>From:</strong> ${parsed.data.name} (${parsed.data.email})</p><p>${parsed.data.message}</p>`,
  });
}

export default function ContactPage() {
  return (
    <div className="py-24 px-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Contact us</h1>
      <form action={submitContact} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input name="name" required className="w-full rounded-lg border border-border bg-background px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-border bg-background px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <textarea name="message" required rows={5} className="w-full rounded-lg border border-border bg-background px-4 py-2" />
        </div>
        <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          Send message
        </button>
      </form>
    </div>
  );
}
```

---

## `src/app/sitemap.ts`

```ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ];
}
```

## `src/app/robots.ts`

```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

---

## `src/app/api/og/route.tsx` (OG Image)

```tsx
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'My Product';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%', width: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#f8fafc', textAlign: 'center' }}>
          {title}
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', marginTop: 24 }}>
          Your tagline here
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

---

## `src/lib/analytics.ts` (PostHog)

```tsx
'use client';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false, // manual pageviews
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Track custom events
export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}
```

---

## MDX Blog Setup

### `mdx-components.tsx`

```tsx
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>,
    p: ({ children }) => <p className="my-4 leading-7 text-muted-foreground">{children}</p>,
    code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{children}</code>,
    pre: ({ children }) => <pre className="rounded-lg bg-muted p-4 overflow-x-auto my-6">{children}</pre>,
    ...components,
  };
}
```

### `src/lib/mdx.ts`

```ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/blog');

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readingTime: string;
  content: string;
}

export function getAllPosts(): Post[] {
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter(f => f.endsWith('.mdx'))
    .map(f => {
      const slug = f.replace('.mdx', '');
      const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags || [],
        readingTime: readingTime(content).text,
        content,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find(p => p.slug === slug);
}
```

---

## `.env.example`

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Email
RESEND_API_KEY=
CONTACT_EMAIL=team@yourdomain.com
```

---

## Setup Instructions

1. **Create project:** `npx create-next-app@latest my-site --typescript --tailwind --eslint --app --src-dir`

2. **Install deps:** Add framer-motion, posthog, MDX packages from `package.json` above

3. **Configure MDX:** Copy `next.config.ts` with `createMDX` wrapper + `mdx-components.tsx`

4. **shadcn init:** `npx shadcn@latest init` → add components needed for nav, footer

5. **Set up route groups:** Create `(marketing)` and `(app)` folders in `app/`

6. **Copy components:** Hero, Features, Pricing, FAQ, Testimonials, CTA, Nav, Footer

7. **SEO:** Add `sitemap.ts`, `robots.ts`, OG image route at `/api/og`

8. **Analytics:** Copy `src/lib/analytics.ts`, wrap layout with `PostHogProvider`

9. **MDX blog:** Create `src/content/blog/`, add `gray-matter` + `reading-time`

10. **Deploy:** `vercel deploy` — set env vars in Vercel dashboard
