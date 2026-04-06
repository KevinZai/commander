---
name: developer-icons
description: Curated SVG tech stack icons for React/Next.js. TypeScript-first, SVGO-optimized, with light/dark/wordmark variants. Use when adding technology logos, stack badges, or brand icons to UI.
tags: [icons, react, svg, ui, design]
---

# developer-icons

## What It Is

`developer-icons` is an npm package of curated, optimized SVG icons for popular technologies — HTML, CSS, JavaScript, TypeScript, React, Next.js, Node.js, Docker, PostgreSQL, and 300+ more. Each icon is a React component, TypeScript-typed, and SVGO-optimized.

**This is the standard icon library for all Kevin's projects** (mywifi-redesign, dmhub, guestnetworks).

- GitHub: https://github.com/xandemon/developer-icons (839 stars)
- Browse all icons: https://xandemon.github.io/developer-icons/icons/All
- License: MIT

## Installation

```bash
npm i developer-icons
```

## Basic Usage

```tsx
import { HtmlIcon, JavascriptIcon, ReactIcon, NextjsIcon } from "developer-icons"

export function TechStack() {
  return (
    <div>
      <ReactIcon size={32} />
      <NextjsIcon size={32} />
      <JavascriptIcon size={32} />
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `24` | Width and height in px |
| `color` | `string` | icon's native color | Override fill color |
| `className` | `string` | — | CSS class for styling |
| `style` | `CSSProperties` | — | Inline styles |

```tsx
<ReactIcon size={48} className="opacity-80 hover:opacity-100" />
<DockerIcon size={40} color="#2496ED" style={{ marginRight: 8 }} />
```

## Variants

Icons ship in three variants — append suffix to the base name:

| Variant | Example | When to Use |
|---------|---------|-------------|
| Default (colored) | `ReactIcon` | Light backgrounds |
| Light | `ReactLightIcon` | Dark/colored backgrounds |
| Dark | `ReactDarkIcon` | Force dark treatment |
| Wordmark | `ReactWordmarkIcon` | Logo + text lockups |

```tsx
import { ReactIcon, ReactLightIcon, ReactWordmarkIcon } from "developer-icons"

// Dark-mode aware
<ReactIcon className="dark:hidden" />
<ReactLightIcon className="hidden dark:block" />
```

## Common Icons

```tsx
import {
  HtmlIcon, CssIcon, JavascriptIcon, TypescriptIcon,
  ReactIcon, NextjsIcon, TailwindcssIcon, NodejsIcon,
  PostgresqlIcon, MysqlIcon, MongodbIcon, RedisIcon,
  DockerIcon, GithubIcon, VercelIcon, AwsIcon,
  PrismaIcon, GraphqlIcon, FigmaIcon, VscodeIcon,
} from "developer-icons"
```
