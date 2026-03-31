---
name: KZ Mega-Mobile
description: "Complete mobile development ecosystem — 8 skills in one. React Native, Flutter, SwiftUI, Jetpack Compose, testing, ASO, push notifications, and deep linking."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
tags: [CCC domain, mobile, ios, android]
---

# KZ Mega-Mobile

> Load ONE skill. Get the entire mobile development domain. From cross-platform frameworks to native iOS/Android to distribution and engagement.

## Sub-Skills

| # | Skill | Command | Description |
|---|-------|---------|-------------|
| 1 | react-native | `/react-native` | React Native development patterns, navigation, native modules |
| 2 | flutter | `/flutter` | Flutter/Dart development, widget architecture, state management |
| 3 | swiftui | `/swiftui` | SwiftUI development, MVVM patterns, iOS-specific features |
| 4 | jetpack-compose | `/jetpack-compose` | Jetpack Compose for Android, Material Design 3 |
| 5 | mobile-testing | `/mobile-testing` | Mobile testing with Detox, Maestro, XCTest, Espresso |
| 6 | app-store-optimization | `/app-store-optimization` | ASO for App Store and Play Store listings |
| 7 | push-notifications | `/push-notifications` | Push notification setup with FCM, APNs, OneSignal |
| 8 | deep-linking | `/deep-linking` | Universal links, app links, deep linking configuration |

## How To Use

**Step 1:** Tell me what you're building and which platform(s) you're targeting.

**Step 2:** I'll confirm your framework choice, target OS versions, and any constraints before routing to the specialist.

**Step 3:** The specialist skill handles the work. You get mobile expertise across the full stack without loading 8 separate skills.

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Build a React Native app" / "RN navigation" / "Expo" | `react-native` | `flutter` (different framework entirely) |
| "Flutter app" / "Dart widget" / "Riverpod" | `flutter` | `react-native` (JS-based, not Dart) |
| "SwiftUI view" / "iOS native" / "Combine" | `swiftui` | `jetpack-compose` (Android, not iOS) |
| "Compose UI" / "Android native" / "Material 3" | `jetpack-compose` | `swiftui` (iOS, not Android) |
| "Test my app" / "E2E mobile test" / "Detox" | `mobile-testing` | Framework skills (building, not testing) |
| "App Store listing" / "Play Store optimization" | `app-store-optimization` | `push-notifications` (engagement, not discovery) |
| "Push notifications" / "FCM" / "APNs" | `push-notifications` | `deep-linking` (navigation, not messaging) |
| "Deep links" / "Universal links" / "App links" | `deep-linking` | `push-notifications` (messaging, not navigation) |

## Campaign Templates

### Cross-Platform App (React Native)
1. `react-native` -> scaffold project, navigation, state management
2. `push-notifications` -> integrate FCM + APNs via React Native Firebase
3. `deep-linking` -> configure universal links and app links
4. `mobile-testing` -> set up Detox E2E tests
5. `app-store-optimization` -> optimize store listings before launch
6. Deliver: production-ready cross-platform app with notifications, deep linking, and tests

### Native iOS App
1. `swiftui` -> build UI with SwiftUI, implement MVVM architecture
2. `push-notifications` -> configure APNs and notification handling
3. `deep-linking` -> set up universal links and custom URL schemes
4. `mobile-testing` -> write XCTest unit and UI tests
5. `app-store-optimization` -> optimize App Store listing
6. Deliver: native iOS app with full notification and deep link support

### Native Android App
1. `jetpack-compose` -> build UI with Compose, Material Design 3
2. `push-notifications` -> configure FCM and notification channels
3. `deep-linking` -> set up Android App Links and intent filters
4. `mobile-testing` -> write Espresso and Compose UI tests
5. `app-store-optimization` -> optimize Play Store listing
6. Deliver: native Android app with Material 3, notifications, and testing

## Platform Selection Guide

```
Which platform should you target?
|
+-- Need iOS + Android from one codebase?
|   +-- Team knows React/JS? -> react-native
|   +-- Want best cross-platform performance? -> flutter
|
+-- Need native platform experience?
|   +-- iOS only? -> swiftui
|   +-- Android only? -> jetpack-compose
|
+-- Not sure?
    +-- Start with react-native if team knows JS/TS
    +-- Start with flutter if team wants maximum UI control
```

## Context Strategy

This CCC domain uses on-demand loading. Sub-skills have `disable-model-invocation: true` so they only load when explicitly invoked, keeping your context lean.
