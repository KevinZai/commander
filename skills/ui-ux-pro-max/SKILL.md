---
name: ui-ux-pro-max
description: AI-powered design intelligence — 192 reasoning rules, 80 UI styles, 74 font pairings
category: design
triggers:
  - design system
  - ui style
  - ux rules
  - color palette
  - font pairing
  - landing page design
---

# UI UX Pro Max — Design Intelligence for AI

Structured design system generation with industry-specific reasoning rules. Tell it what you're building and get a complete design system recommendation.

## Install

```bash
npm install -g ui-ux-pro-max-cli   # provides the `uipro` command
uipro init --ai claude             # or: --ai codex, --ai cursor, ...
```

Or as a Claude Code plugin: `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`, then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`.

## What's Included

- **192** industry-specific reasoning rules, with a matching color palette per product type
- **80** searchable UI styles (51 active)
- **74** font pairings
- **120** UX guidelines, including resilient text layout and IME-safe Enter shortcuts
- **25** chart type recommendations
- **22** tech stacks

Counts are from the upstream README on 2026-11-18; check it for current numbers.

## How It Works

BM25-ranked search engine matches your project description to the design database. Returns: recommended style, color palette, typography, key effects, and anti-patterns to avoid.

## Example

> "Build a beauty spa booking landing page"

Returns: Soft morphism style, warm pastel palette, serif + sans-serif pairing, micro-interactions, glassmorphism cards. Avoid: harsh shadows, tech-heavy typography.

## Links

- **GitHub:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **License:** MIT
- **Vendored at:** `vendor/ui-ux-pro-max-skill`
