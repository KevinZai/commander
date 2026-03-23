---
name: seo-optimizer
description: "Technical SEO and GEO optimization for Next.js + shadcn/ui projects. Meta tags, Open Graph, JSON-LD structured data, sitemaps, robots.txt, Core Web Vitals, local/GEO SEO, hreflang, canonical URLs, and keyword optimization. Use when: user wants SEO, meta tags, structured data, sitemap, local SEO, or search optimization."
---

# SEO Optimizer Skill

Implement technical SEO for **Next.js (App Router) + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- Next.js App Router compatible (Metadata API, not `<Head>`)
- TypeScript strict mode
- Following Google's latest guidelines and Core Web Vitals

## 1. Next.js Metadata API

### Static Metadata
```tsx
// app/page.tsx or app/layout.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Site Name",
    template: "%s | Site Name", // for child pages
  },
  description: "Compelling 150-160 char description with primary keyword",
  keywords: ["keyword1", "keyword2"],
  authors: [{ name: "Author", url: "https://example.com" }],
  creator: "Brand Name",
  metadataBase: new URL("https://example.com"),
  alternates: {
    canonical: "/",
    languages: { "en-US": "/en", "es": "/es" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://example.com",
    siteName: "Site Name",
    title: "Page Title — can be longer for social",
    description: "Social description, can differ from meta description",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Description" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Page Title",
    description: "Twitter description",
    images: ["/og-image.png"],
    creator: "@handle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: {
    google: "google-verification-code",
  },
}
```

### Dynamic Metadata
```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [{ url: post.ogImage, width: 1200, height: 630 }],
    },
    alternates: { canonical: `/blog/${slug}` },
  }
}
```

## 2. JSON-LD Structured Data

### Component Pattern
```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

### Organization
```tsx
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Company Name",
  url: "https://example.com",
  logo: "https://example.com/logo.png",
  sameAs: ["https://twitter.com/handle", "https://linkedin.com/company/name"],
  contactPoint: { "@type": "ContactPoint", telephone: "+1-XXX", contactType: "customer service" },
}
```

### Article / Blog Post
```tsx
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.excerpt,
  image: post.ogImage,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: { "@type": "Person", name: post.author.name, url: post.author.url },
  publisher: { "@type": "Organization", name: "Site Name", logo: { "@type": "ImageObject", url: "/logo.png" } },
  mainEntityOfPage: { "@type": "WebPage", "@id": `https://example.com/blog/${post.slug}` },
}
```

### LocalBusiness (GEO SEO)
```tsx
const localSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Business Name",
  image: "https://example.com/photo.jpg",
  "@id": "https://example.com",
  url: "https://example.com",
  telephone: "+1-XXX-XXX-XXXX",
  address: { "@type": "PostalAddress", streetAddress: "123 Main St", addressLocality: "City", addressRegion: "ST", postalCode: "12345", addressCountry: "US" },
  geo: { "@type": "GeoCoordinates", latitude: 40.7128, longitude: -74.0060 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "17:00" },
  ],
  priceRange: "$$",
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "127" },
}
```

### Product
```tsx
const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Product Name",
  image: ["https://example.com/photo1.jpg"],
  description: "Product description",
  brand: { "@type": "Brand", name: "Brand" },
  offers: {
    "@type": "Offer",
    price: "29.99",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://example.com/product",
  },
}
```

### FAQ
```tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
}
```

### BreadcrumbList
```tsx
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: breadcrumbs.map((crumb, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: crumb.label,
    item: `https://example.com${crumb.href}`,
  })),
}
```

## 3. Sitemap & Robots

### sitemap.ts (App Router)
```tsx
// app/sitemap.ts
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  const postUrls = posts.map(post => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [
    { url: "https://example.com", lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: "https://example.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...postUrls,
  ]
}
```

### robots.ts
```tsx
// app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/_next/"] },
    ],
    sitemap: "https://example.com/sitemap.xml",
  }
}
```

## 4. Core Web Vitals

### LCP (Largest Contentful Paint)
- Use `priority` on hero images: `<Image priority src={...} />`
- Preload critical fonts: `<link rel="preload" as="font" />`
- Avoid lazy-loading above-the-fold content

### CLS (Cumulative Layout Shift)
- Always set `width` and `height` on `<Image>` (Next.js does this)
- Use `aspect-ratio` CSS for dynamic content
- Reserve space for ads/embeds with min-height

### INP (Interaction to Next Paint)
- Defer non-critical JS with `next/script` strategy="lazyOnload"
- Use `startTransition` for non-urgent state updates
- Avoid long tasks (>50ms) in event handlers

### Performance Component
```tsx
// Preload critical resources in layout.tsx
import Script from "next/script"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://analytics.example.com/script.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
```

## 5. GEO / Local SEO

### hreflang (Multi-language)
```tsx
// In metadata:
alternates: {
  canonical: "https://example.com",
  languages: {
    "en-US": "https://example.com/en",
    "es-ES": "https://example.com/es",
    "fr-FR": "https://example.com/fr",
    "x-default": "https://example.com",
  },
}
```

### Local Landing Pages
- Create `/locations/[city]` pages with unique content per location
- Include LocalBusiness schema with exact geo coordinates
- Embed Google Maps with proper `loading="lazy"`
- Add NAP (Name, Address, Phone) consistently across all pages

## 6. SEO Checklist

### Per-Page
- [ ] Unique `<title>` (50-60 chars) with primary keyword
- [ ] Unique `<meta description>` (150-160 chars) with CTA
- [ ] Canonical URL set
- [ ] Open Graph tags (title, description, image 1200x630)
- [ ] Twitter card tags
- [ ] H1 tag (one per page, contains primary keyword)
- [ ] Heading hierarchy (H1 > H2 > H3, no skips)
- [ ] Image alt text on all images
- [ ] Internal links to related content
- [ ] JSON-LD structured data appropriate for page type

### Site-Wide
- [ ] sitemap.xml generated and submitted
- [ ] robots.txt configured
- [ ] HTTPS everywhere
- [ ] Mobile responsive
- [ ] Core Web Vitals passing (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] 404 page with navigation
- [ ] Redirects for changed URLs (301)
- [ ] No duplicate content / canonical tags set

**Version:** 1.0.0
**Last Updated:** 2026-03-17
