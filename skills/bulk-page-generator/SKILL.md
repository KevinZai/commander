---
name: bulk-page-generator
description: |
  Generate bulk pages for SEO programmatic content. Creates templated pages for
  location-based, comparison, alternative, integration, and use-case pages.
  Designed for MyWiFi Networks and DMHub marketing sites.
  Agents can use this for autonomous SEO content creation.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Bulk Page Generator

## When to Use
- Programmatic SEO campaigns (e.g., "WiFi marketing for {city}")
- Comparison pages (e.g., "MyWiFi vs {competitor}")
- Integration pages (e.g., "MyWiFi + {integration}")
- Use case pages (e.g., "WiFi marketing for {industry}")

## Page Types

### 1. Location Pages
Template: `{product} WiFi Marketing in {City}, {State/Province}`
Data source: List of target cities/regions
```
/wifi-marketing/toronto
/wifi-marketing/new-york
/wifi-marketing/los-angeles
```

### 2. Competitor Comparison Pages
Template: `{Product} vs {Competitor}: {Year} Comparison`
```
/compare/mywifi-vs-stayfi
/compare/mywifi-vs-socialwifi
/compare/mywifi-vs-aislelabs
```

### 3. Integration Pages
Template: `{Product} + {Integration}: How to {Benefit}`
```
/integrations/mailchimp
/integrations/hubspot
/integrations/zapier
```

### 4. Use Case / Industry Pages
Template: `WiFi Marketing for {Industry}: Complete Guide`
```
/industries/hotels
/industries/restaurants
/industries/retail
/industries/healthcare
```

## Generation Process

### Step 1: Define Template
```tsx
// src/app/{type}/[slug]/page.tsx
export default function Page({ params }: { params: { slug: string } }) {
  const data = getPageData(params.slug);
  return <Template {...data} />;
}
```

### Step 2: Create Data File
```json
// src/data/{type}-pages.json
[
  { "slug": "toronto", "city": "Toronto", "region": "Ontario", "country": "Canada" },
  { "slug": "new-york", "city": "New York", "region": "New York", "country": "USA" }
]
```

### Step 3: Generate Static Paths
```tsx
export function generateStaticParams() {
  return pages.map(p => ({ slug: p.slug }));
}
```

### Step 4: SEO Metadata
Each page MUST have:
- Unique title tag (< 60 chars)
- Unique meta description (< 160 chars)
- Schema.org structured data (LocalBusiness or Product)
- Canonical URL
- Open Graph tags

### Step 5: Content Differentiation
Each page must have **minimum 40% unique content** to avoid thin content penalties:
- City-specific stats/data
- Local competitor mentions
- Region-specific compliance notes
- Unique testimonial or case study reference

## Quality Gates
- [ ] No duplicate title tags across pages
- [ ] No duplicate meta descriptions
- [ ] > 40% unique content per page
- [ ] All pages pass Lighthouse SEO audit
- [ ] Structured data validates (schema.org validator)
- [ ] Internal linking between related pages
- [ ] Sitemap includes all generated pages

## Gotchas
- Google penalizes thin programmatic pages — quality > quantity
- Always frame content for RESELLERS, not end users (MyWiFi specific)
- Canadian + US spelling variations matter for local SEO
- Generate in batches of 20 to verify quality before scaling
- Use `next build` to catch static generation errors before deploy
