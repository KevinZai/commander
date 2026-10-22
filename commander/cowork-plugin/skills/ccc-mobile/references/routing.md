# /ccc-mobile — sub-skills and routing

Reference for SKILL.md step 2. Sub-skills ship with the Commander CLI toolkit (`skills/ccc-mobile/<name>/SKILL.md` in the repository). When one is not available in the session, apply the focus in its row.

## Sub-skills

| Sub-skill | Focus |
|---|---|
| `react-native` | Expo or bare workflow, React Navigation, native modules, state management |
| `flutter` | Widget architecture, state management, platform channels |
| `swiftui` | MVVM, Combine, iOS-specific features |
| `jetpack-compose` | Material Design 3, Android lifecycle |
| `mobile-testing` | Detox, Maestro, XCTest, Espresso |
| `app-store-optimization` | App Store and Play Store listings: keywords, screenshots, rating prompts |
| `push-notifications` | FCM, APNs, OneSignal, Expo Notifications |
| `deep-linking` | Universal Links, App Links, deep link configuration |

## Routing matrix

| Intent or argument | Route to |
|---|---|
| "React Native" / "Expo" / `react-native` | `react-native` |
| "Flutter" / "Dart" / `flutter` | `flutter` |
| "iOS" / "SwiftUI" / `swiftui` | `swiftui` |
| "Android" / "Jetpack Compose" / `jetpack-compose` | `jetpack-compose` |
| "Mobile tests" / "Detox" / "Maestro" / `testing` | `mobile-testing` |
| "App Store" / "Play Store" / "ASO" / `aso` | `app-store-optimization` |
| "Push notifications" / "FCM" / "APNs" / `push` | `push-notifications` |
| "Deep links" / "Universal links" / `deep-links` | `deep-linking` |
| "New app" / `new` | SKILL.md step 3 |

## Platform selection guide

| Need | Recommendation |
|---|---|
| One codebase, both platforms | React Native (larger ecosystem) or Flutter (stronger custom UI) |
| iOS only, native feel | SwiftUI |
| Android only, native feel | Jetpack Compose |
| Performance-critical rendering | Flutter (Impeller) or native |
| Existing React web team | React Native |

## Examples

- "Build a React Native app with navigation and native modules" → `react-native`: Expo or bare workflow, React Navigation, native module integration.
- "Optimize our App Store listing to increase downloads" → `app-store-optimization`: keyword research, screenshot optimization, rating prompts.
- "Add push notifications to our iOS and Android app" → `push-notifications`: FCM + APNs via OneSignal or Expo Notifications.
