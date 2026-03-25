# JSON-LD Templates

## Organization (site-wide, in layout)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "COMPANY",
  "url": "https://DOMAIN",
  "logo": "https://DOMAIN/logo.png",
  "description": "One-line factual description",
  "sameAs": ["https://twitter.com/HANDLE", "https://linkedin.com/company/SLUG"],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "url": "https://DOMAIN/contact"
  }
}
```

## SoftwareApplication (SaaS products)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PRODUCT",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://DOMAIN",
  "description": "Factual product description matching visible page copy",
  "offers": [
    {
      "@type": "Offer",
      "name": "PLAN",
      "price": "PRICE",
      "priceCurrency": "USD",
      "priceSpecification": { "@type": "RecurringCharge", "frequency": "monthly" }
    }
  ]
}
```

## Article / Blog Post
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "TITLE",
  "description": "SUMMARY",
  "datePublished": "ISO-DATE",
  "dateModified": "ISO-DATE",
  "author": { "@type": "Person", "name": "NAME" },
  "publisher": { "@type": "Organization", "name": "ORG" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://DOMAIN/slug" }
}
```

## FAQ Page
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "QUESTION?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Direct answer matching visible page text."
      }
    }
  ]
}
```

## Product (e-commerce)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "PRODUCT",
  "description": "DESCRIPTION",
  "image": ["https://DOMAIN/images/product.jpg"],
  "sku": "SKU",
  "brand": { "@type": "Brand", "name": "BRAND" },
  "offers": {
    "@type": "Offer",
    "price": "PRICE",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "SELLER" }
  }
}
```

## Breadcrumbs (navigation)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://DOMAIN/" },
    { "@type": "ListItem", "position": 2, "name": "PAGE", "item": "https://DOMAIN/page" }
  ]
}
```

## Rules
- Every value MUST match visible page content
- Re-validate after every content/price change
- Test: `curl -sL URL | rg 'application/ld\+json'`
- Validate: https://validator.schema.org or Google Rich Results Test
