---
name: partner-logo-standard
description: Standards and process for creating, cleaning, and maintaining vendor/partner SVG logos across GuestNetworks projects
---

## When to Use
- Adding a new vendor/partner integration that needs a logo
- Cleaning up or normalizing existing SVG logos
- Any component that renders vendor branding

## SVG Specification

Every vendor logo SVG must conform to these rules:

### Required
- **viewBox**: height proportional to content (typically `0 0 {width} {height}`)
- **fill**: `#FFFFFF` — pure white, no other colors
- **xmlns**: `xmlns="http://www.w3.org/2000/svg"` only
- **Content**: Wordmarks (company name as text/paths), not just icons

### Forbidden
- `width` or `height` attributes on root `<svg>`
- `<?xml ...?>` declarations
- `<metadata>`, `<title>`, `<desc>` elements
- `xmlns:xlink`, `xmlns:rdf`, `xmlns:cc` namespaces
- Inline `style` attributes or `<style>` blocks
- Non-white fill colors (no brand colors, no gradients)
- Embedded raster images (`<image>`)

### Guidelines
- File size under 5KB
- Prefer paths over `<text>` when possible
- If using `<text>`, use `font-family="Arial, Helvetica, sans-serif"` (universally available)
- File naming: `{vendor-slug}.svg` in kebab-case

## Creating a New Vendor Logo

### Step 1: Check Simple Icons
Visit `https://simpleicons.org/?q={vendor}`. If the brand exists:
1. Download the SVG
2. Change all fills to `#FFFFFF`
3. Remove metadata, title, width/height attributes
4. Save to `apps/portal/public/vendor-logos/{slug}.svg`

### Step 2: Create Wordmark (if not on Simple Icons)
Use this template:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} 40" fill="#FFFFFF"><text x="0" y="29" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="0.5">{COMPANY NAME}</text></svg>
```
Width guide: `name.length * 13`, add extra for capitals.

### Step 3: Register the Logo
1. Add entry to `apps/portal/lib/vendor-logos.ts` manifest
2. Update `packages/core/src/integrations.ts` — set `logoFile: '{slug}.svg'`
3. Verify: `npm run build`

## Rendering Logos in Components

Always use the shared `<VendorLogo>` component:
```tsx
import { VendorLogo } from '@/components/VendorLogo';

// Standard sizes
<VendorLogo slug="cisco-meraki" size="ribbon" />  // 24px
<VendorLogo slug="cisco-meraki" size="card" />     // 40px
<VendorLogo slug="cisco-meraki" size="hero" />     // 64px

// Custom height
<VendorLogo slug="cisco-meraki" heightPx={80} />
```

### Size Presets
| Size | Height | Usage |
|------|--------|-------|
| `badge` | 14px | ConnectorBadge, inline |
| `compact` | 16px | Solution page lists |
| `flow` | 18px | DataFlowHero nodes |
| `ribbon` | 24px | TrustedByRibbon, scrolling |
| `grid` | 24px | IntegrationGrid |
| `related` | 32px | Related integrations |
| `card` | 40px | IntegrationCard, dashboard |
| `dashboard` | 40px | Dashboard panels |
| `hero` | 64px | Integration hero banner |

### NEVER do this:
```tsx
// BAD — inline img with filter hack
<img src="/vendor-logos/foo.svg" style={{ filter: 'brightness(0) invert(1)' }} />

// GOOD — shared component, no filter needed
<VendorLogo slug="foo" size="card" />
```

## Quality Checklist
Before committing a new logo:
- [ ] viewBox is present and proportional
- [ ] No `width`/`height` on root `<svg>`
- [ ] All fills are `#FFFFFF`
- [ ] No metadata, title, desc, or style elements
- [ ] File size under 5KB
- [ ] Renders correctly at 14px and 64px height
- [ ] Entry added to `vendor-logos.ts` manifest
- [ ] `logoFile` populated in `integrations.ts`

## Key Files
- **SVGs**: `apps/portal/public/vendor-logos/*.svg`
- **Manifest**: `apps/portal/lib/vendor-logos.ts`
- **Component**: `apps/portal/components/VendorLogo.tsx`
- **Integrations**: `packages/core/src/integrations.ts`
