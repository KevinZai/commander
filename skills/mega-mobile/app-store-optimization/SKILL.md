---
name: app-store-optimization
description: "App Store Optimization (ASO) for Apple App Store and Google Play Store — keywords, screenshots, descriptions, and conversion."
version: 1.0.0
category: mobile
parent: mega-mobile
tags: [mega-mobile, aso, app-store, marketing]
disable-model-invocation: true
---

# App Store Optimization

## What This Does

Optimizes app store listings for maximum visibility and conversion on both Apple App Store and Google Play Store. Covers keyword research, title optimization, description writing, screenshot strategy, and A/B testing to increase organic downloads.

## Instructions

1. **Audit the current listing.** If the app is already published, review:
   - Current title, subtitle (iOS) / short description (Android)
   - Full description and keyword field (iOS)
   - Screenshots and preview videos
   - Current category and rankings
   - Reviews and ratings (average, common complaints)
   - Competitor listings in the same category

2. **Keyword research.** Identify high-value keywords:
   - Brainstorm 50-100 relevant keywords (features, use cases, synonyms)
   - Categorize by intent: navigational, informational, transactional
   - Estimate search volume and competition (use App Annie, Sensor Tower, or AppTweak if available)
   - Select 15-25 primary keywords to target
   - Map keywords to placement: title, subtitle, keyword field, description

3. **Optimize the title and subtitle.**

   **Apple App Store:**
   ```
   Title (30 chars max): {Brand Name} - {Primary Keyword}
   Subtitle (30 chars max): {Secondary Keyword Phrase}
   Keyword field (100 chars): {comma-separated keywords, no spaces after commas}
   ```

   **Google Play Store:**
   ```
   Title (30 chars max): {Brand Name} - {Primary Keyword}
   Short description (80 chars max): {Value proposition with keywords}
   ```

   Rules:
   - Front-load the most important keyword in the title
   - Don't duplicate words across title, subtitle, and keyword field (iOS counts them all)
   - Use the singular OR plural of a keyword, not both (Apple indexes both forms)
   - Avoid generic words Apple already indexes (free, app, the)

4. **Write the description.**
   - First 3 lines are critical (shown before "Read More")
   - Lead with the strongest benefit, not features
   - Use short paragraphs and bullet points
   - Include social proof (awards, press mentions, user counts)
   - End with a clear call to action
   - Google Play: keywords in the description impact ranking. Apple: they do not.

5. **Screenshot strategy.**
   - First 2 screenshots determine whether users scroll — make them count
   - Show the core value proposition, not the splash screen
   - Use captions on screenshots (short, benefit-focused text overlays)
   - Include device frames for polish
   - Show real app content, not placeholder data
   - Recommended: 5-8 screenshots per locale

   **iOS sizes (required):**
   - 6.7" (iPhone 15 Pro Max): 1290 x 2796
   - 6.5" (iPhone 14 Plus): 1284 x 2778
   - 5.5" (iPhone 8 Plus): 1242 x 2208
   - iPad Pro 12.9": 2048 x 2732

   **Android sizes:**
   - Phone: 1080 x 1920 minimum (16:9) or 1080 x 2400 (20:9)
   - Feature graphic: 1024 x 500

6. **Localization.** For each target market:
   - Translate and culturally adapt, don't just translate
   - Research local keywords (direct translations often aren't the search terms)
   - Adapt screenshots with localized text overlays
   - Prioritize markets by potential (US, UK, Germany, Japan, Brazil for most apps)

7. **Monitor and iterate.**
   - Track keyword rankings weekly
   - A/B test screenshots and descriptions (Google Play Experiments or third-party tools)
   - Respond to reviews (improves rating and shows active development)
   - Update listing with seasonal keywords and new features

## Output Format

```markdown
# ASO Optimization: {App Name}

## Title & Subtitle
- **Title:** {optimized title}
- **Subtitle (iOS):** {optimized subtitle}
- **Short Description (Android):** {optimized short description}

## Keywords (iOS)
{100-char keyword field, comma-separated}

## Description
{Full optimized description}

## Screenshot Plan
| Slot | Message | Screen Shown |
|------|---------|-------------|
| 1 | {headline benefit} | {which screen} |
| 2 | {key feature} | {which screen} |
| ... | ... | ... |

## Keyword Targets
| Keyword | Volume | Competition | Current Rank | Target |
|---------|--------|------------|-------------|--------|
| {keyword} | {H/M/L} | {H/M/L} | {rank or N/A} | {target rank} |
```

## Tips

- The title is the single highest-impact ASO lever — optimize it first
- iOS keyword field: use every character, no spaces after commas, no duplicates from title/subtitle
- Google Play indexes keywords from the full description — repeat important terms naturally 3-5 times
- Ratings below 4.0 hurt conversion significantly — prioritize bug fixes that address common complaints
- Update your listing quarterly even if the app hasn't changed — fresh metadata can boost ranking
- Preview videos auto-play on iOS — make the first 3 seconds compelling without sound
