---
name: analytics-setup
description: "Implement product analytics with PostHog, Mixpanel, or GA4 — event tracking, funnels, cohorts, and dashboards."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, analytics, posthog, mixpanel, ga4]
disable-model-invocation: true
---

# Analytics Setup

## What This Does

Implements product analytics tracking from scratch — choosing the right platform, defining an event taxonomy, instrumenting the codebase, building funnels and dashboards, and setting up automated insights. Covers PostHog (self-hosted/cloud), Mixpanel, and Google Analytics 4 (GA4).

## Instructions

1. **Choose your analytics platform.**

   | Platform | Best For | Hosting | Price |
   |----------|----------|---------|-------|
   | PostHog | Product analytics, feature flags, session replay | Self-hosted or cloud | Free tier generous, open source |
   | Mixpanel | Product analytics, deep funnel analysis | Cloud only | Free up to 20M events/mo |
   | GA4 | Marketing analytics, acquisition channels | Cloud only | Free |
   | Amplitude | Enterprise product analytics | Cloud only | Free tier limited |

   **Recommendation:** PostHog for most startups (free self-hosted, all-in-one), GA4 for marketing analytics, Mixpanel for product-led growth companies.

2. **Define your event taxonomy.** Plan events BEFORE instrumenting:

   ```
   Naming convention: {object}_{action}

   Core events (every app needs these):
   - user_signed_up         (acquisition)
   - user_logged_in         (activation)
   - user_completed_onboarding  (activation)
   - {core_action}_completed    (engagement — the main thing users do)
   - subscription_started       (monetization)
   - subscription_cancelled     (retention)
   - feature_used              (engagement, with feature_name property)

   Properties for every event:
   - user_id (or anonymous_id before signup)
   - timestamp
   - platform (web/ios/android)
   - app_version
   - utm_source, utm_medium, utm_campaign (if from external link)
   ```

3. **Implement tracking (PostHog example).**

   ```typescript
   // lib/analytics.ts — centralized analytics module
   import posthog from 'posthog-js';

   // Initialize (once, at app startup)
   posthog.init('phc_YOUR_KEY', {
     api_host: 'https://app.posthog.com',  // or self-hosted URL
     capture_pageview: true,
     capture_pageleave: true,
     autocapture: false,  // prefer explicit events
   });

   // Identify user (after login/signup)
   export function identifyUser(userId: string, traits: Record<string, unknown>) {
     posthog.identify(userId, {
       email: traits.email,
       plan: traits.plan,
       created_at: traits.createdAt,
     });
   }

   // Track event (type-safe wrapper)
   type EventName =
     | 'user_signed_up'
     | 'user_logged_in'
     | 'feature_used'
     | 'subscription_started'
     | 'item_created'
     | 'item_shared';

   export function track(event: EventName, properties?: Record<string, unknown>) {
     posthog.capture(event, {
       ...properties,
       platform: 'web',
       app_version: APP_VERSION,
     });
   }

   // Reset on logout
   export function resetAnalytics() {
     posthog.reset();
   }
   ```

   ```typescript
   // Usage in components
   import { track } from '@/lib/analytics';

   function CreateItemButton() {
     const handleCreate = async () => {
       const item = await createItem(data);
       track('item_created', {
         item_type: item.type,
         has_attachments: item.attachments.length > 0,
       });
     };
     return <button onClick={handleCreate}>Create</button>;
   }
   ```

4. **Server-side tracking (for critical events).**
   ```typescript
   // Server-side events can't be blocked by ad blockers
   import { PostHog } from 'posthog-node';

   const posthog = new PostHog('phc_YOUR_KEY', {
     host: 'https://app.posthog.com',
   });

   // Track server-side events
   posthog.capture({
     distinctId: userId,
     event: 'subscription_started',
     properties: {
       plan: 'pro',
       mrr: 29.99,
       trial_length_days: 14,
     },
   });

   // Set user properties
   posthog.identify({
     distinctId: userId,
     properties: {
       plan: 'pro',
       company_size: '10-50',
     },
   });
   ```

5. **Build key analytics views.**

   **Funnels:**
   ```
   Signup Funnel:
   1. Landing page viewed
   2. Signup form started
   3. Signup completed
   4. Onboarding started
   5. Onboarding completed
   6. First core action

   Conversion targets: >60% signup-to-onboarding, >40% onboarding-to-core-action
   ```

   **Retention:**
   ```
   Weekly retention cohort:
   - Week 0: signed up
   - Week 1: returned and performed core action
   - Week 4: returned and performed core action
   - Week 12: returned and performed core action

   Target: >40% W1, >20% W4, >10% W12
   ```

   **Feature adoption:**
   ```
   For each feature:
   - Total users who used it (adoption rate)
   - Frequency of use per user (stickiness)
   - Correlation with retention (is it a leading indicator?)
   ```

6. **Privacy and compliance.**
   - Implement cookie consent banner (GDPR/CCPA)
   - Respect Do Not Track header
   - Allow users to opt out
   - Don't track PII unless necessary (email, full name)
   - Set data retention limits
   - Document what you track and why

## Output Format

```markdown
# Analytics Setup: {App Name}

## Platform: {PostHog / Mixpanel / GA4}

## Event Taxonomy
| Event | Category | Properties | Trigger |
|-------|----------|-----------|---------|
| {event_name} | {acquisition/activation/engagement/monetization/retention} | {key properties} | {when it fires} |

## Implementation
### Client-side
{Code for analytics module + instrumentation}

### Server-side
{Code for critical events tracked server-side}

## Key Dashboards
| Dashboard | Metrics | Audience |
|-----------|---------|----------|
| {name} | {what it shows} | {who views it} |

## Funnels
{Defined funnel steps with targets}

## Privacy
{Consent mechanism and data handling}
```

## Tips

- Track events explicitly rather than using autocapture — explicit events have clean names and consistent properties
- Server-side tracking for business-critical events (payments, signups) — ad blockers can't block server-side
- Define your event taxonomy in a spreadsheet BEFORE writing code — it's much harder to rename events later
- PostHog's session replay is incredibly useful for understanding why users drop off in funnels
- GA4 is best for marketing/acquisition analytics; PostHog/Mixpanel are better for product analytics — many teams use both
- Don't over-track — 20-30 well-defined events are more useful than 200 generic ones
- Track properties, not events, for variations — `feature_used { feature: "export" }` not `export_feature_used`
